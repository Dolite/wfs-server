/*global
    exports, global, module, process, require, console
*/

var Exceptions = require('../models/exceptions');
var PG = require('pg');
var PGquery = require('pg-query');
var PGnative = require('pg-native');

/*******************************************************/
/************************* UTILS ***********************/
/*******************************************************/


function translateFeatures (rawResults) {

    if (rawResults === null || rawResults === undefined) {return null;}

    var geoJSON = {
        "type": "FeatureCollection",
        "totalFeatures": rawResults.length,
        "features": []
    };

    var crs = null;

    for (var i = 0; i < rawResults.length; i++) {
        var rawFeature = rawResults[i];
        var feature = {
            "type": "Feature",
            "properties": {}
        };

        for (var att in rawFeature) {
            if (att === "jsongeometry") {
                feature.geometry = JSON.parse(rawFeature.jsongeometry);
            } else if (att === "jsoncrs") {
                crs = rawFeature.jsoncrs;
            } else {
                feature.properties[att] = rawFeature[att];
            }
        }

        geoJSON.features.push(feature);
    }

    if (crs !== null) {
        geoJSON.crs = {
            "type": "name",
            "properties": {
                "name": crs
            }
        };
    }

    return geoJSON;
}

// Convertisseur du paramètre sort
function translateSort (sortParam) {
    //sortBy=attribute(+A|+D)
    // le plus est tranformé en espace
    if (sortParam === undefined) {return "";}
    var s = sortParam.split(' ');

    var order = "ASC";
    if (s.length == 2 && s[1] == "D") {
        order = "DESC";
    }

    return "ORDER BY " + s[0] + " " + order;
}

function translateBbox (srsParam, bboxParam, geomColumn, sridGeom) {

    // Si il  manque une information sur les géométries on ne retourne pas de filtre géométrique
    if (geomColumn === null || sridGeom === null) {return "";}

    if (srsParam === undefined) {return "";}
    var srs = srsParam.split(':');
    if (srs.length != 2 || srs[0].toLowerCase() != "epsg") {throw new Exceptions.BadRequestException("SRSNAME field not valid (EPSG:SRID format expected) : "+srsParam);}

    if (bboxParam === undefined) {return "";}
    var bb = bboxParam.split(',');
    if (bb.length != 4) {throw new Exceptions.BadRequestException("BBOX field not valid (4 values separated by comma expected) : "+bboxParam);}
    var polygon = "POLYGON(("+bb[0]+" "+bb[1]+","+bb[2]+" "+bb[1]+","+bb[2]+" "+bb[3]+","+bb[0]+" "+bb[3]+","+bb[0]+" "+bb[1]+"))";

    //return "WHERE st_intersects("+geomColumn+",st_transform(st_geomfromewkt('SRID="+srs[1]+";"+polygon+"'),"+sridGeom+"))";
    // Calcul d'intersection plus rapide mais moins précis
    return "WHERE "+geomColumn+" && st_transform(st_geomfromewkt('SRID="+srs[1]+";"+polygon+"'),"+sridGeom+")";
}

/*******************************************************/
/************************ Modèle ***********************/
/*******************************************************/

// Liste des tables de fonctionnement de PostGIS, pour ne pas les lister comme étant exploitables
var postgisTables = ['spatial_ref_sys'];

/*
Exceptions possibles :
- MissingAttributeException
- PostgresqlErrorException
*/
function ConnectorPostgresql (params) {
    /* Base postgresql : il faut avoir
        - l'hôte
        - le port
        - le nom de la base de données
        - le user
        - le mot de passe
        - le nom de schéma
    */
    if (! params.hasOwnProperty('host') || params.host === null) {
        throw new Exceptions.MissingAttributeException("Connector 'postgresql", "host");
    }
    this.host = params.host;
    if (! params.hasOwnProperty('port') || params.port === null) {
        throw new Exceptions.MissingAttributeException("Connector 'postgresql'", "port");
    }
    this.port = params.port;
    if (! params.hasOwnProperty('dbname') || params.dbname === null) {
        throw new Exceptions.MissingAttributeException("Connector 'postgresql'", "dbname");
    }
    this.dbname = params.dbname;
    if (! params.hasOwnProperty('user') || params.user === null) {
        throw new Exceptions.MissingAttributeException("Connector 'postgresql'", "user");
    }
    this.user = params.user;
    if (! params.hasOwnProperty('passwd') || params.passwd === null) {
        throw new Exceptions.MissingAttributeException("Connector 'postgresql'", "passwd");
    }   
    this.passwd = params.passwd;
    this.conString = "postgresql://"+this.user+":"+this.passwd+"@"+this.host+":"+this.port+"/"+this.dbname;

    /* Optionnel : si pas de schéma précisé, on part sur 'public' */
    if (! params.hasOwnProperty('schemaName') || params.schemaName === null || params.schemaName === undefined) {
        params.schemaName = 'public';
    }   
    this.schemaName = params.schemaName;

    /* On teste la connexion et on récupère les informations sur les données disponibles */
    this.tables = null;
    this.getFeatureTypes();
}

