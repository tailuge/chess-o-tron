/**
 * Enrich puzzle with loose pieces feature if found.
 * 
 * Deduced by placing king at pieces position in turn and testing for check.
 */

var Chess = require('./lib/chess').Chess;
var ChessExt = require('./chessExt');
var StdinReader = require('./stdinReader');

StdinReader.handle(function(puzzle) {
    return puzzle;
});
