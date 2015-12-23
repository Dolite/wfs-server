var Exceptions = require('../models/exceptions');
var fs = require('fs');
var jade = require('jade');
var Layer = require('../models/layer');
var ConfigurationService = require('./configuration');

// On charge le template Jade pour le GetCapabilities
var gcTemplate;
try{
    var gcTmpl = fs.readFileSync("./app/templates/getCapabilities.jade", 'utf8');
    gcTemplate = jade.compile(gcTmpl);
} catch (e) {
    console.error(e.message);
    process.exit(1);
}

module.exports.getCapabilities = function (req, res) {

    var layers = Layer.getAll();
    var featureTypesList = [];
    for (var l in layers) {
        var lay = Layer.getObject(l);
        for (var i = 0; i < lay.featureTypes.length; i++) {
            var ft = lay.featureTypes[i];
            var infos = lay.source.connector.getFeatureTypeInformations(ft);
            if (infos === null) continue;

            var ftInfos = {};

            ftInfos.name = l+":"+ft;
            ftInfos.title = lay.title+": "+ft;

            if (infos.hasOwnProperty("geometry")) {
                ftInfos.srs = "urn:ogc:def:crs:EPSG::"+infos.geometry.srid;
                ftInfos.upperCorner = infos.geometry.bboxWgs84g[2]+" "+infos.geometry.bboxWgs84g[3];
                ftInfos.lowerCorner = infos.geometry.bboxWgs84g[0]+" "+infos.geometry.bboxWgs84g[1];
            }

            featureTypesList.push(ftInfos);
        }
    }

    var xmlContent = gcTemplate({
        layers: featureTypesList,
        url: "http://localhost:" + ConfigurationService.getPort() + "/wfs",
        max: ConfigurationService.getDefaultMax()
    });

    res.set('Content-Type', 'application/xml; charset=utf-8').status(200).send(xmlContent);
};

module.exports.DescribeFeatureType = function (req, res) {
    /*      On sait qu'on a

        http://server.com/wfs?
        service=wfs&
        version=2.0.0&
        request=DescribeFeatureType&
    */
};


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

    /* On identifie couche et table requêtées */
    if (! req.query.hasOwnProperty("typenames") || req.query.typenames === null) {
        res.status(400).json(new Exceptions.BadRequestException("For a GetFeature request, TYPENAMES field have to be present"));
    }

    var tn = req.query.typenames.split(":");
    if (tn.length != 2 || tn[0] === null || tn[1] === null) {
        res.status(400).json(new Exceptions.BadRequestException("For a GetFeature request, TYPENAMES value format have to be layer:featureType"));
    }

    var requestedLayer = Layer.getObject(tn[0]);
    if (requestedLayer === null) {
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
};