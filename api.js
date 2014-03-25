#!/usr/bin/env node
var winston = require('winston');
var sprintf  = require('sprintf');

var server = require('./server.js');

/* =========================== */
/* === SETUP CONFIGURATION === */

var conf = require('./config.js');


/* ===================== */
/* === SETUP WINSTON === */

winston.clear();
winston.cli();
winston.add(winston.transports.Console, {
  'timestamp': false,
  'prettyPrint': true,
  'colorize': conf.debug,
  'level': conf.test ? 'warn' : conf.debug ? 'debug' : 'info'
});


winston.info('MyConference API starting in ' +
  (conf.test ? 'test' : conf.debug ? 'debug' : 'production').toUpperCase() +
  ' mode');

/* ===================== */
/* === LAUNCH SERVER === */

server.start(function (err) {
  if (err) {
    winston.error('Server failed to start: ', err);
  } else {
    winston.info('Server is up!');
  }
});


// =========================
// === GRACEFUL SHUTDOWN ===

var shutdown = function (done) {
  done = done || function () {};

  winston.info('Shutting down!');
  process.removeAllListeners();

  /* Kill app */
  var sdto = setTimeout(function () {
    winston.warn('Closing forcefully!');
    process.exit(1);
  }, 15000);
  sdto.unref();

  server.stop(function (err) {
    if (err) {
      winston.error('Server failed to stop: ', err);
    } else {
      winston.info('Server is down!');
    }
  });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);