var Chess = require('chess.js').Chess;
var c = require('./chessutils');

module.exports = function(puzzle) {
    var chess = new Chess();
    chess.load(puzzle.fen);
    addCheckingSquares(puzzle.fen, puzzle.features);
    addCheckingSquares(c.fenForOtherSide(puzzle.fen), puzzle.features);
    return puzzle;
};

function addCheckingSquares(fen, features) {
    var chess = new Chess();
    chess.load(fen);
    var moves = chess.moves({
        verbose: true
    });
    var kinglocation = c.kingsSquare(fen, chess.turn() === 'w' ? 'b' : 'w');
    var mates = moves.filter(move => /\#/.test(move.san));
    var checks = moves.filter(move => /\+/.test(move.san));
    features.push({
        description: "checking squares",
        side: chess.turn(),
        targets: checks.map(m => targetAndDiagram(m.from, m.to, kinglocation))
    });

    features.push({
        description: "mating squares",
        side: chess.turn(),
        targets: mates.map(m => targetAndDiagram(m.from, m.to, kinglocation))
    });
}



function targetAndDiagram(from, to, king) {
    return {
        target: to,
        diagram: [{
            orig: from,
            dest: to,
            brush: 'paleBlue'
        }, {
            orig: to,
            dest: king,
            brush: 'red'
        }]
    };
}
