# chess-o-tron [![bitHound Overall Score](https://www.bithound.io/github/tailuge/chess-o-tron/badges/score.svg)](https://www.bithound.io/github/tailuge/chess-o-tron)

[examples](https://tailuge.github.io/chess-o-tron/)

```
git clone https://github.com/tailuge/chess-o-tron.git
cd chess-o-tron/generate
head -100 raw.puzzles | node checkingSquares.js | node absolutePin.js | node loosePieces.js 
```

(node 4.2.4)

```
cd ui
npm install
gulp
```

