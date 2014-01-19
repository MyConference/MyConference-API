var restify = require('restify');

var conf = require('../../config.js');

var client = restify.createJsonClient({
  'url':     conf.http.proto + '://' + conf.http.host,
  'version': '*',
  'headers': {
    'connection': 'close'
  }
});

module.exports = client;