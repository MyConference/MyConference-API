var async = require('async');
var mongoose = require('mongoose');
var restify = require('restify');

/* Models */
var Application = mongoose.model('Application');
var AccessToken = mongoose.model('AccessToken');
var RefreshToken = mongoose.model('RefreshToken');
var LoginMethod = mongoose.model('LoginMethod');
var User = mongoose.model('User');

/* Middleware */
var bodyCheck = require('../middleware/body_check.js').bodyCheck;

/* Define the routes */
module.exports = function (server) {



  /* POST  /auth/signup/ */
  server.post('/v0.1/auth/signup',

    // Check body fields
    bodyCheck({
      'application_id': String,
      'device_id': String,
      'user_data': {
        'email': String,
        'password': String
      }
    }),

    // Actual code
    function (req, res, next)
  {
    var body = req.body;
    var lmid = 'password!' + body.user_data.email;

    async.waterfall([

      /* Check the application exists */
      function (cb) {
        Application.findById(body.application_id, function (err, app) {
          // If error, fast exit
          if (err) {
            return cb(err);
          }

          // If app not found
          if (!app) {
            // TODO use a proper exception
            return cb(new restify.InvalidArgumentError("invalid application"));
          }

          // Else all alright 
          return cb(null, app);
        });
      },


      /* Check that the login method does not exist */
      function (app, cb) {
        LoginMethod.findById(lmid, function (err, lm) {
          // If error, fast exit
          if (err) {
            return cb(err);
          }

          // If exists
          if (lm) {
            return cb(new restify.InvalidArgumentError("invalid email"));
          }

          return cb(null);
        });
      },


      /* Check that the password is OK */
      function (cb) {
        if (body.user_data.password.length < 8) {
          return cb(new restify.InvalidArgumentError("invalid password"));
        }

        return cb(null);
      },


      /* Create the new user*/
      function (cb) {
        var user = new User({});
        user.save(function (err) {
          if (err) {
            return cb(err);
          }

          return cb(null, user);
        });
      },


      /* Create the new login method */
      function (user, cb) {
        var lm = new LoginMethod({
          '_id': lmid,

          'type': 'password',
          'user': user.id,
          'other': {
            'password': body.user_data.password
          }
        });
        lm.save(function (err) {
          if (err) {
            return cb(err);
          }

          return cb(null, user, lm);
        });
      }
    ],

    /* Respond to the request */
    function (err, user, lm) {
      if (err) {
        return next(err);
      }

      res.send({'user_id': user.id});
      return next();
    });
  });




};