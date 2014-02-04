#!/usr/bin/env node
var mongoose = require('mongoose');
var winston = require('winston');
var async = require('async');

var conf = require('../config.js');

var LoginMethod = require('../models/login_method.js');
var User        = require('../models/user.js')
var Conference  = require('../models/conference.js');
var Document    = require('../models/document.js');

/* Setup Winston logger */
winston.clear();
winston.cli();
winston.add(winston.transports.Console, {
  'prettyPrint': true,
  'colorize': true,
  'level': 'debug'
});

/* Some helper functions */
function onRemove () {
  return function (err, obj) {
    if (err) {
      winston.error('Error removing %s %s', obj.constructor.modelName, obj.id, err);
    } else {
      winston.info('Removed %s %s', obj.constructor.modelName, obj.id);
    }
  };
}

function onSave () {
  return function (err, obj) {
    if (err) {
      winston.error('Error saving %s %s', obj.constructor.modelName, obj.id, err);
    } else {
      winston.info('Saved %s %s', obj.constructor.modelName, obj.id);
    }
  };
}

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
        lm.remove(onRemove());
      } else {
        User.findById(lm.user, function (err, user) {
          if (err) {
            return cb(err);
          }

          if (!user) {
            winston.warn('Login Method "%s" refers to nonexisting user "%s"', lm.id, lm.user);
            lm.remove(onRemove());
          }
        });
      }
    });

    stream.on('error', function (err) {
      stream.removeAllListeners();
      cb(err);
    });

    stream.on('close', function () {
      stream.removeAllListeners();
      cb(null);
    });
  },

  /* Check for every conference that has an user, the user has the conference */
  function (cb) {
    var stream = Conference.find().stream();

    // For every login conference...
    stream.on('data', function (conf) {

      var userobjs = conf.toFullRepr().users;
      userobjs.forEach(function (userobj) {
        User.findById(userobj.id).exec(function (err, user) {
          if (err) {
            return cb(err);
          }

          var confsWithRole = user.conferences[userobj.role];
          if (confsWithRole.indexOf(conf.id) < 0) {
            winston.warn('Conference %s has %s %s, but user does not list it', conf.id, userobj.role, user.id);
            confsWithRole.push(conf);
            user.save(onSave());
          }
        });
      });
    });

    stream.on('error', function (err) {
      stream.removeAllListeners();
      cb(err);
    });

    stream.on('close', function () {
      stream.removeAllListeners();
      cb(null);
    });
  },

  /* Check for every document that its conference has it listed as document */
  function (cb) {
    var stream = Document.find().stream();

    stream.on('data', function (doc) {

      Conference.findById(doc.conference).exec(function (err, conf) {
        if (err) return cb(err);

        if (conf.documents.indexOf(doc.id) < 0) {
          winston.warn('Document %s belongs to Conference %s, but conference does not list it', doc.id, conf.id);
          conf.documents.push(doc.id);
          conf.save(onSave());
        }
      })
    });

    stream.on('error', function (err) {
      stream.removeAllListeners();
      cb(err);
    });

    stream.on('close', function () {
      stream.removeAllListeners();
      cb(null);
    });
  }

], function (err, results) {
  if (err) {
    winston.error(err);
  }

  setTimeout(function () {
    mongoose.connection.close();
  }, 3000);
});