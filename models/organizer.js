var mongoose = require('mongoose');
var dbid = require('../util/dbid.js');

var ObjectID = mongoose.Schema.Types.ObjectId;
var Mixed = mongoose.Schema.Types.Mixed;

var organizerSchema = mongoose.Schema({
  '_id':  { 'type': String, 'default': dbid },

  'name':        {'type': String},
  'origin':      {'type': String, 'default': ''},
  'details':     {'type': String, 'default': ''},

  'group':       {'type': String},
  'conference':  {'type': String, 'ref': 'Conference'}
});

organizerSchema.virtual('uri').get(function () {
  return '/organizers/' + this.id;
});

organizerSchema.statics.getMicroRepr = function (id) {
  return {
    'id':  id,
    'uri': '/organizers/' + id
  }
};

organizerSchema.methods.toMicroRepr = function () {
  return mongoose.model('Organizer').getMicroRepr(this.id);
};

organizerSchema.methods.toSimpleRepr = function () {
  var repr = this.toMicroRepr();
  repr.name = this.name;
  repr.origin = this.origin;
  repr.details = this.details;
  repr.group = this.group;
  return repr;
};

organizerSchema.methods.toFullRepr = function () {
  var repr = this.toSimpleRepr();

  repr.conference = (typeof this.conference === 'string')
    ? mongoose.model('Conference').getMicroRepr(this.conference)
    : this.conference.toSimpleRepr();

  return repr;
};

module.exports = mongoose.model('Organizer', organizerSchema);
