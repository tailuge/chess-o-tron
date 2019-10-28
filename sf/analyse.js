var Chess = require('chess.js').Chess;
var stockfish = require("stockfish");
var sf = new stockfish();

async function bestMove(fen) {
    return new Promise((resolve, reject) => {
        sf.onmessage = (event) => {
            if (/^bestmove/.test(event)) {
                resolve(event);
            }
        };
        sf.postMessage('position fen ' + fen);
        sf.postMessage('go depth 14');
    });
}

async function main() {
    var chess = new Chess();
    chess.load_pgn('1. e4 e5 2. f4 exf4 3. Nf3 Be7 4. Bc4 Bh4+ 5. g3 Bxg3+??')
    console.log(await bestMove(chess.fen()));
}

main();
