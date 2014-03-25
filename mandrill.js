var mandrill = require('mandrill-api/mandrill');
var conf = require('./config.js');
module.exports = new mandrill.Mandrill(conf.mandrill.apiKey);