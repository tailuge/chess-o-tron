#!/bin/bash

echo "var problems=[" > ../html/js/feature-tron-data.js
cat raw.puzzles | head -n 200 | \
    node fen2puzzle.js | \
    node absolutePin.js | \
    node loosePieces.js | \
    node forkingSquares.js | \
    node aligned.js | \
    node mateInOneThreat.js | \
    node checkingSquares.js | \
    node filterMatesPrimary.js | \
    sed 's/$/,/' >> ../html/js/feature-tron-data.js
echo "];" >> ../html/js/feature-tron-data.js

wc -l ../html/js/feature-tron-data.js

