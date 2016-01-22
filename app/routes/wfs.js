/* jslint node: true */

var express = require('express');
var router = express.Router();
var Exceptions = require('../models/exceptions');

var WfsService = require('../services/wfs');

router.route('/')
    .get(function(req, res) {
        // On ne gère que le 2.0.0, donc si on précise une version, ce doit être 2.0.0
        if (req.query.version !== undefined && req.query.version !== "2.0.0") {
            res.status(400).json(new Exceptions.BadRequestException("Only VERSION 2.0.0 is supported"));
        }

        // On ne gère que le WFS, donc si on précise un service, ce doit être WFS
        if (req.query.service !== undefined && req.query.service !== "2.0.0") {
            res.status(400).json(new Exceptions.BadRequestException("Only SERVICE WFS is supported"));
        }

        // Champ Request
        if (req.query.request === null) {
            res.status(400).json(new Exceptions.BadRequestException("REQUEST field have to be present"));
        }
        else if (req.query.request.toLowerCase() == "getfeature") {
            WfsService.getFeature(req, res);
        }
        else if (req.query.request.toLowerCase() == "describefeaturetype") {
            WfsService.DescribeFeatureType(req, res);
        }
        else if (req.query.request.toLowerCase() == "getcapabilities") {
            WfsService.getCapabilities(req, res);
        }
        else {
            res.status(400).json(new Exceptions.BadRequestException("Unknown REQUEST field : " + req.query.request));
        }
    });

module.exports = router;