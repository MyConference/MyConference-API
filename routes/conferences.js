var async = require('async');
var mongoose = require('mongoose');
var restify = require('restify');
var winston = require('winston');
var conf = require('../config.js');

/* Models */
var LoginMethod = mongoose.model('LoginMethod');
var User = mongoose.model('User');
var Conference = mongoose.model('Conference');

/* Middleware */
var bodyCheck = require('../middleware/body_check.js').bodyCheck;
var tokenCheck = require('../middleware/token_check.js').tokenCheck;

var errors = require('../errors.js');

module.exports = function (server) {

  server.get('/conferences/:uuid',
    /* Token check */
    tokenCheck(false),

    /* Actual code */
    function (req, res, next)
  {
    async.waterfall([
      /* Get the conference */
      function (cb) {
        Conference.findById(req.params.uuid).exec(function (err, conf) {
          if (err) {
            return cb(err);
          }

          if (!conf) {
            return cb(new restify.NotFountError());
          }

          cb(null, conf);
        });
      },

      /* Get the rights for the current user */
    ],

    /* Send the results */
    function (err, conf) {
      if (err) {
        return next(err);
      }

      res.send(conf.toFullRepr());
      next();
    });
  });

};