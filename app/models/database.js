var fs = require('fs');
var Exceptions = require('./exceptions');

var storePath;

/*******************************************************/
/************************ Modèle ***********************/
/*******************************************************/

function Database (name, type) {
    this.name = name;
    this.type = type;
}

module.exports.Model = Database;

/*******************************************************/
/********************* Méthodes CRUD *******************/
/*******************************************************/

function isValidDatabase (obj) {
    if (obj.name == null) {
        return false;
    }
    if (obj.type == null) {
        return false;
    }
    return true;
}

module.exports.isValid = isValidDatabase;

function createDatabase(obj, save) {
    if (isValidDatabase(obj)) {

        if (getDatabase(obj.name) != null) {
            throw new Exceptions.ConflictException("Provided database owns a name already used");
        }

        var db = new Database(obj.name, obj.type);
        loadedDatabases[db.name] = db;

        if (save != null && save) {
            var jsonDb = JSON.stringify(db);
            var file = storePath + "/" + db.name + ".json";
            try {
                fs.writeFileSync(file, jsonDb);            
            } catch (e) {
                throw new Exceptions.ConfigurationErrorException("Impossible to write the database file : " + file);
            }
        }

        return db;
    } else {
        throw new Exceptions.BadRequestException("Provided object cannot be cast as a database");
    }    
}

module.exports.create = createDatabase;

function deleteDatabase (name) {
    if (getDatabase(name) == null) {
        throw new Exceptions.NotFoundException("Database to delete does not exist : " + name);
    }
    loadedDatabases[name] = null;
    delete loadedDatabases[name];
    var file = storePath + "/" + name + ".json";
    try {
        fs.unlinkSync(file);
    } catch (e) {
        throw new Exceptions.ConfigurationErrorException("Impossible to remove the database file : " + file);
    }
}

module.exports.delete = deleteDatabase;

function updateDatabase (name, obj) {
    obj.name = name;
    if (getDatabase(name) == null) {
        throw new NotFoundException("Database to update does not exist : " + name);
    }

    if (isValidDatabase(obj)) {

        var db = new Database(obj.name, obj.type);
        loadedDatabases[db.name] = db;

        var jsonDb = JSON.stringify(db);
        var file = storePath + "/" + db.name + ".json";
        try {
            fs.writeFileSync(file, jsonDb);            
        } catch (e) {
            throw new Exceptions.ConfigurationErrorException("Impossible to write the database file : " + file);
        }

        return db;
    } else {
        throw new Exceptions.BadRequestException("Provided object cannot be cast as a database");
    } 
}

module.exports.update = updateDatabase;

var loadedDatabases = {};

function getDatabases () {
    return loadedDatabases;
}

module.exports.getAll = getDatabases;

function getDatabase (dbName) {
    if (loadedDatabases.hasOwnProperty(dbName)) {
        return loadedDatabases[dbName];
    } else {
        return null;
    }
}

module.exports.getOne = getDatabase;

/*******************************************************/
/****************** Chargement complet *****************/
/*******************************************************/

function loadDatabases(dir) {
    if (dir != null) storePath = dir;
    console.log("Browse databases' directory "+storePath);

    try {
        var files = fs.readdirSync(storePath);
    }
    catch (e) {
        throw new Exceptions.ConfigurationErrorException("Unable to browse databases' directory "+storePath);
    }

    loadedDatabases = null
    loadedDatabases = {};

    for (var i=0; i<files.length; i++) {
        var file = storePath + "/" + files[i];
        try{
            var db = JSON.parse(fs.readFileSync(file, 'utf8'));
            createDatabase(db, false);
        } catch (e) {
            console.log("Database file is not a valid JSON file : " + file);
            continue;
        }
    }
}

module.exports.load = loadDatabases;