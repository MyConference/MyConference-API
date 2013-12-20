#!/usr/bin/env node
var winston = require('winston');
var async = require('async');
var restify = require('restify');
var readline = require('readline');
var uuid = require('node-uuid');

var conf = require('../config.js');

// Logger
winston.clear();
winston.cli();
winston.add(winston.transports.Console, {
  'prettyPrint': true,
  'colorize': true,
  'level': 'debug'
});

var session = {};

var client = restify.createJsonClient({
  'url': process.argv[2],
  'version': '*'
});

var app = process.argv[3];
var device = uuid.v4();

winston.data({'url':process.argv[2], 'app':process.argv[3]});

var commands = {
  'quit': function (rl, args, cb) {
    rl.close();
  },

  'login': function (rl, args, cb) {
    if (args.length != 2) {
      winston.error('login expects 2 arguments, %d given', args.length);
      return cb();
    }

    var user = args[0];
    var pass = args[1];

    winston.info('Logging in...');

    client.post('/auth', {
      'application_id': app,
      'device_id': device,
      'credentials': {
        'type': 'password',
        'email': user,
        'password': pass
      }
    }, function (err, req, res, obj) {
      if (err) {
        return cb(err);
      }

      winston.info('Login successful');
      winston.data(obj);
      
      session.token = obj.access_token;
      session.refresh = obj.refresh_token;
      cb();
    });
  }
};

var completer = function completer (line) {
  var names = Object.keys(commands);

  if (line == '') {
    return names;
  }

  var hits = names.filter(function (cmd) { return cmd.indexOf(line) == 0; });
  return [hits, line];
}

// Program
var rl = readline.createInterface({
  'input': process.stdin,
  'output': process.stdout,
  'completer': completer
});

// Line
var askLine = function () {
  rl.setPrompt('$ ');
  rl.prompt();
  rl.once('line', function (line) {
    rl.pause();
    rl.setPrompt('> ');

    var args = line.trim().split(/\s+/);
    var name = args[0];
    args = args.splice(1);
    var command = commands[name];

    if (!command) {
      winston.error('Command "%s" not found', name);
      return askLine();
    }

    try {
      return command(rl, args, function (err) {
        if (err) {
          winston.error(err);
        }

        askLine();
      });

    } catch (exc) {
      winston.error(exc);
      askLine();
    }
  });
}

askLine();