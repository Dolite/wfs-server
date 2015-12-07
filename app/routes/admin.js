var express = require('express');
var router = express.Router();

var LayerService = require('../services/layer');
var DatasourceService = require('../services/datasource');
var StoredQueryService = require('../services/storedQuery');

router.route('/reload')
    .put(function(req, res) {
        console.log("Reload configuration");
        try {
            DatasourceService.load();
            LayerService.load();
            StoredQueryService.load();

            res.status(200).json({
                "message" : "Reload OK",
                "datasources" : DatasourceService.getNumber(),
                "layers" : LayerService.getNumber(),
                "requests" : StoredQueryService.getNumber()
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

/* DATASOURCE */
router.route('/datasource')
    .get(function(req, res) {
        console.log("Getting all datasources");
        DatasourceService.getAll(req, res);
    })
    .post(function(req, res) {
        console.log("Create new datasource");
        DatasourceService.create(req, res);
    });
router.route('/datasource/:name')
    .get(function(req, res) {
        console.log("Get datasource " + req.params.name);
        DatasourceService.getOne(req, res);
    })
    .put(function(req, res) {
        console.log("Update datasource " + req.params.name);
        DatasourceService.update(req, res);
    })
    .delete(function(req, res) {
        console.log("Delete datasource " + req.params.name);
        DatasourceService.delete(req, res);
    });

/* QUERY */
router.route('/query')
    .get(function(req, res) {
        console.log("Getting all stored requests");
        StoredQueryService.getAll(req, res);
    })
    .post(function(req, res) {
        console.log("Create new stored query");
        StoredQueryService.create(req, res);
    });
router.route('/query/:name')
    .get(function(req, res) {
        console.log("Get stored query " + req.params.name);
        StoredQueryService.getOne(req, res);
    })
    .put(function(req, res) {
        console.log("Update stored query " + req.params.name);
        StoredQueryService.update(req, res);
    })
    .delete(function(req, res) {
        console.log("Delete stored query " + req.params.name);
        StoredQueryService.delete(req, res);
    });

module.exports = router;