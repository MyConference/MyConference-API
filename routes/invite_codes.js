var async = require('async');
var mongoose = require('mongoose');
var restify = require('restify');
var winston = require('winston');

var config = require('../config.js');
var mandrill = require('../mandrill.js');

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
      'type': Object,
      'fields': {

        'recipient_email': {
          'type': String
        },

        'recipient_name': {
          'type': String
        },

        'conference': {
          'type': String
        }
      }
    }),

    function (req, res, next)
  {
    async.waterfall([

      /* Get the conference */
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

      /* Check the user has rights to add an invite code to the conf */
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

      /* Create and save the invite code */
      function (conf, cb) {
        var invcode = new InviteCode({
          'created_by':      req.user.id,
          'recipient_email': req.body.recipient_email,
          'recipient_name':  req.body.recipient_name,
          'conference':      conf.id
        });

        invcode.save(function (err) {
          if (err) return cb(err);

          cb(null, invcode, conf);
        });
      },

      /* Update the conference to contain the invcode */
      function (invcode, conf, cb) {
        conf.invite_codes.push(invcode.id);
        conf.save(function (err) {
          if (err) return cb(err);

          cb(null, invcode, conf);
        });
      },

      /* Send the invitation e-mail through Mandrill */
      function (invcode, conf, cb) {
        winston.debug('Sending invitation e-mail to "' + req.body.recipient_name
          + ' <' + req.body.recipient_email + '>"');

        mandrill.messages.sendTemplate({
            'template_name':    'invitation-code',
            'template_content': [],
            'message': {
              'global_merge_vars': [
                {'name': 'CONFNAME', 'content': conf.name},
                {'name': 'JOINCODE', 'content': invcode.id},
                {'name': 'JOINURL',  'content': config.webUrl + '/redeem'},
              ],
              'to': [
                {'name': req.body.recipient_name, 'email': req.body.recipient_email}
              ]
            }
          },

          /* On Success */
          function (result) {
            winston.data(result);
            cb(null, invcode);
          },

          /* On Error */
          function (err) {
            winston.error(err);
            cb(new restify.InternalError('could not send email'));
          }
        );
      }

    ], function (err, code) {
      if (err) {
        return next(err);
      }

      res.send(code.toFullRepr());
      next();
    });
  });


  
  server.post('/invite-codes/:uuid/redeem',

    /* Only users can access */
    tokenCheck(true),

    function (req, res, next)
  {
    async.waterfall([

      /* Find the invitation code */
      function (cb) {
        InviteCode
        .findById(req.params.uuid)
        .populate('conference')
        .exec(function (err, invcode) {
          if (err) return cb(err);

          if (!invcode) {
            return cb(new restify.NotFoundError());
          }

          // Here we check the invite code is:
          // * active
          // * not used
          if (!invcode.active || invcode.used_by) {
            return cb(new errors.InvalidInviteCodeError());
          }


          cb(null, invcode);
        });
      },

      /* Check the user is not in the conference */
      function (invcode, cb) {
        var skip = false;

        req.user.conferences.all.forEach (function (conf) {
          if (invcode.conference.id == conf) {
            skip = true;
          }
        });

        cb(null, invcode, skip);
      },

      /* Add the user to the conference */
      function (invcode, skip, cb) {
        if (skip) {
          return cb(null, invcode, true);
        }

        invcode.conference.users.assistant.push(req.user.id);
        invcode.conference.save(function (err) {
          if (err) {
            return cb(err);
          }

          cb(null, invcode, false);
        });
      },

      /* Add the conference to the user */
      function (invcode, skip, cb) {
        if (skip) {
          return cb(null, invcode);
        }

        req.user.conferences.assistant.push(invcode.conference.id);
        req.user.save(function (err) {
          if (err) {
            return cb(err);
          }

          cb(null, invcode);
        });
      },

      /* Mark the invite code as used */
      function (invcode, cb) {
        invcode.active = false;
        invcode.used_date = new Date();
        invcode.used_by = req.user.id;
        invcode.save(function (err) {
          if (err) {
            return cb(err);
          }

          cb(null);
        })
      }

    ], function (err) {
      if (err) {
        return next(err);
      }

      res.send({"status":"ok"});
      next();
    });
  });
}