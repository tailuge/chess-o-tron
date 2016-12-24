var m = require('mithril');
var groundBuild = require('./ground');
var generate = require('../../explorer/src/calc/generate');
var diagram = require('../../explorer/src/calc/diagram');
var fendata = require('../../explorer/src/calc/fendata');
var queryparam = require('../../explorer/src/util/queryparam');

module.exports = function(opts, i18n) {

  var fen = m.prop(opts.fen);
  var selection = m.prop("Knight forks");
  var features = m.prop(generate.extractSingleFeature(selection(), fen()));
  var ground;
  var score = m.prop(0);
  var bonus = m.prop("");
  var time = m.prop(60.0);
  var correct = m.prop([]);
  var incorrect = m.prop([]);
  var timerId;
  var startTime;
  var lastCorrectTime;

  function showGround() {
    if (!ground) ground = groundBuild(fen(), onSquareSelect);
  }

  function newGame() {
    score(0);
    bonus("");
    time(60);
    correct([]);
    incorrect([]);
    startTime = Date.now();
    timerId = setInterval(onTick, 200);
  }

  function onTick() {
    var elapsed = Date.now() - startTime;
    time(60 - (elapsed / 1000));

    if (time() < 0) {
      clearInterval(timerId);
      time(0);
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
        correct().push(target);
        if (Date.now() - lastCorrectTime < 1000) {
          bonus("+" + found * 2 + "  combo !");
          score(score() + found*2);
        }
        else {
          bonus("+" + found);
          score(score() + found);
        }
        lastCorrectTime = Date.now();
      }
      else {
        incorrect().push(target);
        score(score() - 1);
        bonus("-1");
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
    features: features,
    updateFen: updateFen,
    onFilterSelect: onFilterSelect,
    onSquareSelect: onSquareSelect,
    nextFen: nextFen,
    showAll: showAll,
    score: score,
    bonus: bonus,
    time: time,
    selection: selection,
    newGame: newGame
  };
};
