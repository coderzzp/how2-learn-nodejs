
    (function(modules) {
      function require(fileName) {
        const fn = modules[fileName];
        const module = { exports : {} };
        fn(require, module, module.exports);
        return module.exports;
      }
      require('./example/app.js');
    })({'./example/app.js': function (require, module, exports) { "use strict";

var _helloworld = require("./helloworld");

var _helloworld2 = _interopRequireDefault(_helloworld);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

console.log(_helloworld2.default); },'./helloworld': function (require, module, exports) { "use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _world = require("./world");

var _world2 = _interopRequireDefault(_world);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var a = 'hello' + _world2.default;
exports.default = a; },'./world': function (require, module, exports) { "use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
var b = 'world';
exports.default = b; },})
  