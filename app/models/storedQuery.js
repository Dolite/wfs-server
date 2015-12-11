var fs = require('fs');
var Exceptions = require('./exceptions');

var storePath;

/*******************************************************/
/************************ Modèle ***********************/
/*******************************************************/

function StoredQuery (name, request) {
    this.name = name;
    this.request = request;
}

module.exports.Model = StoredQuery;

/*******************************************************/
/********************* Méthodes CRUD *******************/
/*******************************************************/

function isValidStoredQuery (obj) {
    if (obj.name === null) {
        return "'name' is missing";
    }
    if (obj.request === null) {
        return "'request' is missing";
    }
    return null;
}

module.exports.isValid = isValidStoredQuery;

function createStoredQuery(obj, save) {
    if (isValidStoredQuery(obj) === null) {

        if (getStoredQuery(obj.name) !== null) {
            throw new Exceptions.ConflictException("Provided storedQuery owns a name already used");
        }

        var squery = new StoredQuery(obj.name, obj.request);
        loadedStoredQuerys[squery.name] = squery;

        if (save !== null && save) {
            var jsonReq = JSON.stringify(squery);
            var file = storePath + "/" + squery.name + ".json";
            try {
                fs.writeFileSync(file, jsonReq);            
            } catch (e) {
                throw new Exceptions.ConfigurationErrorException("Impossible to write the storedQuery file : " + file);
            }
        }

        return squery;
    } else {
        throw new Exceptions.BadRequestException("Provided object cannot be cast as a storedQuery : " + isValidStoredQuery(obj));
    }    
}

module.exports.create = createStoredQuery;

function deleteStoredQuery (name) {
    if (getStoredQuery(name) === null) {
        throw new Exceptions.NotFoundException("StoredQuery to delete does not exist : " + name);
    }
    loadedStoredQuerys[name] = null;
    delete loadedStoredQuerys[name];
    var file = storePath + "/" + name + ".json";
    try {
        fs.unlinkSync(file);
    } catch (e) {
        throw new Exceptions.ConfigurationErrorException("Impossible to remove the storedQuery file : " + file);
    }
}

module.exports.delete = deleteStoredQuery;

function updateStoredQuery (name, obj) {
    obj.name = name;
    if (getStoredQuery(name) === null) {
        throw new NotFoundException("StoredQuery to update does not exist : " + name);
    }

    if (isValidStoredQuery(obj) === null) {

        var squery = new StoredQuery(obj.name, obj.storedQuery);
        loadedStoredQuerys[squery.name] = squery;

        var jsonReq = JSON.stringify(squery);
        var file = storePath + "/" + squery.name + ".json";
        try {
            fs.writeFileSync(file, jsonReq);            
        } catch (e) {
            throw new Exceptions.ConfigurationErrorException("Impossible to write the storedQuery file : " + file);
        }

        return squery;
    } else {
        throw new Exceptions.BadRequestException("Provided object cannot be cast as a storedQuery : " + isValidStoredQuery(obj));
    } 
}

module.exports.update = updateStoredQuery;

var loadedStoredQuerys = {};

function getStoredQuerys () {
    return loadedStoredQuerys;
}

module.exports.getAll = getStoredQuerys;

function getStoredQuery (squeryName) {
    if (loadedStoredQuerys.hasOwnProperty(squeryName)) {
        return loadedStoredQuerys[squeryName];
    } else {
        return null;
    }
}

module.exports.getOne = getStoredQuery;

/*******************************************************/
/****************** Chargement complet *****************/
/*******************************************************/

function loadStoredQuerys(dir) {
    if (dir !== null) storePath = dir;
    console.log("Browse storedQuerys' directory "+storePath);

    var files;
    try {
        files = fs.readdirSync(storePath);
    }
    catch (e) {
        throw new Exceptions.ConfigurationErrorException("Unable to browse storedQuerys' directory "+storePath);
    }

    loadedStoredQuerys = null;
    loadedStoredQuerys = {};

    for (var i=0; i<files.length; i++) {
        var file = storePath + "/" + files[i];
        try{
            var squery = JSON.parse(fs.readFileSync(file, 'utf8'));
            createStoredQuery(squery, false);
        } catch (e) {
            console.log(e.message);
            console.log("StoredQuery file is not a valid JSON file : " + file);
            continue;
        }
    }
}

module.exports.load = loadStoredQuerys;