/**
 * Enrich puzzle with checking squares feature if found.
 * 
 * Deduced from legal moves that check. Problem with revealed checks.
 * (try deleting all other pieces to see if it is check?)
 * grep "1q1r1k2/1b2Rpp1/p1pQ3p/PpPp4/3P1NP1/1P3P1P/6K1/8" raw.puzzles | node checkingSquares.js
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
    moves = moves.filter(move => /\+|\#/.test(move.san)).map(move => move.to);
    features.push({
        description: "checking squares",
        side: chess.turn(),
        targets: moves.sort().filter(function (el, i, a) {
            return i == a.indexOf(el);
        })
    });

}
