/**
 * Enrich puzzle with forking squares feature if found.
 * 
 * issue with promotion square being counted in forks.
 * 
 */

var Chess = require('./lib/chess').Chess;
var ChessExt = require('./chessExt');
var StdinReader = require('./stdinReader');

StdinReader.handle(function(puzzle) {
    var chess = new Chess();
    chess.load(puzzle.fen);
    addForks(puzzle.fen, puzzle.features);
    addForks(ChessExt.fenForOtherSide(puzzle.fen), puzzle.features);
    return puzzle;
});

function addForks(fen, features) {
    var chess = new Chess();
    chess.load(fen);
    var moves = chess.moves({
        verbose: true
    });
    moves = moves.filter(m => isFork(fen, m));
    addForksBy(moves, 'q', 'queen', chess.turn(), features);
    addForksBy(moves, 'p', 'pawn', chess.turn(), features);
    addForksBy(moves, 'r', 'rook', chess.turn(), features);
    addForksBy(moves, 'b', 'bishop', chess.turn(), features);
    addForksBy(moves, 'n', 'knight', chess.turn(), features);
}

function isFork(fen, move) {
    var chess = new Chess();
    chess.load(fen);
    chess.move(move);

    var sameSidesTurnFen = ChessExt.fenForOtherSide(chess.fen());
    var pieceMoves = ChessExt.movesOfPieceOn(sameSidesTurnFen, move.to);
    var captures = pieceMoves.filter(capturesMajorPiece).length;
    return (captures >= 2);
}

function capturesMajorPiece(move) {
    return move.captured && move.captured !== 'p';
}

function addForksBy(moves, piece, pieceEnglish, side, features) {
    var bypiece = moves.filter(m => m.piece === piece).map(m => m.to);
    features.push({
        description: pieceEnglish + " forks",
        side: side,
        targets: bypiece.sort().filter(function(el, i, a) {
            return i === a.indexOf(el);
        })
    });
}
