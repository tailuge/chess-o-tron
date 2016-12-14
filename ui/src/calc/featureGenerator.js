// deduce features from position

module.exports = {

  diagramForTarget: function(target, features) {
    var diagram = [];
    features.forEach(f => f.targets.forEach(t => {
      if (t.target === target) {
        diagram = diagram.concat(t.diagram);
      }
    }));
    return diagram;
  },

  features: function(fen) {
    return [{
      name: '♘ forks',
      side: 'w',
      targets: [{
        target: 'g3',
        diagram: [{
          orig: 'f5',
          dest: 'g3',
          brush: 'paleBlue'
        }, {
          orig: 'g3',
          dest: 'f1',
          brush: 'red'
        }, {
          orig: 'g3',
          dest: 'h1',
          brush: 'red'
        }]
      }, {
        target: 'b2',
        diagram: [{
          orig: 'c4',
          dest: 'f5',
          brush: 'green'
        }, {
          orig: 'h5',
          dest: 'a7',
          brush: 'paleBlue'
        }, {
          orig: 'g4',
          brush: 'yellow'
        }]
      }]
    }, {
      name: 'hidden',
      side: 'b',
      targets: [{
        target: 'a8',
        diagram: [{
          orig: 'a8',
          dest: 'f3',
          brush: 'red'
        }, {
          orig: 'b7',
          dest: 'b6',
          brush: 'paleBlue'
        }, {
          orig: 'b7',
          dest: 'b5',
          brush: 'paleBlue'
        }]
      }, {
        target: 'b2',
        diagram: [{
          orig: 'c4',
          brush: 'green'
        }]
      }, {
        target: 'b3',
        diagram: [{
          orig: 'c4',
          brush: 'green'
        }]
      }]
    }];
  }

};
