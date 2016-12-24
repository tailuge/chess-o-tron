var m = require('mithril');

module.exports = function(ctrl) {
  return [
    m('select.selectblack', {
      onclick : function() {
        ctrl.newGame();
      }
    }, [
      m('option', {
        value: "Knight forks"
      }, "Knight forks"),
//      m('option', {
//        value: "Queen forks"
//      }, "Queen forks"),
    ])
  ];
};
