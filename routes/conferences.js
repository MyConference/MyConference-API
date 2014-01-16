var async = require('async');
var mongoose = require('mongoose');
var restify = require('restify');
var winston = require('winston');
var conf = require('../config.js');

/* Models */
var LoginMethod = mongoose.model('LoginMethod');
var User        = mongoose.model('User');
var Conference  = mongoose.model('Conference');

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
        Conference
          .findById(req.params.uuid)
          .populate('documents')
          .populate('users')
          .exec(function (err, conf)
        {
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
      function (conf, cb) {
        // Check the user appear on the list of users for the conference
        // TODO
        cb(conf);
      }
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


  server.post('/conferences',
    /* Token check */
    tokenCheck(true),

    /* Body check */
    bodyCheck({
      'type': Object,
      'fields': {
        /* Name of the conference */
        'name': {
          'type': String
        },

        /* Description of the conference */
        'description': {
          'type': String
        }
      }
    }),

    /* Actual code */
    function (req, res, next)
  {
    async.waterfall([
        /* Create a new conference */
        function (cb) {
          var conf = new Conference({
            'name':        req.body.name,
            'description': req.body.description,
            'users.owner': [req.user.id]
          });

          cb(null, conf);
        },

        /* Save it */
        function (conf, cb) {
          conf.save(function (err) {
            if (err) {
              return cb(err);
            }

            cb(null, conf);
          });
        },

        /* Add it to the current user */
        function (conf, cb) {
          req.user.conferences.owner.push(conf);
          req.user.save(function (err) {
            if (err) {
              return cb(err);
            }

            cb(null, conf);
          });
        }
      ],

      /* Return the conference */
      function (err, conf) {
        if (err) {
          return next(err);
        }

        res.send(conf.toFullRepr());
        next();
      });
  });

};