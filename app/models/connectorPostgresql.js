var Exceptions = require('../models/exceptions');
var PG = require('pg');
var PGquery = require('pg-query');
var PGnative = require('pg-native');

/*******************************************************/
/************************ Modèle ***********************/
/*******************************************************/

function connectorPostgresql (params) {
    if (params.host === null) {
        throw new Exceptions.PostgresqlErrorException("Connector 'postgresql' : connector.host' is missing");
    }
    this.host = params.host;
    if (params.port === null) {
        throw new Exceptions.PostgresqlErrorException("Connector 'postgresql' : 'connector.port' is missing");
    }
    this.port = params.port;
    if (params.dbname === null) {
        throw new Exceptions.PostgresqlErrorException("Connector 'postgresql' : 'connector.dbname' is missing");
    }
    this.dbname = params.dbname;
    if (params.user === null) {
        throw new Exceptions.PostgresqlErrorException("Connector 'postgresql' : 'connector.user' is missing");
    }
    this.user = params.user;
    if (params.passwd === null) {
        throw new Exceptions.PostgresqlErrorException("Connector 'postgresql' : 'connector.passwd' is missing");
    }   
    this.passwd = params.passwd;
    this.conString = "postgresql://"+this.user+":"+this.passwd+"@"+this.host+":"+this.port+"/"+this.dbname;

    if (params.schemaname === null) {
        params.schemaname = 'public';
    }   
    this.schemaname = params.schemaname;

    this.getFeatureTypes();
}

// Fonction synchrone
// Teste la connexion
// Récupère les tables disponibles et leur colonne géométrique
connectorPostgresql.prototype.getFeatureTypes = function () {
    if (this.tables !== null) {
        return this.tables;
    }

    try {
        var client = new PGnative();
        client.connectSync(this.conString);
        //text queries
        var rawgeoms = client.querySync("SELECT f_table_name as name, f_geometry_column as geom, srid FROM geometry_columns WHERE f_table_schema = '"+this.schemaname+"' ;");
        var rawtables = client.querySync("SELECT tablename as name FROM pg_tables WHERE schemaname = '"+this.schemaname+"' ;");

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
        return this.tables;
    }
    catch (e) {
        throw new Exceptions.PostgresqlErrorException('Could not connect to postgresql : ' + e.message);
    }
};


/*******************************************************/
/************************ SELECTS **********************/
/*******************************************************/

connectorPostgresql.prototype.select = function(requestedTable, max, properties, sort, callback) {

    if (properties === null) properties = "*";
    var sqlRequest = "SELECT "+properties+" FROM "+requestedTable+" "+translateSort(sort)+" LIMIT "+max+";";

    PGquery.connectionParameters = this.conString;
    
    PGquery(
        sqlRequest,
        function(err, rows, result) {
            callback(err, rows);
        }
    );
};

connectorPostgresql.prototype.selectById = function(requestedTable, properties, objId, callback) {
    if (properties === null) properties = "*";
    var sqlRequest = "SELECT "+properties+" FROM "+requestedTable+" WHERE gid = "+objId+";";

    PGquery.connectionParameters = this.conString;
    
    PGquery(
        sqlRequest,
        function(err, rows, result) {
            callback(err, rows);
        }
    );
};

connectorPostgresql.prototype.selectByBbox = function(requestedTable, max, properties, sort, bbox, srs, callback) {
    
    if (properties === null) properties = "*";
    var geomColumnName = this.tables[requestedTable][0];
    var nativeSrid = this.tables[requestedTable][1];
    var sqlRequest = "SELECT "+properties+" FROM "+requestedTable+" "+translateBbox(srs, bbox, geomColumnName, nativeSrid)+" "+translateSort(sort)+" LIMIT "+max+";";

    PGquery.connectionParameters = this.conString;
    
    PGquery(
        sqlRequest,
        function(err, rows, result) {
            callback(err, rows);
        }
    );
};


module.exports.Model = connectorPostgresql;


/*******************************************************/
/************************* UTILS ***********************/
/*******************************************************/


// Convertisseur du paramètre sort

function translateSort (sortParam) {
    //sortBy=attribute(+A|+D)
    // le plus est tranformé en espace
    if (sortParam === null) return "";
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

    if (srsParam === null) return "";
    var srs = srsParam.split(':');
    if (srs.length != 2 || srs[0].toLowerCase() != "epsg") throw new Exceptions.BadRequestException("SRSNAME field not valid (EPSG:SRID format expected) : "+srsParam);

    if (bboxParam === null) return "";
    var bb = bboxParam.split(',');
    if (bb.length != 4) throw new Exceptions.BadRequestException("BBOX field not valid (4 values separated by comma expected) : "+bboxParam);
    var polygon = "POLYGON(("+bb[0]+" "+bb[1]+","+bb[2]+" "+bb[1]+","+bb[2]+" "+bb[3]+","+bb[0]+" "+bb[3]+","+bb[0]+" "+bb[1]+"))";

    //return "WHERE st_intersects("+geomColumn+",st_transform(st_geomfromewkt('SRID="+srs[1]+";"+polygon+"'),"+sridGeom+"))";
    // Calcul d'intersection plus rapide mais moins précis
    return "WHERE "+geomColumn+" && st_transform(st_geomfromewkt('SRID="+srs[1]+";POLYGON((4 45,5 45,5 46,4 46,4 45))'),"+sridGeom+")";
}