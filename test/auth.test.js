var mocha    = require('mocha');
var chai     = require('chai');
var mongoose = require('mongoose');
var uuid     = require('node-uuid');
var async    = require('async');
var bcrypt   = require('bcrypt');

var expect = chai.expect;

var hooks  = require('./common/hooks.js');
var client = require('./common/client.js');
var mongo  = require('./common/mongo.js');

var User = require('../models/user.js');
var LoginMethod = require('../models/login_method.js');
var AccessToken = require('../models/access_token.js');
var RefreshToken = require('../models/refresh_token.js');

before(hooks.before);
beforeEach(hooks.beforeEach);
afterEach(hooks.afterEach);
after(hooks.after);

describe('Auth', function () {

  it('should allow access to user resources to a logged in user', function (done) {
    client.post({
      'path': '/auth/check-user',
      'headers': {
        'authorization': 'Token ' + mongo.values.loggedAccess
      }
    }, {}, function (err, req, res, obj) {
      if (err) return done(err);

      expect(res.statusCode).to.equal(200);
      expect(obj.id).to.equal(mongo.values.loggedUser);

      done();
    });
  });


  it('should allow access to public resources to a logged in user', function (done) {
    client.post({
      'path': '/auth/check-anon',
      'headers': {
        'authorization': 'Token ' + mongo.values.loggedAccess
      }
    }, {}, function (err, req, res, obj) {
      if (err) return done(err);

      expect(res.statusCode).to.equal(200);

      done();
    });
  });


  it('should reject acces to user resources to an anonymous user', function (done) {
    client.post({
      'path': '/auth/check-user',
      'headers': {
        'authorization': 'Token ' + mongo.values.anonAccess
      }
    }, {}, function (err, req, res, obj) {
      expect(err).to.be.ok;
      expect(obj.code).to.equal('invalid_access');

      done();
    });
  });


  it('should allow access to public resources to an anonymous user', function (done) {
    client.post({
      'path': '/auth/check-anon',
      'headers': {
        'authorization': 'Token ' + mongo.values.anonAccess
      }
    }, {}, function (err, req, res, obj) {
      if (err) return done(err);

      expect(res.statusCode).to.equal(200);

      done();
    });
  });


  it('should reject access to non-existant access tokens', function (done) {
    client.post({
      'path': '/auth/check-anon',
      'headers': {
        'authorization': 'Token ' + uuid.v4()
      }
    }, {}, function (err, req, res, obj) {
      expect(err).to.be.ok;
      expect(obj.code).to.equal('invalid_access');

      done();
    });
  });


  it('should reject access to invalidated access tokens', function (done) {
    client.post({
      'path': '/auth/check-anon',
      'headers': {
        'authorization': 'Token ' + mongo.values.invalidatedAccess
      }
    }, {}, function (err, req, res, obj) {
      expect(err).to.be.ok;
      expect(obj.code).to.equal('invalid_access');

      done();
    });
  });


  it('should reject access to expired access tokens', function (done) {
    client.post({
      'path': '/auth/check-anon',
      'headers': {
        'authorization': 'Token ' + mongo.values.expiredAccess
      }
    }, {}, function (err, req, res, obj) {
      expect(err).to.be.ok;
      expect(obj.code).to.equal('invalid_access');

      done();
    });
  })


  describe('Signup', function () {

    it('should register a user when passed a valid email and password', function (done) {
      this.timeout(5000);

      // Perform a request
      client.post('/auth/signup', {
        'application_id': mongo.values.applicationId,
        'device_id': uuid.v4(),
        'user_data': {
          'email':    'john.doe@example.org',
          'password': 'decent-length-password'
        }
      }, function (err, req, res, obj) {
        if (err) {
          return done(err);
        }

        expect(obj.user.id, 'user id').to.be.a('string');
        expect(obj.user.uri, 'user uri').to.be.a('string');

        async.parallel([
          // Check that the user was created
          function (cb) {
            User.findById(obj.user.id, function (err, user) {
              if (err) return cb(err);

              expect(user, 'db user').to.be.ok;
              expect(user.id, 'db user id').to.equal(obj.user.id, 'user id');

              cb();
            });
          },

          // Check that a login method was created orrectly
          function (cb) {
            LoginMethod.findOne({'key': 'john.doe@example.org'}, function (err, lm) {
              if (err) return cb(err);

              expect(lm, 'lm').to.be.ok;
              expect(lm.user, 'lm user').to.equal(obj.user.id);
              expect(lm.type, 'lm type').to.equal('password');
              expect(bcrypt.compareSync('decent-length-password', lm.data.password), 'lm password check').to.be.ok

              cb();
            });
          }

        ], done);
      });
    });


    it('should reject an invalid application', function (done) {
      client.post('/auth/signup', {
        'application_id': uuid.v4(),
        'device_id': uuid.v4(),
        'user_data': {
          'email':    'john.doe@example.org',
          'password': 'decent-length-password'
        }
      }, function (err, req, res, obj) {
        expect(err).to.be.ok;
        expect(obj.code).to.equal('invalid_application');

        LoginMethod.findOne({'key': 'john.doe@example.org'}, function (err, lm) {
          if (err) return done(err);

          expect(lm).to.not.be.ok;

          done();
        });
      });
    });


    it('should reject an invalid email', function (done) {
      client.post('/auth/signup', {
        'application_id': mongo.values.applicationId,
        'device_id': uuid.v4(),
        'user_data': {
          'email':    'notanemail',
          'password': 'decent-length-password'
        }
      }, function (err, req, res, obj) {
        expect(err).to.be.ok;
        expect(obj.code).to.equal('invalid_email');

        LoginMethod.findOne({'key': 'notanemail'}, function (err, lm) {
          if (err) return done(err);

          expect(lm).to.not.be.ok;

          done();
        });
      });
    });


    it('should reject an already registered email', function (done) {
      client.post('/auth/signup', {
        'application_id': mongo.values.applicationId,
        'device_id': uuid.v4(),
        'user_data': {
          'email':    mongo.values.registeredEmail,
          'password': 'decent-length-password'
        }
      }, function (err, req, res, obj) {
        expect(err).to.be.ok;
        expect(obj.code).to.equal('invalid_email');

        done();
      });
    });


    it('should reject a short password', function (done) {
      client.post('/auth/signup', {
        'application_id': mongo.values.applicationId,
        'device_id': uuid.v4(),
        'user_data': {
          'email':    'john.doe@example.org',
          'password': 'short'
        }
      }, function (err, req, res, obj) {
        expect(err).to.be.ok;
        expect(obj.code).to.equal('invalid_password');

        LoginMethod.findOne({'key': 'john.doe@example.org'}, function (err, lm) {
          if (err) return done(err);

          expect(lm).to.not.be.ok;

          done();
        });
      });
    });
  });


  describe('Login', function () {

    it('should reject an invalid application', function (done) {
      client.post('/auth', {
        'application_id': uuid.v4(),
        'device_id': uuid.v4(),
        'credentials': {
          'type': 'anonymous'
        }
      }, function (err, req, res, obj) {
        expect(err).to.be.ok;
        expect(obj.code).to.equal('invalid_application');

        done();
      })
    });


    it('should invalidate old access/refresh tokens', function (done) {
      client.post('/auth', {
        'application_id': mongo.values.loggedAppId,
        'device_id': mongo.values.loggedDeviceId,
        'credentials': {
          'type': 'anonymous'
        }
      }, function (err, req, res, obj) {
        if (err) return done(err);

        async.parallel([
          /* Check the AccessToken */
          function (cb) {
            AccessToken.findById(mongo.values.loggedAccess).exec(function (err, at) {
              if (err) return cb(err);

              expect(at, 'access token').to.be.ok;
              expect(at.active, 'access token active').to.not.be.ok;

              cb();
            });
          },

          /* Check the RefreshToken */
          function (cb) {
            RefreshToken.findById(mongo.values.loggedRefresh).exec(function (err, rt) {
              if (err) return cb(err);

              expect(rt, 'refresh token').to.be.ok;
              expect(rt.active, 'refresh token active').to.not.be.ok;
              
              cb();
            });
          }
        ], done);

      })
    });


    describe('Anonymous', function () {
      it('should login anonymously with no errors', function (done) {
        client.post('/auth', {
          'application_id': mongo.values.applicationId,
          'device_id': uuid.v4(),
          'credentials': {
            'type': 'anonymous'
          }
        }, function (err, req, res, obj) {
          if (err) return done(err);

          expect(obj).to.have.property('access_token');
          expect(obj).to.have.property('access_token_expires');
          expect(obj).to.have.property('refresh_token');
          expect(obj).to.have.property('refresh_token_expires');
          expect(obj).to.have.property('user');
          expect(obj.user).to.equal(null);

          done();
        })
      });
    });


    describe('Password', function () {

      it('should log in a registered user', function (done) {
        client.post('/auth', {
          'application_id': mongo.values.applicationId,
          'device_id': uuid.v4(),
          'credentials': {
            'type': 'password',
            'email': mongo.values.registeredEmail,
            'password': mongo.values.registeredPassword
          }
        }, function (err, req, res, obj) {
          if (err) return done(err);

          expect(obj).to.have.property('access_token');
          expect(obj).to.have.property('access_token_expires');
          expect(obj).to.have.property('refresh_token');
          expect(obj).to.have.property('refresh_token_expires');
          expect(obj).to.have.property('user');
          expect(obj.user).to.have.property('id');
          expect(obj.user).to.have.property('uri');
          expect(obj.user.id).to.equal(mongo.values.registeredUser);

          done();
        });
      });


      it('should reject an unregistered email', function (done) {
        client.post('/auth', {
          'application_id': mongo.values.applicationId,
          'device_id': uuid.v4(),
          'credentials': {
            'type': 'password',
            'email': 'unregistered.email@example.org',
            'password': mongo.values.registeredPassword
          }
        }, function (err, req, res, obj) {
          expect(err).to.be.ok;
          expect(obj.code).to.equal('invalid_email_or_password');

          done();
        });
      });


      it('should reject an incorrect password', function (done) {
        client.post('/auth', {
          'application_id': mongo.values.applicationId,
          'device_id': uuid.v4(),
          'credentials': {
            'type': 'password',
            'email': mongo.values.registeredEmail,
            'password': uuid.v4()
          }
        }, function (err, req, res, obj) {
          expect(err).to.be.ok;
          expect(obj.code).to.equal('invalid_email_or_password');
          
          done();
        });
      });

    });


    describe('Refresh', function () {

      it('should log in with a valid token', function (done) {
        client.post('/auth', {
          'application_id': mongo.values.loggedAppId,
          'device_id': mongo.values.loggedDeviceId,
          'credentials': {
            'type': 'refresh',
            'refresh_token': mongo.values.loggedRefresh
          }
        }, function (err, req, res, obj) {
          if (err) return done(err);

          expect(obj, 'response').to.be.ok;
          expect(obj).to.have.property('access_token');
          expect(obj).to.have.property('access_token_expires');
          expect(obj).to.have.property('refresh_token');
          expect(obj).to.have.property('refresh_token_expires');
          expect(obj).to.have.property('user');
          expect(obj.user, 'user').to.be.ok;
          expect(obj.user).to.have.property('id');
          expect(obj.user).to.have.property('uri');
          expect(obj.user.id).to.equal(mongo.values.loggedUser);

          done();
        });
      });


      it('should reject a non existant refresh token', function (done) {
        client.post('/auth', {
          'application_id': mongo.values.loggedAppId,
          'device_id': mongo.values.loggedDeviceId,
          'credentials': {
            'type': 'refresh',
            'refresh_token': uuid.v4()
          }
        }, function (err, req, res, obj) {
          expect(err).to.be.ok;
          expect(obj.code).to.equal('invalid_refresh');

          done();
        });
      });


      it('should reject an invalidated refresh token', function (done) {
        client.post('/auth', {
          'application_id': mongo.values.invalidatedAppId,
          'device_id': mongo.values.invalidatedDeviceId,
          'credentials': {
            'type': 'refresh',
            'refresh_token': mongo.values.invalidatedRefresh
          }
        }, function (err, req, res, obj) {
          expect(err).to.be.ok;
          expect(obj.code).to.equal('invalid_refresh');

          done();
        });
      });


      it('should reject an expired refresh token', function (done) {
        client.post('/auth', {
          'application_id': mongo.values.expiredAppId,
          'device_id': mongo.values.expiredDeviceId,
          'credentials': {
            'type': 'refresh',
            'refresh_token': mongo.values.expiredRefresh
          }
        }, function (err, req, res, obj) {
          expect(err).to.be.ok;
          expect(obj.code).to.equal('invalid_refresh');

          done();
        });
      });


      it('should reject a token with unmatching application', function (done) {
        client.post('/auth', {
          'application_id': mongo.values.otherApp,
          'device_id': mongo.values.loggedDeviceId,
          'credentials': {
            'type': 'refresh',
            'refresh_token': mongo.values.loggedRefresh
          }
        }, function (err, req, res, obj) {
          expect(err).to.be.ok;
          expect(obj.code).to.equal('invalid_refresh');

          done();
        });
      });


      it('should reject a token with unmatching device', function (done) {
        client.post('/auth', {
          'application_id': mongo.values.loggedAppId,
          'device_id': uuid.v4(),
          'credentials': {
            'type': 'refresh',
            'refresh_token': mongo.values.loggedRefresh
          }
        }, function (err, req, res, obj) {
          expect(err).to.be.ok;
          expect(obj.code).to.equal('invalid_refresh');

          done();
        });
      });
    });
  });


  describe('Logout', function () {

    it('should invalidate current access/refresh tokens', function (done) {
      client.post({
        'path': '/auth/logout',
        'headers': {
          'authorization': 'Token ' + mongo.values.loggedAccess
        }
      }, {}, function (err, req, res, obj) {
        if (err) return done(err);

        async.parallel([
          function (cb) {
            AccessToken.findById(mongo.values.loggedAccess).exec(function (err, at) {
              if (err) return err;

              expect(at.active, 'access token active').to.not.be.ok;
              cb();
            });
          },

          function (cb) {
            RefreshToken.findById(mongo.values.loggedRefresh).exec(function (err, rt) {
              if (err) return err;

              expect(rt.active, 'refresh token active').to.not.be.ok;
              cb();
            });
          }
        ], done);
      });
    });


  });
});