var async = require('async');
var errors = require('../errors.js');

function matchType (object, type) {
  if (type === null) {
    return true;

  } else if (type === String) {
    return (typeof object === 'string');

  } else if (type === Date) {
    return (typeof object === 'string')
        && object.match(/^(\d{4}\-\d\d\-\d\d([tT][\d:\.]*)?)([zZ]|([+\-])(\d\d):?(\d\d))?$/);

  } else if (type === Number) {
    return (typeof object === 'number');

  } else if (type === Boolean) {
    return (typeof object === 'boolean');

  } else if (type === Object) {
    return (typeof object === 'object') && !Array.isArray(object);

  } else if (type === Array) {
    return (Array.isArray(object));

  } else  {
    throw new Error('Invalid type: ' + type);
  }
}


function checkObjectSchema (schema, object, cb) {
  if (!object && schema.optional) {
    return cb(null);
  }

  // Get list of allowed types
  var type = schema.type;
  if (!(type instanceof Array)) {
    type = [type];
  }

  // Check if it matches with any type
  var matched = null;
  for (t in type) {
    if (matchType(object, type[t])) {
      matched = type[t];
      break;
    }
  }

  // If not matches, error!
  if (!matched) {
    return cb({
      'error': 'type_mismatch',
      'path': []
    });
  }

  if (matched === Array && schema.elements) {
    // If Array and 'elements', check subelements
    var idx = 0;
    async.eachSeries(object, function (subobj, icb) {
      var currIdx = idx++;

      checkObjectSchema(schema.elements, subobj, function (err) {
        if (err) {
          err.path.unshift(currIdx);
          return icb(err);
        }
        return icb(null);
      });
    }, cb);

  } else if (matched === Object && schema.fields) {
    // If Object and 'fields', check subfields
    async.each(Object.keys(schema.fields), function (f, icb) {
      if (object[f] === undefined) {
        return icb({
          'error': 'missing_field',
          'path': [f]
        });
      }

      checkObjectSchema(schema.fields[f], object[f], function (err) {
        if (err) {
          err.path.unshift(f);
          return cb(err);
        }

        return cb(null);
      });
    }, cb);

  } else {
    // Else, return
    return cb(null);
  }
}

/* Performs an object check on the body */
module.exports.bodyCheck = function (bodySchema) {
  return function (req, res, next) {
    checkObjectSchema(bodySchema, req.body, function (err) {
      if (err) {
        var exc = new errors.InvalidBodyError();
        exc.message = err;
        return next(exc);
      }

      next(null);
    });
  };
}