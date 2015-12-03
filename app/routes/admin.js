var express = require('express');
var router = express.Router();

var LayerService = require('../services/layer');
var DatabaseService = require('../services/database');
var RequestService = require('../services/request');

router.route('/reload')
    .put(function(req, res) {
        console.log("Reload configuration");
        try {
            DatabaseService.load();
            LayerService.load();
            RequestService.load();

            res.status(200).json({
                "message" : "Reload OK",
                "databases" : DatabaseService.getNumber(),
                "layers" : LayerService.getNumber(),
                "requests" : RequestService.getNumber()
            });
        }
        catch (e) {
            res.status(500).json(e);
        }
    });

/* LAYER */
router.route('/layer')
    .get(function(req, res) {
        console.log("Getting all layers");
        LayerService.getAll(req, res);
    })
    .post(function(req, res) {
        console.log("Create new layer");
        LayerService.create(req, res);
    });
router.route('/layer/:name')
    .get(function(req, res) {
        console.log("Get layer " + req.params.name);
        LayerService.getOne(req, res);
    })
    .put(function(req, res) {
        console.log("Update layer " + req.params.name);
        LayerService.update(req, res);
    })
    .delete(function(req, res) {
        console.log("Delete layer " + req.params.name);
        LayerService.delete(req, res);
    });

/* DATABASE */
router.route('/database')
    .get(function(req, res) {
        console.log("Getting all databases");
        DatabaseService.getAll(req, res);
    })
    .post(function(req, res) {
        console.log("Create new database");
        DatabaseService.create(req, res);
    });
router.route('/database/:name')
    .get(function(req, res) {
        console.log("Get database " + req.params.name);
        DatabaseService.getOne(req, res);
    })
    .put(function(req, res) {
        console.log("Update database " + req.params.name);
        DatabaseService.update(req, res);
    })
    .delete(function(req, res) {
        console.log("Delete database " + req.params.name);
        DatabaseService.delete(req, res);
    });

/* REQUEST */
router.route('/request')
    .get(function(req, res) {
        console.log("Getting all requests");
        RequestService.getAll(req, res);
    })
    .post(function(req, res) {
        console.log("Create new request");
        RequestService.create(req, res);
    });
router.route('/request/:name')
    .get(function(req, res) {
        console.log("Get request " + req.params.name);
        RequestService.getOne(req, res);
    })
    .put(function(req, res) {
        console.log("Update request " + req.params.name);
        RequestService.update(req, res);
    })
    .delete(function(req, res) {
        console.log("Delete request " + req.params.name);
        RequestService.delete(req, res);
    });

module.exports = router;