var config = {
  'debug': process.env.NODE_ENV != 'production'
};

// MongoDB and Mongoose configuration
config.mongo = {
  'uri': process.env.MONGOLAB_URI
      || process.env.MONGO_URI
      || 'mongodb://localhost/myconference-api'
};

// HTTP configuration
config.http = {
  'proto': 'http',
  'port': process.env.HTTP_PORT
      || (config.debug ? 4321 : 80)
};

module.exports = config;