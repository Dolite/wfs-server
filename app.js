/*jslint node: true */

var express = require('express');
var bodyParser = require('body-parser');
var routing = require('./app/routes/index');
var configurationService = require('./app/services/configuration');
var parseArgs = require('minimist');

/**************** Chargement de la configuration, de manière synchrone ************************/

var args = parseArgs(process.argv.slice(2),{
    string: 'file',
    alias: { f: 'file' },
    default: { file: './config/local/server.json' },
    stopEarly: true, /* populate _ with first non-option */
    unknown: function (arg) {
        console.log("ERROR : unknown argument : "+arg);
        process.exit(1);
    } /* invoked on unknown param */
});

try {
    var config = configurationService.load(args.file);
}
catch (e) {
    console.log(e.message);
    process.exit(1);
}

/**************** On configure le serveur maintenant ************************/

var port = config.server.port;
console.log('WFS server started on port ' + port);

var app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
// Case insensitive for request query
app.use(function(req, res, next) {
  for (var key in req.query)
  { 
    req.query[key.toLowerCase()] = req.query[key];
  }
  next();
});
app.use('/', routing);

var clean = function () {
    console.log('Shutdown');
    process.exit(1);
};

app.on('close',clean);
process.on('SIGINT', clean);
process.on('SIGTERM', clean);

app.listen(port);
console.log('Configurations loaded ! Server ready to be used');
