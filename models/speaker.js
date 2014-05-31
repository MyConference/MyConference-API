var mongoose = require('mongoose');
var dbid = require('../util/dbid.js');

var ObjectID = mongoose.Schema.Types.ObjectId;
var Mixed = mongoose.Schema.Types.Mixed;

var speakerSchema = mongoose.Schema({
  '_id':  { 'type': String, 'default': dbid },

  'name':        {'type': String},
  'charge':      {'type': String, 'default': ''},
  'origin':      {'type': String, 'default': ''},
  'description': {'type': String, 'default': ''},
  'picture_url': {'type': String, 'default': ''},

  'conference':  {'type': String, 'ref': 'Conference'}
});

speakerSchema.virtual('uri').get(function () {
  return '/speakers/' + this.id;
});

speakerSchema.statics.getMicroRepr = function (id) {
  return {
    'id':  id,
    'uri': '/speakers/' + id
  }
};

speakerSchema.methods.toMicroRepr = function () {
  return mongoose.model('Speaker').getMicroRepr(this.id);
};

speakerSchema.methods.toSimpleRepr = function () {
  var repr = this.toMicroRepr();
  repr.name = this.name;
  repr.charge = this.charge;
  repr.origin = this.origin;
  repr.description = this.description;
  repr.picture_url = this.picture_url;
  return repr;
};

speakerSchema.methods.toFullRepr = function () {
  var repr = this.toSimpleRepr();

  repr.conference = (typeof this.conference === 'string')
    ? mongoose.model('Conference').getMicroRepr(this.conference)
    : this.conference.toSimpleRepr();

  return repr;
};

module.exports = mongoose.model('Speaker', speakerSchema);
