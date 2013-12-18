var async = require('async');
var mongoose = require('mongoose');
var restify = require('restify');
var winston = require('winston');
var conf = require('../config.js');

/* Models */
var LoginMethod = mongoose.model('LoginMethod');
var User = mongoose.model('User');

/* Middleware */
var bodyCheck = require('../middleware/body_check.js').bodyCheck;
var tokenCheck = require('../middleware/token_check.js').tokenCheck;

var errors = require('../errors.js');

module.exports = function (server) {

  server.get('/users/:uuid',
    /* Token check */
    tokenCheck(false),

    /* Actual code */
    function (req, res, next)
  {


    async.waterfall([
      /* Get the user */
      function (cb) {
        User.findById(req.params.uuid, function (err, user) {
          if (err) {
            return cb(err);
          }

          if (!user) {
            return cb(new restify.NotFoundError());
          }

          return cb(null, user);
        });
      },
    ],

    /* Send the results */
    function (err, user) {
      if (err) {
        return next(err);
      }

      res.send({
        'id': user.id,
        'uri': req.baseUri + '/users/' + user.id
      });
      next();
    });
  });

};