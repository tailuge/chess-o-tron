var Chess = require('chess.js').Chess;
var c = require('./chessutils');

var forkMap = [];
forkMap['n'] = {
    pieceEnglish: 'Knight',
    marker: '♘♆'
};
forkMap['q'] = {
    pieceEnglish: 'Queen',
    marker: '♕♆'
};
forkMap['p'] = {
    pieceEnglish: 'Pawn',
    marker: '♙♆'
};
forkMap['b'] = {
    pieceEnglish: 'Bishop',
    marker: '♗♆'
};
forkMap['r'] = {
    pieceEnglish: 'Rook',
    marker: '♖♆'
};


module.exports = function(puzzle, forkType) {
    var chess = new Chess();
    chess.load(puzzle.fen);
    addForks(puzzle.fen, puzzle.features, forkType);
    addForks(c.fenForOtherSide(puzzle.fen), puzzle.features, forkType);
    return puzzle;
};

function addForks(fen, features, forkType) {

    var chess = new Chess();
    chess.load(fen);

    var moves = chess.moves({
        verbose: true
    });

    moves = moves.map(m => enrichMoveWithForkCaptures(fen, m));
    moves = moves.filter(m => m.captures.length >= 2);

    if (!forkType || forkType == 'q') {
        addForksBy(moves, 'q', chess.turn(), features);
    }
    if (!forkType || forkType == 'p') {
        addForksBy(moves, 'p', chess.turn(), features);
    }
    if (!forkType || forkType == 'r') {
        addForksBy(moves, 'r', chess.turn(), features);
    }
    if (!forkType || forkType == 'b') {
        addForksBy(moves, 'b', chess.turn(), features);
    }
    if (!forkType || forkType == 'n') {
        addForksBy(moves, 'n', chess.turn(), features);
    }
}

function enrichMoveWithForkCaptures(fen, move) {
    var chess = new Chess();
    chess.load(fen);

    var kingsSide = chess.turn();
    var king = c.kingsSquare(fen, kingsSide);

    chess.move(move);

    // replace moving sides king with a pawn to avoid pinned state reducing branches on fork

    chess.remove(king);
    chess.put({
        type: 'p',
        color: kingsSide
    }, king);

    var sameSidesTurnFen = c.fenForOtherSide(chess.fen());

    var pieceMoves = c.movesOfPieceOn(sameSidesTurnFen, move.to);
    var captures = pieceMoves.filter(capturesMajorPiece);

    move.captures = uniqTo(captures);
    return move;
}

function uniqTo(moves) {
    var dests = [];
    return moves.filter(m => {
        if (dests.indexOf(m.to) != -1) {
            return false;
        }
        dests.push(m.to);
        return true;
    });
}

function capturesMajorPiece(move) {
    return move.captured && move.captured !== 'p';
}

function diagram(move) {
    var main = [{
        orig: move.from,
        dest: move.to,
        brush: 'paleBlue'
    }];
    var forks = move.captures.map(m => {
        return {
            orig: move.to,
            dest: m.to,
            brush: m.captured === 'k' ? 'red' : 'blue'
        };
    });
    return main.concat(forks);
}

function addForksBy(moves, piece, side, features) {
    var bypiece = moves.filter(m => m.piece === piece);
    features.push({
        description: forkMap[piece].pieceEnglish + " forks",
        side: side,
        targets: bypiece.map(m => {
            return {
                target: m.to,
                diagram: diagram(m),
                marker: forkMap[piece].marker
            };
        })
    });
}
