var Exceptions = require('../models/exceptions');
var PG = require('pg');
var PGquery = require('pg-query');
var PGnative = require('pg-native');

/*******************************************************/
/************************* UTILS ***********************/
/*******************************************************/

// Test de connexion synchrone et récupérations des tables disponibles et de leur colonne géométrique
module.exports.connInfos = function (host, port, dbname, user, passwd, schemaname) {
    var conString = "postgresql://"+user+":"+passwd+"@"+host+":"+port+"/"+dbname;

    try {
        var client = new PGnative();
        client.connectSync(conString);
        //text queries
        var rawgeoms = client.querySync("SELECT f_table_name as name, f_geometry_column as geom, srid FROM geometry_columns WHERE f_table_schema = '"+schemaname+"' ;");
        var rawtables = client.querySync("SELECT tablename as name FROM pg_tables WHERE schemaname = '"+schemaname+"' ;");

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
        return [conString, tables];
    }
    catch (e) {
        throw new Exceptions.PostgresqlErrorException('Could not connect to postgresql : ' + e.message);
    }
};

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

/*******************************************************/
/************************ SELECTS **********************/
/*******************************************************/

function select (connstring, requestedTable, max, properties, sort, callback) {

    if (properties === null) properties = "*";
    var sqlRequest = "SELECT "+properties+" FROM "+requestedTable+" "+translateSort(sort)+" LIMIT "+max+";";

    PGquery.connectionParameters = connstring;
    
    PGquery(
        sqlRequest,
        function(err, rows, result) {
            callback(err, rows);
        }
    );
}

module.exports.select = select;

module.exports.selectById = function(connstring, requestedTable, properties, objId, callback) {
    if (properties === null) properties = "*";
    var sqlRequest = "SELECT "+properties+" FROM "+requestedTable+" WHERE gid = "+objId+";";

    PGquery.connectionParameters = connstring;
    
    PGquery(
        sqlRequest,
        function(err, rows, result) {
            callback(err, rows);
        }
    );
};

module.exports.selectByBbox = function(connstring, requestedTable, max, properties, sort, bbox, srs, geomColumnName, nativeSrid, callback) {
    
    if (properties === null) properties = "*";
    var sqlRequest = "SELECT "+properties+" FROM "+requestedTable+" "+translateBbox(srs, bbox, geomColumnName, nativeSrid)+" "+translateSort(sort)+" LIMIT "+max+";";

    console.log(sqlRequest + " on " + connstring);

    PGquery.connectionParameters = connstring;
    
    PGquery(
        sqlRequest,
        function(err, rows, result) {
            callback(err, rows);
        }
    );
};

