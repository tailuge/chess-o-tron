var m = require('mithril');
var feature = require('./feature');

module.exports = function(controller) {
  return m('div.featuresall', [
    m('ul.features', controller.features().map(f => feature(controller, f)))
  ]);

};
