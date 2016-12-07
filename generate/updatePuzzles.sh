#!/bin/bash

echo "var problems=[" > ../html/js/feature-tron-data.js
sort -R raw.puzzles | head -n 200 | \
    node fen2puzzle.js | \
    node absolutePin.js | \
    node loosePieces.js | \
    node checkingSquares.js | \
    node forkingSquares.js | \
    node aligned.js | \
    node mateInOneThreat.js | \
    sed -r '/^.{,215}$/d' | \
    sed 's/$/,/' >> ../html/js/feature-tron-data.js
echo "];" >> ../html/js/feature-tron-data.js

wc -l ../html/js/feature-tron-data.js

