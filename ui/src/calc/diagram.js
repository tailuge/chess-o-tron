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

  allDiagrams: function(features) {
    var diagram = [];
    features.forEach(f => f.targets.forEach(t => {
      diagram = diagram.concat(t.diagram);
    }));
    return diagram;
  }


};
