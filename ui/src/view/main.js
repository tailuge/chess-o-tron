var m = require('mithril');
var chessground = require('chessground');


function visualBoard(ctrl) {
  console.log(ctrl);
  return m('div.lichess_board', {class:"chessground tiny wood merida"},[
      chessground.view(ctrl.ground),
      ctrl.promotion.view()
    ]);
}

module.exports = function(ctrl) {
  return visualBoard(ctrl);
};
