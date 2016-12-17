var uniq = require('../util/uniq');

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
    return uniq(diagram);
  },

  allDiagrams: function(features) {
    var diagram = [];
    features.forEach(f => f.targets.forEach(t => {
      diagram = diagram.concat(t.diagram);
    }));
    return uniq(diagram);
  }


};
