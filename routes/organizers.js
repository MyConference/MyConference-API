var async = require('async');
var mongoose = require('mongoose');
var restify = require('restify');
var winston = require('winston');
var config = require('../config.js');

/* Models */
var LoginMethod = mongoose.model('LoginMethod');
var User        = mongoose.model('User');
var Conference  = mongoose.model('Conference');
var Organizer   = mongoose.model('Organizer');

/* Middleware */
var bodyCheck = require('../middleware/body_check.js').bodyCheck;
var tokenCheck = require('../middleware/token_check.js').tokenCheck;

var errors = require('../errors.js');

module.exports = function (server) {

  server.get('/organizers/:uuid',
    /* Token check */
    tokenCheck(false),

    /* Actual code */
    function (req, res, next)
  {
    async.waterfall([

      /* Get the organizer */
      function (cb) {
        Organizer.findById(req.params.uuid)
        .populate('conference')
        .exec(function (err, org) {
          if (err) return cb(err);

          if (!org) {
            return cb(new restify.NotFoundError());
          }

          cb(null, org);
        });
      },

    ], function (err, org) {
      if (err) {
        return next(err);
      }

      res.send(org.toFullRepr());
      next();
    });
  });


  server.post('/organizers',
    /* Token check */
    tokenCheck(true),

    /* Body check */
    bodyCheck({
      'type': Object,
      'fields': {
        /* Conference in which to add the doc */
        'conference': {
          'type': String
        },


        /* Organizer name */
        'name': {
          'type': String
        },

        /* Oganizer origin */
        'origin': {
          'type': String
        },

        /* Organizer details */
        'details': {
          'type': String
        },

        /* Organizer details */
        'group': {
          'type': String
        }
      }
    }),

    /* Actual code */
    function (req, res, next)
  {
    async.waterfall([

      /* Get the conference in which the org is being added */
      function (cb) {
        Conference
        .findById(req.body.conference)
        .exec(function (err, conf) {
          if (err) return cb(err);

          if (!conf) {
            return cb(new restify.NotFoundError());
          }

          cb(null, conf);
        });
      },

      /* Check the user has rights to add a doc to the conf */
      function (conf, cb) {
        var perms = []
          .concat(conf.get('users.collaborator'))
          .concat(conf.get('users.owner'))
          .some(function (user)
        {
          return user == req.user.id;
        });

        if (!perms) {
          return cb(new restify.ForbiddenError('not allowed to edit conference'));
        }

        cb(null, conf);
      },

      /* Create and save the org */
      function (conf, cb) {
        var org = new Document({
          'name':    req.body.name,
          'origin':  req.body.origin,
          'details': req.body.details,
          'group':   req.body.group,

          'conference':  conf.id
        });

        org.save(function (err) {
          if (err) return cb(err);

          cb(null, org, conf);
        });
      },

      /* Update the conference to contain the org */
      function (org, conf, cb) {
        conf.organizers.push(org.id);
        conf.save(function (err) {
          if (err) return cb(err);

          cb(null, org);
        });
      }

    ], function (err, org) {
      if (err) {
        return next(err);
      }

      res.send(org.toFullRepr());
      next();
    });
  });
};