var m = require('mithril');

module.exports = function(controller) {
  return [
    m('div.breakbar', [
      m('div.rhythm', {
        style: {
          width: controller.breaklevel() + "%"
        }
      }),
      m('div.breakarea', 'break'),
    ])

  ];
};
