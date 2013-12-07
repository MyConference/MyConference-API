var async = require('async');
var mongoose = require('mongoose');
var restify = require('restify');
var bcrypt = require('bcrypt');
var winston = require('winston');

/* Models */
var Application = mongoose.model('Application');
var AccessToken = mongoose.model('AccessToken');
var RefreshToken = mongoose.model('RefreshToken');
var LoginMethod = mongoose.model('LoginMethod');
var User = mongoose.model('User');

/* Middleware */
var bodyCheck = require('../middleware/body_check.js').bodyCheck;

/* Other */
function fnCheckAppExists (appid, cb) {
  Application.findById(appid, function (err, app) {
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
}

/* Define the routes */
module.exports = function (server) {



  /**
   * POST  /auth/signup/ 
   */
  server.post('/v0.1/auth/signup',

    // Check body fields
    bodyCheck({
      /* ID of the application */
      'application_id': {
        'type': String
      },

      /* ID of the device */
      'device_id': {
        'type': String
      },

      /* Data for the new user */
      'user_data': {
        'type': Object,
        'fields': {

          /* E-Mail of the user */
          'email': {
            'type': String
          },

          /* Password of the user */
          'password': {
            'type': String
          }
        }
      }
    }),

    // Actual code
    function (req, res, next)
  {
    var body = req.body;
    var lmid = 'password!' + body.user_data.email;

    async.waterfall([
      function (cb) {
        cb(null, body.application_id);
      },

      /* Check the application exists */
      fnCheckAppExists,


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


      /* Hash the password */
      function (user, cb) {
        bcrypt.genSalt(12, function (err, salt) {
          if (err) {
            return cb(err);
          }

          bcrypt.hash(body.user_data.password, salt, function (err, hash) {
            if (err) {
              return cb(err);
            }

            return cb(null, user, hash);
          });
        });
      },


      /* Create the new login method */
      function (user, pwd, cb) {
        var lm = new LoginMethod({
          '_id': lmid,

          'type': 'password',
          'user': user.id,
          'data': {
            'password': pwd
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



  /* POST  /auth/ */
  server.post('/v0.1/auth',

    // Check body fields
    bodyCheck({
      /* ID of the application */
      'application_id': {
        'type': String
      },

      /* ID of the device */
      'device_id': {
        'type': String
      },

      /* Credentials of the login */
      'credentials': {
        'type': Object,
        'fields': {

          /* Type of the credentials */
          'type': {
            'type': String
          }
        }
      }
    }),

    // Actual code
    function (req, res, next)
  {
    var body = req.body;

    async.waterfall([
      function (cb) {
        cb(null, body.application_id);
      },

      /* Check the application exists */
      fnCheckAppExists,

      /* Find the user trying to log in */
      function (app, cb) {
        switch (body.credentials.type) {
          /* Anonymous login */
          case 'anonymous':
            cb(null, app, null); 
          break;

          /* Login with email+password */
          case 'password':
            var lmid = 'password!' + body.credentials.email;

            async.waterfall([
              // Find a login method with the given user id
              function (icb) {
                LoginMethod.findById(lmid).populate('user').exec(function (err, lm) {
                  if (err) {
                    return icb(err);
                  }

                  if (lm.type != 'password') {
                    // WTF!
                    winston.error('Login method "%s" is of type "%s"', lmid, lm.type);
                    icb(new restify.InternalServerError());
                  }

                  return icb(null, lm);
                });
              },

              // Check the password matches
              function (lm, icb) {
                bcrypt.compare(body.credentials.password, lm.data.password, function (err, result) {
                  if (err) {
                    return icb(err);
                  }

                  if (!result) {
                    return icb(new restify.NotAuthorizedError());
                  }


                  return icb(null, lm.user);
                });
              }

              // Return the login method's user!
              ], function (err, user) {
                if (err) {
                  return cb(err);
                }

                return cb(null, app, user);
            });
          break;
          
          /* Login using a refresh token */
          case 'refresh':
            async.waterfall([
              // Find the refresh token
              function (icb) {
                RefreshToken
                  .findById(body.credentials.refresh_token)
                  .populate('user')
                  .exec(function (err, rtok)
                {
                  if (err) {
                    return icb(err);
                  }

                  return icb(null, rtok);
                });
              },

              // Check that everything is OK (appid, devid, expiration, active)
              function (rtok, icb) {
                var expires = rtok.expires.getTime();

                if (!rtok.active 
                 || expires < Date.now
                 || rtok.application != app.id
                 || rtok.device != body.device_id
                ) {
                  return icb(new restify.InvalidArgumentError('invalid refresh token'));
                }

                icb(null, rtok);
              },

              // Revoke the refresh token
              function (rtok, icb) {
                rtok.update({'active': false}, function (err) {
                  if (err) {
                    return icb(err);
                  }

                  return icb(null, rtok.user);
                });
              }

              // Return the old access token user
              ], function (err, user) {
                if (err) {
                  return cb(err);
                }

                cb(null, app, user);
            });
          break;
          
          case 'thirdparty':
            //fn(body.credentials, cb); 
            cb('not-implemented');
          break;
          
          default:
            cb(new restify.InvalidArgumentError("invalid credentials type"));
        }
      },

      /* Revoke old tokens */
      function (app, user, cb) {
        AccessToken
          .where('user').equals(user ? user.id : null)
          .where('application').equals(app.id)
          .where('device').equals(body.device_id)
          .setOptions({ 'multi': true })
          .update(
            {'active': false },
            function (err, count) {
              if (err) {
                return cb(err);
              }

              return cb(null, app, user);
            });
      },

      /* Generate the access token */
      function (app, user, cb) {
        var now = Date.now();
        var accExpire = now + 36 * 3600000; // 36 hours

        var accToken = new AccessToken({
          'application': app.id,
          'device': body.device_id,

          'user': (user ? user.id : null),

          'created': now,
          'used': now,
          'expires': accExpire
        });

        accToken.save(function (err) {
          if (err) {
            return cb(err);
          }

          return cb(null, accToken);
        });
      },

      /* Generate the refresh token */
      function (accToken, cb) {
        var now = Date.now();
        var refExpire = now + 28 * 86400000; // 4 weeks

        var refToken = new RefreshToken({
          'access_token': accToken.id,

          'application': accToken.application,
          'device': accToken.device,

          'created': now,
          'expires': refExpire
        });

        refToken.save(function (err) {
          if (err) {
            return cb(err);
          }

          return cb(null, accToken, refToken);
        });
      },

    ], function (err, accToken, refToken) {
      if (err) {
        return next(err);
      }

      res.send({
        'access_token': accToken.id,
        'access_token_expires': accToken.expires.toISOString(),
        'refresh_token': refToken.id,
        'refresh_token_expires': refToken.expires.toISOString()
      });

      return next();
    });
  });

};