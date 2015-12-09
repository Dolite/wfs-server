var Datasource = require('../models/datasource');
var Exceptions = require('../models/exceptions');

module.exports.create = function (req, res) {
    try {
        var obj = Datasource.create(req.body, true);
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
}

module.exports.getAll = function (req, res) {
    res.status(200).json(Datasource.getAll());
}

module.exports.getOne = function (req, res) {
    var obj = Datasource.getOne(req.params.name);
    if (obj == null) {
        res.status(404).json(new Exceptions.NotFoundException("Datasource to get does not exist : " + name));
    } else {
        res.status(200).json(obj);
    }
}

module.exports.delete = function (req, res) {
    try {
        Datasource.delete(req.params.name);
        res.status(200).json();
    }
    catch (e) {
        if (e instanceof Exceptions.NotFoundException) {
            res.status(404).json(e);
        } else {
            res.status(500).json(e);
        }
    }
}

module.exports.update = function (req, res) {
    try {
        var obj = Datasource.update(req.params.name, req.body);
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
}

module.exports.getNumber = function () {
    return Object.keys(Datasource.getAll()).length;
}

module.exports.load = function (dir) {
    Datasource.load(dir);
}