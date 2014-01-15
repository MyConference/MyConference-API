var mongoose = require('mongoose');
var uuid = require('node-uuid');

var ObjectID = mongoose.Schema.Types.ObjectId;
var Mixed = mongoose.Schema.Types.Mixed;

var documentSchema = mongoose.Schema({
  '_id':  { 'type': String, 'default': uuid.v4 },

  'title':       {'type': String},
  'description': {'type': String, 'default': ''},
  'type':        {'type': String, 'default': 'text'},
  'data':        {'type': Mixed},

  'conference':  {'type': String, 'ref': 'Conference'}
});

documentSchema.virtual('uri').get(function () {
  return '/documents/' + this.id;
});

documentSchema.statics.getMicroRepr = function (id) {
  return {
    'id':  id,
    'uri': '/documents/' + id
  }
};

documentSchema.methods.toMicroRepr = function () {
  return mongoose.model('Document').getMicroRepr(this.id);
};

documentSchema.methods.toSimpleRepr = function () {
  var repr = this.toMicroRepr();
  repr.title = this.title;
  repr.description = this.description;
  repr.type = this.type;
  repr.data = this.data;
  return repr;
};

documentSchema.methods.toFullRepr = function () {
  var repr = this.toFullRepr();
  repr.conference = this.conference;
  return repr;
};

module.exports = mongoose.model('Document', documentSchema);
