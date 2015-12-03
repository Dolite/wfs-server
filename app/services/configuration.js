var LayerService = require('../services/layer');
var DatabaseService = require('../services/database');
var RequestService = require('../services/request');
var Exceptions = require('../models/exceptions');
var fs = require('fs');

function load (file) {

    file = process.cwd()+"/"+file

    try {
        fs.statSync(file);
    } catch (e) {
        throw new Exceptions.ConfigurationErrorException("Configuration file does not exist : " + file);
    }

    console.log("Loading server configuration from file " + file);

    try{
        var config = JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch (e) {
        throw new Exceptions.ConfigurationErrorException("Configuration file is not a valid JSON file : " + file);
    }

    if (config.server.port == null || isNaN(new Number(config.server.port))) {
        throw new Exceptions.ConfigurationErrorException("Port have to be provided in the configuration file (server / port) and have to be an integer : " + file);
    }

    if (config.config.layersDir == null) {
        throw new Exceptions.ConfigurationErrorException("Layers' directory have to be provided in the configuration file (config / layersDir) : " + file);
    }

    if (config.config.databasesDir == null) {
        throw new Exceptions.ConfigurationErrorException("Databases' directory have to be provided in the configuration file (config / databasesDir) : " + file);   
    }

    if (config.config.requestsDir == null) {
        throw new Exceptions.ConfigurationErrorException("Requests' directory have to be provided in the configuration file (config / requestsDir) : " + file);   
    }

    try {
        DatabaseService.load(config.config.databasesDir);
        console.log(DatabaseService.getNumber() + " database(s) loaded");
        LayerService.load(config.config.layersDir);
        console.log(LayerService.getNumber() + " layer(s) loaded");
        RequestService.load(config.config.requestsDir);
        console.log(RequestService.getNumber() + " request(s) loaded");
    }
    catch (e) {
        throw e;
    }


    return config;
}

module.exports.load = load;
