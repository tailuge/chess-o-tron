#!/bin/bash

echo "var problems=[" > ../html/js/feature-tron-data.js
cat raw.puzzles | \
    node fen2puzzle.js | \
    node absolutePin.js | \
    node loosePieces.js | \
    node checkingSquares.js | \
    node forkingSquares.js | \
    node aligned.js | \
    sed 's/$/,/' >> ../html/js/feature-tron-data.js
echo "];" >> ../html/js/feature-tron-data.js

wc -l ../html/js/feature-tron-data.js

