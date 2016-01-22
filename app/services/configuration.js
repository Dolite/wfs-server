var LayerService = require('../services/layer');
var DatasourceService = require('../services/datasource');
var StoredQueryService = require('../services/storedQuery');
var Exceptions = require('../models/exceptions');
var fs = require('fs');

function load (file) {

    file = process.cwd()+"/"+file;

    try {
        fs.statSync(file);
    } catch (e) {
        throw new Exceptions.ConfigurationErrorException("Configuration file does not exist : " + file);
    }

    console.log("Loading server configuration from file " + file);

    var config;
    try{
        config = JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch (e) {
        throw new Exceptions.ConfigurationErrorException("Configuration file is not a valid JSON file : " + file);
    }

    if (config.server.port === null || isNaN(parseFloat(config.server.port)) || ! isFinite(config.server.port)) {
        throw new Exceptions.ConfigurationErrorException("Port have to be provided in the configuration file (server / port) and have to be an integer : " + file);
    }

    if (config.config.layersDir === null) {
        throw new Exceptions.ConfigurationErrorException("Layers' directory have to be provided in the configuration file (config / layersDir) : " + file);
    }

    if (config.config.datasourcesDir === null) {
        throw new Exceptions.ConfigurationErrorException("Datasources' directory have to be provided in the configuration file (config / datasourcesDir) : " + file);   
    }

    if (config.config.storedQuerysDir === null) {
        throw new Exceptions.ConfigurationErrorException("Stored Query' directory have to be provided in the configuration file (config / storedQuerysDir) : " + file);   
    }

    if (config.service.maxFeatureCount === null) {
        console.log("No default maxFeatureCount defined in 'service' section : it will be 500");
        config.service.maxFeatureCount = 500;   
    }

    try {
        DatasourceService.load(config.config.datasourcesDir);
        console.log(DatasourceService.getNumber() + " datasource(s) loaded");
        LayerService.load(config.config.layersDir, config.service.maxFeatureCount);
        console.log(LayerService.getNumber() + " layer(s) loaded");
        StoredQueryService.load(config.config.storedQuerysDir);
        console.log(StoredQueryService.getNumber() + " stored querie(s) loaded");
    }
    catch (e) {
        throw e;
    }


    return config;
}

module.exports.load = load;
