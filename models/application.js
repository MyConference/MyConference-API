var mongoose = require('mongoose');
var uuid = require('node-uuid');

var ObjectID = mongoose.Schema.Types.ObjectId;

var applicationSchema = mongoose.Schema({
  '_id':  { 'type': String, 'default': uuid.v4 },

  'name': String,
});

module.exports = mongoose.model('Application', applicationSchema);