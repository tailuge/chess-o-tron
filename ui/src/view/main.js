var m = require('mithril');
var chessground = require('chessground');
var fenbar = require('./fenbar');

function visualBoard(ctrl) {
  console.log(ctrl);
  return [m('div.lichess_board', [
    chessground.view(ctrl.ground),
    ctrl.promotion.view()
  ]),
  m('br'),
  m('div.fen',fenbar(ctrl))
  ];
}

module.exports = function(ctrl) {
  return visualBoard(ctrl);
};
