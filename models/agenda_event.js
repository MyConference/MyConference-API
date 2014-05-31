var mongoose = require('mongoose');
var dbid = require('../util/dbid.js');

var ObjectID = mongoose.Schema.Types.ObjectId;
var Mixed = mongoose.Schema.Types.Mixed;

var eventSchema = mongoose.Schema({
  '_id':  { 'type': String, 'default': dbid },

  'title':       {'type': String},
  'description': {'type': String},
  'date':        {'type': Date,   'default': Date.now},

  'conference':  {'type': String, 'ref': 'Conference'}
});

eventSchema.virtual('uri').get(function () {
  return '/organizers/' + this.id;
});

eventSchema.statics.getMicroRepr = function (id) {
  return {
    'id':  id,
    'uri': '/agenda-events/' + id
  }
};

eventSchema.methods.toMicroRepr = function () {
  return mongoose.model('AgendaEvent').getMicroRepr(this.id);
};

eventSchema.methods.toSimpleRepr = function () {
  var repr = this.toMicroRepr();
  repr.name = this.name;
  repr.description = this.description;
  repr.date = this.date;

  return repr;
};

eventSchema.methods.toFullRepr = function () {
  var repr = this.toSimpleRepr();

  repr.conference = (typeof this.conference === 'string')
    ? mongoose.model('Conference').getMicroRepr(this.conference)
    : this.conference.toSimpleRepr();

  return repr;
};

module.exports = mongoose.model('AgendaEvent', eventSchema);
