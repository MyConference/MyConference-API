var async = require('async');

var mongo  = require('./mongo.js');
var server = require('./server.js');


module.exports.before = function (done) {
  server.start(done);
}

module.exports.beforeEach = function (done) {
  this.timeout(5000);
  mongo.start(done);
}

module.exports.after = function (done) {
  server.stop(done);
}

module.exports.afterEach = function (done) {
  mongo.stop(done);
}