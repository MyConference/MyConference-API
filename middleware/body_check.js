module.exports.bodyCheck = function (body) {
  return function (req, res, next) {

    next();
  };
}