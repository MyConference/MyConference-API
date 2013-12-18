#!/usr/bin/env node
var mongoose = require('mongoose');
var winston = require('winston');
var async = require('async');

var conf = require('../config.js');

var LoginMethod = require('../models/login_method.js');
var User = require('../models/user.js')

/* Setup Winston logger */
winston.clear();
winston.cli();
winston.add(winston.transports.Console, {
  'prettyPrint': true,
  'colorize': true,
  'level': 'debug'
});


winston.data('MyConference API DataBase sanitization tool');

/* Go! */
async.parallel([

  /* Setup Mongoose */
  function (cb) {
    mongoose.connect(conf.mongo.uri);
    mongoose.connection.once('error', function (err) {
      winston.error('MongoDB', err, err);
      cb(err);
    });
    mongoose.connection.once('open', function () {
      winston.info('Connected to MongoDB');
      cb(null);
    });
  },

  /* Check every login method is associated with an existing user */
  function (cb) {
    var stream = LoginMethod.find().stream();

    // For every login method...
    stream.on('data', function (lm) {
      if (!lm.user) {
        winston.warn('Login Method "%s" doesn\'t refer to a user', lm.id);
        lm.remove();
      } else {
        User.findById(lm.user, function (err, user) {
          if (err) {
            return cb(err);
          }

          if (!user) {
            winston.warn('Login Method "%s" refers to nonexisting user "%s"', lm.id, lm.user);
            lm.remove();
          }
        });
      }
    });

    stream.on('error', function (err) {
      cb(err);
    });

    stream.on('close', function () {
      cb(null);
    });
  }

], function (err, results) {
  if (err) {
    winston.error(err);
  }
  winston.info('Finished');

  setTimeout(function () {
    mongoose.connection.close();
  }, 3000);
});