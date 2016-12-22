var m = require('mithril');

module.exports = function(controller) {
  return [
    m('div.timer', "time: " + controller.time())
  ];
};
