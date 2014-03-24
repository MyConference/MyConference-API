var async = require('async');
var mongoose = require('mongoose');
var restify = require('restify');
var winston = require('winston');
var config = require('../config.js');

/* Models */
var InviteCode  = mongoose.model('InviteCode');
var User        = mongoose.model('User');
var Conference  = mongoose.model('Conference');

/* Middleware */
var bodyCheck = require('../middleware/body_check.js').bodyCheck;
var tokenCheck = require('../middleware/token_check.js').tokenCheck;

var errors = require('../errors.js');

module.exports = function (server) {

  server.get('/invite-codes/:uuid',

    /* Only users can access */
    tokenCheck(true),

    function (req, res, next)
  {
    async.waterfall([

      /* Get the code */
      function (cb) {
        InviteCode.findById(req.params.uuid)
        .populate('conference')
        .populate('created_by')
        .populate('used_by')
        .exec(function (err, code) {
          if (err) return cb(err);

          if (!code) {
            return cb(new restify.NotFoundError());
          }

          cb(null, code);
        });
      },

      /* Check the invite is ours */
      function (code, cb) {
        if (code.created_by.id != req.user.id) {
          return next(new restify.ForbiddenError());
        }

        next(null, code);
      }

    ], function (err, code) {
      if (err) {
        return next(err);
      }

      res.send(code.toFullRepr());
      next();
    });
  });

  server.post('/invite-codes',

    /* Only users can access */
    tokenCheck(true),

    /* Check body */
    bodyCheck({
      'type': Object
    }),

    function (req, res, next)
  {
    async.waterfall([

    ], function (err, code) {
      if (err) {
        return next(err);
      }

      res.send(code.toFullRepr());
      next();
    });
  });

}