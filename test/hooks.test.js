var mocha = require('mocha');
var hooks = require('./common/hooks.js');

before(hooks.before);
beforeEach(hooks.beforeEach);
afterEach(hooks.afterEach);
after(hooks.after);