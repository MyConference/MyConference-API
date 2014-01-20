var async    = require('async');
var fs       = require('fs');
var mongoose = require('mongoose');
var restify  = require('restify');
var winston  = require('winston');


var conf = require('./config.js');

var Server = function () {};

/* ==================== */
/* === SETUP MODELS === */

fs.readdirSync("./models").forEach(function (file) {
  var model = require("./models/" + file);
});



/* ===================== */
/* === SETUP RESTIFY === */

Server.prototype.createServer = function () {
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

  this.server = server;
}

Server.prototype.start = function (done) {
  this.createServer();

  mongoose.connect(conf.mongo.uri);
  mongoose.connection.on('error', function (err) {
    winston.error('MongoDB error', err);
  });
  mongoose.connection.on('open', function () {
    winston.info('Connected to MongoDB');
  });

  this.server.listen(conf.http.port, function() {
    winston.info('Server listening on %s', conf.http.port);
    done();
  });
}


Server.prototype.stop = function (done) {
  var self = this;

  async.parallel([
    function (cb) {
      self.server.once('close', function () {
        winston.debug('Server closed');
        cb();
      });
      self.server.close();
    },

    function (cb) {
      mongoose.connection.once('close', function () {
        winston.debug('MongoDB closed');
        cb();
      });
      mongoose.connection.close();
    }
  ], done);
}

module.exports = new Server();