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
    /*      On sait qu'on a

        http://server.com/wfs?
        service=wfs&
        version=2.0.0&
        request=GetFeature&
    */

    /*      Reste à parser

        - Obligatoire
        typeNames=layer:table

        - Optionnel
        count=N
        featureID=X
        sortBy=attribute(+A|+D)
        propertyName=attribute1,attribute2
        srsName=CRS
        bbox=a1,b1,a2,b2
    */

    /* On identifie couche et table reqêtées */
    if (req.query.typenames == null) {
        res.status(400).json(new Exceptions.BadRequestException("For a GetFeature request, TYPENAMES field have to be present"));
    }

    var tn = req.query.typenames.split(":");
    if (tn.length != 2 || tn[0] == null || tn[1] == null) {
        res.status(400).json(new Exceptions.BadRequestException("For a GetFeature request, TYPENAMES value format have to be layer:featureType"));
    }

    var requestedLayer = Layer.getOne(tn[0]);
    if (requestedLayer == null) {
        res.status(400).json(new Exceptions.BadRequestException("Requested layer "+tn[0]+" does not exist"));
    }

    try {
        requestedLayer.getFeature(
            tn[1], req.query.count, req.query.propertyname, req.query.featureid, req.query.sortby, req.query.bbox, req.query.srsname,
            function (err, results) {
                if (err) {
                    res.status(400).json(err);
                } else {
                    res.status(200).json(results);
                }
            }
        );
    }
    catch (e) {
        if (e instanceof Exceptions.NotFoundException) {
            res.status(404).json(e);
        } else if (e instanceof Exceptions.BadRequestException) {
            res.status(400).json(e);
        } else if (e instanceof Exceptions.ConflictException) {
            res.status(409).json(e);
        }  else {
            res.status(500).json(e);
        }
    }
}