var StoredQuery = require('../models/storedQuery');
var Exceptions = require('../models/exceptions');

module.exports.create = function (req, res) {
    try {
        var obj = StoredQuery.create(req.body, true);
        res.status(200).json(obj);
    }
    catch (e) {
        if (e instanceof Exceptions.NotFoundException) {
            res.status(404).json(e);
        } else if (e instanceof Exceptions.BadStoredQueryException) {
            res.status(400).json(e);
        } else if (e instanceof Exceptions.ConflictException) {
            res.status(409).json(e);
        }  else {
            res.status(500).json(e);
        }
    }
};

module.exports.getAll = function (req, res) {
    res.status(200).json(StoredQuery.getAll());
};

module.exports.getOne = function (req, res) {
    var obj = StoredQuery.getOne(req.params.name);
    if (obj === null) {
        res.status(404).json(new Exceptions.NotFoundException("StoredQuery to get does not exist : " + name));
    } else {
        res.status(200).json(obj);
    }
};

module.exports.delete = function (req, res) {
    try {
        StoredQuery.delete(req.params.name);
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
        var obj = StoredQuery.update(req.params.name, req.body);
        res.status(200).json(obj);
    }
    catch (e) {
        if (e instanceof Exceptions.NotFoundException) {
            res.status(404).json(e);
        } else if (e instanceof Exceptions.BadStoredQueryException) {
            res.status(400).json(e);
        } else {
            res.status(500).json(e);
        }
    }
};

module.exports.getNumber = function () {
    return Object.keys(StoredQuery.getAll()).length;
};

module.exports.load = function (dir) {
    StoredQuery.load(dir);
};