var async    = require('async');
var bcrypt   = require('bcrypt');
var uuid     = require('node-uuid');
var mongoose = require('mongoose');

var Application  = require('../../models/application.js');
var AccessToken  = require('../../models/access_token.js');
var Conference   = require('../../models/conference.js');
var Document     = require('../../models/document.js');
var LoginMethod  = require('../../models/login_method.js');
var RefreshToken = require('../../models/refresh_token.js');
var User         = require('../../models/user.js');


var values = {};
values.applicationId = uuid.v4();
values.otherApp = uuid.v4();

values.registeredUser = uuid.v4();
values.registeredEmail = 'jane.doe@example.com';
values.registeredPassword = uuid.v4();

values.loggedAccess = uuid.v4();
values.loggedRefresh = uuid.v4();
values.loggedUser = values.registeredUser;
values.loggedAppId = values.applicationId;
values.loggedDeviceId = uuid.v4();

values.anonAccess = uuid.v4();
values.anonRefresh = uuid.v4();
values.anonAppId = values.applicationId;
values.anonDeviceId = uuid.v4();

values.invalidatedAccess = uuid.v4();
values.invalidatedRefresh = uuid.v4();
values.invalidatedAppId = values.applicationId;
values.invalidatedDeviceId = uuid.v4();

values.expiredAccess = uuid.v4();
values.expiredRefresh = uuid.v4();
values.expiredAppId = values.applicationId;
values.expiredDeviceId = uuid.v4();

/* Mocks */
var mocks = function (done) {
  var objs = [];


  /* Test applications */
  objs.push(new Application({
    '_id': values.applicationId,
    'name': '$TEST$'
  }));

  objs.push(new Application({
    '_id': values.otherApp,
    'name': '$OTHER$'
  }));


  /* Registered user and login method */
  objs.push(new User({
    '_id': values.registeredUser,
  }));

  objs.push(new LoginMethod({
    'type': 'password',
    'user': values.registeredUser,
    'key':  values.registeredEmail,
    'data': {
      'password': bcrypt.hashSync(values.registeredPassword, 1)
    }
  }));


  /* Logged in user */
  objs.push(new AccessToken({
    '_id': values.loggedAccess,
    'active': true,

    'user': values.loggedUser,
    'application': values.loggedAppId,
    'device': values.loggedDeviceId,

    'created': Date.now(),
    'used': Date.now(),
    'expires': Date.now() + 86400000
  }));

  objs.push(new RefreshToken({
    '_id': values.loggedRefresh,
    'active': true,

    'user': values.loggedUser,
    'access_token': values.loggedAccess,
    'application': values.loggedAppId,
    'device': values.loggedDeviceId,

    'created': Date.now(),
    'expires': Date.now() + 86400000
  }));


  /* Logged in anon */
  objs.push(new AccessToken({
    '_id': values.anonAccess,
    'active': true,

    'user': null,
    'application': values.anonAppId,
    'device': values.anonDeviceId,

    'created': Date.now(),
    'used': Date.now(),
    'expires': Date.now() + 86400000
  }));

  objs.push(new RefreshToken({
    '_id': values.anonRefresh,
    'active': true,

    'user': null,
    'access_token': values.anonAccess,
    'application': values.anonAppId,
    'device': values.anonDeviceId,

    'created': Date.now(),
    'expires': Date.now() + 86400000
  }));

  /* Invalidated access/refresh tokens */
  objs.push(new AccessToken({
    '_id': values.invalidatedAccess,
    'active': false,

    'user': null,
    'application': values.invalidatedAppId,
    'device': values.invalidatedDeviceId,

    'created': Date.now(),
    'used': Date.now(),
    'expires': Date.now() + 86400000
  }));

  objs.push(new RefreshToken({
    '_id': values.invalidatedRefresh,
    'active': false,

    'user': null,
    'access_token': values.invalidatedAccess,
    'application': values.invalidatedAppId,
    'device': values.invalidatedDeviceId,

    'created': Date.now(),
    'expires': Date.now() + 86400000
  }));


  /* Expired access/refresh tokens */
  objs.push(new AccessToken({
    '_id': values.expiredAccess,
    'active': true,

    'user': null,
    'application': values.expiredAppId,
    'device': values.expiredDeviceId,

    'created': Date.now() - 20000,
    'used': Date.now() - 15000,
    'expires': Date.now() - 10000
  }));

  objs.push(new RefreshToken({
    '_id': values.expiredRefresh,
    'active': true,

    'user': null,
    'access_token': values.expiredAccess,
    'application': values.expiredAppId,
    'device': values.expiredDeviceId,

    'created': Date.now() - 15000,
    'expires': Date.now() - 10000
  }));


  /* Go! */
  async.parallel(objs.map(function (obj) {
    return obj.save.bind(obj);
  }), done);
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