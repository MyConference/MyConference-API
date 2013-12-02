var mongoose = require('mongoose');
var uuid = require('node-uuid');

var userSchema = mongoose.Schema({
  '_id': { 'type': String, 'default': uuid.v4 }
});

module.exports = mongoose.model('User', userSchema);