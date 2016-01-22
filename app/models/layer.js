var fs = require('fs');
var Exceptions = require('./exceptions');
var Database = require('./datasource');

var storePath;
var defaultMaxFeatureCount;

/*******************************************************/
/************************ Modèle ***********************/
/*******************************************************/

function Layer (name, sourceName, tables, max) {
    this.name = name;
    
    this.source = Database.getOne(sourceName);

    if (max === null) max = defaultMaxFeatureCount;
    this.maxFeatureCount = max;

    this.tables = Array.from(tables);
}


Layer.prototype.getFeature = function(requestedTable, max, properties, objId, sort, bbox, srs, callback) {
    if (this.tables.indexOf(requestedTable) == -1) {
        throw new Exceptions.BadRequestException("Requested feature type '"+requestedTable+"' does not exist for the layer '" + this.name + "'");
    }

    if (! this.source.ownTable(requestedTable)) {
        throw new Exceptions.BadRequestException("Requested feature type '"+requestedTable+"' does not exist for the datasource '" + this.source.name + "'");
    }

    /* On determine le maxFeatureCount : celui par défaut ou celui dans la requête */
    if (max === null || (! isNaN(parseFloat(max)) && isFinite(max))) {
        max = this.maxFeatureCount;
    }

    if (objId !== null) {
        console.log("getFeatureById");
        this.source.getFeatureById(requestedTable, properties, objId, callback);  
    }
    else if (bbox !== null && srs !== null) {
        console.log("getFeatureByBbox");
        this.source.getFeatureByBbox(requestedTable, max, properties, sort, bbox, srs, callback);
    }
    else {
        console.log("getFeature");
        this.source.getFeature(requestedTable, max, properties, sort, callback);
    }    
};

//module.exports.Layer = Layer;

/*******************************************************/
/********************* Méthodes CRUD *******************/
/*******************************************************/

function isValidLayer (obj) {

    if (obj.name === null) {
        return "'name' is missing";
    }
    if (obj.source === null) {
        return "'source' is missing";
    }
    if (Database.getOne(obj.source) === null) {
        return "'source' is not an existing datasource name : "+obj.source;
    }
    if (obj.tables === null || ! Array.isArray(obj.tables) || obj.tables.length === 0) {
        return "'tables' is missing or is not a not empty array";
    }
    for (var i=0; i<obj.tables.length; i++) {
        if (! Database.getOne(obj.source).ownTable(obj.tables[i])) {
            return "Table '"+obj.tables[i]+"' is not available in the datasource "+obj.source;
        }
    } 
    

    return null;
}


module.exports.isValid = isValidLayer;

function createLayer(obj, save) {
    if (isValidLayer(obj) === null) {

        if (getLayer(obj.name) !== null) {
            throw new Exceptions.ConflictException("Provided layer owns a name already used");
        }

        var lay = new Layer(obj.name, obj.source, obj.tables, obj.maxFeatureCount);
        loadedLayers[lay.name] = lay;

        if (save !== null && save) {
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
        throw new Exceptions.BadRequestException("Provided object cannot be cast as a layer : " + isValidLayer(obj));
    }    
}

module.exports.create = createLayer;

function deleteLayer (name) {
    if (getLayer(name) === null) {
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
    if (getLayer(name) === null) {
        throw new NotFoundException("Layer to update does not exist : " + name);
    }

    if (isValidLayer(obj) === null) {

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
        throw new Exceptions.BadRequestException("Provided object cannot be cast as a layer : " + isValidLayer(obj));
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
    if (dir !== null) storePath = dir;
    if (max !== null) defaultMaxFeatureCount = max;

    console.log("Browse layers' directory "+storePath);

    var files;
    try {
        files = fs.readdirSync(storePath);
    }
    catch (e) {
        throw new Exceptions.ConfigurationErrorException("Unable to browse layers' directory "+storePath);
    }

    loadedLayers = null;
    loadedLayers = {};

    for (var i=0; i<files.length; i++) {
        var file = storePath + "/" + files[i];
        try{
            var lay = JSON.parse(fs.readFileSync(file, 'utf8'));
            createLayer(lay, false);
        } catch (e) {
            console.log(e.message);
            console.log("Layer file is not a valid JSON file : " + file);
            continue;
        }
    }
}

module.exports.load = loadLayers;