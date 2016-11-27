/**
 * Generate chess puzzles by stepping through a PGN of a game on stdin
 * 
 * node --version
 * > v4.2.4
 * 
 * example usage from lichess game dump:
 * 
 * head -10 example100.pgn | node generatePuzzles.js | tee ../html/js/loose-piece-o-tron-data.js
 * 
 */

var Chess = require('./lib/chess').Chess;
var ChessExt = require('./chessExt');

console.log(ChessExt.allSquares);

/**
 * Read from stdin and apply puzzle generator to each line
 */
var readline = require('readline');
var rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
});

console.log("var problems = [");
rl.on('close', function () {
    console.log("];");
});

rl.on('line', function (pgnLine) {
    ChessExt.pgnToFens(pgnLine)
        .map(generate)
        .filter(filterForChanges)
        .forEach(puzzle => console.log(JSON.stringify(puzzle) + ","));
});

/**
 * Enrich each FEN with tactical elements.
 */
function generate(fen) {
    return enrichWithPiecesThatCanGiveCheck(
        enrichWithLoosePieces(
            enrichWithAbsolutePins({
                fen: fen
            })));
}

/**
 * Loose piece analysis added to puzzle.
 */
function enrichWithLoosePieces(puzzle) {
    puzzle.targetPieces = loosePiecesForBothSides(puzzle.fen);
    return puzzle;
}

/**
 * Puzzle enricher return the puzzle with extra elements added.
 */
function enrichWithAbsolutePins(puzzle) {
    return puzzle;
}

/**
 * Puzzle enricher return the puzzle with extra elements added.
 */
function enrichWithPiecesThatCanGiveCheck(puzzle) {
    return puzzle;
}



function filterForChanges(elt, index, array) {
    if (index === 0) {
        return true;
    }
    // keep only positions where targets change
    return (JSON.stringify(array[index].targetPieces) != JSON.stringify(array[index - 1].targetPieces));
}





function loosePiecesForBothSides(fen) {
    var blackLoosePieces = loosePieces(fen);
    var whiteLoosePieces = loosePieces(fenForOtherSide(fen));
    return blackLoosePieces.concat(whiteLoosePieces);
}

function loosePieces(fen) {
    var chess = new Chess();
    chess.load(fen);
    var king = ChessExt.kingsSquare(fen, chess.turn());
    var pieces = ChessExt.piecesForColour(fen, chess.turn() == 'w' ? 'b' : 'w');
    return pieces.filter(square => !isCheckAfterPlacingKingAtSquare(fen, king, square));
}

/**
 * A piece is loose if you can put the oponents king in place of it and that king is not in check.
 */
function isCheckAfterPlacingKingAtSquare(fen, king, square) {
    var chess = new Chess();
    chess.load(fen);
    chess.remove(square);
    chess.remove(king);
    chess.put({
        type: 'k',
        color: chess.turn()
    }, square);
    return chess.in_check();
}

function fenForOtherSide(fen) {
    return fen.replace(/ w .*/, " b - - 0 1");
}

// handy to investigate a single fen

if (process.argv.length === 3) {
    console.log(generate(process.argv[2]));
    process.exit();
}
