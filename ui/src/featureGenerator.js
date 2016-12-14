// deduce features from position

module.exports = function(fen) {
  return [{
    name: '♕ forks',
    side: 'w',
    targets: [{
      target: 'e4',
      diagram: [{
        orig: 'd4',
        dest: 'e5',
        brush: 'paleBlue'
      }, {
        orig: 'e5',
        dest: 'e7',
        brush: 'red'
      }, {
        orig: 'a4',
        brush: 'paleBlue'
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
    name: 'loose',
    side: 'w',
    targets: [{
      target: 'e4',
      diagram: [{
        orig: 'd4',
        brush: 'paleBlue'
      }]
    }, {
      target: 'b2',
      diagram: [{
        orig: 'c4',
        brush: 'green'
      }]
    }, {
      target: 'b2',
      diagram: [{
        orig: 'c4',
        brush: 'green'
      }]
    }]
  }];
};
