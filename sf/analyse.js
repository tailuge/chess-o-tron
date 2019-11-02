var Chess = require('chess.js').Chess;
var stockfish = require("stockfish");
var sf = new stockfish();
var lineByLine = require('n-readlines');

//
// usage:
// node analyse.js ../html/js/bertin.js > bertin_solutions.js
//

async function main() {
    const liner = new lineByLine(process.argv[2]);
    var line;
    while (line = liner.next()) {
        var fullLine = line.toString();
        var result = await convertLine(fullLine);
        console.log(result);
    }
}

main();

async function convertLine(line) {
    if (/moves:/.test(line)) {
        var pgn = line.match(/moves.*:[^"]*"([^"]*)"/)[1];
        line = line.replace('}', ', best: "' + await pgnToBestMove(pgn) + '"}');
    }
    return line
}


async function bestMove(fen) {
    return new Promise((resolve, reject) => {
        sf.onmessage = (event) => {
            if (/^bestmove/.test(event)) {
                resolve(event.split(' ')[1]);
            }
        };
        sf.postMessage('position fen ' + fen);
        sf.postMessage('go depth 14');
    });
}

async function pgnToBestMove(pgn) {
    var chess = new Chess();
    chess.load_pgn(pgn);
    return bestMove(chess.fen());
}
