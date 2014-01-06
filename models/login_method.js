var mongoose = require('mongoose');
var uuid = require('node-uuid');

var ObjectID = mongoose.Schema.Types.ObjectId;
var Mixed = mongoose.Schema.Types.Mixed;

var loginSchema = mongoose.Schema({
  '_id':  { 'type': String, 'default': uuid.v4 },

  'type': { 'type': String, 'index': true },
  'user': { 'type': String, 'index': true, 'ref': 'User' },
  'key':  { 'type': String, 'index': true },
  'data': Mixed
});

module.exports = mongoose.model('LoginMethod', loginSchema);