var m = require('mithril');
var chessground = require('chessground');
var fenbar = require('./fenbar');
var features = require('./features');

function visualBoard(ctrl) {
  return m('div.lichess_board_wrap', m('div.lichess_board', [
    chessground.view(ctrl.ground)
  ]));
}

function info(ctrl) {
  return [m('div.explanation', [
    m('p', "Before choosing the right move you should first be aware of the tactical features in a position."),
    m('div.control.button', {
      onclick: function() {
        ctrl.nextFen();
      }
    }, 'Random Position ↻')
  ])];
}
module.exports = function(ctrl) {
  return m("div.all", [
    m('div.board_left',
      features(ctrl)
    ),
    m('div.lichess_game', [
      visualBoard(ctrl), m('div.lichess_ground', info(ctrl))
    ]),
    m('div.underboard', [
      m('div.center', [
        fenbar(ctrl)
      ])
    ])
  ]);
};
