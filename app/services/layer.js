/*global
    exports, global, module, process, require, console
*/

var Layer = require('../models/layer');
var Exceptions = require('../models/exceptions');

module.exports.create = function (req, res) {
    try {
        var obj = Layer.create(req.body, true);
        res.status(200).json(obj);
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

module.exports.getAll = function (req, res) {
    res.status(200).json(Layer.getAll());
};

module.exports.getOne = function (req, res) {
    var obj = Layer.getOne(req.params.name);
    if (obj === null) {
        res.status(404).json(new Exceptions.NotFoundException("Layer to get does not exist : " + req.params.name));
    } else {
        res.status(200).json(obj);
    }
};

module.exports.delete = function (req, res) {
    try {
        Layer.delete(req.params.name);
        res.status(200).json();
    }
    catch (e) {
        if (e instanceof Exceptions.NotFoundException) {
            res.status(404).json(e);
        } else {
            res.status(500).json(e);
        }
    }
};

module.exports.update = function (req, res) {
    try {
        var obj = Layer.update(req.params.name, req.body);
        res.status(200).json(obj);
    }
    catch (e) {
        if (e instanceof Exceptions.NotFoundException) {
            res.status(404).json(e);
        } else if (e instanceof Exceptions.BadRequestException) {
            res.status(400).json(e);
        } else {
            res.status(500).json(e);
        }
    }
};

module.exports.getNumber = function () {
    return Object.keys(Layer.getAll()).length;
};

module.exports.load = function (dir, max) {
    Layer.load(dir, max);
};