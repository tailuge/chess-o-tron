var chessground = require('chessground');

module.exports = function(data, config, pref, onSelect) {
  return new chessground.controller({
    fen: data.fen,
    viewOnly: false,
    turnColor: 'white',
    animation: {
      duration: 500
    },
    movable: {
      free: true,
      color: 'white',
      premove: true,
      dests: [],
      events: {
        after: function() {
          console.log("after");
        }
      }
    },
    drawable: {
      enabled: true
    },
    events: {
      move: function(orig, dest, capturedPiece) {
        onSelect(dest);
      },
      select: function(key) {
        onSelect(key);
      }
    }
  });
};
