var async = require('async');
var mongoose = require('mongoose');
var restify = require('restify');
var winston = require('winston');
var config = require('../config.js');

/* Models */
var User        = mongoose.model('User');
var Conference  = mongoose.model('Conference');
var Document    = mongoose.model('Document');

/* Middleware */
var bodyCheck = require('../middleware/body_check.js').bodyCheck;
var tokenCheck = require('../middleware/token_check.js').tokenCheck;

var errors = require('../errors.js');

module.exports = function (server) {

  server.get('/documents/:uuid',
    /* Token check */
    tokenCheck(false),

    /* Actual code */
    function (req, res, next)
  {
    async.waterfall([

      /* Get the document */
      function (cb) {
        Document.findById(req.params.uuid)
        .populate('conference')
        .exec(function (err, doc) {
          if (err) return cb(err);

          if (!doc) {
            return cb(new restify.NotFoundError());
          }

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


  server.post('/documents',
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


        /* Document title */
        'title': {
          'type': String
        },

        /* Document description */
        'description': {
          'type': String
        },

        /* Document data type */
        'type': {
          'type': String
        },

        /* Document data */
        'data': {
          'type': null
        }
      }
    }),

    /* Actual code */
    function (req, res, next)
  {
    async.waterfall([

      /* Get the conference in which the doc is being added */
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

      /* Create and save the doc */
      function (conf, cb) {
        var doc = new Document({
          'title':       req.body.title,
          'description': req.body.description,
          'type':        req.body.type,
          'data':        req.body.data,

          'conference':  conf.id
        });

        doc.save(function (err) {
          if (err) return cb(err);

          cb(null, doc, conf);
        });
      },

      /* Update the conference to contain the doc */
      function (doc, conf, cb) {
        conf.documents.push(doc.id);
        conf.save(function (err) {
          if (err) return cb(err);

          cb(null, doc);
        });
      }

    ], function (err, doc) {
      if (err) {
        return next(err);
      }

      res.send(doc.toFullRepr());
      next();
    });
  });


  server.patch('/documents/:uuid',
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
        'description': {
          'type': String,
          'optional': true
        },

        /* Document data type */
        'type': {
          'type': String,
          'optional': true
        },

        /* Document data */
        'data': {
          'type': null,
          'optional': true
        }
      }
    }),

    /* Actual code */
    function (req, res, next)
  {
    async.waterfall([

      /* Get the conference in which the doc is being edited */
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

      /* Check the user has rights to edit a doc to the conf */
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

      /* Get the document */
      function (conf, cb) {
        Document.findById(req.params.uuid)
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
        doc.title       = req.body.title       || doc.title,
        doc.description = req.body.description || doc.description,
        doc.type        = req.body.type        || doc.type,
        doc.data        = req.body.data        || doc.data,

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


  server.del('/documents/:uuid', 

    tokenCheck(true),

    function (req, res, next)
  {
    async.waterfall([

      /* Obtain the document */
      function (cb) {
        Document
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
        Document.findById(doc.id).remove().exec(function (err) {
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