/*
Fonction synchrone
- Teste la connexion
- Récupère les tables disponibles et leur colonne géométrique (et plus même...)

Exceptions possibles :
- PostgresqlErrorException
*/
ConnectorPostgresql.prototype.getFeatureTypes = function () {
    if (this.tables !== null) {
        return Object.keys(this.tables);
    }

    this.tables = {};
    try {
        var client = new PGnative();
        client.connectSync(this.conString);
        //text queries
        var rawgeoms = client.querySync(
            "SELECT f_table_name as name, f_geometry_column as geom, srid FROM geometry_columns WHERE f_table_schema = '"+this.schemaName+"' ;"
        );
        var rawtables = client.querySync(
            "SELECT tablename as name FROM pg_tables WHERE schemaname = '"+this.schemaName+"' ;"
        );

        var geoms = {};
        var srids = {};
        for (var i=0; i<rawgeoms.length; i++) {
            geoms[rawgeoms[i].name] = rawgeoms[i].geom;
            srids[rawgeoms[i].name] = rawgeoms[i].srid;
        }

        /* Pour chaque table, on va : 
         *    1 - vérifier qu'elle n'est pas une table de fonctionnement de PostGIS
         *    2 - préciser la colonne géométrique et si présente :
         *        - son srid
         *        - son étendue
         *    3 - récupérer les attributs et leur type
         */
        for (i=0; i<rawtables.length; i++) {
            var tableName = rawtables[i].name;

            // 1
            if (postgisTables.indexOf(tableName) !== -1) {continue;}

            var table = {};

            // 2
            if (geoms.hasOwnProperty(tableName)) {
                var bboxeSQL = "SELECT "+
                    "st_xmin(bboxes.native) as xminn, st_xmax(bboxes.native) as xmaxn, st_ymin(bboxes.native) as yminn, st_ymax(bboxes.native) as ymaxn, "+
                    "st_xmin(bboxes.reproj) as xminw, st_xmax(bboxes.reproj) as xmaxw, st_ymin(bboxes.reproj) as yminw, st_ymax(bboxes.reproj) as ymaxw "+
                    "FROM "+
                    "(SELECT "+
                    "bbox.native as native, st_transform(st_setsrid(st_segmentize(bbox.native, st_perimeter(bbox.native)/100),"+srids[tableName]+"), 4326) as reproj "+
                    "FROM "+
                    "(SELECT st_extent("+geoms[tableName]+") AS native "+
                    "FROM "+this.schemaName+"."+tableName+") AS bbox) AS bboxes;";
                var bboxes = client.querySync(bboxeSQL)[0];
                table.geometry = {
                    "column": geoms[tableName],
                    "srid": srids[tableName],
                    "bboxNative": [bboxes.xminn, bboxes.yminn, bboxes.xmaxn, bboxes.ymaxn],
                    "bboxWgs84g": [bboxes.xminw, bboxes.yminw, bboxes.xmaxw, bboxes.ymaxw]
                };
            }

            // 3
            var rawatts = client.querySync(
                "SELECT column_name as name, data_type as type FROM information_schema.columns WHERE table_schema = '"+this.schemaName+"' and table_name = '"+tableName+"';"
            );

            var atts = {};
            for (var j=0; j<rawatts.length; j++) {
                // On ne liste pas là la colonne géometrique
                if (rawatts[j].name === table.geometry.column) {continue;}

                atts[rawatts[j].name] = rawatts[j].type;
            }
            table.attributes = atts;
            // Pour éviter de calculer la chaîne à chaque fois, on stocke une fois pour toute la 
            // chaîne de caractère correspondant à tous les attributs, plus la géométrie
            // (dans le cas de getFeature sans champ 'properties')

            var allProperties = [];
            allProperties.push(Object.keys(atts));
            if (table.hasOwnProperty("geometry")) {
                // la propriété géométrique est demandée en GeoJSON
                allProperties.push("st_asGeoJSON(" + table.geometry.column + ") AS jsongeometry");
                allProperties.push("'urn:ogc:def:crs:EPSG::" + table.geometry.srid + "' AS jsoncrs");
            }
            table.allAttributes = allProperties.join(",");

            // On stocke ces informations
            this.tables[tableName] = table;

        }

        client.end();
        return Object.keys(this.tables);
    }
    catch (e) {
        throw new Exceptions.PostgresqlErrorException('Could not connect to postgresql : ' + e.message);
    }
};

