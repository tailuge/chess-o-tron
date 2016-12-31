/**
 * Read from stdin and filter lines that have given feature.
 * Takes FENs and PGNs. For PGNs will stop searching after feature first detected.
 * 
 */

var Chess = require('chess.js').Chess;
var c = require('./chessutils');


function handle(callback) {

    process.stdin.resume();

    var readline = require('readline');
    var rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        terminal: false
    });

    console.log("module.exports = [");

    rl.on('close', function() {
        console.log("];");
    });

    rl.on('line', function(line) {
        if (/.*\/.*\/.*\/.*/.test(line)) {
            // if line is a fen filter using callback
            var fen = c.repairFen(line);
            if (callback(fen)) {
                console.log('"' + fen + '",');
            }
        }
        else if (/1.*2.*3.*4.*5.*6.*7.*8.*9.*10.*11.*/.test(line)) {
            var chess = new Chess();
            if (chess.load_pgn(line)) {
                var game = new Chess();
                var fens = [];
                chess.history().forEach(move => {
                    game.move(move, {
                        sloppy: true
                    });

                    // skip opening moves
                    if (game.history().length < 8) {
                        return;
                    }

                    // skip positions in check
                    if (!game.in_check()) {
                        fens.push(game.fen());
                    }
                });

                var first = fens.find(f => callback(f));
                if (first) {
                    console.log('"' + first + '",');
                }
            }
        }
    });

}

module.exports.handle = handle;
