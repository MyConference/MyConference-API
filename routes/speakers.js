var async = require('async');
var mongoose = require('mongoose');
var restify = require('restify');
var winston = require('winston');
var config = require('../config.js');

/* Models */
var LoginMethod = mongoose.model('LoginMethod');
var User        = mongoose.model('User');
var Conference  = mongoose.model('Conference');
var Speaker     = mongoose.model('Speaker');

/* Middleware */
var bodyCheck = require('../middleware/body_check.js').bodyCheck;
var tokenCheck = require('../middleware/token_check.js').tokenCheck;

var errors = require('../errors.js');

module.exports = function (server) {

  server.get('/speakers/:uuid',
    /* Token check */
    tokenCheck(false),

    /* Actual code */
    function (req, res, next)
  {
    async.waterfall([

      /* Get the organizer */
      function (cb) {
        Speaker.findById(req.params.uuid)
        .populate('conference')
        .exec(function (err, spkr) {
          if (err) return cb(err);

          if (!spkr) {
            return cb(new restify.NotFoundError());
          }

          cb(null, spkr);
        });
      },

    ], function (err, spkr) {
      if (err) {
        return next(err);
      }

      res.send(spkr.toFullRepr());
      next();
    });
  });


  server.post('/speakers',
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


        'name': {
          'type': String
        },

        'charge': {
          'type': String
        },

        'description': {
          'type': String
        },

        'picture_url': {
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

      /* Create and save the spkr */
      function (conf, cb) {
        var spkr = new Speaker({
          'name':        req.body.name,
          'charge':      req.body.charge,
          'origin':      req.body.origin,
          'description': req.body.description,
          'picture_url': req.body.picture_url,

          'conference':  conf.id
        });

        console.log(req.body.picture_url);

        spkr.save(function (err) {
          if (err) return cb(err);

          cb(null, spkr, conf);
        });
      },

      /* Update the conference to contain the spkr */
      function (spkr, conf, cb) {
        conf.speakers.push(spkr.id);
        conf.save(function (err) {
          if (err) return cb(err);

          cb(null, spkr);
        });
      }

    ], function (err, spkr) {
      if (err) {
        return next(err);
      }

      res.send(spkr.toFullRepr());
      next();
    });
  });


  server.del('/speakers/:uuid', 

    tokenCheck(true),

    function (req, res, next)
  {
    async.waterfall([

      /* Obtain the document */
      function (cb) {
        Speaker
        .findById(req.params.uuid)
        .populate('conference')
        .exec(function (err, doc) {
          if (err) {
            return cb(err);
          }

          if (!doc) {
            throw new restify.NotFoundError('document not found');
          }

          return cb(null, doc.conference, doc);
        });
      },

      /* Check the user has rights to remove a doc from the conf */
      function (conf, doc, cb) {
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

        cb(null, conf, doc);
      },

      /* Remove the document from the conference */
      function (conf, doc, cb) {
        conf.documents.remove(doc.id);
        conf.save(function (err) {
          cb(err, doc);
        });
      },

      /* Remove the document */
      function (doc, cb) {
        Speaker.findById(doc.id).remove().exec(function (err) {
          cb(err, doc);
        });
      }

    ], function (err, doc) {
      if (err) return next(err);

      res.end();
      return next();
    });
  });
};