#!/usr/bin/env node
var winston = require('winston');
var async = require('async');
var restify = require('restify');

var args = process.argv;
var conf = require('../config.js');

// Logger
winston.clear();
winston.cli();
winston.add(winston.transports.Console, {
  'prettyPrint': true,
  'colorize': true,
  'level': 'debug'
});

if (args.length != 6) {
  winston.error('Wrong number of arguments: expected %d, given %d', 4, args.length - 2);
}

var method = args[2].toUpperCase();
var host = args[3];
var path = args[4];
var data = args[5];

var client = restify.createJsonClient({
  'url': host,
  'version': '*',
  'accept': 'application/json',
});

var fun = null;
switch (method) {
  case 'GET':    fun = client.get.bind(client);  break;
  case 'HEAD':   fun = client.head.bind(client); break;
  case 'POST':   fun = client.post.bind(client); break;
  case 'PUT':    fun = client.put.bind(client);  break;
  case 'DELETE': fun = client.del.bind(client);  break;
  default:
    winston.error('Unrecognized method %s', method);
}

if (fun) {
  var cb = function (err, req, res, obj) {
    if (err) {
      winston.error('Error on the request', err);
      process.exit(1);

    } else {
      winston.data(obj);
      process.exit(0);
    }
  };

  if (method == 'POST' || method == 'PUT') {
    fun(path, JSON.parse(data), cb);
  } else {
    fun(path, cb);
  }
}