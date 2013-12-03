var fs       = require('fs');
var mongoose = require('mongoose');
var restify  = require('restify');
var winston  = require('winston');

/* =========================== */
/* === SETUP CONFIGURATION === */

var DEBUG = process.env.NODE_ENV != 'production';

var conf = {
  // MongoDB and Mongoose configuration
  'mongo': {
    'uri': process.env.MOGOLAB_URI
        || process.env.MONGO_URI
        || 'mongodb://localhost/myconference-api'
  },

  // HTTP and HTTPS configuration
  'http': {
    'port': DEBUG ? 4321 : 80
  }
};


/* ===================== */
/* === SETUP WINSTON === */

winston.clear();
winston.cli();
winston.add(winston.transports.Console, {
  'level': DEBUG ? 'debug' : 'info'
});


/* ====================== */
/* === SETUP MONGOOSE === */

mongoose.connect(conf.mongo.uri);
mongoose.connection.on('error', function (err) {
  winston.error('MongoDB: %s', err);
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
  'name': 'MyConference API'
});

// Global middleware
//server.use(restify.logger());
server.use(restify.bodyParser({ mapParams: false }));

// Routes
fs.readdirSync("./routes").forEach(function (file) {
  require("./routes/" + file)(server);
});

server.listen(conf.http.port, function() {
  winston.info('Server listening at %s', server.url);
});