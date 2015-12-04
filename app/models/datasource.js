var fs = require('fs');
var Exceptions = require('./exceptions');

var storePath;

/*******************************************************/
/************************ Modèle ***********************/
/*******************************************************/

function Datasource (name, type) {
    this.name = name;
    this.type = type;
}

module.exports.Model = Datasource;

/*******************************************************/
/********************* Méthodes CRUD *******************/
/*******************************************************/

function isValidDatasource (obj) {
    if (obj.name == null) {
        return false;
    }
    if (obj.type == null) {
        return false;
    }
    return true;
}

module.exports.isValid = isValidDatasource;

function createDatasource(obj, save) {
    if (isValidDatasource(obj)) {

        if (getDatasource(obj.name) != null) {
            throw new Exceptions.ConflictException("Provided datasource owns a name already used");
        }

        var ds = new Datasource(obj.name, obj.type);
        loadedDatasources[ds.name] = ds;

        if (save != null && save) {
            var jsonDb = JSON.stringify(ds);
            var file = storePath + "/" + ds.name + ".json";
            try {
                fs.writeFileSync(file, jsonDb);            
            } catch (e) {
                throw new Exceptions.ConfigurationErrorException("Impossible to write the datasource file : " + file);
            }
        }

        return ds;
    } else {
        throw new Exceptions.BadRequestException("Provided object cannot be cast as a datasource");
    }    
}

module.exports.create = createDatasource;

function deleteDatasource (name) {
    if (getDatasource(name) == null) {
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
    if (getDatasource(name) == null) {
        throw new NotFoundException("Datasource to update does not exist : " + name);
    }

    if (isValidDatasource(obj)) {

        var ds = new Datasource(obj.name, obj.type);
        loadedDatasources[ds.name] = ds;

        var jsonDb = JSON.stringify(ds);
        var file = storePath + "/" + ds.name + ".json";
        try {
            fs.writeFileSync(file, jsonDb);            
        } catch (e) {
            throw new Exceptions.ConfigurationErrorException("Impossible to write the datasource file : " + file);
        }

        return ds;
    } else {
        throw new Exceptions.BadRequestException("Provided object cannot be cast as a datasource");
    } 
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
    if (dir != null) storePath = dir;
    console.log("Browse datasources' directory "+storePath);

    try {
        var files = fs.readdirSync(storePath);
    }
    catch (e) {
        throw new Exceptions.ConfigurationErrorException("Unable to browse datasources' directory "+storePath);
    }

    loadedDatasources = null
    loadedDatasources = {};

    for (var i=0; i<files.length; i++) {
        var file = storePath + "/" + files[i];
        try{
            var ds = JSON.parse(fs.readFileSync(file, 'utf8'));
            createDatasource(ds, false);
        } catch (e) {
            console.log("Datasource file is not a valid JSON file : " + file);
            continue;
        }
    }
}

module.exports.load = loadDatasources;