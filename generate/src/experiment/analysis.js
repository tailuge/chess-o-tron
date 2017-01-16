var Chess = require('chess.js').Chess;
var generate = require('../generate');
var mygames = require('./mygames');
var singlegame = require('./singlegame');

var games = combineMovesAndAnalysis(mygames.currentPageResults.filter(g => g.analysis).filter(g => g.players.white.userId === 'tailuge'));

enrichWithFens(games[0]);
enrichWithFeature("Pins and Skewers", games[0]);
//enrichWithFeature("Queen forks", games[0]);

console.log(JSON.stringify(games[0], 2, 2));

function combineMovesAndAnalysis(games) {
    games.forEach(g => {
        g.analysis.forEach((a, i) => a.move = g.moves.split(' ')[i]);
        g.analysis.forEach((a, i) => a.moveNo = i + 1);
        g.analysis.forEach((a, i) => a.moveColour = i % 2 == 0 ? 'white' : 'black');
        g.analysis.forEach(a => a.moveRating = a.best ? 'bad' : 'good');
    });
    return games;
}

function enrichWithFens(game) {
    var chess = new Chess();
    game.analysis.forEach(a => {
        a.fenBeforeMove = chess.fen();
        chess.move(a.move);
    });
}

function enrichWithFeature(description, game) {
    game.analysis.forEach(a => {
        if (a.moveColour === 'white' && a.moveRating === 'good') {
            var before = generate.extractSingleFeature(description, a.fenBeforeMove).filter(f => f.side === 'b')[0];
            var chess = new Chess(a.fenBeforeMove);
            chess.move(a.move);
            var after = generate.extractSingleFeature(description, chess.fen()).filter(f => f.side === 'b')[0];
            if (after.targets.length > before.targets.length) {
                a.features = after;
            }
        }
    });
}




function tocsv() {
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
}
