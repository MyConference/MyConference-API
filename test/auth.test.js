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

before(hooks.before);
beforeEach(hooks.beforeEach);
afterEach(hooks.afterEach);
after(hooks.after);

describe('Auth', function () {
  describe('Signup', function () {

    it('should register a user when passed a valid email and password', function (done) {
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


    it('should reject and invalid application', function (done) {
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

        done();
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

        done();
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

        done();
      });
    });
  });


  describe('Login', function () {

    it('should reject an invalid application');


    it('should invalidate old access/refresh tokens');


    describe('Anonymous', function () {
      it('should login anonymously with no errors');
    });


    describe('Password', function () {

      it('should log in a registered user');


      it('should reject an unregistered email');


      it('should reject an incorrect password');

    });


    describe('Refresh', function () {

      it('should log in with a valid token');


      it('should reject an invalid refresh token');


      it('should reject an expired refresh token');


      it('should reject a token with unmatching application');


      it('should reject a token with unmatching device');
    });
  });


  describe('Logout', function () {

    it('should invalidate current access/refresh tokens');


    it('should reject expired access tokens');


    it('should reject invalid access tokens');
  });
});