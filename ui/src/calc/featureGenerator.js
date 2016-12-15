var Chess = require('chess.js').Chess;
var c = require('./chessutils');
var forkingSquares = require('./forkingSquares');
var hiddenAttacks = require('./hiddenAttacks');

module.exports = {

  /**
   * Find all diagrams associated with target square in the list of features.
   */
  diagramForTarget: function(target, features) {
    var diagram = [];
    features.forEach(f => f.targets.forEach(t => {
      if (t.target === target) {
        diagram = diagram.concat(t.diagram);
      }
    }));
    return diagram;
  },

  /**
   * Find all features in the position.
   */
  extractFeatures: function(fen) {
    var puzzle = {
      fen: c.repairFen(fen),
      features: []
    };
    puzzle = forkingSquares(puzzle);
    puzzle = hiddenAttacks(puzzle);

    //     console.log(JSON.stringify(puzzle,null,1));
    return puzzle.features;
  }
};
