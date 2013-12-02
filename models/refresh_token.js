var mongoose = require('mongoose');
var uuid = require('node-uuid');

var ObjectID = mongoose.Schema.Types.ObjectId;

var refreshTokenSchema = mongoose.Schema({
  '_id':          { 'type': String, 'default': uuid.v4, 'index': true },
  
  'active':       { 'type': Boolean, 'default': true },
  'access_token': ObjectID,
  'device':       String,
  'created':      { 'type': Date, 'default': Date.now },
  'expires':      { 'type': Date, 'default': Date.now }
});

module.exports = mongoose.model('RefreshToken', refreshTokenSchema);