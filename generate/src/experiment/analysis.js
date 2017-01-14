var Chess = require('chess.js').Chess;
var generate = require('./generate');
var mygames = require('./mygames');
var singlegame = require('./singlegame');

//var games = combineMovesAndAnalysis(mygames.currentPageResults.filter(g => g.analysis));

//enrichWithFens(games[0]);
//enrichWithFeatures(games[0]);

//console.log(JSON.stringify(games[0]));

function combineMovesAndAnalysis(games) {
    games.forEach(g => {
        g.analysis.forEach((a, i) => a.move = g.moves.split(' ')[i]);
        g.analysis.forEach(a => a.moveRating = a.best ? 'bad' : 'good');
    });
    return games;
}

function enrichWithFens(game) {
    var chess = new Chess();
    game.analysis.forEach(a => {
        chess.move(a.move);
        a.fen = chess.fen();
    });
}

function enrichWithFeatures(game) {
    game.analysis.forEach(a => {
        a.features = generate.extractFeatures(a.fen);
    });
}

singlegame.analysis.forEach(a => {
    a.features.forEach(f => {
        a[(f.side === 'w' ? 'White ' : 'Black ') + f.description] = f.targets.length * (f.side === 'w' ? 1 : -1);
    });
    if (a.mate) {
        a.eval = Math.sign(a.mate) * 1500;
        delete a.mate;
    }
    a.eval = a.eval / 100;
    if (a.eval > 15) {
        a.eval = 15;
    }
    if (a.eval < -15) {
        a.eval = -15;
    }
    delete a.features;
    delete a.move;
    delete a.moveRating;
    delete a.fen;
    delete a.best;
    delete a.variation;
    delete a.judgment;
});

console.log(JSON.stringify(singlegame.analysis));
