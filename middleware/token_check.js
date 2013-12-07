var winston = require('winston');
var restify = require('restify');
var mongoose = require('mongoose');

module.exports.tokenCheck = function (requireUser) {
  return function (req, res, next) {
    var authHeader = req.headers.authorization;
    var parts = authHeader.split(' ');

    if (parts.length != 2 || parts[0] != 'Token') {
      next(new restify.NotAuthorizedError('invalid auth'));
    }

    var token = parts[1];

    mongoose.model('AccessToken')
      .findById(token)
      .populate('user')
      .populate('application')
      .exec(function (err, tok)
    {
      if (err) {
        return next(err);
      }

      if (!tok
       || !tok.active
       || tok.expires.getTime() < Date.now
       || (requireUser && !tok.user)
      ) {
        return next(new restify.NotAuthorizedError('invalid token'));
      }

      req.token = tok;
      req.user = tok.user;
      return next();
    });
  };
}