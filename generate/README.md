
```
cd generate
npm install
cd src
# filter raw fens for those containing more than 1 knight fork:
head -n 500 ../data/raw.puzzles | node filterForFeature.js "Knight forks" 1 | tee ./fens/knightforks.js
```
