var fs = require('fs');
var Exceptions = require('./exceptions');
var Database = require('./datasource')

var storePath;
var defaultMaxFeatureCount;

/*******************************************************/
/************************ Modèle ***********************/
/*******************************************************/

function Layer (name, source, tables, max) {
    this.name = name;
    
    this.source = source;

    if (max == null) max = defaultMaxFeatureCount;
    this.maxFeatureCount = max;

    this.tables = Array.from(tables);
}

module.exports.Layer = Layer;

/*******************************************************/
/********************* Méthodes CRUD *******************/
/*******************************************************/

function isValidLayer (obj) {
    if (obj.name == null) {
        return false;
    }
    if (obj.source == null) {
        return false;
    }
    if (obj.tables == null || ! Array.isArray(obj.tables) || obj.tables.length == 0) {
        return false;
    }
    if (Database.getOne(obj.source) == null) {
        return false;
    }
    return true;
}

module.exports.isValid = isValidLayer;

function createLayer(obj, save) {
    if (isValidLayer(obj)) {

        if (getLayer(obj.name) != null) {
            throw new Exceptions.ConflictException("Provided layer owns a name already used");
        }

        var lay = new Layer(obj.name, obj.source, obj.tables, obj.maxFeatureCount);
        loadedLayers[lay.name] = lay;

        if (save != null && save) {
            var jsonLay = JSON.stringify(lay);
            var file = storePath + "/" + lay.name + ".json";
            try {
                fs.writeFileSync(file, jsonLay);            
            } catch (e) {
                throw new Exceptions.ConfigurationErrorException("Impossible to write the layer file : " + file);
            }
        }

        return lay;
    } else {
        throw new Exceptions.BadRequestException("Provided object cannot be cast as a layer");
    }    
}

module.exports.create = createLayer;

function deleteLayer (name) {
    if (getLayer(name) == null) {
        throw new Exceptions.NotFoundException("Layer to delete does not exist : " + name);
    }
    loadedLayers[name] = null;
    delete loadedLayers[name];
    var file = storePath + "/" + name + ".json";
    try {
        fs.unlinkSync(file);
    } catch (e) {
        throw new Exceptions.ConfigurationErrorException("Impossible to remove the layer file : " + file);
    }
}

module.exports.delete = deleteLayer;

function updateLayer (name, obj) {
    obj.name = name;
    if (getLayer(name) == null) {
        throw new NotFoundException("Layer to update does not exist : " + name);
    }

    if (isValidLayer(obj)) {

        var lay = new Layer(obj.name, obj.source, obj.tables, obj.maxFeatureCount);
        loadedLayers[lay.name] = lay;

        var jsonLay = JSON.stringify(lay);
        var file = storePath + "/" + lay.name + ".json";
        try {
            fs.writeFileSync(file, jsonLay);            
        } catch (e) {
            throw new Exceptions.ConfigurationErrorException("Impossible to write the layer file : " + file);
        }

        return lay;
    } else {
        throw new Exceptions.BadRequestException("Provided object cannot be cast as a layer");
    } 
}

module.exports.update = updateLayer;

var loadedLayers = {};

function getLayers () {
    return loadedLayers;
}

module.exports.getAll = getLayers;

function getLayer (layerName) {
    if (loadedLayers.hasOwnProperty(layerName)) {
        return loadedLayers[layerName];
    } else {
        return null;
    }
}
module.exports.getOne = getLayer;

/*******************************************************/
/****************** Chargement complet *****************/
/*******************************************************/

function loadLayers(dir, max) {
    if (dir != null) storePath = dir;
    if (max != null) defaultMaxFeatureCount = max;

    console.log("Browse layers' directory "+storePath);

    try {
        var files = fs.readdirSync(storePath);
    }
    catch (e) {
        throw new Exceptions.ConfigurationErrorException("Unable to browse layers' directory "+storePath);
    }

    loadedLayers = null
    loadedLayers = {};

    for (var i=0; i<files.length; i++) {
        var file = storePath + "/" + files[i];
        try{
            var lay = JSON.parse(fs.readFileSync(file, 'utf8'));
            createLayer(lay, false);
        } catch (e) {
            console.log("Layer file is not a valid JSON file : " + file);
            continue;
        }
    }
}

module.exports.load = loadLayers;