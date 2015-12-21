var Exceptions = require('../models/exceptions');
var PG = require('pg');
var PGquery = require('pg-query');
var PGnative = require('pg-native');

/*******************************************************/
/************************ Modèle ***********************/
/*******************************************************/

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
    if (! params.hasOwnProperty('schemaName') || params.schemaName === null) {
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
- Récupère les tables disponibles et leur colonne géométrique

Exceptions possibles :
- PostgresqlErrorException
*/
ConnectorPostgresql.prototype.getFeatureTypes = function () {
    if (this.tables !== null) {
        return Object.keys(this.tables);
    }

    try {
        var client = new PGnative();
        client.connectSync(this.conString);
        //text queries
        var rawgeoms = client.querySync("SELECT f_table_name as name, f_geometry_column as geom, srid FROM geometry_columns WHERE f_table_schema = '"+this.schemaName+"' ;");
        var rawtables = client.querySync("SELECT tablename as name FROM pg_tables WHERE schemaname = '"+this.schemaName+"' ;");

        var tables = {};
        var geoms = {};
        for (var i=0; i<rawgeoms.length; i++) {
            geoms[rawgeoms[i].name] = [rawgeoms[i].geom, rawgeoms[i].srid];
        }

        for (i=0; i<rawtables.length; i++) {
            if (geoms.hasOwnProperty(rawtables[i].name)) {
                tables[rawtables[i].name] = geoms[rawtables[i].name];
            } else {
                tables[rawtables[i].name] = null;
            }
        }

        client.end();
        this.tables = tables;
        return Object.keys(tables);
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

/*******************************************************/
/************************ SELECTS **********************/
/*******************************************************/

ConnectorPostgresql.prototype.select = function(requestedTable, max, properties, sort, callback) {

    if (properties === undefined) properties = "*";
    var sqlRequest = "SELECT "+properties+" FROM "+requestedTable+" "+translateSort(sort)+" LIMIT "+max+";";

    PGquery.connectionParameters = this.conString;
    
    PGquery(
        sqlRequest,
        function(err, rows, result) {
            callback(err, rows);
        }
    );
};

ConnectorPostgresql.prototype.selectById = function(requestedTable, properties, objId, callback) {
    if (properties === undefined) properties = "*";
    var sqlRequest = "SELECT "+properties+" FROM "+requestedTable+" WHERE gid = "+objId+";";

    PGquery.connectionParameters = this.conString;
    
    PGquery(
        sqlRequest,
        function(err, rows, result) {
            callback(err, rows);
        }
    );
};

ConnectorPostgresql.prototype.selectByBbox = function(requestedTable, max, properties, sort, bbox, srs, callback) {
    
    if (properties === undefined) properties = "*";
    if (this.tables[requestedTable] === null) {
        // Pas de géométrie dans cette table on ignore la bbox et on part sur un simple select
        console.log("No geometry attribut for this table -> standard select");
        this.select(requestedTable, max, properties, sort, callback);
        return;
    }


    var geomColumnName = this.tables[requestedTable][0];
    var nativeSrid = this.tables[requestedTable][1];
    var sqlRequest = "SELECT "+properties+" FROM "+requestedTable+" "+translateBbox(srs, bbox, geomColumnName, nativeSrid)+" "+translateSort(sort)+" LIMIT "+max+";";

    console.log(sqlRequest);

    PGquery.connectionParameters = this.conString;
    
    PGquery(
        sqlRequest,
        function(err, rows, result) {
            callback(err, rows);
        }
    );
};

module.exports.Model = ConnectorPostgresql;


/*******************************************************/
/************************* UTILS ***********************/
/*******************************************************/


// Convertisseur du paramètre sort

function translateSort (sortParam) {
    //sortBy=attribute(+A|+D)
    // le plus est tranformé en espace
    if (sortParam === undefined) return "";
    var s = sortParam.split(' ');

    var order = "ASC";
    if (s.length == 2 && s[1] == "D") {
        order = "DESC";
    }

    return "ORDER BY " + s[0] + " " + order;
}

function translateBbox (srsParam, bboxParam, geomColumn, sridGeom) {

    // Si il  manque une information sur les géométries on ne retourne pas de filtre géométrique
    if (geomColumn === null || sridGeom === null) return "";

    if (srsParam === undefined) return "";
    var srs = srsParam.split(':');
    if (srs.length != 2 || srs[0].toLowerCase() != "epsg") throw new Exceptions.BadRequestException("SRSNAME field not valid (EPSG:SRID format expected) : "+srsParam);

    if (bboxParam === undefined) return "";
    var bb = bboxParam.split(',');
    if (bb.length != 4) throw new Exceptions.BadRequestException("BBOX field not valid (4 values separated by comma expected) : "+bboxParam);
    var polygon = "POLYGON(("+bb[0]+" "+bb[1]+","+bb[2]+" "+bb[1]+","+bb[2]+" "+bb[3]+","+bb[0]+" "+bb[3]+","+bb[0]+" "+bb[1]+"))";

    //return "WHERE st_intersects("+geomColumn+",st_transform(st_geomfromewkt('SRID="+srs[1]+";"+polygon+"'),"+sridGeom+"))";
    // Calcul d'intersection plus rapide mais moins précis
    return "WHERE "+geomColumn+" && st_transform(st_geomfromewkt('SRID="+srs[1]+";"+polygon+"'),"+sridGeom+")";
}