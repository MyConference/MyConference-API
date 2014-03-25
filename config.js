var config = {
  'test':  process.env.NODE_ENV == 'test',
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
  'port': process.env.PORT
      || (config.debug ? 4321 : 80),
  'host': process.env.HOST || 'localhost:4321'
};

// Mandrill configuration
config.mandrill = {
  'apiKey':   process.env.MANDRILL_APIKEY,
  'username': process.env.MANDRILL_USERNAME
}

// Security things
config.security = {
  rounds: config.test ? 1 : config.debug ? 8 : 13
};

config.webUrl = process.env.WEB_URL

module.exports = config;