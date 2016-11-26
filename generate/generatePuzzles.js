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
    pgnToFens(pgnLine)
    .map(generate)
    .filter(filterForChanges)
    .forEach( puzzle => console.log(JSON.stringify(puzzle) + ","));
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
    puzzle.targetPieces = loosePieces(puzzle.fen);
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



/**
 * Convert PGN to list of FENs.
 */
function pgnToFens(pgn) {
    var gameMoves = pgn.replace(/([0-9]+\.\s)/gm, '').trim();
    var moveArray = gameMoves.split(' ').filter(function (n) {
        return n;
    });

    var fens = [];
    var chess = new Chess();
    moveArray.forEach(move => {
        chess.move(move, {
            sloppy: true
        });

        // skip opening moves
        if (chess.history().length < 8) {
            return;
        }

        // skip positions in check
        if (chess.in_check()) {
            return;
        }

        // skip black moves
        if (chess.turn() === 'b') {
            return;
        }
        fens.push(chess.fen());
    });
    return fens;
}

function filterForChanges(elt, index, array) {
    if (index === 0) {
        return true;
    }
    // keep only positions where targets change
    return !(JSON.stringify(array[index].targetPieces) == JSON.stringify(array[index - 1].targetPieces));
}

var allSquares = ['a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7', 'a8', 'b1', 'b2', 'b3', 'b4', 'b5', 'b6', 'b7', 'b8', 'c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8', 'd1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7', 'd8', 'e1', 'e2', 'e3', 'e4', 'e5', 'e6', 'e7', 'e8', 'f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7', 'f8', 'g1', 'g2', 'g3', 'g4', 'g5', 'g6', 'g7', 'g8', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'h7', 'h8'];

function kingsSquare(fen, colour) {
    var chess = new Chess();
    chess.load(fen);
    return allSquares.find(square => {
        var r = chess.get(square);
        return r === null ? false : (r.color == colour && r.type.toLowerCase() === 'k');
    });
}

/**
 * Find position of all of one colours pieces excluding the king.
 */
function piecesForColour(fen, colour) {
    var chess = new Chess();
    chess.load(fen);
    return allSquares.filter(square => {
        var r = chess.get(square);
        if ((r === null) || (r.type === 'k')) {
            return false;
        }
        return r.color == colour;
    });
}

function loosePieces(fen) {
    var chess = new Chess();
    chess.load(fen);
    var king = kingsSquare(fen, chess.turn());
    var pieces = piecesForColour(fen, chess.turn() == 'w' ? 'b' : 'w');
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
