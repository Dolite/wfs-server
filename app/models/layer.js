var fs = require('fs');
var Exceptions = require('./exceptions');
var Database = require('./datasource');

var storePath;
var defaultMaxFeatureCount;

/*******************************************************/
/************************ Modèle ***********************/
/*******************************************************/

/*
Exceptions possibles :
- MissingAttributeException
- BadRequestException
*/
function Layer (obj) {

    /* Le nom du layer */
    if (! obj.hasOwnProperty('name') || obj.name === null) {
        throw new Exceptions.MissingAttributeException("Layer", "name");
    }
    this.name = obj.name;

    /* Le title du layer */
    if (! obj.hasOwnProperty('title') || obj.title === null) {
        throw new Exceptions.MissingAttributeException("Layer", "title");
    }
    this.title = obj.title;

    /* La source du layer */
    if (! obj.hasOwnProperty('source') || obj.source === null) {
        throw new Exceptions.MissingAttributeException("Layer", "source");
    }
    var ds = Database.getObject(obj.source);
    if (ds === null) {
        throw new Exceptions.BadRequestException("'source' is not an existing datasource name : "+obj.source);
    }
    this.source = ds;

    /* La liste des feature type du layer */
    if (! obj.hasOwnProperty('featureTypes') || obj.featureTypes === null) {
        throw new Exceptions.MissingAttributeException("Layer", "featureTypes");
    }

    if (! Array.isArray(obj.featureTypes) || obj.featureTypes.length === 0) {
        throw new Exceptions.BadRequestException("'Datasource.featureTypes' is missing or is not a not empty array");
    }
    for (var i=0; i<obj.featureTypes.length; i++) {
        if (! this.source.ownFeatureType(obj.featureTypes[i])) {
            throw new Exceptions.BadRequestException("Table '"+obj.featureTypes[i]+"' is not available in the datasource "+obj.source);
        }
    }
    this.featureTypes = Array.from(obj.featureTypes);

    if (obj.maxFeatureCount === null) obj.maxFeatureCount = defaultMaxFeatureCount;
    this.maxFeatureCount = obj.maxFeatureCount;
}


Layer.prototype.getFeature = function(requestedFeatureType, max, properties, objId, sort, bbox, srs, callback) {
    if (this.featureTypes.indexOf(requestedFeatureType) == -1) {
        throw new Exceptions.BadRequestException("Requested feature type '"+requestedFeatureType+"' does not exist for the layer '" + this.name + "'");
    }

    if (! this.source.ownFeatureType(requestedFeatureType)) {
        throw new Exceptions.BadRequestException("Requested feature type '"+requestedFeatureType+"' does not exist for the datasource '" + this.source.name + "'");
    }

    /* On determine le maxFeatureCount : celui par défaut ou celui dans la requête */
    if (max === undefined || (! isNaN(parseFloat(max)) && isFinite(max))) {
        max = this.maxFeatureCount;
    }

    console.log([requestedFeatureType, max, properties, objId, sort, bbox, srs]);

    if (objId !== undefined) {
        console.log("getFeatureById");
        this.source.getFeatureById(requestedFeatureType, properties, objId, callback);  
    }
    else if (bbox !== undefined && srs !== undefined) {
        console.log("getFeatureByBbox");
        this.source.getFeatureByBbox(requestedFeatureType, max, properties, sort, bbox, srs, callback);
    }
    else {
        console.log("getFeature");
        this.source.getFeature(requestedFeatureType, max, properties, sort, callback);
    }    
};

Layer.prototype.getPersistent = function() {
    var obj = {
        "name":this.name,
        "title":this.title,
        "source":this.source.name,
        "featureTypes":this.featureTypes,
        "maxFeatureCount":this.maxFeatureCount
    };
    return obj;
};

//module.exports.Layer = Layer;

/*******************************************************/
/********************* Méthodes CRUD *******************/
/*******************************************************/

/*
Exceptions possibles :
- MissingAttributeException
- ConflictException
- MissingAttributeException
- ConfigurationErrorException
*/
function createLayer(obj, save) {

    var lay = new Layer(obj);
    if (getLayer(lay.name) !== null) {
        throw new Exceptions.ConflictException("Provided layer owns a name already used : " + obj.name);
    }
    loadedLayers[lay.name] = lay;

    if (save !== null && save) {
        var jsonLay = JSON.stringify(lay.getPersistent());
        var file = storePath + "/" + lay.name + ".json";
        try {
            fs.writeFileSync(file, jsonLay);            
        } catch (e) {
            throw new Exceptions.ConfigurationErrorException("Impossible to write the layer file : " + file);
        }
    }

    return lay;  
}

module.exports.create = createLayer;

/*
Exceptions possibles :
- NotFoundException
- ConfigurationErrorException
*/
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

/*
Exceptions possibles :
- MissingAttributeException
- ConflictException
- NotFoundException
- MissingAttributeException
- ConfigurationErrorException
*/
function updateLayer (name, obj) {
    obj.name = name;
    if (getLayer(name) === null) {
        throw new Exceptions.NotFoundException("Layer to update does not exist : " + name);
    }
    delete loadedLayers[name];
    createLayer(obj, true);
}

module.exports.update = updateLayer;

/*******************************************************/
/******************** Layers chargés *******************/
/*******************************************************/

var loadedLayers = {};

function getLayers () {
    var simpleLayers = {};
    for (var l in loadedLayers) {
        simpleLayers[l] = loadedLayers[l].getPersistent();
    }
    return simpleLayers;
}

module.exports.getAll = getLayers;

function getLayer (layerName) {
    if (loadedLayers.hasOwnProperty(layerName)) {
        return loadedLayers[layerName].getPersistent();
    } else {
        return null;
    }
}
module.exports.getOne = getLayer;

function getLayerObject (layerName) {
    if (loadedLayers.hasOwnProperty(layerName)) {
        return loadedLayers[layerName];
    } else {
        return null;
    }
}

module.exports.getObject = getLayerObject;

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