var uuid = require('node-uuid');

module.exports = function () {
  return uuid.v4().replace(/-/g, '');
};