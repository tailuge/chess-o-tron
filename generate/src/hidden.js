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

    addHiddenAttackers(fen, features, potentialCaptures);
}

function addHiddenAttackers(fen, features, potentialCaptures) {
    var chess = new Chess(fen);
    var targets = [];
    potentialCaptures.forEach(pair => {
        var revealingMoves = c.movesThatResultInCaptureThreat(fen, pair.attacker, pair.attacked, true);
        if (revealingMoves.length > 0) {
            targets.push({
                target: pair.attacker,
                marker: '⥇',
                diagram: diagram(pair.attacker, pair.attacked, revealingMoves)
            });
        }
    });

    features.push({
        description: "Hidden attacker",
        side: chess.turn(),
        targets: targets
    });

}


function diagram(from, to, revealingMoves) {
    var main = [{
        orig: from,
        dest: to,
        brush: 'red'
    }];
    var reveals = revealingMoves.map(m => {
        return {
            orig: m.from,
            dest: m.to,
            brush: 'paleBlue'
        };
    });
    return main.concat(reveals);
}
