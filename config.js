var config = {
  'debug': process.env.NODE_ENV != 'production'
};

// MongoDB and Mongoose configuration
config.mongo = {
  'uri': process.env.MOGOLAB_URI
      || process.env.MONGO_URI
      || 'mongodb://localhost/myconference-api'
};

// HTTP and HTTPS configuration
config.http = {
  'port': config.debug ? 4321 : 80
};

module.exports = config;