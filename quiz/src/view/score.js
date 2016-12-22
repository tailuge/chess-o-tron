var m = require('mithril');

module.exports = function(controller) {
  return [
    m('div.bonus', "bonus: " + controller.bonus()),
    m('div.score', "score: " + controller.score())
  ];
};
