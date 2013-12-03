var mongoose = require('mongoose');
var uuid = require('node-uuid');

var ObjectID = mongoose.Schema.Types.ObjectId;

var accessTokenSchema = mongoose.Schema({
  '_id':         { 'type': String, 'default': uuid.v4 },
  
  'active':      { 'type': Boolean, 'default': true },

  'user':        { 'type': String, 'ref': 'User' },
  'application': { 'type': String, 'ref': 'Application' },
  'device':      String,

  'created':     { 'type': Date, 'default': Date.now },
  'used':        { 'type': Date, 'default': Date.now },
  'expires':     { 'type': Date, 'default': Date.now, 'index': true }
});

// Index on the three fields used for token invalidation at login
accessTokenSchema.index({'user': 1, 'application': 1, 'device': 1});

module.exports = mongoose.model('AccessToken', accessTokenSchema);