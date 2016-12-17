var m = require('mithril');
var chessground = require('chessground');
var fenbar = require('./fenbar');
var features = require('./features');

function visualBoard(ctrl) {
  return m('div.lichess_board_wrap', m('div.lichess_board', [
    chessground.view(ctrl.ground)
  ]));
}

function info() {
  return [m('div.explanation', [
    m('p', "Before choosing the right move you should first be aware of the tactical features in a position.")
  ])];
}
module.exports = function(ctrl) {
  return m("div.all", [
    m('div.board_left',
      features(ctrl)
    ),
    m('div.lichess_game', [
      visualBoard(ctrl), m('div.lichess_ground', info())
    ]),
    m('div.underboard', [
      m('div.center', [
        fenbar(ctrl)
      ])
    ])
  ]);
};
