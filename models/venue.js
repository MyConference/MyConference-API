var mongoose = require('mongoose');
var uuid = require('node-uuid');

var ObjectID = mongoose.Schema.Types.ObjectId;
var Mixed = mongoose.Schema.Types.Mixed;

var venueSchema = mongoose.Schema({
  '_id':  { 'type': String, 'default': uuid.v4 },

  'name': {'type': String, 'default': ''},
  'location': {
    'lat': Number,
    'lng': Number
  },
  'details': {'type': String, 'default': ''},

  'conference':  {'type': String, 'ref': 'Conference'}
});

venueSchema.virtual('uri').get(function () {
  return '/venues/' + this.id;
});

venueSchema.statics.getMicroRepr = function (id) {
  return {
    'id':  id,
    'uri': '/venues/' + id
  }
};

venueSchema.methods.toMicroRepr = function () {
  return mongoose.model('Venue').getMicroRepr(this.id);
};

venueSchema.methods.toSimpleRepr = function () {
  var repr = this.toMicroRepr();
  repr.name = this.name;
  repr.location = this.location;
  repr.details = this.details;
  return repr;
};

venueSchema.methods.toFullRepr = function () {
  var repr = this.toSimpleRepr();

  repr.conference = (typeof this.conference === 'string')
    ? mongoose.model('Conference').getMicroRepr(this.conference)
    : this.conference.toSimpleRepr();

  return repr;
};

module.exports = mongoose.model('Venue', venueSchema);
