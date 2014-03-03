var mongoose = require('mongoose');
var dbid = require('../util/dbid.js');


var roles = ['owner', 'collaborator', 'assistant'];

var userSchema = mongoose.Schema({
  '_id': { 'type': String, 'default': dbid },

  'conferences': {
  	'owner':        [{'type': String, 'default': [], 'ref': 'Conference' }],
  	'collaborator': [{'type': String, 'default': [], 'ref': 'Conference' }],
  	'assistant':    [{'type': String, 'default': [], 'ref': 'Conference' }],
  }
});

userSchema.virtual('uri').get(function () {
  return '/users/' + this.id;
});

userSchema.virtual('conferences.all').get(function () {
  return []
  	.concat(this.conferences.owner)
  	.concat(this.conferences.collaborator)
  	.concat(this.conferences.assistant);
});

userSchema.statics.getMicroRepr = function (id) {
  return {
    'id':  id,
    'uri': '/users/' + id
  }
};

userSchema.methods.toMicroRepr = function () {
  return mongoose.model('User').getMicroRepr(this.id);
}

userSchema.methods.toSimpleRepr = function () {
  var repr = this.toMicroRepr();
  return repr;
}

userSchema.methods.toFullRepr = function () {
  var repr = this.toSimpleRepr();
  repr.conferences = [];

  for (r in roles) {
    var role = roles[r];

    this.conferences[role].forEach(function (conf) {
      if (typeof conf === 'string') {
        conf = mongoose.model('Conference').getMicroRepr(conf);
      } else {
        conf = conf.toSimpleRepr();
      }

      conf.role = role;
      repr.conferences.push(conf);
    });
  }

  return repr;
}

module.exports = mongoose.model('User', userSchema);