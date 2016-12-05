/**
 * Enrich puzzle with pieces aligned with others.
 * 
 *
 */

var Chess = require('./lib/chess').Chess;
var ChessExt = require('./chessExt');
var StdinReader = require('./stdinReader');

StdinReader.handle(function(puzzle) {
    var chess = new Chess();
    chess.load(puzzle.fen);
    addAligned(puzzle.fen, puzzle.features);
    addAligned(ChessExt.fenForOtherSide(puzzle.fen), puzzle.features);
    return puzzle;
});

function addAligned(fen, features) {
    var chess = new Chess();
    chess.load(fen);

    var pieces = ChessExt.majorPiecesForColour(fen, chess.turn());
    var opponentsPieces = ChessExt.majorPiecesForColour(fen, chess.turn() == 'w' ? 'b' : 'w');

    var aligned = [];
    pieces.forEach(from => {
        var type = chess.get(from).type;
        if ((type !== 'k') && (type !=='n')) {
            opponentsPieces.forEach(to => {
                if (ChessExt.canCapture(from, chess.get(from), to, chess.get(to))) {
                    aligned.push(from);
                }
            });
        }
    });

    features.push({
        description: "aligned pieces",
        side: chess.turn(),
        targets: aligned.sort().filter(function(el, i, a) {
            return i === a.indexOf(el);
        })
    });

}
