var m = require('mithril');
var groundBuild = require('./ground');
var generate = require('../../generate/src/generate');
var diagram = require('../../generate/src/diagram');
var fendata = require('../../generate/src/fendata');
var queryparam = require('../../explorer/src/util/queryparam');
var gamestate = require('./gamestate');

module.exports = function(opts, i18n) {


  var fen = m.prop(opts.fen);
  var selection = m.prop("Knight forks");
  var features = m.prop(generate.extractSingleFeature(selection(), fen()));

  var state = new gamestate(40);
  state.addTargets(features(),fen());


  var ground;
  var score = m.prop(0);
  var bonus = m.prop("");
  var time = m.prop(60.0);
  var breaklevel = m.prop(80.0);
  var correct = m.prop([]);
  var incorrect = m.prop([]);
  var timerId;

  timerId = setInterval(onTick, 200);

  function showGround() {
    if (!ground) ground = groundBuild(fen(), onSquareSelect);
  }

  function newGame() {
    score(0);
    bonus("");
    time(60);
    correct([]);
    incorrect([]);
    timerId = setInterval(onTick, 200);
    nextFen();
  }

  function onTick() {
    breaklevel(breaklevel() * 0.99);
    if (breaklevel() < 0) {
      breaklevel(0);
    }
    m.redraw();
  }

  function onSquareSelect(target) {
    if (correct().includes(target) || incorrect().includes(target)) {
      target = 'none';
    }
    else {
      var found = generate.featureFound(features(), target);
      if (found > 0) {
        var breakandscore = state.markTarget(target,breaklevel());
        breaklevel(breakandscore.breaklevel);
        score(score() + breakandscore.delta);
        correct().push(target);
      }
      else {
        incorrect().push(target);
        score(score() - 1);
        bonus("-1");
        breaklevel(breaklevel()-10);
      }
    }
    ground.set({
      fen: fen(),
    });
    var clickedDiagram = diagram.clickedSquares(features(), correct(), incorrect(), target);
    ground.setShapes(clickedDiagram);
    m.redraw();
    if (generate.allFeaturesFound(features())) {
      setTimeout(function() {
        nextFen();
      }, 500);
    }
  }

  function onFilterSelect(side, description, target) {
    diagram.clearDiagrams(features());
    ground.setShapes([]);
    ground.set({
      fen: fen(),
    });
    queryparam.updateUrlWithState(fen(), side, description, target);
  }

  function showAll() {
    ground.setShapes(diagram.allDiagrams(features()));
  }

  function updateFen(value) {
    diagram.clearDiagrams(features());
    fen(value);
    ground.set({
      fen: fen(),
    });
    ground.setShapes([]);
    correct([]);
    incorrect([]);
    features(generate.extractSingleFeature(selection(), fen()));
    if (generate.allFeaturesFound(features())) {
      // not all puzzles will have desired feature
      // this should be changed for prod release.
      return nextFen();
    }
    state.addTargets(features(),fen());
    m.redraw();
  }

  function nextFen() {
    updateFen(fendata[Math.floor(Math.random() * fendata.length)]);
  }

  showGround();
  m.redraw();

  return {
    fen: fen,
    ground: ground,
    state: state,
    features: features,
    updateFen: updateFen,
    onFilterSelect: onFilterSelect,
    onSquareSelect: onSquareSelect,
    nextFen: nextFen,
    showAll: showAll,
    score: score,
    bonus: bonus,
    breaklevel: breaklevel,
    selection: selection,
    newGame: newGame,
    descriptions: generate.featureMap.map(f => f.description)
  };
};
