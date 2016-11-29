/**
 * Read from stdin and apply puzzle generator to each line
 */
function handle(callback) {

    var readline = require('readline');
    var rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        terminal: false
    });

    rl.on('close', function () {});

    rl.on('line', function (line) {
        console.log(JSON.stringify(callback(JSON.parse(line))));
    });

}

module.exports.handle = handle;
