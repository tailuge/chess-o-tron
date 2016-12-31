
```
cd generate
npm install
cd src
# filter raw FENs for those containing more than 1 knight fork:
head -n 500 ../data/puzzle.fens | node filterForFeature.js "Knight forks" 1 | tee ./fens/knightforks.js
# filter raw PGNs for first position containing more than 1 knight fork:
head -n 500 ../data/puzzle.fens | node filterForFeature.js "Knight forks" 1 | tee ./fens/knightforks.js
```
