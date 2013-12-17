var restify = require('restify');
var util = require('util');

// Quick function that generates error "classes"
function error (status, name, code) {
  var err = function (message) {
    restify.RestError.call(this, {
      'restCode': code
      'statusCode': status,
      'message': message,
      'constructorOpt': err
    });
    
    this.name = name;
  };

  util.inherits(err, restify.RestError);
}

// Actual error classes
module.exports = {
  // Global errors
  'TemporarilyDisallowedError': error(403, 'TemporarilyDisallowed', 'temporarily_disallowed'),
  'PermanentlyDisallowedError': error(403, 'PermanentlyDisallowed', 'permanently_disallowed'),
  'InvalidBodyError':           error(409, 'InvalidBody', 'invalid_body'),

  // Authentication and similar errors
  'InvalidApplicationError':     error(401, 'InvalidApplication', 'invalid_application'),
  'InvalidAuthenticationError':  error(401, 'InvalidAthentication', 'invalid_authentication'),
  'InvalidAccessError':          error(401, 'InvalidAccess', 'invalid_access'),
  'InvalidRefreshError':         error(401, 'InvalidRefresh', 'invalid_refresh'),

  'InvalidEmailOrPasswordError': error(400, 'InvalidEmailOrPassword', 'invalid_email_or_password'),
  
  'InvalidCredentialsError':     error(409, 'InvalidCredentials', 'invalid_credentials'),
  'InvalidPasswordError':        error(409, 'InvalidPassword', 'invalid_password'),
  'InvalidEmailError':           error(409, 'InvalidEmail', 'invalid_email'),
};