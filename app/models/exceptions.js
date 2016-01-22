/* jslint node: true */

module.exports.ConfigurationErrorException = function ConfigurationErrorException (message) {
    this.message = message;
};

module.exports.PostgresqlErrorException = function PostgresqlErrorException (message) {
    this.message = message;
};

module.exports.MissingAttributeException = function MissingAttributeException (className, attributeName) {
    this.message = "'"+attributeName+"' is missing to instanciate '"+className+"' object";
    this.className = className;
    this.attributeName = attributeName;
};

module.exports.NotFoundException = function NotFoundException (message) {
    this.message = message;
    this.code = 404;
};

module.exports.BadRequestException = function BadRequestException (message) {
    this.message = message;
    this.code = 400;
};

module.exports.ConflictException = function ConflictException (message) {
    this.message = message;
    this.code = 409;
};