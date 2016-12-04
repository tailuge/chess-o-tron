/**
 * Read from stdin and apply puzzle generator to each line
 * 
 * cat raw.puzzles | node absolutePin.js | node loosePieces.js | node checkingSquares.js | sed 's/$/,/' > enriched.js
 * 
 */
function handle(callback) {

    var readline = require('readline');
    var rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        terminal: false
    });

    rl.on('close', function() {});

    rl.on('line', function(line) {
        var puzzle;
        try {
            puzzle = JSON.parse(line);
        }
        catch (e) {
            if (/.*\/.*\/.*\/.*/.test(line)) {
                // if line is a fen, convert to puzzle
                puzzle = {
                    fen: line,
                    features: []
                };
            } else {
                // skip non fen lines
                return;
            }
        }
        puzzle.fen = puzzle.fen.replace(/0$/, "2");
        console.log(JSON.stringify(callback(puzzle)));
    });

}

module.exports.handle = handle;
