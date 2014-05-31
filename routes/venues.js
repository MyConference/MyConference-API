var async = require('async');
var mongoose = require('mongoose');
var restify = require('restify');
var winston = require('winston');
var config = require('../config.js');

/* Models */
var LoginMethod = mongoose.model('LoginMethod');
var User        = mongoose.model('User');
var Conference  = mongoose.model('Conference');
var Venue       = mongoose.model('Venue');

/* Middleware */
var bodyCheck = require('../middleware/body_check.js').bodyCheck;
var tokenCheck = require('../middleware/token_check.js').tokenCheck;

var errors = require('../errors.js');

module.exports = function (server) {

  server.get('/venues/:uuid',
    /* Token check */
    tokenCheck(false),

    /* Actual code */
    function (req, res, next)
  {
    async.waterfall([

      /* Get the venue */
      function (cb) {
        Venue.findById(req.params.uuid)
        .populate('conference')
        .exec(function (err, venue) {
          if (err) return cb(err);

          if (!venue) {
            return cb(new restify.NotFoundError());
          }

          cb(null, venue);
        });
      },

    ], function (err, venue) {
      if (err) {
        return next(err);
      }

      res.send(venue.toFullRepr());
      next();
    });
  });


  server.post('/venues',
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


        /* Name of the venue */
        'name': {
          'type': String
        },

        /* Location of the venue */
        'location': {
          'type': Object,
          'fields': {

            'lat': {
              'type': Number
            },

            'lng': {
              'type': Number
            }
          }
        },

        /* Details of thevenue */
        'details': {
          'type': String
        }

      }
    }),

    /* Actual code */
    function (req, res, next)
  {
    async.waterfall([

      /* Get the conference in which the venue is being added */
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

      /* Check the user has rights to add a venue to the conf */
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

      /* Create and save the venue */
      function (conf, cb) {
        var venue = new Venue({
          'name': req.body.name,
          'location': req.body.location,
          'details': req.body.details,

          'conference':  conf.id
        });

        venue.save(function (err) {
          if (err) return cb(err);

          cb(null, venue, conf);
        });
      },

      /* Update the conference to contain the venue */
      function (venue, conf, cb) {
        conf.venues.push(venue.id);
        conf.save(function (err) {
          if (err) return cb(err);

          cb(null, venue);
        });
      }

    ], function (err, venue) {
      if (err) {
        return next(err);
      }

      res.send(venue.toFullRepr());
      next();
    });
  });
};