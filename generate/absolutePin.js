/**
 * Enrich puzzle with absolute pins feature if found.
 * 
 * Deduced by removing pieces in turn and testing for check.
 */

var Chess = require('./lib/chess').Chess;
var ChessExt = require('./chessExt');
var StdinReader = require('./stdinReader');

StdinReader.handle(function (puzzle) {
    var chess = new Chess();
    chess.load(puzzle.fen);
    addPinsForCurrentPlayer(puzzle.fen, puzzle.features);
    addPinsForCurrentPlayer(ChessExt.fenForOtherSide(puzzle.fen), puzzle.features);
    return puzzle;
});

function addPinsForCurrentPlayer(fen, features) {
    var chess = new Chess();
    chess.load(fen);
    var opponent = chess.turn() === 'w' ? 'b' : 'w';
    var pieces = ChessExt.piecesForColour(fen, chess.turn());
    var pinned = pieces.filter(square => ChessExt.isCheckAfterRemovingPieceAtSquare(fen, square));
    if (pinned.length !== 0) {
        features.push({
            description: "pinned pieces",
            side: chess.turn(),
            targets: pinned
        });
    }
}
