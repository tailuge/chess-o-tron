var m = require('mithril');
var feature = require('./feature');

module.exports = function(controller) {
  return m('div', [
    m('ul', controller.features.map(f => feature(controller, f)))
  ]);

};
