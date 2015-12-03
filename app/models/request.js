var fs = require('fs');
var Exceptions = require('./exceptions');

var storePath;

/*******************************************************/
/************************ Modèle ***********************/
/*******************************************************/

function Request (name, request) {
    this.name = name;
    this.request = request;
}

module.exports.Model = Request;

/*******************************************************/
/********************* Méthodes CRUD *******************/
/*******************************************************/

function isValidRequest (obj) {
    if (obj.name == null) {
        return false;
    }
    if (obj.request == null) {
        return false;
    }
    return true;
}

module.exports.isValid = isValidRequest;

function createRequest(obj, save) {
    if (isValidRequest(obj)) {

        if (getRequest(obj.name) != null) {
            throw new Exceptions.ConflictException("Provided request owns a name already used");
        }

        var req = new Request(obj.name, obj.request);
        loadedRequests[req.name] = req;

        if (save != null && save) {
            var jsonReq = JSON.stringify(req);
            var file = storePath + "/" + req.name + ".json";
            try {
                fs.writeFileSync(file, jsonReq);            
            } catch (e) {
                throw new Exceptions.ConfigurationErrorException("Impossible to write the request file : " + file);
            }
        }

        return req;
    } else {
        throw new Exceptions.BadRequestException("Provided object cannot be cast as a request");
    }    
}

module.exports.create = createRequest;

function deleteRequest (name) {
    if (getRequest(name) == null) {
        throw new Exceptions.NotFoundException("Request to delete does not exist : " + name);
    }
    loadedRequests[name] = null;
    delete loadedRequests[name];
    var file = storePath + "/" + name + ".json";
    try {
        fs.unlinkSync(file);
    } catch (e) {
        throw new Exceptions.ConfigurationErrorException("Impossible to remove the request file : " + file);
    }
}

module.exports.delete = deleteRequest;

function updateRequest (name, obj) {
    obj.name = name;
    if (getRequest(name) == null) {
        throw new NotFoundException("Request to update does not exist : " + name);
    }

    if (isValidRequest(obj)) {

        var req = new Request(obj.name, obj.request);
        loadedRequests[req.name] = req;

        var jsonReq = JSON.stringify(req);
        var file = storePath + "/" + req.name + ".json";
        try {
            fs.writeFileSync(file, jsonReq);            
        } catch (e) {
            throw new Exceptions.ConfigurationErrorException("Impossible to write the request file : " + file);
        }

        return req;
    } else {
        throw new Exceptions.BadRequestException("Provided object cannot be cast as a request");
    } 
}

module.exports.update = updateRequest;

var loadedRequests = {};

function getRequests () {
    return loadedRequests;
}

module.exports.getAll = getRequests;

function getRequest (reqName) {
    if (loadedRequests.hasOwnProperty(reqName)) {
        return loadedRequests[reqName];
    } else {
        return null;
    }
}

module.exports.getOne = getRequest;

/*******************************************************/
/****************** Chargement complet *****************/
/*******************************************************/

function loadRequests(dir) {
    if (dir != null) storePath = dir;
    console.log("Browse requests' directory "+storePath);

    try {
        var files = fs.readdirSync(storePath);
    }
    catch (e) {
        throw new Exceptions.ConfigurationErrorException("Unable to browse requests' directory "+storePath);
    }

    loadedRequests = null
    loadedRequests = {};

    for (var i=0; i<files.length; i++) {
        var file = storePath + "/" + files[i];
        try{
            var req = JSON.parse(fs.readFileSync(file, 'utf8'));
            createRequest(req, false);
        } catch (e) {
            console.log("Request file is not a valid JSON file : " + file);
            continue;
        }
    }
}

module.exports.load = loadRequests;