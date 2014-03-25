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

inviteCodeSchema.virtual('uri').get(function () {
  return '/invite-codes/' + this.id;
});

inviteCodeSchema.statics.getMicroRepr = function (id) {
  return {
    'id':  id,
    'uri': '/invite-codes/' + id
  }
};

inviteCodeSchema.methods.toMicroRepr = function () {
  return mongoose.model('InviteCode').getMicroRepr(this.id);
};

inviteCodeSchema.methods.toSimpleRepr = function () {
  var repr = this.toMicroRepr();
  return repr;
};

inviteCodeSchema.methods.toFullRepr = function () {
  var repr = this.toSimpleRepr();

  repr.conference = (typeof this.conference === 'string')
    ? mongoose.model('Conference').getMicroRepr(this.conference)
    : this.conference.toSimpleRepr();

  return repr;
};

module.exports = mongoose.model('InviteCode', inviteCodeSchema);