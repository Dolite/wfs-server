/* jslint node: true */

var fs = require('fs');
var Exceptions = require('./exceptions');
var ConnectorPostgresql = require('./connectorPostgresql').Model;

var storePath;

/*******************************************************/
/************************ Modèle ***********************/
/*******************************************************/

/*
Exceptions possibles :
- BadRequestException
- MissingAttributeException
- PostgresqlErrorException
*/
function Datasource (obj) {
    /* Le nom du datasource */
    if (obj.name === null) {
        throw new Exceptions.MissingAttributeException("Datasource", "name");
    }
    this.name = obj.name;

    /* Le connecteur utilisé par le datasource */
    if (obj.connector === null) {
        throw new Exceptions.MissingAttributeException("Datasource", "connector");
    }
    if (obj.connector.type === null) {
        throw new Exceptions.MissingAttributeException("Datasource", "connector.type");
    }
    
    if (obj.connector.type === 'postgresql') {
        var connector = new ConnectorPostgresql(obj.connector);
        this.connector = connector;
        this.featureTypes = connector.getFeatureTypes();
    }
    else {
        throw new Exceptions.BadRequestException("Provided object cannot be cast as a datasource : 'connector.type' unknown : "+obj.connector.type);   
    }
}


Datasource.prototype.ownFeatureType = function(testFeatureType) {
    return (this.featureTypes.indexOf(testFeatureType) !== -1);
};

Datasource.prototype.getFeature = function(requestedFeatureType, max, properties, sort, callback) {
    console.log("getFeature");
    this.connector.select(
        requestedFeatureType, max, properties, sort,
        callback
    );
};

Datasource.prototype.getFeatureById = function(requestedFeatureType, properties, objId, callback) {
    console.log("getFeatureById");
    this.connector.selectById(
        requestedFeatureType, properties, objId,
        callback
    );
};

Datasource.prototype.getFeatureByBbox = function(requestedFeatureType, max, properties, sort, bbox, srs, callback) {
    console.log("getFeatureByBbox");
    this.connector.selectByBbox(
        requestedFeatureType, max, properties, sort, bbox, srs,
        callback
    );
};

Datasource.prototype.getPersistent = function() {
    var obj = {
        "name": this.name,
        "connector": this.connector.getPersistent()
    };
    return obj;
};

module.exports.Model = Datasource;

/*******************************************************/
/********************* Méthodes CRUD *******************/
/*******************************************************/

/*
Exceptions possibles :
- BadRequestException
- MissingAttributeException
- ConflictException
- PostgresqlErrorException
- ConfigurationErrorException
*/
function createDatasource(obj, save) {

    var ds = new Datasource(obj);
    if (getDatasource(ds.name) !== null) {
        throw new Exceptions.ConflictException("Provided datasource owns a name already used : " + obj.name);
    }
    loadedDatasources[ds.name] = ds;

    if (save !== null && save) {
        var jsonDb = JSON.stringify(ds.getPersistent());
        var file = storePath + "/" + ds.name + ".json";
        try {
            fs.writeFileSync(file, jsonDb);            
        } catch (e) {
            console.log(e);
            throw new Exceptions.ConfigurationErrorException("Impossible to write the datasource file : " + file);
        }
    }

    return ds; 
}

module.exports.create = createDatasource;

/*
Exceptions possibles :
- NotFoundException
- ConfigurationErrorException
*/
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

/*
Exceptions possibles :
- BadRequestException
- ConflictException
- NotFoundException
- PostgresqlErrorException
- ConfigurationErrorException
*/
function updateDatasource (name, obj) {
    obj.name = name;
    if (getDatasourceObject(name) === null) {
        throw new Exceptions.NotFoundException("Datasource to update does not exist : " + name);
    }
    delete loadedDatasources[name];
    createDatasource(obj, true);
}

module.exports.update = updateDatasource;

/*******************************************************/
/****************** Datasources chargés ****************/
/*******************************************************/

var loadedDatasources = {};

function getDatasources () {
    var simpleDatasources = {};
    for (var d in loadedDatasources) {
        simpleDatasources[d] = loadedDatasources[d].getPersistent();
    }
    return simpleDatasources;
}



module.exports.getAll = getDatasources;

function getDatasource (dsName) {
    if (loadedDatasources.hasOwnProperty(dsName)) {
        return loadedDatasources[dsName].getPersistent();
    } else {
        return null;
    }
}

module.exports.getOne = getDatasource;

function getDatasourceObject (dsName) {
    if (loadedDatasources.hasOwnProperty(dsName)) {
        return loadedDatasources[dsName];
    } else {
        return null;
    }
}

module.exports.getObject = getDatasourceObject;

/*******************************************************/
/****************** Chargement complet *****************/
/*******************************************************/

/*
Exceptions possibles :
- BadRequestException
- ConflictException
- PostgresqlErrorException
- ConfigurationErrorException
*/
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