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


describe('Users', function () {

  describe('Profile', function () {
    it('should show full user data for logged in user');


    it('should show reduced user data for non logged in user');


    it('should allow profile edition of logged in user');


    it('should reject profile edition of logged in user');
  });

  describe('Conferences', function () {
    it('should list conferences of logged in user');


    it('should refuse to list conferences of non logged in user');
  });

});