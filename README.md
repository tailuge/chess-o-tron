# chess-o-tron

[examples](https://tailuge.github.io/chess-o-tron/index.html)

```
git clone https://github.com/tailuge/chess-o-tron.git
cd chess-o-tron/generate
npm install
cd src
# filter raw FENs for those containing more than 1 knight fork:
head -n 500 ../data/puzzle.fens | node filterForFeature.js "Knight forks" 1 | tee ./fens/knightforks.js
# filter raw PGNs for first position containing more than 1 knight fork:
head -n 500 ../data/puzzle.fens | node filterForFeature.js "Knight forks" 1 | tee ./fens/knightforks.js
```

(node 4.2.4 and above)

```
cd explorer
npm install
gulp prod
gulp
```

```
cd quiz
npm install
gulp prod
gulp
```
