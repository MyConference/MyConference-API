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
var LoginMethod = require('../models/login_method.js');
var AccessToken = require('../models/access_token.js');
var RefreshToken = require('../models/refresh_token.js');


describe('Users', function () {

  it('should obtain full user data for logged in user');


});