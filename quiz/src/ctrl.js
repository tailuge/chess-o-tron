var m = require('mithril');
var groundBuild = require('./ground');
var generate = require('../../explorer/src/calc/generate');
var diagram = require('../../explorer/src/calc/diagram');
var fendata = require('../../explorer/src/calc/fendata');
var queryparam = require('../../explorer/src/util/queryparam');

module.exports = function(opts, i18n) {

  var fen = m.prop(opts.fen);
  var selection = m.prop("Knight forks");
  var features = m.prop(generate.extractSingleFeature(selection(),fen()));
  var ground;
  var score = m.prop(0);
  var bonus = m.prop("");
  var time = m.prop(60.0);
  var correct = m.prop([]);
  var incorrect = m.prop([]);
  
  function showGround() {
    if (!ground) ground = groundBuild(fen(), onSquareSelect);
  }
  
  function newGame() {
    score(0);
    bonus("");
    time(60);
    correct([]);
    incorrect([]);
  }



  function onSquareSelect(target) {
    if (correct().includes(target) || incorrect().includes(target)) {
      target = '';    
    }
    else
    if (generate.featureFound(features(), target)) {
      correct().push(target);
      score(score() + 1);
    }
    else {
      incorrect().push(target);
      score(score() - 1);
    }

    ground.set({
      fen: fen(),
    });
    var clickedDiagram = diagram.clickedSquares(features(), correct(), incorrect(), target);
    ground.setShapes(clickedDiagram);
    m.redraw();
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
    fen(value);
    ground.set({
      fen: fen(),
    });
    ground.setShapes([]);
    features(generate.extractFeatures(fen()));
  }

  function nextFen(dest) {
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
    selection: selection
  };
};
