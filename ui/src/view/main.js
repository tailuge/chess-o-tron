var m = require('mithril');
var chessground = require('chessground');
var fenbar = require('./fenbar');
var features = require('./features');

function visualBoard(ctrl) {
  return m('div.lichess_board', [
    chessground.view(ctrl.ground)
  ]);
}

module.exports = function(ctrl) {
  return [
    visualBoard(ctrl),
    m('div.underboard', [
      m('div.center', [
        fenbar(ctrl)
      ])
    ]),
    features(ctrl)
  ];
};
