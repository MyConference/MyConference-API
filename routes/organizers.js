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
        var org = new Organizer({
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


  server.patch('/organizers/:uuid',
    /* Token check */
    tokenCheck(true),

    /* Body check */
    bodyCheck({
      'type': Object,
      'fields': {

        /* Organizer name */
        'name': {
          'type': String,
          'optional': true
        },

        /* Oganizer origin */
        'origin': {
          'type': String,
          'optional': true
        },

        /* Organizer details */
        'details': {
          'type': String,
          'optional': true
        },

        /* Organizer details */
        'group': {
          'type': String,
          'optional': true
        }
      }
    }),

    /* Actual code */
    function (req, res, next)
  {
    async.waterfall([

      /* Get the document */
      function (cb) {
        Organizer.findById(req.params.uuid)
        .populate('conference')
        .exec(function (err, doc) {
          if (err) return cb(err);

          if (!doc) {
            return cb(new restify.NotFoundError());
          }

          cb(null, doc);
        });
      },

      /* Check the user has rights to edit a doc to the conf */
      function (doc, cb) {
        var conf = doc.conference;

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

        cb(null, doc);
      },

      /* Modify and save the doc */
      function (doc, cb) {
        doc.name    = req.body.name    || doc.name,
        doc.origin  = req.body.origin  || doc.origin,
        doc.details = req.body.details || doc.details,
        doc.group   = req.body.group   || doc.group,

        doc.save(function (err) {
          if (err) return cb(err);

          cb(null, doc);
        });
      },

    ], function (err, doc) {
      if (err) {
        return next(err);
      }

      res.send(doc.toFullRepr());
      next();
    });
  });


  server.del('/organizers/:uuid', 

    tokenCheck(true),

    function (req, res, next)
  {
    async.waterfall([

      /* Obtain the document */
      function (cb) {
        Organizer
        .findById(req.params.uuid)
        .populate('conference')
        .exec(function (err, org) {
          if (err) {
            return cb(err);
          }

          if (!org) {
            throw new restify.NotFoundError('organizer not found');
          }

          return cb(null, org.conference, org);
        });
      },

      /* Check the user has rights to remove a doc from the conf */
      function (conf, org, cb) {
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

        cb(null, conf, org);
      },

      /* Remove the document from the conference */
      function (conf, org, cb) {
        conf.documents.remove(org.id);
        conf.save(function (err) {
          cb(err, org);
        });
      },

      /* Remove the document */
      function (org, cb) {
        Organizer.findById(org.id).remove().exec(function (err) {
          cb(err, org);
        });
      }

    ], function (err, org) {
      if (err) return next(err);

      res.end();
      return next();
    });
  });
};