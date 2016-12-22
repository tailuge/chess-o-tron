var m = require('mithril');

module.exports = function(controller) {
  return [
    m('select', [
      m('option', {
        value: "Knight forks"
      }, "Knight forks"),
      m('option', {
        value: "Queen forks"
      }, "Queen forks"),
    ])
  ];
};
