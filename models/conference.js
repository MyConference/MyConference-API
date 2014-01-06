var mongoose = require('mongoose');
var uuid = require('node-uuid');

var roles = ['owner', 'collaborator', 'assistant'];

var conferenceSchema = mongoose.Schema({
  '_id':  { 'type': String, 'default': uuid.v4 },

  'name':        {'type': String},
  'description': {'type': String, 'default': ''},

  'users': {
  	'owner':        {'type': [String], 'deault': [], 'ref': 'User'},
  	'collaborator': {'type': [String], 'deault': [], 'ref': 'User'},
  	'assistant':    {'type': [String], 'deault': [], 'ref': 'User'},
  }
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
  return repr;
}

conferenceSchema.methods.toFullRepr = function () {
  var repr = this.toSimpleRepr();
  repr.users = [];

  for (r in roles) {
    var role = roles[r];

    this.users[role].forEach(function (user) { 
      if (typeof user === 'string') {
        user = mongoose.model('Users').getMicroRepr(user);
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