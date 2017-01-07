var Chess = require('chess.js').Chess;
var c = require('./chessutils');



module.exports = function(puzzle) {
    addLowMobility(puzzle.fen, puzzle.features);
    addLowMobility(c.fenForOtherSide(puzzle.fen), puzzle.features);
    return puzzle;
};

var mobilityMap = {};
mobilityMap['p'] = -1; // dissable
mobilityMap['n'] = 4;
mobilityMap['b'] = 6;
mobilityMap['r'] = 7;
mobilityMap['q'] = 13;
mobilityMap['k'] = 2;

function addLowMobility(fen, features) {
    var chess = new Chess(fen);
    var pieces = c.majorPiecesForColour(fen, chess.turn());

    pieces = pieces.map(square => {
        return {
            square: square,
            type: chess.get(square).type,
            moves: chess.moves({
                verbose: true,
                square: square
            })
        };
    });

    pieces = pieces.filter(m => {
        if (m.moves.length <= mobilityMap[m.type]) {
            m.marker = marker(m);
            return true;
        }
    });

    //    console.log(JSON.stringify(pieces));

    features.push({
        description: "Low mobility",
        side: chess.turn(),
        targets: pieces.map(t => {
            return {
                target: t.square,
                marker: t.marker,
                diagram: [{
                    orig: t.square,
                    brush: 'yellow'
                }]
            };
        })
    });
}

function marker(m) {
    if (m.type === 'p') {
        return '♙☄';
    }

    var count = m.moves.length === 0 ? '' : m.moves.length;

    if (m.type === 'n') {
        return '♘☄' + count;
    }
    if (m.type === 'r') {
        return '♖☄' + count;
    }
    if (m.type === 'b') {
        return '♗☄' + count;
    }
    if (m.type === 'q') {
        return '♕☄' + count;
    }
    if (m.type === 'k') {
        return '♔☄' + count;
    }
}
