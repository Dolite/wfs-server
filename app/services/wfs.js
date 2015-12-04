var Exceptions = require('../models/exceptions');
var Layer = require('../models/layer');

module.exports.getCapabilities = function (req, res) {

    var gc = {};
    gc.version = "2.0.0";
    var layers = Layer.getAll();
    var layersGC = [];
    for (var layerName in layers) {
        var tables = layers[layerName].tables;
        layersGC.push({"tables":tables, "layerName":layerName, "title":"Titre de "+layerName, "maxFeatureCount":layers[layerName].maxFeatureCount});
    }
    gc.layers = layersGC;
    res.status(200).json(gc);
}

module.exports.getFeature = function (req, res) {
    /*
        http://server.com/wfs?
        service=wfs&
        version=2.0.0&
        request=GetFeature&
        typeNames=layer:table
    */
    res.status(200).json({"message":"pas d'objet'"});
}