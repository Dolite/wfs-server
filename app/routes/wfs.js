var express = require('express');
var router = express.Router();
var Exceptions = require('../models/exceptions');

var WfsService = require('../services/wfs');

router.route('/')
    .get(function(req, res) {
        // On ne gère que le 2.0.0
        if (req.query.version === null) {
            res.status(400).json(new Exceptions.BadRequestException("VERSION field have to be present"));
        }
        if (req.query.version != "2.0.0") {
            res.status(400).json(new Exceptions.BadRequestException("Only VERSION 2.0.0 is handled"));
        }

        // Service WFS obligé
        if (req.query.service === null) {
            res.status(400).json(new Exceptions.BadRequestException("SERVICE field have to be present"));
        }
        if (req.query.service.toLowerCase() != "wfs") {
            res.status(400).json(new Exceptions.BadRequestException("Only SERVICE WFS is handled"));
        }

        // Champ Request
        if (req.query.request === null) {
            res.status(400).json(new Exceptions.BadRequestException("REQUEST field have to be present"));
        }
        else if (req.query.request.toLowerCase() == "getfeature") {
            WfsService.getFeature(req, res);
        }
        else if (req.query.request.toLowerCase() == "getcapabilities") {
            WfsService.getCapabilities(req, res);
        }
        else {
            res.status(400).json(new Exceptions.BadRequestException("Unknown REQUEST field : " + req.query.request));
        }
    });

module.exports = router;