/**
 * Read from stdin and filter lines that have given feature.
 * 
 */

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
        else {
            // skip non fen lines
            return;
        }
    });

}

module.exports.handle = handle;
