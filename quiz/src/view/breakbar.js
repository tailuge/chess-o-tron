var m = require('mithril');

module.exports = function(controller) {
  return [
    m('div.breakbar',
      m('div.breakbar.indicator', {style: {width: controller.breaklevel()+"%"}})
    )
  ];
};
