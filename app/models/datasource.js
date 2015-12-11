var fs = require('fs');
var Exceptions = require('./exceptions');
var PostgresService = require('../services/postgresql');

var storePath;

/*******************************************************/
/************************ Modèle ***********************/
/*******************************************************/

function Datasource (name, connector) {
    this.name = name;
    this.connector = connector;
    this.tables = {};

    if (this.connector.type == "postgresql" && this.connector.schemaname === null) {
        this.connector.schemaname = 'public';
    }
}


Datasource.prototype.ownTable = function(testTable) {
    return this.tables.hasOwnProperty(testTable);
};

Datasource.prototype.getFeature = function(requestedTable, max, properties, sort, callback) {
    if (this.connector.type == "postgresql") {
        requestedTable = this.connector.schemaname+"."+requestedTable;
        PostgresService.select(
            this.connector.connstring,
            requestedTable, max, properties, sort,
            callback
        );
    }
};

Datasource.prototype.getFeatureById = function(requestedTable, properties, objId, callback) {
    if (this.connector.type == "postgresql") {
        requestedTable = this.connector.schemaname+"."+requestedTable;
        PostgresService.selectById(
            this.connector.connstring,
            requestedTable, properties, objId,
            callback
        );
    }
};

Datasource.prototype.getFeatureByBbox = function(requestedTable, max, properties, sort, bbox, srs, callback) {

    if (this.tables[requestedTable] === null) {
        // La table n'a pas de géométrie, on part donc sur une requête simple
        this.getFeature(connstring, requestedTable, max, properties, sort, callback);
        return;
    }

    var geomColumnName = this.tables[requestedTable][0];
    var nativeSrid = this.tables[requestedTable][1];

    if (this.connector.type == "postgresql") {

        requestedTable = this.connector.schemaname+"."+requestedTable;
        PostgresService.selectByBbox(
            this.connector.connstring,
            requestedTable, max, properties, sort, bbox, srs, geomColumnName, nativeSrid, 
            callback
        );
    }
};

Datasource.prototype.findInfos = function() {
    if (this.connector.type == "postgresql") {
        try {
            var infos = PostgresService.connInfos(
                this.connector.host,
                this.connector.port,
                this.connector.dbname,
                this.connector.user,
                this.connector.passwd,
                this.connector.schemaname
            );

            this.connector.connstring = infos[0];
            this.tables = infos[1];
            this.geoms = infos[2];

            return true;
        }
        catch (e) {
            console.log(e.message);
            return false;
        }
    }
    return false;
};

module.exports.Model = Datasource;

/*******************************************************/
/********************* Méthodes CRUD *******************/
/*******************************************************/

function isValidDatasource (obj) {
    if (obj.name === null) {
        return "'name' is missing";
    }
    if (obj.connector === null) {
        return "'connector' is missing";
    }
    if (obj.connector.type === null) {
        return "'connector.type' is missing";
    }

    if (obj.connector.type == "postgresql") {
        /* Base postgresql : il faut avoir
            - l'hôte
            - le port
            - le nom de la base de données
            - le user
            - le mot de passe
            - le nom de schéma
        */
        if (obj.connector.host === null) {return "Connector 'postgresql' : connector.host' is missing";}
        if (obj.connector.port === null) {return "Connector 'postgresql' : 'connector.port' is missing";}
        if (obj.connector.dbname === null) {return "Connector 'postgresql' : 'connector.dbname' is missing";}
        if (obj.connector.user === null) {return "Connector 'postgresql' : 'connector.user' is missing";}
        if (obj.connector.passwd === null) {return "Connector 'postgresql' : 'connector.passwd' is missing";}
    } else {
        return "connector.type unknown : "+obj.connector.type;
    }

    return null;
}

module.exports.isValid = isValidDatasource;

function createDatasource(obj, save) {
    if (isValidDatasource(obj) === null) {

        if (getDatasource(obj.name) !== null) {
            throw new Exceptions.ConflictException("Provided datasource owns a name already used");
        }

        var ds = new Datasource(obj.name, obj.connector);

        if (! ds.findInfos()) {
            throw new Exceptions.BadRequestException("Provided connector is unusable");
        }

        loadedDatasources[ds.name] = ds;

        if (save !== null && save) {
            var jsonDb = JSON.stringify(ds);
            var file = storePath + "/" + ds.name + ".json";
            try {
                fs.writeFileSync(file, jsonDb);            
            } catch (e) {
                console.log(e);
                throw new Exceptions.ConfigurationErrorException("Impossible to write the datasource file : " + file);
            }
        }

        return ds;
    } else {
        throw new Exceptions.BadRequestException("Provided object cannot be cast as a datasource : "+isValidDatasource(obj));
    }    
}

module.exports.create = createDatasource;

function deleteDatasource (name) {
    if (getDatasource(name) === null) {
        throw new Exceptions.NotFoundException("Datasource to delete does not exist : " + name);
    }
    loadedDatasources[name] = null;
    delete loadedDatasources[name];
    var file = storePath + "/" + name + ".json";
    try {
        fs.unlinkSync(file);
    } catch (e) {
        throw new Exceptions.ConfigurationErrorException("Impossible to remove the datasource file : " + file);
    }
}

module.exports.delete = deleteDatasource;

function updateDatasource (name, obj) {
    obj.name = name;
    if (getDatasource(name) === null) {
        throw new NotFoundException("Datasource to update does not exist : " + name);
    }
    delete loadedDatasources[name];
    createDatasource(obj, true);
}

module.exports.update = updateDatasource;

var loadedDatasources = {};

function getDatasources () {
    return loadedDatasources;
}

module.exports.getAll = getDatasources;

function getDatasource (dsName) {
    if (loadedDatasources.hasOwnProperty(dsName)) {
        return loadedDatasources[dsName];
    } else {
        return null;
    }
}

module.exports.getOne = getDatasource;

/*******************************************************/
/****************** Chargement complet *****************/
/*******************************************************/

function loadDatasources(dir) {
    if (dir !== null) storePath = dir;
    console.log("Browse datasources' directory "+storePath);

    var files;
    try {
        files = fs.readdirSync(storePath);
    }
    catch (e) {
        throw new Exceptions.ConfigurationErrorException("Unable to browse datasources' directory "+storePath);
    }

    loadedDatasources = null;
    loadedDatasources = {};

    for (var i=0; i<files.length; i++) {
        var file = storePath + "/" + files[i];
        try{
            var ds = JSON.parse(fs.readFileSync(file, 'utf8'));
            createDatasource(ds, false);
        } catch (e) {
            console.log(e.message);
            console.log("Datasource file is not a valid JSON file : " + file);
            continue;
        }
    }
}

module.exports.load = loadDatasources;