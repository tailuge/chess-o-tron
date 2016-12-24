var m = require('mithril');
var feature = require('./feature');

module.exports = function(controller) {
  return m('div.featuresall', [
    m('div.features.both', [
      m('br'),
      m('br'),
      m('div.features.black', [
        m('p', 'Black'),
        m('ul.features.black', controller.features().filter(f => f.side === 'b').map(f => feature(controller, f)))
      ]),
      m('br'),
      m('br'),
      m('br'),
      m('br'),
      m('br'),
      m('br'),
      m('br'),
      m('br'),
      m('div.features.white', [
        m('p', 'White'),
        m('ul.features.white', controller.features().filter(f => f.side === 'w').map(f => feature(controller, f)))
      ])
    ])
  ]);
};
