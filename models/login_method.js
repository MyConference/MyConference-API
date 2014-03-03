var mongoose = require('mongoose');
var dbid = require('../util/dbid.js');

var ObjectID = mongoose.Schema.Types.ObjectId;
var Mixed = mongoose.Schema.Types.Mixed;

var loginSchema = mongoose.Schema({
  '_id':  { 'type': String, 'default': dbid },

  'type': { 'type': String, 'index': true },
  'user': { 'type': String, 'index': true, 'ref': 'User' },
  'key':  { 'type': String, 'index': true },
  'data': Mixed
});

module.exports = mongoose.model('LoginMethod', loginSchema);