var mongoose = require('mongoose');
var dbid = require('../util/dbid.js');

var ObjectID = mongoose.Schema.Types.ObjectId;
var Mixed = mongoose.Schema.Types.Mixed;

var announcementSchema = mongoose.Schema({
  '_id':  { 'type': String, 'default': dbid },

  'title': {'type': String, 'default': ""},
  'body':  {'type': String, 'default': ""},
  'date':  {'type': Date,   'default': Date.now},

  'conference':  {'type': String, 'ref': 'Conference'}
});

announcementSchema.virtual('uri').get(function () {
  return '/announcements/' + this.id;
});

announcementSchema.statics.getMicroRepr = function (id) {
  return {
    'id':  id,
    'uri': '/announcements/' + id
  }
};

announcementSchema.methods.toMicroRepr = function () {
  return mongoose.model('Announcement').getMicroRepr(this.id);
};

announcementSchema.methods.toSimpleRepr = function () {
  var repr = this.toMicroRepr();

  repr.title = this.title;
  repr.body = this.body;
  repr.date = this.date.toISOString();

  return repr;
};

announcementSchema.methods.toFullRepr = function () {
  var repr = this.toSimpleRepr();

  repr.conference = (typeof this.conference === 'string')
    ? mongoose.model('Conference').getMicroRepr(this.conference)
    : this.conference.toSimpleRepr();

  return repr;
};

module.exports = mongoose.model('Announcement', announcementSchema);
