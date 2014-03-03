var mongoose = require('mongoose');
var dbid = require('../util/dbid.js');

var ObjectID = mongoose.Schema.Types.ObjectId;

var refreshTokenSchema = mongoose.Schema({
  '_id':          { 'type': String, 'default': dbid, 'index': true },
  'active':       { 'type': Boolean, 'default': true },

  'user':         { 'type': String, 'ref': 'User' },
  'access_token': { 'type': String, 'ref': 'AccessToken' },
  'application':  { 'type': String, 'ref': 'Application' },
  'device':       String,

  'created':      { 'type': Date, 'default': Date.now },
  'expires':      { 'type': Date, 'default': Date.now }
});

module.exports = mongoose.model('RefreshToken', refreshTokenSchema);