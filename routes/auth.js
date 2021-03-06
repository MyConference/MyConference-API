var async = require('async');
var mongoose = require('mongoose');
var restify = require('restify');
var bcrypt = require('bcrypt');
var validator = require('validator');
var winston = require('winston');

/* Models */
var Application = mongoose.model('Application');
var AccessToken = mongoose.model('AccessToken');
var RefreshToken = mongoose.model('RefreshToken');
var LoginMethod = mongoose.model('LoginMethod');
var User = mongoose.model('User');

/* Middleware */
var bodyCheck = require('../middleware/body_check.js').bodyCheck;
var tokenCheck = require('../middleware/token_check.js').tokenCheck;

var config = require('../config.js');
var errors = require('../errors.js');

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
      return cb(new errors.InvalidApplicationError());
    }

    // Else all alright 
    return cb(null, app);
  });
}

/* Define the routes */
module.exports = function (server) {

  /**
   * POST  /auth/check-user
   */
  server.post('/auth/check-user', tokenCheck(true), function (req, res, next) {
    res.send({
      'id': req.user.id,
      'uri': req.user.uri
    });

    next();
  });


  /**
   * POST  /auth/check-anon
   */
  server.post('/auth/check-anon', tokenCheck(false), function (req, res, next) {
    res.send({});
    next();
  });


  /**
   * POST  /auth/logout
   */
  server.post('/auth/logout',

    // Check token
    tokenCheck(false),

    // Check body
    bodyCheck({
      'type': Object,
      'fields': {}
    }),

    // Logout!
    function (req, res, next) {
      var user = req.user;
      var atok = req.token;

      async.parallel([
        /* Invalidate the access token */
        function (cb) {
          atok.active = false;
          atok.save(function (err) {
            cb(err);
          });
        },

        /* Find and invalidate the refresh token */
        function (cb) {
          RefreshToken
            .where('access_token').equals(atok.id)
            .setOptions({ 'multi': true })
            .update({'active': false}, function (err) {
              cb(err);
            });
        }

      ], function (err)
      {
        if (err) return next(err);

        res.end();
        next();
      });
    }
  );


  /**
   * POST  /auth/signup/ 
   */
  server.post('/auth/signup',

    // Check body fields
    bodyCheck({
      'type': Object,
      'fields': {
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
      }
    }),

    // Actual code
    function (req, res, next)
  {
    var body = req.body;
    var lmk = body.user_data.email;

    async.waterfall([
      function (cb) {
        cb(null, body.application_id);
      },

      /* Check the application exists */
      fnCheckAppExists,


      /* Check that the login method does not exist */
      function (app, cb) {
        LoginMethod.findOne()
          .where('type').equals('password')
          .where('key').equals(lmk)
          .exec(function (err, lm)
        {
          // If error, fast exit
          if (err) {
            return cb(err);
          }

          // If exists
          if (lm) {
            return cb(new errors.InvalidEmailError());
          }

          return cb(null);
        });
      },


      /* Check that the email is OK */
      function (cb) {
        if (validator.isEmail(body.user_data.email)) {
          return cb(null);
        }

        return cb(new errors.InvalidEmailError());
      },


      /* Check that the password is OK */
      function (cb) {
        if (body.user_data.password.length < 8) {
          return cb(new errors.InvalidPasswordError());
        }

        return cb(null);
      },


      /* Create the new user*/
      function (cb) {
        var user = new User({
          'conferences': {}
        });
        user.save(function (err) {
          if (err) {
            return cb(err);
          }

          return cb(null, user);
        });
      },


      /* Hash the password */
      function (user, cb) {
        bcrypt.genSalt(config.security.rounds, function (err, salt) {
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
          'type': 'password',
          'user': user.id,

          'key': lmk,
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

      res.send({
        'user': {
          'id': user.id, 
          'uri': user.uri
        }
      });
      return next();
    });
  });



  /* POST  /auth/ */
  server.post('/auth',

    // Check body fields
    bodyCheck({
      'type': Object,
      'fields': {
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
      }
    }),

    // Actual code
    function (req, res, next)
  {
    var body = req.body;

    async.waterfall([
      function (cb) {
        winston.debug('Received login attempt (%s)', body.credentials.type);
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
            var lmk = body.credentials.email;
            winston.debug('Passord login (%s)', lmk);

            async.waterfall([
              // Find a login method with the given user id
              function (icb) {
                LoginMethod.findOne()
                  .where('type').equals('password')
                  .where('key').equals(lmk)
                  .populate('user').exec(function (err, lm)
                {
                  if (err) {
                    return icb(err);
                  }

                  if (!lm) {
                    return icb(new errors.InvalidEmailOrPasswordError());
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
                    return icb(new errors.InvalidEmailOrPasswordError());
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
            winston.debug('Refresh login (%s)', body.credentials.refresh_token);

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
                if (!rtok
                 || !rtok.active 
                 || rtok.expires.getTime() < Date.now()
                 || rtok.application != app.id
                 || rtok.device != body.device_id
                ) {
                  return icb(new errors.InvalidRefreshError());
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
            
          break;
          
          default:
            winston.debug('Unknown login type!');
            cb(new errors.InvalidCredentialsError());
        }
      },

      /* Revoke old access tokens */
      function (app, user, cb) {
        winston.debug('Login OK (ID %s)', user ? user.id : 'null');

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

      /* Revoke old refresh tokens */
      function (app, user, cb) {
        RefreshToken
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

          return cb(null, user, accToken);
        });
      },

      /* Generate the refresh token */
      function (user, accToken, cb) {
        var now = Date.now();
        var refExpire = now + 28 * 86400000; // 4 weeks

        var refToken = new RefreshToken({
          'application': accToken.application,
          'device': accToken.device,

          'access_token': accToken.id,
          'user': (user ? user.id : null),

          'created': now,
          'expires': refExpire
        });

        refToken.save(function (err) {
          if (err) {
            return cb(err);
          }

          return cb(null, user, accToken, refToken);
        });
      },

    ], function (err, user, accToken, refToken) {
      if (err) {
        return next(err);
      }

      res.send({
        'access_token': accToken.id,
        'access_token_expires': accToken.expires.toISOString(),
        'refresh_token': refToken.id,
        'refresh_token_expires': refToken.expires.toISOString(),
        'user': user ? user.toMicroRepr() : null
      });

      return next();
    });
  });

};