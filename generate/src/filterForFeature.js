/**
 * Generate chess puzzles by stepping through a PGN of a game on stdin
 * 
 * node --version
 * > v4.2.4
 * 
 * example usage from lichess game dump:
 * 
 * Filter for fen with more than 2 knight fork features:
 * echo "r2qkb1r/pp2pb2/2p3pp/3p3n/2n2B2/2NQ1N2/PPP2PPP/2KR1B1R b KQkq -" | node filterForFeature.js "Knight forks" 2
 * 
 * Filter raw data to just those containing 2 or more knight fork
 * cd generate/src
 * head -n 500 ../data/puzzle.fens | node filterForFeature.js "Knight forks" 1 | tee ./fens/knightforks.js
 */

var stdinReader = require('./stdinReader');
var generate = require('./generate');

stdinReader.handle(function(fen) {
    var features = generate.extractSingleFeature(process.argv[2], fen);
    features = features.map(f => f.targets.length).reduce((a, b) => a + b);
    return features > process.argv[3];
});
