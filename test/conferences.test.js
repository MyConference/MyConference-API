var mocha    = require('mocha');
var chai     = require('chai');
var mongoose = require('mongoose');
var uuid     = require('node-uuid');
var async    = require('async');
var bcrypt   = require('bcrypt');

var expect = chai.expect;

var client = require('./common/client.js');
var mongo  = require('./common/mongo.js');

var User = require('../models/user.js');

describe('Conferences', function () {

  it('should show individual conferences with simplified data for non-assistants', function (done) {
    client.get({
      'path': '/conferences/' + mongo.values.regularConference,
      'headers': {'authorization': 'Token ' + mongo.values.anonAccess}
    }, function (err, req, res, obj) {
      if (err) return done(err);

      expect(obj).to.be.ok;
      expect(obj.id).to.equal(mongo.values.regularConference);
      expect(obj.name).to.equal(mongo.values.regularConferenceName);
      expect(obj.description).to.equal(mongo.values.regularConferenceDescription);

      expect(obj.users).to.not.be.ok;
      expect(obj.documents).to.be.a('array');

      done();
    });
  });

  it('should show individual conferences with full data for assistants', function (done) {
    client.get({
      'path': '/conferences/' + mongo.values.regularConference,
      'headers': {'authorization': 'Token ' + mongo.values.assistantAccess}
    }, function (err, req, res, obj) {
      if (err) return done(err);

      expect(obj).to.be.ok;
      expect(obj.id).to.equal(mongo.values.regularConference);
      expect(obj.name).to.equal(mongo.values.regularConferenceName);
      expect(obj.description).to.equal(mongo.values.regularConferenceDescription);

      expect(obj.users).to.be.a('array');
      expect(obj.documents).to.be.a('array');

      done();
    });
  });


  it('should list all available documents');


  describe('Creating', function () {
    it('should allow conference creation');
  });


  describe('Editing', function () {
    it('should allow conference editing from owners');


    it('should allow conference editing from collaborators');


    it('should reject conference editing from assistants');
  });


  describe('Removing', function () {
    it('should allow conference removal from owners');


    it('should reject conference removal from collaborators');


    it('should reject conference removal from assistants');
  });
});