ConnectorPostgresql.prototype.getPersistent = function() {
    var obj = {
        "type":"postgresql",
        "dbname":this.dbname,
        "host":this.host,
        "port":this.port,
        "user":this.user,
        "passwd":this.passwd,
        "schemaName":this.schemaName
    };
    return obj;
};

ConnectorPostgresql.prototype.translateProperties = function(tableName, properties) {
    var finalProperties = [];

    if (properties === undefined) {
        return this.tables[tableName].allAttributes;
    }

    var props = properties.split(',');
    for (var i = 0; i < props.length; i++) {
        var p = props[i];
        if (this.tables[tableName].hasOwnProperty("geometry") && p === this.tables[tableName].geometry.column) {
            // la propriété demandée est la colonne géométrique, on ajoute la conversion en GeoJSON
            finalProperties.push("st_asGeoJSON(" + p + ") AS jsongeometry");
            finalProperties.push("'urn:ogc:def:crs:EPSG::" + this.tables[tableName].geometry.srid + "'' AS jsoncrs");
        } else if (this.tables[tableName].attributes.hasOwnProperty(p)) {
            finalProperties.push(p);
        } else {
            throw new Exceptions.BadRequestException("Unvalid attribute in PROPERTYNAME field: "+p);
        }
    }

    return finalProperties.join(",");
};

ConnectorPostgresql.prototype.getFeatureTypeInformations = function(tableName) {
    return this.tables[tableName];
};

/*******************************************************/
/************************ SELECTS **********************/
/*******************************************************/

ConnectorPostgresql.prototype.select = function(requestedTable, max, properties, sort, callback) {

    properties = this.translateProperties(requestedTable, properties);
    var sqlRequest = "SELECT "+properties+" FROM "+this.schemaName+"."+requestedTable+" "+translateSort(sort)+" LIMIT "+max+";";

    PGquery.connectionParameters = this.conString;
    
    PGquery(
        sqlRequest,
        function(err, rows, result) {
            callback(err, translateFeatures(rows));
        }
    );
};

ConnectorPostgresql.prototype.selectById = function(requestedTable, properties, objId, callback) {
    properties = this.translateProperties(requestedTable, properties);
    var sqlRequest = "SELECT "+properties+" FROM "+this.schemaName+"."+requestedTable+" WHERE gid = "+objId+";";

    PGquery.connectionParameters = this.conString;

    PGquery(
        sqlRequest,
        function(err, rows, result) {
            callback(err, translateFeatures(rows));
        }
    );
};

ConnectorPostgresql.prototype.selectByBbox = function(requestedTable, max, properties, sort, bbox, srs, callback) {
    
    if (! this.tables[requestedTable].hasOwnProperty("geometry")) {
        // Pas de géométrie dans cette table on ignore la bbox et on part sur un simple select
        console.log("No geometry attribut for this table -> standard select");
        this.select(requestedTable, max, properties, sort, callback);
        return;
    }

    properties = this.translateProperties(requestedTable, properties);

    var geomColumnName = this.tables[requestedTable].geometry.column;
    var nativeSrid = this.tables[requestedTable].geometry.srid;
    var sqlRequest = "SELECT "+properties+" FROM "+this.schemaName+"."+requestedTable+" "+translateBbox(srs, bbox, geomColumnName, nativeSrid)+" "+translateSort(sort)+" LIMIT "+max+";";

    PGquery.connectionParameters = this.conString;
    
    PGquery(
        sqlRequest,
        function(err, rows, result) {
            callback(err, translateFeatures(rows));
        }
    );
};

module.exports.Model = ConnectorPostgresql;


