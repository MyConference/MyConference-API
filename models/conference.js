var mongoose = require('mongoose');
var dbid = require('../util/dbid.js');

var roles = ['owner', 'collaborator', 'assistant'];

var conferenceSchema = mongoose.Schema({
  '_id':  { 'type': String, 'default': dbid },

  'name':        {'type': String},
  'description': {'type': String, 'default': ''},

  'css':         {'type': String, 'default': ''},

  'users': {
  	'owner':        [{'type': String, 'default': [], 'ref': 'User'}],
  	'collaborator': [{'type': String, 'default': [], 'ref': 'User'}],
  	'assistant':    [{'type': String, 'default': [], 'ref': 'User'}],
  },

  'documents':     [{'type': String, 'default': [], 'ref': 'Document'}],
  'venues':        [{'type': String, 'default': [], 'ref': 'Venue'}],
  'announcements': [{'type': String, 'default': [], 'ref': 'Announcement'}],
  'organizers':    [{'type': String, 'default': [], 'ref': 'Organizer'}],
  'speakers':      [{'type': String, 'default': [], 'ref': 'Speaker'}]
});

conferenceSchema.virtual('uri').get(function () {
  return '/conferences/' + this.id;
});


conferenceSchema.virtual('users.all').get(function () {
  return []
  	.concat(this.users.owner)
  	.concat(this.users.collaborator)
  	.concat(this.users.assistant);
});


conferenceSchema.statics.getMicroRepr = function (id) {
  return {
    'id':  id,
    'uri': '/conferences/' + id
  }
};

conferenceSchema.methods.toMicroRepr = function () {
  return mongoose.model('Conference').getMicroRepr(this.id);
}

conferenceSchema.methods.toSimpleRepr = function () {
  var repr = this.toMicroRepr();
  repr.name = this.name;
  repr.description = this.description;
  repr.css = this.css;
  return repr;
}

conferenceSchema.methods.toFullRepr = function () {
  var repr = this.toSimpleRepr();

  // Put all documents
  repr.documents = this.documents.map(function (doc, idx) {
    if (typeof doc === 'string') {
      return mongoose.model('Document').getMicroRepr(doc);
    } else {
      return doc.toSimpleRepr();
    }
  });

  // Put all venues
  repr.venues = this.venues.map(function (venue, idx) {
    if (typeof venue === 'string') {
      return mongoose.model('Venue').getMicroRepr(venue);
    } else {
      return venue.toSimpleRepr();
    }
  });

  // Put all announcements
  repr.announcements = this.announcements.map(function (announcement, idx) {
    if (typeof announcement === 'string') {
      return mongoose.model('Announcement').getMicroRepr(announcement);
    } else {
      return announcement.toSimpleRepr();
    }
  });

  // Put all organizers
  repr.organizers = this.organizers.map(function (organizer, idx) {
    if (typeof organizer === 'string') {
      return mongoose.model('Organizer').getMicroRepr(organizer);
    } else {
      return organizer.toSimpleRepr();
    }
  });

  // Put all speakers
  repr.speakers = this.speakers.map(function (speaker, idx) {
    if (typeof speaker === 'string') {
      return mongoose.model('Speaker').getMicroRepr(speaker);
    } else {
      return speaker.toSimpleRepr();
    }
  });

  // Put all users
  repr.users = [];
  for (r in roles) {
    var role = roles[r];

    this.users[role].forEach(function (user) { 
      if (typeof user === 'string') {
        user = mongoose.model('User').getMicroRepr(user);
      } else {
        user = user.toSimpleRepr();
      }

      user.role = role;
      repr.users.push(user);
    });
  }

  return repr;
}

module.exports = mongoose.model('Conference', conferenceSchema);
