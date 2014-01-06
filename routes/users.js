var async = require('async');
var mongoose = require('mongoose');
var restify = require('restify');
var winston = require('winston');
var conf = require('../config.js');

/* Models */
var LoginMethod = mongoose.model('LoginMethod');
var User = mongoose.model('User');

/* Middleware */
var bodyCheck = require('../middleware/body_check.js').bodyCheck;
var tokenCheck = require('../middleware/token_check.js').tokenCheck;

var errors = require('../errors.js');

module.exports = function (server) {

  server.get('/users/:uuid',
    /* Token check */
    tokenCheck(false),

    /* Actual code */
    function (req, res, next)
  {
    async.waterfall([
      /* Get the user */
      function (cb) {
        User.findById(req.params.uuid, function (err, user) {
          if (err) {
            return cb(err);
          }

          if (!user) {
            return cb(new restify.NotFoundError());
          }

          return cb(null, user);
        });
      },
    ],

    /* Send the results */
    function (err, user) {
      if (err) {
        return next(err);
      }

      res.send(user.toFullRepr());
      next();
    });
  });


  server.get('/users/:uuid/conferences',
    /* Toekn check */
    tokenCheck(true),

    /* Actual code */
    function (req, res, next)
  {
    async.waterfall([
      /* Check it's you */
      function (cb) {
        if (req.params.uuid != req.user.id) {
          return cb(new restify.ForbiddenError());
        }

        return cb(null);
      },

      /* Get the user */
      function (cb) {
        User
          .findById(req.params.uuid)
          .populate('conferences.owner')
          .populate('conferences.collaborator')
          .populate('conferences.assistant')
          .exec(function (err, user)
        {
          if (err) {
            return cb(err);
          }

          if (!user) {
            return cb(new restify.NotFoundError());
          }

          return cb(null, user);
        });
      },

      /* Merge the conferences with the role */
      function (user, cb) {
        var userRepr = user.toFullRepr();
        cb(null, userRepr.conferences);
      }
    ],

    /* Send the results */
    function (err, result) {
      if (err) {
        return next(err);
      }

      res.send(result);
      next();
    });
  });

};