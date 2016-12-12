var chessground = require('chessground');

module.exports = function(data, config, pref, onMove) {
  console.log(data.fen);
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
        console.log(orig, dest, capturedPiece);
      },
      select: function(key) {
        console.log(key);
      }
    }
  });
};
