#!/usr/bin/env node
var winston  = require('winston');
var async    = require('async');
var restify  = require('restify');
var readline = require('readline');
var uuid     = require('node-uuid');
var mongoose = require('mongoose');

var conf = require('../config.js');

var Application = require('../models/application.js');

// Logger
winston.clear();
winston.cli();
winston.add(winston.transports.Console, {
  'prettyPrint': true,
  'colorize': true,
  'level': 'debug'
});

var session = {
  'device': uuid.v4()
};

var client = restify.createJsonClient({
  'url': 'http://' + conf.http.host,
  'version': '*'
});

var commands = {
  'quit': function (rl, args, cb) {
    rl.close();
    mongoose.connection.close();
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
      'application_id': session.app,
      'device_id': session.device,
      'credentials': {
        'type': 'password',
        'email': user,
        'password': pass
      }
    }, function (err, req, res, obj) {
      if (err) {
        return cb(err);
      }

      if (!obj.user) {
        return cb('user is null!');
      }

      winston.info('Login successful');
      winston.data(obj);
      
      session.token   = obj.access_token;
      session.refresh = obj.refresh_token;
      session.user    = obj.user.id;

      client.headers.authorization = 'Token ' + session.token;

      cb();
    });
  },

  'request': function (rl, args, cb) {
    if (args.length != 2 && args.length != 3) {
      winston.error('request expects 2 or 3 arguments, %d given', args.length);
    }

    var method = args[0].toUpperCase();
    var path   = args[1];
    var body   = args.length >= 3 ? JSON.parse(args[2]) : null;

    winston.info('%s %s', method, path);
    if (body) {
      winston.data(body);
    }

    var fun = null;
    switch (method) {
      case 'GET':    fun = client.get.bind(client, path); break;
      case 'POST':   fun = client.post.bind(client, path, body); break;
      case 'DELETE': fun = client.del.bind(client, path); break;
      case 'PUT':    fun = client.put.bind(client, path, body); break;
      case 'HEAD':   fun = client.head.bind(client, path); break;
      default:
        winston.error('Method %s not available', method);
        return cb();
    }

    fun(function (err, req, res, obj) {
      if (err) {
        winston.error('Error in request: %s', res ? res.statusCode : null, obj);
        return cb();
      }

      winston.info('Request OK: %s', res.statusCode, obj);
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

mongoose.connect(conf.mongo.uri);
mongoose.connection.on('error', function (err) {
  winston.error('MongoDB error', err);
  mongoose.connection.close();
});
mongoose.connection.on('open', function () {
  winston.info('Connected to MongoDB');
});
mongoose.connection.on('close', function () {
  winston.info('Disconnected from MongoDB');
  mongoose.connection.removeAllListeners();
  rl.close();
});

Application.findOne({'name': '$SCRIPT$'}).exec(function (err, app) {
  if (err || !app) {
    winston.error('Error finding the $SCRIPT$ app', err);
    return mongoose.connection.close();
  }
  session.app = app.id;

  winston.debug('Found app id: %s', app.id);
  winston.info('Using device id: %s', session.device);

  askLine();
});