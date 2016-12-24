var m = require('mithril');

module.exports = function(ctrl) {
  return [
    m('select.selectblack', {
        onchange: function() {
          ctrl.selection(this.value);
          ctrl.newGame();
        }
      },
      ctrl.descriptions.map(d => {
        return m('option', {
          value: d
        }, d);
      })
    )
  ];
};
