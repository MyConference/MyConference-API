var async = require('async');
var mongoose = require('mongoose');
var restify = require('restify');
var winston = require('winston');
var config = require('../config.js');

/* Models */
var LoginMethod   = mongoose.model('LoginMethod');
var User          = mongoose.model('User');
var Conference    = mongoose.model('Conference');
var Document      = mongoose.model('Document');
var Venue         = mongoose.model('Venue');
var Announcement  = mongoose.model('Announcement');

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
          .populate('venues')
          .populate('announcements')
          .populate('organizers')
          .populate('speakers')
          .populate('users.owner')
          .populate('users.collaborator')
          .populate('users.assistant')
          .exec(function (err, conf)
        {
          if (err) {
            return cb(err);
          }

          if (!conf) {
            return cb(new restify.NotFountError('conference not found'));
          }

          cb(null, conf);
        });
      },

      /* Get the rights for the current user */
      function (conf, cb) {

        // Check the user appears on the list of users for the conference
        var perms = req.user && conf.get('users.all').some(function (user) {
          return user.id == req.user.id;
        });

        cb(null, conf, perms);
      }
    ],

    /* Send the results */
    function (err, conf, perms) {
      if (err) {
        return next(err);
      }

      var repr;
      if (perms) {
        repr = conf.toFullRepr();

      } else {
        repr = conf.toSimpleRepr();

        repr.documents = conf.documents.map(function (doc) {
          return doc.toMicroRepr();
        });

        repr.venues = conf.venues.map(function (venue) {
          return venue.toMicroRepr();
        });

        repr.announcements = conf.announcements.map(function (ann) {
          return ann.toMicroRepr();
        });
      }

      res.send(repr);
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
        },

        /* CSS class name of the conference */
        'css': {
          'type': String,
          'optional': true
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





  server.del('/conferences/:uuid',
    /* Token check */
    tokenCheck(true),

    /* Actual code */
    function (req, res, next)
    {
      async.waterfall([

      /* Get the conference */
      function (cb) {
        Conference
        .findById(req.params.uuid)
        .exec(function (err, conf) {
          if (err) return cb(err);

          if (!conf) {
            return cb(new restify.NotFoundError('conference not found'));
          }

          cb(null, conf);
        });
      },

      /* Check the user has rights to remove the conference */
      function (conf, cb) {
        var perms = []
          .concat(conf.get('users.owner'))
          .some(function (user)
        {
          return user == req.user.id;
        });

        if (!perms) {
          return cb(new restify.ForbiddenError('not allowed to remove conference'));
        }

        cb(null, conf);
      },

      /* The funny part: Remove everything that's linked to the conference */
      function (conf, cb) {
        var actions = [];

        async.parallel([
          function (icb) {
            Document.find({'_id': {'$in': conf.documents}}).remove().exec(icb);
          },
          function (icb) {
            Venue.find({'_id': {'$in': conf.venues}}).remove().exec(icb);
          },
          function (icb) {
            Announcement.find({'_id': {'$in': conf.announcements}}).remove().exec(icb);
          }
        ], function (err) {
          if (err) return cb(err);

          cb(null, conf);
        });
      },

      /* Actually delete the conference */
      function (conf, cb) {
        Conference.findById(conf.id).remove().exec(cb);
      }

    ], function (err) {
        if (err) return next(err);

        res.end();
        return next();
      });
    }
  );
};