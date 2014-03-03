var mongoose = require('mongoose');
var dbid = require('../util/dbid.js');

var ObjectID = mongoose.Schema.Types.ObjectId;

var applicationSchema = mongoose.Schema({
  '_id':  { 'type': String, 'default': dbid },

  'name': String,
});

module.exports = mongoose.model('Application', applicationSchema);
