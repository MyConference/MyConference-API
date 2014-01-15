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
  'timestamp': !conf.debug ? false : function () {
    var date = new Date();
    return sprintf('\033[90m%02d:%02d:%02d.%03d\033[m',
      date.getHours(), date.getMinutes(), date.getSeconds(), date.getMilliseconds());
  },
  'prettyPrint': true,
  'colorize': conf.debug,
  'level': conf.debug ? 'debug' : 'info'
});


winston.data('MyConference API starting in ' +
  (conf.debug ? 'debug' : 'production').toUpperCase() +
  ' mode');

/* ====================== */
/* === SETUP MONGOOSE === */

mongoose.connect(conf.mongo.uri);
mongoose.connection.on('error', function (err) {
  winston.error('MongoDB error', err);
});
mongoose.connection.on('open', function () {
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

server.use(function (req, res, next) {
  req.baseUri = conf.http.proto + '://' + req.header('host');
  next();
});

// Routes
fs.readdirSync("./routes").forEach(function (file) {
  winston.debug('Reading routes from %s', './routes/'+file);
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


// =========================
// === GRACEFUL SHUTDOWN ===

var shutdown = function () {
  winston.info('Shutting down!');
  process.removeAllListeners();

  /* Kill app */
  var sdto = setTimeout(function () {
  	winston.warn('Closing forcefully!');
  	process.exit(1);
  }, 5000);
  sdto.unref();

  server.once('close', function () {
    winston.debug('Server closed');

    mongoose.connection.once('close', function () {
      winston.debug('MongoDB closed');
    });
    
    mongoose.connection.close();
  });

  server.close();
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);