var mongoose = require('mongoose');

var ObjectID = mongoose.Schema.Types.ObjectId;
var Mixed = mongoose.Schema.Types.Mixed;

var loginSchema = mongoose.Schema({
  '_id':   String,

  'type':  { 'type': String, 'index': true },
  'user':  { 'type': String, 'index': true, 'ref': 'User' },
  'data': Mixed
});

module.exports = mongoose.model('LoginMethod', loginSchema);