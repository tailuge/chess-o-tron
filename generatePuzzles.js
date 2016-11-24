/**
 * Generate chess puzzles by stepping through a PGN of a game on stdin
 * 
 * node --version
 * > v4.2.4
 * 
 * example usage from lichess game dump:
 * 
 * head -10 example100.pgn | node generatePuzzles.js | tee puzzles.json
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

console.log("[");
rl.on('close', function () {
    console.log("]");
});

rl.on('line', function (line) {
    findAllLoosePieces(line).forEach(x => console.log(JSON.stringify(x)+","));
});

/**
 * Step through all positions in PGN.
 */
function findAllLoosePieces(pgn) {
    var gameMoves = pgn.replace(/([0-9]+\.\s)/gm, '').trim();
    var moveArray = gameMoves.split(' ').filter(function (n) {
        return n;
    });

    var allPositions = [];
    var chess = new Chess();
    moveArray.forEach(move => {
        chess.move(move, {
            sloppy: true
        });
        if ((chess.turn() === 'w') && (!chess.in_check())) {
            var fen = chess.fen();
            var pieces = loosePieces(fen);
            if (pieces.length > 0) {
                allPositions.push({
                    fen: fen,
                    targetPieces: pieces
                });
            }
        }
    });

    // keep only positions where targets change
    var lastSet = [];
    allPositions = allPositions.filter(position => {
        if (JSON.stringify(lastSet) == JSON.stringify(position.targetPieces)) {
            return false;
        }
        else {
            lastSet = position.targetPieces;
            return true;
        }
    });
    return allPositions;
}

var allSquares = ['a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7', 'a8', 'b1', 'b2', 'b3', 'b4', 'b5', 'b6', 'b7', 'b8', 'c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8', 'd1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7', 'd8', 'e1', 'e2', 'e3', 'e4', 'e5', 'e6', 'e7', 'e8', 'f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7', 'f8', 'g1', 'g2', 'g3', 'g4', 'g5', 'g6', 'g7', 'g8', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'h7', 'h8'];

function kingsSquare(fen, colour) {
    var chess = new Chess();
    chess.load(fen);
    return allSquares.find(square => {
        var r = chess.get(square);
        return r == null ? false : (r.color == colour && r.type.toLowerCase() === 'k');
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
        if ((r==null) || (r.type == 'k')) {
            return false;
        }
        return r.color == colour;
    });
}

function loosePieces(fen) {
    var chess = new Chess();
    chess.load(fen);
    var king = kingsSquare(fen,chess.turn());
    var pieces = piecesForColour(fen,chess.turn()=='w'?'b':'w');
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
    chess.put({type:'k',color:chess.turn()},square);
    return chess.in_check();
}

