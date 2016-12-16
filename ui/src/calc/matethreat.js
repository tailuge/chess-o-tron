var Chess = require('chess.js').Chess;
var c = require('./chessutils');



module.exports = function(puzzle) {
    var chess = new Chess();
    chess.load(puzzle.fen);
    addMateInOneThreats(puzzle.fen, puzzle.features);
    addMateInOneThreats(c.fenForOtherSide(puzzle.fen), puzzle.features);
    return puzzle;
};

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

    chess.load(c.fenForOtherSide(chess.fen()));
    var moves = chess.moves({
        verbose: true
    });
    return moves.filter(m => /#/.test(m.san)).length > 0;
}

