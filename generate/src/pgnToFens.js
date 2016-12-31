/**
 * Generate FEN from PGN (skips opening)
 * 
 */

var Chess = require('chess.js').Chess;

process.stdin.resume();

var readline = require('readline');
var rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
});

rl.on('line', function(line) {
    if (/1.*2.*3.*4.*5.*6.*7.*8.*9.*10.*11.*/.test(line)) {
        var chess = new Chess();
        if (chess.load_pgn(line)) {
            var c = new Chess();
            chess.history().forEach(move => {
                c.move(move, {
                    sloppy: true
                });

                // skip opening moves
                if (c.history().length < 8) {
                    return;
                }

                // skip positions in check
                if (c.in_check()) {
                    return;
                }

                console.log(c.fen());
            });
        }
    }
});
