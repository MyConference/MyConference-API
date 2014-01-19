var async    = require('async');
var bcrypt   = require('bcrypt');
var mongoFs  = require('mongodb-fs');
var uuid     = require('node-uuid');
var mongoose = require('mongoose');

var Application  = require('../../models/application.js');
var AccessToken  = require('../../models/access_token.js');
var Conference   = require('../../models/conference.js');
var Document     = require('../../models/document.js');
var LoginMethod  = require('../../models/login_method.js');
var RefreshToken = require('../../models/refresh_token.js');
var User         = require('../../models/user.js');

var values = {
  'applicationId': uuid.v4(),

  'registeredUser': uuid.v4(),
  'registeredEmail': 'jane.doe@example.com',
  'registeredPassword': uuid.v4(),
};

/* Mocks */
var mocks = function (done) {
  var saves = [];

  /* Test application */
  var testApp = new Application({
    '_id': values.applicationId,
    'name': '$TEST$'
  });
  saves.push(testApp.save.bind(testApp));

  /* Registered user and login method */
  var regUser = new User({
    '_id': values.registeredUser,
  });
  saves.push(regUser.save.bind(regUser));

  var regLm = new LoginMethod({
    'type': 'password',
    'user': values.registeredUser,
    'key':  values.registeredEmail,
    'data': {
      'password': bcrypt.hashSync(values.registeredPassword, 1)
    }
  });
  saves.push(regLm.save.bind(regLm));

  /* Go! */
  async.parallel(saves, done);
};

var start = function (done) {
  async.parallel([
    Application.remove.bind(Application),
    AccessToken.remove.bind(AccessToken),
    Conference.remove.bind(Conference),
    Document.remove.bind(Document),
    LoginMethod.remove.bind(LoginMethod),
    RefreshToken.remove.bind(RefreshToken),
    User.remove.bind(User)
  ], function (err) {
    if (err) return done(err);

    mocks(done);
  });
}

var stop = function (done) {
  done();
}

module.exports.start  = start;
module.exports.stop   = stop;
module.exports.values = values;