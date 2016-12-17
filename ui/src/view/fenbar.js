var m = require('mithril');

module.exports = function(controller) {
  return [
    m('label[for=instructions]', 'FEN:'),
    m('input#instructions[type=text].form-control input-lg', {
      value: controller.fen(),
      oninput: m.withAttr('value', controller.updateFen)
    }),
    m('div', {onclick:function(){controller.nextFen()}},'↻'),
    m('div', {onclick:function(){controller.showAll()}},'kc'),
    
    m('h3', ['info: ', m('span.text-warning', controller.fen())])
  ];
};
