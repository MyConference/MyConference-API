var async = require('async');
var mongoose = require('mongoose');
var restify = require('restify');
var winston = require('winston');
var config = require('../config.js');

/* Models */
var LoginMethod  = mongoose.model('LoginMethod');
var User         = mongoose.model('User');
var Conference   = mongoose.model('Conference');
var Announcement = mongoose.model('Announcement');

/* Middleware */
var bodyCheck = require('../middleware/body_check.js').bodyCheck;
var tokenCheck = require('../middleware/token_check.js').tokenCheck;

var errors = require('../errors.js');

module.exports = function (server) {

  server.get('/announcements/:uuid',
    /* Token check */
    tokenCheck(false),

    /* Actual code */
    function (req, res, next)
  {
    async.waterfall([

      /* Get the announcement */
      function (cb) {
        Announcement.findById(req.params.uuid)
        .populate('conference')
        .exec(function (err, announcement) {
          if (err) return cb(err);

          if (!announcement) {
            return cb(new restify.NotFoundError());
          }

          cb(null, announcement);
        });
      },

    ], function (err, announcement) {
      if (err) {
        return next(err);
      }

      res.send(announcement.toFullRepr());
      next();
    });
  });


  server.post('/announcements',
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


        /* Title of the announcement */
        'title': {
          'type': String
        },

        /* Location of the announcement */
        'body': {
          'type': String
        },

        /* Date of the announcement */
        'date': {
          'type': Date
        }

      }
    }),

    /* Actual code */
    function (req, res, next)
  {
    async.waterfall([

      /* Get the conference in which the announcement is being added */
      function (cb) {
        Conference
        .findById(req.body.conference)
        .exec(function (err, conf) {
          if (err) return cb(err);

          if (!conf) {
            return cb(new restify.NotFoundError('conference nor found'));
          }

          cb(null, conf);
        });
      },

      /* Check the user has rights to add a announcement to the conf */
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

      /* Create and save the announcement */
      function (conf, cb) {
        var announcement = new Announcement({
          'title': req.body.title,
          'body': req.body.body,
          'date': new Date(req.body.date),

          'conference': conf.id
        });

        announcement.save(function (err) {
          if (err) return cb(err);

          cb(null, announcement, conf);
        });
      },

      /* Update the conference to contain the announcement */
      function (announcement, conf, cb) {
        conf.announcements.push(announcement.id);
        conf.save(function (err) {
          if (err) return cb(err);

          cb(null, announcement);
        });
      }

    ], function (err, announcement) {
      if (err) {
        return next(err);
      }

      res.send(announcement.toFullRepr());
      next();
    });
  });


  server.patch('/announcements/:uuid',
    /* Token check */
    tokenCheck(true),

    /* Body check */
    bodyCheck({
      'type': Object,
      'fields': {

        /* Document title */
        'title': {
          'type': String,
          'optional': true
        },

        /* Document description */
        'body': {
          'type': String,
          'optional': true
        },

        /* Document data type */
        'date': {
          'type': Date,
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
        AgendaEvent.findById(req.params.uuid)
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

      /* Get the document */
      function (doc, cb) {
        Announcement.findById(req.params.uuid)
        .populate('conference')
        .exec(function (err, doc) {
          if (err) return cb(err);

          if (!doc) {
            return cb(new restify.NotFoundError());
          }

          cb(null, doc);
        });
      },

      /* Modify and save the doc */
      function (doc, cb) {
        doc.title = req.body.title || doc.title,
        doc.body  = req.body.body  || doc.body,
        doc.date  = req.body.date  || doc.date,

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


  server.del('/announcements/:uuid', 

    tokenCheck(true),

    function (req, res, next)
  {
    async.waterfall([

      /* Obtain the document */
      function (cb) {
        Announcement
        .findById(req.params.uuid)
        .populate('conference')
        .exec(function (err, ann) {
          if (err) {
            return cb(err);
          }

          if (!ann) {
            throw new restify.NotFoundError('announcement not found');
          }

          return cb(null, ann.conference, ann);
        });
      },

      /* Check the user has rights to remove a ann from the conf */
      function (conf, ann, cb) {
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

        cb(null, conf, ann);
      },

      /* Remove the document from the conference */
      function (conf, ann, cb) {
        conf.documents.remove(ann.id);
        conf.save(function (err) {
          cb(err, ann);
        });
      },

      /* Remove the document */
      function (ann, cb) {
        Announcement.findById(ann.id).remove().exec(function (err) {
          cb(err, ann);
        });
      }

    ], function (err, ann) {
      if (err) return next(err);

      res.end();
      return next();
    });
  });
};