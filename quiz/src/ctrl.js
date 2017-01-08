var m = require('mithril');
var groundBuild = require('./ground');
var generate = require('../../generate/src/generate');
var diagram = require('../../generate/src/diagram');
var gamestate = require('./gamestate');

module.exports = function(opts, i18n) {

  var betweenFens = false;
  var gameTotal = 40;
  var selection = m.prop(opts.mode);
  var fen = m.prop(opts.fen ? opts.fen : generate.randomFenForFeature(selection()));
  var features = m.prop(generate.extractSingleFeature(selection(), fen()));

  var state = new gamestate(gameTotal);
  var randomFeature;
  var ground;
  var score = m.prop();
  var displayscore = m.prop();
  var breaklevel = m.prop();
  var correct = m.prop([]);
  var incorrect = m.prop([]);
  var timerId;

  function showGround() {
    if (!ground) ground = groundBuild(fen(), onSquareSelect);
  }


  function newGame() {
    score(0);
    displayscore(0);
    breaklevel(99);
    state.reset();
    correct([]);
    incorrect([]);
    nextFen();
    if (!timerId) {
      timerId = setInterval(onTick, 200);
    }
  }

  function onTick() {
    if (!state.gameOver) {
      breaklevel(breaklevel() * 0.99);
    }
    if (breaklevel() < 0) {
      breaklevel(0);
    }
    if (displayscore() < score()) {
      displayscore(displayscore() + 10);
    }
    if (displayscore() > score()) {
      displayscore(score());
    }

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
        var breakandscore = state.markTarget(target, breaklevel());
        breaklevel(breakandscore.breaklevel);
        score(score() + breakandscore.delta);
        correct().push(target);
      }
      else {
        incorrect().push(target);
        score(score() - 1);
        breaklevel(breaklevel() - 10);
      }
    }
    ground.set({
      fen: fen(),
    });
    var clickedDiagram = diagram.clickedSquares(features(), correct(), incorrect(), target);
    ground.setShapes(clickedDiagram);
    m.redraw();
    if (generate.allFeaturesFound(features())) {
      if (state.gameComplete()) {
        gameOver();
      }
      else {
        // since this will take 0.5 seconds to fire we must block all other events until it is run.
        betweenFens = true;
        setTimeout(function() {
          betweenFens = false;
          nextFen();
        }, 500);
      }
    }
  }

  function gameOver() {
    m.redraw();
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
    
    var feature = selection() === 'Mixed' ? randomFeature : selection();

    features(generate.extractSingleFeature(feature, fen()));
    if (generate.allFeaturesFound(features())) {
      return nextFen();
    }
    state.addTargets(features(), fen());
    m.redraw();
  }

  function nextFen() {
    randomFeature = generate.randomFeature();
    var feature = selection() === 'Mixed' ? randomFeature : selection();
    updateFen(generate.randomFenForFeature(feature));
  }

  showGround();
  newGame();
  m.redraw();

  return {
    fen: fen,
    ground: ground,
    state: state,
    features: features,
    updateFen: updateFen,
    onSquareSelect: onSquareSelect,
    nextFen: nextFen,
    score: score,
    displayscore: displayscore,
    breaklevel: breaklevel,
    selection: selection,
    newGame: newGame,
    descriptions: generate.featureMap.map(f => f.description)
  };
};
