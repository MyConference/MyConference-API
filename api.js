var bunyan   = require('bunyan');
var fs       = require('fs');
var mongoose = require('mongoose');
var restify  = require('restify');
var sprintf  = require('sprintf');
var winston  = require('winston');

/* =========================== */
/* === SETUP CONFIGURATION === */


var conf = require('./config.js');


/* ===================== */
/* === SETUP WINSTON === */

winston.clear();
winston.cli();
winston.add(winston.transports.Console, {
  'timestamp': function () {
    var date = new Date();
    return sprintf('\033[90m%02d:%02d:%02d.%03d\033[m',
      date.getHours(), date.getMinutes(), date.getSeconds(), date.getMilliseconds());
  },
  'prettyPrint': true,
  'colorize': true,
  'level': conf.debug ? 'debug' : 'info'
});


/* ====================== */
/* === SETUP MONGOOSE === */

mongoose.connect(conf.mongo.uri);
mongoose.connection.on('error', function (err) {
  winston.error('MongoDB error: %s', err.toString());
  winston.error(err);
});
mongoose.connection.once('open', function () {
  winston.info('Connected to MongoDB');
});


/* ==================== */
/* === SETUP MODELS === */

fs.readdirSync("./models").forEach(function (file) {
  var model = require("./models/" + file);
  winston.debug("Loaded model: %s", model.modelName);
});


/* ===================== */
/* === SETUP RESTIFY === */


var server = restify.createServer({
  'name': 'MyConference API',
  'version': '0.1.0'
});

// Global middleware
//server.use(restify.logger());
server.on('after', function (req, res, route, err) {
  var stcod = res.statusCode;

  var color;
  if (stcod < 200) {
    color = 35;
  } else if (stcod < 300) {
    color = 32;
  } else if (stcod < 400) {
    color = 36;
  } else if (stcod < 500) {
    color = 33;
  } else {
    color = 31;
  }

  // Log it
  var str = '\033[97m' + req.method + '\033[m';
  str += ' ' + req.url;
  str += ' \033[' + color + 'm' + stcod + '\033[m';

  if (err) {
    str += ' \033[31m' + (err.constructor.name) + '\033[m';
  }

  var ctsize = res.headers['Content-Length']
  if (typeof ctsize !== 'undefined') {
    str += ' ' + ctsize + 'B';
  }

  winston.info(str);
});

server.use(restify.bodyParser({ mapParams: false }));

// Routes
fs.readdirSync("./routes").forEach(function (file) {
  require("./routes/" + file)(server);
});

server.get('/test',
  require('./middleware/token_check').tokenCheck(true),
  function (req, res, next) {
    res.send({'token': req.token, 'user': req.user});
    next();
  });

server.listen(conf.http.port, function() {
  winston.info('Server listening at %s', server.url);
});