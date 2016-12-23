var Chess = require('chess.js').Chess;
var c = require('./chessutils');
var forks = require('./forks');
var hidden = require('./hidden');
var loose = require('./loose');
var pins = require('./pins');
var matethreat = require('./matethreat');
var checks = require('./checks');

module.exports = {

  /**
   * Calculate all features in the position.
   */
  extractFeatures: function(fen) {
    var puzzle = {
      fen: c.repairFen(fen),
      features: []
    };

    puzzle = forks(puzzle);
    puzzle = hidden(puzzle);
    puzzle = loose(puzzle);
    puzzle = pins(puzzle);
    puzzle = matethreat(puzzle);
    puzzle = checks(puzzle);

    return puzzle.features;
  },

  /**
   * Calculate single features in the position.
   */
  extractSingleFeature: function(featureDescription, fen) {
    var puzzle = {
      fen: c.repairFen(fen),
      features: []
    };

    if (featureDescription === "Queen forks") {
      puzzle = forks(puzzle,'q');
    }
    if (featureDescription === "Rook forks") {
      puzzle = forks(puzzle,'r');
    }
    if (featureDescription === "Bishop forks") {
      puzzle = forks(puzzle,'b');
    }
    if (featureDescription === "Knight forks") {
      puzzle = forks(puzzle,'n');
    }
    if (featureDescription === "Pawn forks") {
      puzzle = forks(puzzle,'p');
    }

    return puzzle.features;
  },

  featureFound: function(features, target) {
    var found = 0;
    features
      .forEach(f => {
        f.targets.forEach(t => {
          if (t.target === target) {
            found++;
          }
        });
      });
    return found;
  },

  allFeaturesFound: function(features) {
    var found = true;
    features
      .forEach(f => {
        f.targets.forEach(t => {
          if (!t.selected) {
            found = false;
          }
        });
      });
    return found;
  }


};
