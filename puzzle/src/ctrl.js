var m = require('mithril');
var groundBuild = require('./ground');


module.exports = function(opts, i18n) {

  var selection = m.prop(opts.mode);
  var fen = m.prop();
  var fenForBoard = fen();

  var ground;
  var score = m.prop();
  var displayscore = m.prop();
  var beatbonus = m.prop();
  var offbeatbonus = m.prop();

  var timerId;

  function showGround() {
    if (!ground) ground = groundBuild(fenForBoard, onSquareSelect);
  }


  function newGame() {
    score(0);
    displayscore(0);

    if (!timerId) {
      timerId = setInterval(onTick, 25);
    }
  }


  function onTick() {

    var t = new Date().getTime() / 1000;
    var radians = t * 2 * Math.PI;
    var bpm = 26.7;
    var bps = bpm / 60;
    var beat = Math.sin(radians * bps);
    beatbonus(50 + beat * 50);

    var phase = Math.PI;
    var offbeat = Math.sin((radians * bps) + phase);
    offbeatbonus(50 + offbeat * 50);

    m.redraw();
  }

  function onSquareSelect(target) {
console.log(target);
  }


  showGround();
  newGame();
  m.redraw();

  return {
    fen: fen,
    ground: ground,
    onSquareSelect: onSquareSelect,
    score: score,
    displayscore: displayscore,
    beatbonus: beatbonus,
    offbeatbonus: offbeatbonus,
    selection: selection,
    newGame: newGame
  };
};
