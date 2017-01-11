var Chess = require('chess.js').Chess;
var c = require('./chessutils');
var forks = require('./forks');
var knightforkfens = require('./fens/knightforks');
var queenforkfens = require('./fens/queenforks');
var pawnforkfens = require('./fens/pawnforks');
var rookforkfens = require('./fens/rookforks');
var bishopforkfens = require('./fens/bishopforks');
var pinfens = require('./fens/pins');
var pin = require('./pins');
var hidden = require('./hidden');
var loose = require('./loose');
var immobile = require('./immobile');
var matethreat = require('./matethreat');
var checks = require('./checks');

/**
 * Feature map 
 */
var featureMap = [{
    description: "Knight forks",
    fullDescription: "Squares from where a knight can move and fork two pieces (not pawns).",
    data: knightforkfens,
    extract: function(puzzle) {
      return forks(puzzle, 'n');
    }
  }, {
    description: "Queen forks",
    fullDescription: "Squares from where a queen can move and fork two pieces (not pawns).",
    data: queenforkfens,
    extract: function(puzzle) {
      return forks(puzzle, 'q');
    }
  }, {
    description: "Pawn forks",
    fullDescription: "Squares from where a pawn can move and fork two pieces (not pawns).",
    data: pawnforkfens,
    extract: function(puzzle) {
      return forks(puzzle, 'p');
    }
  }, {
    description: "Rook forks",
    fullDescription: "Squares from where a rook can move and fork two pieces (not pawns).",
    data: rookforkfens,
    extract: function(puzzle) {
      return forks(puzzle, 'r');
    }
  }, {
    description: "Bishop forks",
    fullDescription: "Squares from where a bishop can move and fork two pieces (not pawns).",
    data: bishopforkfens,
    extract: function(puzzle) {
      return forks(puzzle, 'b');
    }
  }, {
    description: "Loose pieces",
    fullDescription: "Pieces that are not protected by any piece of the same colour.",
    data: knightforkfens,
    extract: function(puzzle) {
      return loose(puzzle);
    }
  }, {
    description: "Checking squares",
    fullDescription: "Squares from where check can be delivered.",
    data: knightforkfens,
    extract: function(puzzle) {
      return checks(puzzle);
    }
  }, {
    description: "Hidden attackers",
    fullDescription: "Pieces that will attack an opponents piece (but not pawn) if an interviening piece of the same colour moves.",
    data: knightforkfens,
    extract: function(puzzle) {
      return hidden(puzzle);
    }
  }, {
    description: "Pins and Skewers",
    fullDescription: "Pieces that are pinned or skewered to a piece (but not pawn) of the same colour.",
    data: pinfens,
    extract: function(puzzle) {
      return pin(puzzle);
    }
  }, {
    description: "Low mobility pieces",
    fullDescription: "Pieces that have reduced mobility. i.e. Pawns that are immobile, knights with only 1 legal move, bishops with no more than 3 legal moves, rooks with no more than 6 legal moves, queens with no more than 10 legal moves and the king with no more than 2 legal moves.",
    data: knightforkfens,
    extract: function(puzzle) {
      return immobile(puzzle);
    }
  }, {
    description: "Mixed",
    fullDescription: "Use the icons to determine which feature to find.",
    data: null,
    extract: null
  }


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
    puzzle = pin(puzzle);
    puzzle = matethreat(puzzle);
    puzzle = checks(puzzle);
    puzzle = immobile(puzzle);

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

  randomFeature: function() {
    return featureMap[Math.floor(Math.random() * (featureMap.length - 1))].description;
  },

  randomFenForFeature: function(featureDescription) {
    var fens = featureMap.find(f => f.description === featureDescription).data;
    return fens[Math.floor(Math.random() * fens.length)];
  },

};
