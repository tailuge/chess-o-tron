var m = require('mithril');
var groundBuild = require('./ground');
var generate = require('../../explorer/src/calc/generate');
var diagram = require('../../explorer/src/calc/diagram');
var fendata = require('../../explorer/src/calc/fendata');
var queryparam = require('../../explorer/src/util/queryparam');

module.exports = function(opts, i18n) {

  var fen = m.prop(opts.fen);
  var features = m.prop(generate.extractFeatures(fen()));
  var ground;
  var score = m.prop(0);
  var bonus = m.prop("");
  var time = m.prop(60.0);
  var selection = m.prop("Knight forks");
  var correct = m.prop([]);
  var incorrect = m.prop([]);

  function newGame() {
    score(0);
    bonus("");
    time(60);
    correct([]);
    incorrect([]);
  }

  function showGround() {
    if (!ground) ground = groundBuild(fen(), onSquareSelect);
  }

  function onSquareSelect(target) {
    console.log(incorrect());
    var found = false;
    features()
      .forEach(f => {
        f.targets.forEach(t => {
          if (t.target === target) {
            found = true;
          }
        });
      });

    if (found) {
      correct().push(target);
    }
    else {
      incorrect().push(target);
    }
    console.log(incorrect());
    ground.set({
      fen: fen(),
    });
    var clickedDiagram = diagram.clickedSquares(correct(), incorrect());
    console.log(JSON.stringify(clickedDiagram));
    ground.setShapes(clickedDiagram);
    m.redraw();
  }

  function onFilterSelect(side, description, target) {
    diagram.clearDiagrams(features());
    ground.setShapes([]);
    ground.set({
      fen: fen(),
    });
    //    ground.setShapes(diagram.diagramForTarget(side, description, target, features()));
    queryparam.updateUrlWithState(fen(), side, description, target);
  }

  function showAll() {
    ground.setShapes(diagram.allDiagrams(features()));
    queryparam.updateUrlWithState(fen(), null, null, "all");
  }

  function updateFen(value) {
    fen(value);
    ground.set({
      fen: fen(),
    });
    ground.setShapes([]);
    features(generate.extractFeatures(fen()));
    queryparam.updateUrlWithState(fen(), null, null, null);
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
