var shutdown = null;

var start = function (done) {
  var api = require('../../api.js');
  shutdown = api.shutdown;
  api.server.once('listening', done);
}

var stop = function (done) {
  if (shutdown != null) {
    return shutdown(done);
  }

  done();
}

module.exports.start = start;
module.exports.stop  = stop;