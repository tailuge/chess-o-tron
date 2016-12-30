var Chess = require('chess.js').Chess;
var c = require('./chessutils');
var forks = require('./forks');
var knightforkfens = require('./fens/knightforks');
var queenforkfens = require('./fens/queenforks');
var pawnforkfens = require('./fens/pawnforks');
var rookforkfens = require('./fens/rookforks');
var bishopforkfens = require('./fens/bishopforks');
var hidden = require('./hidden');
var loose = require('./loose');
var pins = require('./pins');
var matethreat = require('./matethreat');
var checks = require('./checks');

/**
 * Feature map 
 */
var featureMap = [{
    description: "Knight forks",
    data: knightforkfens,
    extract: function(puzzle) {
      return forks(puzzle, 'n');
    }
  }, {
    description: "Queen forks",
    data: queenforkfens,
    extract: function(puzzle) {
      return forks(puzzle, 'q');
    }
  }, {
    description: "Pawn forks",
    data: pawnforkfens,
    extract: function(puzzle) {
      return forks(puzzle, 'p');
    }
  }, {
    description: "Rook forks",
    data: rookforkfens,
    extract: function(puzzle) {
      return forks(puzzle, 'r');
    }
  }, {
    description: "Bishop forks",
    data: bishopforkfens,
    extract: function(puzzle) {
      return forks(puzzle, 'b');
    }
  },


];

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


  featureMap: featureMap,

  /**
   * Calculate single features in the position.
   */
  extractSingleFeature: function(featureDescription, fen) {
    var puzzle = {
      fen: c.repairFen(fen),
      features: []
    };

    featureMap.forEach(f => {
       if (featureDescription === f.description) {
        puzzle = f.extract(puzzle);
      }
    });

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
  },
  
  randomFenForFeature: function(featureDescription) {
    var fens = featureMap.find(f => f.description === featureDescription).data;
    return fens[Math.floor(Math.random() * fens.length)];
  }


};
