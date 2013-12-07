#!/usr/bin/env node
var mongoose = require('mongoose');
var winston = require('winston');
var async = require('async');

var conf = require('../config.js');
var App = require('../models/application.js');

// Logger
winston.clear();
winston.cli();
winston.add(winston.transports.Console, {
  'prettyPrint': true,
  'colorize': true,
  'level': 'debug'
});

// Mongoose
mongoose.connect(conf.mongo.uri);
mongoose.connection.on('error', function (err) {
  winston.error('MongoDB: %s', err);
});
mongoose.connection.once('open', function () {
  winston.info('Connected to MongoDB');

  var getOrCreate = function (name) {
    // Function to get or create app
    return function (cb) {
      App.find({'name': name}, function (err, apps) {
        if (err) {
          winston.error('Error finding app %s', name);
          return cb(err);
        }

        if (apps.length == 0) {
          winston.debug('App %s not found, creating...', name);

          var app = new App({'name': name});
          app.save(function (err) {
            if (err) {
              winston.error('Error creating app %s', name);
              return cb(err);
            }

            winston.debug('App %s created successfully', name);
            return cb(null, app.id);
          });

        } else if (apps.length == 1) {
          winston.debug('App %s found', name);
          cb(null, apps[0].id);

        } else {
          winston.warn('App %s is duplicated, manual intervention required', name);
          cb(null, apps[0].id);
        }
      });
    };
  }

  async.parallel({
    'web': getOrCreate('$WEB$'),
    'ios': getOrCreate('$IOS$'),
    'android': getOrCreate('$ANDROID$')

  }, function (err, data) {
    if (err) {
      winston.error(err);
      return;
    }

    winston.info('Finished OK');
    winston.data(data);

    mongoose.connection.close();
  });
});