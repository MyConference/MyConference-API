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

  it('should show individual conferences with full data');


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