/**
 * Enrich puzzle with loose pieces feature if found.
 * 
 * Deduced by placing king at pieces position in turn and testing for check.
 */

var Chess = require('./lib/chess').Chess;
var ChessExt = require('./chessExt');
var StdinReader = require('./stdinReader');

StdinReader.handle(function (puzzle) {
    var chess = new Chess();
    chess.load(puzzle.fen);
    addLoosePieces(puzzle.fen, puzzle.features);
    addLoosePieces(ChessExt.fenForOtherSide(puzzle.fen),  puzzle.features);
    return puzzle;
});

function addLoosePieces(fen,features) {
    var chess = new Chess();
    chess.load(fen);
    var king = ChessExt.kingsSquare(fen, chess.turn());
    var opponent = chess.turn() == 'w' ? 'b' : 'w';
    var pieces = ChessExt.piecesForColour(fen, opponent);
    pieces.filter(square => !ChessExt.isCheckAfterPlacingKingAtSquare(fen, king, square));
    if (pieces.length !== 0) {
        features.push({
            description: "Loose Pieces",
            side: opponent,
            targets: pieces
        });
    }
}

