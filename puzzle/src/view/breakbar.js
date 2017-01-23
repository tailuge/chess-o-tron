var m = require('mithril');

module.exports = function(controller) {
  return [
    m('div.breakbar', [
      m('div.rhythm', {
        style: {
          width: controller.beatbonus() * 0.999 + "%"
        }
      }),
      m('div.breakarea', 'pick perfect'),
    ]),
    m('div.breakbar', [
      m('div.rhythm', {
        style: {
          width: controller.offbeatbonus() * 0.999 + "%"
        }
      }),
      m('div.breakarea', 'drop perfect'),
    ])


  ];
};
