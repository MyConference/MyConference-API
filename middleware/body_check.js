var restify = require('restify');


function checkObjectSchema (schema, object, cb) {

  cb(null);
}

/* Performsan object check on the body */
module.exports.bodyCheck = function (bodySchema) {
  return function (req, res, next) {
    checkObjectSchema(bodySchema, req.body, next);
  };
}