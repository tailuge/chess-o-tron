/**
 * Enrich puzzle with mate in one threats feature if found.
 * 
 *
 */

var Chess = require('./lib/chess').Chess;
var ChessExt = require('./chessExt');
var StdinReader = require('./stdinReader');

StdinReader.handle(function(puzzle) {
    var chess = new Chess();
    chess.load(puzzle.fen);
    addMateInOneThreats(puzzle.fen, puzzle.features);
    addMateInOneThreats(ChessExt.fenForOtherSide(puzzle.fen), puzzle.features);
    return puzzle;
});

function addMateInOneThreats(fen, features) {
    var chess = new Chess();
    chess.load(fen);
    var moves = chess.moves({
        verbose: true
    });
    
    moves = moves.filter(m => canMateOnNextTurn(fen, m));
    moves = moves.map(m => m.to);
    
    features.push({
        description: "mate in one threats",
        side: chess.turn(),
        targets: moves.sort().filter(function(el, i, a) {
            return i === a.indexOf(el);
        })
    });
}

function canMateOnNextTurn(fen, move) {
    var chess = new Chess();
    chess.load(fen);
    chess.move(move);
    if (chess.in_check()) {
        return false;
    }

    chess.load(ChessExt.fenForOtherSide(chess.fen()));
    var moves = chess.moves({
        verbose: true
    });
    return moves.filter(m => /#/.test(m.san)).length > 0;
}

