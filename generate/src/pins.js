var Chess = require('chess.js').Chess;
var c = require('./chessutils');

module.exports = function(puzzle) {
    inspectAligned(puzzle.fen, puzzle.features);
    inspectAligned(c.fenForOtherSide(puzzle.fen), puzzle.features);
    return puzzle;
};

function inspectAligned(fen, features) {
    var chess = new Chess(fen);

    var moves = chess.moves({
        verbose: true
    });

    var pieces = c.majorPiecesForColour(fen, chess.turn());
    var opponentsPieces = c.majorPiecesForColour(fen, chess.turn() == 'w' ? 'b' : 'w');

    var potentialCaptures = [];
    pieces.forEach(from => {
        var type = chess.get(from).type;
        if ((type !== 'k') && (type !== 'n')) {
            opponentsPieces.forEach(to => {
                if (c.canCapture(from, chess.get(from), to, chess.get(to))) {
                    var availableOnBoard = moves.filter(m => m.from === from && m.to === to);
                    if (availableOnBoard.length === 0) {
                        potentialCaptures.push({
                            attacker: from,
                            attacked: to
                        });
                    }
                }
            });
        }
    });

    addPins(fen, features, potentialCaptures);
}

function addPins(fen, features, potentialCaptures) {
    var chess = new Chess(fen);
    var targets = [];
    potentialCaptures.forEach(pair => {
        var revealingMoves = c.movesThatResultInCaptureThreat(fen, pair.attacker, pair.attacked, false);
        if (revealingMoves.length > 0) {
            targets.push({
                target: revealingMoves[0].from,
                marker: marker(fen, revealingMoves[0].from, pair.attacked),
                diagram: diagram(pair.attacker, pair.attacked, revealingMoves)
            });
        }
    });

    addAbsolutePinTargetForCurrentPlayer(c.fenForOtherSide(fen), targets);

    features.push({
        description: "Pins and Skewers",
        side: chess.turn() === 'w' ? 'b' : 'w',
        targets: targets
    });
}

function marker(fen, pinned, attacked) {
    var chess = new Chess(fen);
    var p = chess.get(pinned).type;
    var a = chess.get(attacked).type;
    if ((p === 'q') || (p === 'r' && (a === 'b' || a === 'n'))) {
        return '🍢';
    }
    return '📌';
}

function diagram(from, to, revealingMoves) {
    return [{
        orig: from,
        dest: to,
        brush: 'red'
    }, {
        orig: revealingMoves[0].from,
        brush: 'red'
    }];
}


function addAbsolutePinTargetForCurrentPlayer(fen, targets) {
    var chess = new Chess();
    chess.load(fen);
    var pieces = c.piecesForColour(fen, chess.turn());
    var pinnedSquares = pieces.filter(square => checkAfterRemovingPieceAtSquare(fen, square));
    if (pinnedSquares.length === 0) {
        return;
    }

    var kingCapture = checkAfterRemovingPieceAtSquare(fen, pinnedSquares[0]);

    targets.push({
        target: pinnedSquares[0],
        marker: '📌+',
        diagram: [{
            orig: kingCapture.from,
            dest: kingCapture.to,
            brush: 'red'
        }, {
            orig: pinnedSquares[0],
            brush: 'red'
        }]
    });
}

function checkAfterRemovingPieceAtSquare(fen, square) {
    var chess = new Chess(fen);
    chess.remove(square);
    if (chess.in_check()) {
        chess.load(c.fenForOtherSide(chess.fen()));
        return chess.moves({
            verbose: true
        }).filter(m => m.captured).filter(m => m.captured == 'k')[0];
    }
}
