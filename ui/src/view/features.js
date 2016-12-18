var m = require('mithril');
var feature = require('./feature');

module.exports = function(controller) {
  return m('div.featuresall', [
    m('div.black', [
      m('p', 'black'),
      m('ul.features.black', controller.features().filter(f => f.side === 'b').map(f => feature(controller, f)))
    ]),
    m('div.white', [
      m('p', 'white'),
      m('ul.features.white', controller.features().filter(f => f.side === 'w').map(f => feature(controller, f)))
    ])
  ]);
};
