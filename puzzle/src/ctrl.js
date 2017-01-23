var m = require('mithril');
var groundBuild = require('./ground');
var generate = require('../../generate/src/generate');
var diagram = require('../../generate/src/diagram');


module.exports = function(opts, i18n) {

  var betweenFens = false;
  var gameTotal = 40;
  var selection = m.prop(opts.mode);
  var fen = m.prop(opts.fen ? opts.fen : generate.randomFenForFeature(selection()));
  var fenForBoard = fen();
  var features = m.prop(generate.extractSingleFeature(selection(), fen()));

  var randomFeature;
  var ground;
  var score = m.prop();
  var displayscore = m.prop();
  var beatbonus = m.prop();
  var offbeatbonus = m.prop();
  var correct = m.prop([]);
  var incorrect = m.prop([]);
  var timerId;

  function showGround() {
    if (!ground) ground = groundBuild(fenForBoard, onSquareSelect);
  }


  function newGame() {
    score(0);
    displayscore(0);

    correct([]);
    incorrect([]);
    nextFen();
    if (!timerId) {
      timerId = setInterval(onTick, 25);
    }
  }


  function onTick() {

    var t = new Date().getTime() / 1000;
    var radians = t * 2 * Math.PI;
    var bpm = 26.5;
    var bps = bpm / 60;
    var beat = Math.sin(radians * bps);
    beatbonus(50 + beat * 50);

    var phase = Math.PI;
    var offbeat = Math.sin((radians * bps) + phase);
    offbeatbonus(50 + offbeat * 50);

    m.redraw();
  }

  function onSquareSelect(target) {
    if (betweenFens) {
      return;
    }
    if (correct().includes(target) || incorrect().includes(target)) {
      target = 'none';
    }
    else {
      var found = generate.featureFound(features(), target);
      if (found > 0) {
        correct().push(target);
      }
      else {
        incorrect().push(target);
        score(score() - 1);
      }
    }
    ground.set({
      fen: fenForBoard,
    });
    var clickedDiagram = diagram.clickedSquares(features(), correct(), incorrect(), target);
    ground.setShapes(clickedDiagram);
    m.redraw();
    if (generate.allFeaturesFound(features())) {

    }
  }

  function gameOver() {
    m.redraw();
  }

  function updateFen(value) {
    diagram.clearDiagrams(features());
    fen(value);
    fenForBoard = fen();
    ground.set({
      fen: fenForBoard,
    });
    ground.setShapes([]);
    correct([]);
    incorrect([]);

    var feature = selection() === 'Mixed' ? randomFeature : selection();

    features(generate.extractSingleFeature(feature, fen()));
    if (generate.allFeaturesFound(features())) {
      return nextFen();
    }
    m.redraw();
  }

  function nextFen() {
    randomFeature = generate.randomFeature();
    var feature = selection() === 'Mixed' ? randomFeature : selection();
    updateFen(generate.randomFenForFeature(feature));
  }

  function blindfold() {
    if (fenForBoard === '8/8/8/8/8/8/8/8') {
      fenForBoard = fen();
    }
    else {
      fenForBoard = '8/8/8/8/8/8/8/8';
    }
    ground.set({
      fen: fenForBoard,
    });
    m.redraw();
  }

  showGround();
  newGame();
  m.redraw();

  return {
    fen: fen,
    ground: ground,
    features: features,
    updateFen: updateFen,
    onSquareSelect: onSquareSelect,
    nextFen: nextFen,
    score: score,
    displayscore: displayscore,
    beatbonus: beatbonus,
    offbeatbonus: offbeatbonus,
    selection: selection,
    newGame: newGame,
    blindfold: blindfold,
    descriptions: generate.featureMap.map(f => f.description)
  };
};
