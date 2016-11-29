/**
 * Enrich puzzle with checking squares feature if found.
 * 
 * Deduced from legal moves that check. Problem with revealed checks.
 */

var Chess = require('./lib/chess').Chess;
var ChessExt = require('./chessExt');
var StdinReader = require('./stdinReader');

StdinReader.handle(function (puzzle) {
    var chess = new Chess();
    chess.load(puzzle.fen);
    addCheckingSquares(puzzle.fen, puzzle.features);
    addCheckingSquares(ChessExt.fenForOtherSide(puzzle.fen), puzzle.features);
    return puzzle;
});

function addCheckingSquares(fen, features) {
    var chess = new Chess();
    chess.load(fen);
    var moves = chess.moves({
        verbose: true
    });
    moves = moves.filter(move => move.san.indexOf("+") > 0).map(move => move.to);
    if (moves.length !== 0) {
        features.push({
            description: "Checking Squares",
            side: chess.turn(),
            targets: moves
        });
    }
}
