var mongoose = require('mongoose');
var dbid = require('../util/dbid.js');

var ObjectID = mongoose.Schema.Types.ObjectId;

var inviteCodeSchema = mongoose.Schema({
  '_id':         { 'type': String, 'default': dbid },
  
  'active':       { 'type': Boolean, 'default': true },
  'created_date': { 'type': Date, 'default': Date.now },
  'used_date':    { 'type': Date },

  'created_by':  { 'type': String,  'ref': 'User' },
  'used_by':     { 'type': String,  'ref': 'User' },

  'recipient_email': { 'type': String },
  'recipient_name':  { 'type': String },

  'conference':  { 'type': String, 'ref': 'Conference' }
});

// Index on the three fields used for token invalidation at login
inviteCodeSchema.index({'user': 1, 'application': 1, 'device': 1});

module.exports = mongoose.model('InviteCode', inviteCodeSchema);