var express = require('express');
var router = express.Router();
var Exceptions = require('../models/exceptions');

var WfsService = require('../services/wfs');

router.route('/')
    .get(function(req, res) {
        if (req.query.request == null) {
            res.status(400).json(new Exceptions.BadRequestException("REQUEST field have to be present"));
        }
        else if (req.query.request.toLowerCase() == "GetFeature".toLowerCase()) {
            WfsService.getFeature(req, res);
        }
        else if (req.query.request.toLowerCase() == "GetCapabilities".toLowerCase()) {
            WfsService.getCapabilities(req, res);
        }
        else {
            res.status(400).json(new Exceptions.BadRequestException("Unknown REQUEST field : " + req.query.request));
        }
    });

module.exports = router;