var m = require('mithril');

module.exports = function(controller) {
  return [
    m('div.breakbar', [
      m('div.breakbarindicator' + (controller.breaklevel() > 66 ? '.gold' : ''), {
        style: {
          width: controller.breaklevel() + "%"
        }
      }),
      m('div.breakarea', 'break'),
    ])

  ];
};
