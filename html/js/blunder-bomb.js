/* globals clearHighlights, highlightFromDescriptions, 
    initializeClock, ChessBoard, $, problems, renderFeature, updateUrlWithState, getParameterByName,
    updateFilters, Chess */

'use strict';

var kg_puzzles = [
    { url: "https://lichess.org/vbt002q7", moves: "1. e4 e5 2. f4?! d5 3. exd5 e4?! 4. c4 Nf6 5. Nc3 Bb4??" },
    { url: "https://lichess.org/8ocuoncw", moves: "1. e4 e5 2. f4?! exf4 3. Nf3 d6 4. Bc4 Nc6 5. O-O Ne5 6. Nxe5?! dxe5 7. Nc3??" },
    { url: "https://lichess.org/fc95lr4l", moves: "1. e4 e5 2. f4?! d5 3. fxe5??" },
    { url: "https://lichess.org/vjs3c0fb", moves: "1. e4 e5 2. f4 Nf6 3. Nc3 Bc5??" },
    { url: "https://lichess.org/09u89aoa", moves: "1. e4 e5 2. f4 d6 3. f5??" },
    { url: "https://lichess.org/rubd2kv6", moves: "1. e4 e5 2. f4?! Qh4+?! 3. g3 Qf6?! 4. Nf3 exf4 5. gxf4 Qxf4 6. Nc3 Bc5??" },
    { url: "https://lichess.org/krydlko2", moves: "1. e4 e5 2. f4?! exf4 3. Nf3 Be7 4. h4?! Nf6 5. Nc3 O-O 6. d4 Nh5 7. Bxf4??" },
    { url: "https://lichess.org/psrppynz", moves: "1. e4 e5 2. f4?! exf4 3. Nf3 g5 4. Bc4?! g4 5. O-O gxf3 6. Bxf7+??" },
    { url: "https://lichess.org/f7hk5zc2", moves: "1. e4 e5 2. f4?! exf4 3. Nf3 Be7 4. h4?! Nc6?! 5. d4 Nf6 6. Ne5??" },
    { url: "https://lichess.org/1d6smnpd", moves: "1. e4 e5 2. f4?! d5 3. exd5 e4?! 4. d3 Qxd5 5. Qe2 Nf6 6. Nc3 Qc6 7. Nxe4 Bg4??" },
    { url: "https://lichess.org/6s3vwu13", moves: "1. e4 e5 2. f4?! Nc6?! 3. Nf3 Bc5?! 4. c3?! d6 5. fxe5?! Nxe5?! 6. d4 Nxf3+ 7. Qxf3 Bb6 8. Bc4 Qf6 9. O-O Ne7??" },
    { url: "https://lichess.org/lgooczd0", moves: "1. e4 e5 2. f4?! Nc6 3. fxe5??" },
    { url: "https://lichess.org/a1sv59ut", moves: "1. e4 e5 2. f4 Bc5?! 3. fxe5??" },
    { url: "https://lichess.org/nw2ksm1e", moves: "1. e4 e5 2. f4?! exf4 3. Nf3 d5 4. exd5 Qxd5 5. Nc3 Qc6??" },
    { url: "https://lichess.org/qz5l1d7n", moves: "1. e4 e5 2. f4 exf4 3. Nf3 g5 4. Bc4?! f5??" },
    { url: "https://lichess.org/1d5qxgdw", moves: "1. e4 e5 2. f4 d6 3. fxe5??" },
    { url: "https://lichess.org/a7zhqfg6", moves: "1. e4 e5 2. f4 exf4 3. Nf3 g5?! 4. Bc4?! h6?! 5. Bxf7+??" },
    { url: "https://lichess.org/1hnabg2d", moves: "1. e4 e5 2. f4 Nc6?! 3. fxe5??" },
    { url: "https://lichess.org/ssgt7hxn", moves: "1. e4 e5 2. f4?! Nc6?! 3. Nf3 d5 4. exd5 Qxd5 5. fxe5 Qe4+ 6. Qe2?! Qxc2 7. Qd3??" },
    { url: "https://lichess.org/yg20baag", moves: "1. e4 e5 2. f4?! exf4 3. Nf3 Nc6 4. d4 g5 5. d5 Na5?! 6. Nd4?! Bg7 7. Nf5 Qf6??" },
    { url: "https://lichess.org/23kx68zk", moves: "1. e4 e5 2. f4?! exf4 3. Nf3 Qh4+??" },
    { url: "https://lichess.org/817lxdbr", moves: "1. e4 e5 2. f4?! exf4 3. Nf3 g5 4. Bc4?! g4 5. Ne5 Nh6?! 6. Nxf7??" },
    { url: "https://lichess.org/1qde796d", moves: "1. e4 e5 2. f4?! exf4 3. Nf3 g5 4. h4 g4 5. Ne5 d6 6. Nxg4 Nf6?! 7. e5??" },
    { url: "https://lichess.org/280wfzkh", moves: "1. e4 e5 2. f4?! Bc5?! 3. Nf3 d6 4. fxe5 dxe5 5. Bc4 Bg4??" },
    { url: "https://lichess.org/391d5agy", moves: "1. e4 e5 2. f4?! Nc6?! 3. Nf3 d6 4. fxe5 dxe5 5. Bc4 Bg4?! 6. d3 Nd4??" },
    { url: "https://lichess.org/riu2g5kd", moves: "1. e4 e5 2. f4?! exf4 3. Nf3 d5 4. exd5 Qxd5 5. Nc3 Qd8?! 6. Bc4 Be7?! 7. O-O Nf6 8. d4 Nh5??" },
    { url: "https://lichess.org/fvlx715z", moves: "1. e4 e5 2. f4?! exf4 3. Nf3 d5?! 4. exd5 Qxd5 5. Be2 Bd6 6. Nc3 Qe6 7. O-O Bd7?! 8. Rfe1 Ne7?! 9. Bc4??" },
    { url: "https://lichess.org/c2ouune1", moves: "1. e4 e5 2. f4?! d5 3. exd5 e4 4. Bc4?! Nf6 5. d3 Bc5 6. d4?! Bb4+ 7. c3 Bd6 8. Ne2 O-O 9. O-O Nxd5??" },
    { url: "https://lichess.org/u3r1vguy", moves: "1. e4 e5 2. f4 exf4 3. Nf3 Qh4+??" },
    { url: "https://lichess.org/mf2nw9rn", moves: "1. e4 e5 2. f4?! d6 3. fxe5??" },
    { url: "https://lichess.org/copjd3jc", moves: "1. e4 e5 2. f4?! Bc5?! 3. Nf3 d6 4. fxe5 dxe5 5. Nxe5??" },
    { url: "https://lichess.org/ixxpf35i", moves: "1. e4 e5 2. f4 exf4 3. Nf3 Qe7?! 4. Nc3 d5 5. Nxd5 Qxe4+ 6. Ne3??" },
    { url: "https://lichess.org/bylvi2v7", moves: "1. e4 e5 2. f4?! d6 3. fxe5??" },
    { url: "https://lichess.org/wr2sxtp6", moves: "1. e4 e5 2. f4?! Nc6?! 3. fxe5??" },
    { url: "https://lichess.org/a6ct52jz", moves: "1. e4 e5 2. f4 d5 3. exd5 e4?! 4. c4 Nf6 5. Nc3 Bb4??" },
    { url: "https://lichess.org/lvwsuuw8", moves: "1. e4 e5 2. f4?! d6?! 3. fxe5??" },
    { url: "https://lichess.org/67jalrac", moves: "1. e4 e5 2. f4 exf4 3. Nf3 Be7 4. Bc4 Bh4+ 5. Kf1 d6 6. d4 Nc6 7. Nc3 Be6??" },
    { url: "https://lichess.org/8rx00w94", moves: "1. e4 e5 2. f4 exf4 3. Bc4?! Qh4+ 4. Kf1 Bc5?! 5. d4 Bb6 6. Nf3 Qh5 7. Bxf7+??" },
    { url: "https://lichess.org/2qxtljeo", moves: "1. e4 e5 2. f4?! Nc6 3. fxe5??" },
    { url: "https://lichess.org/3hzrmkdh", moves: "1. e4 e5 2. f4?! Nc6?! 3. fxe5??" },
    { url: "https://lichess.org/cbia5ew9", moves: "1. e4 e5 2. f4?! d6?! 3. f5??" },
    { url: "https://lichess.org/ctxsaigh", moves: "1. e4 e5 2. f4?! exf4 3. Bc4?! Qh4+ 4. Kf1 Bc5?! 5. d4 Be7 6. Nf3 Qh6??" },
    { url: "https://lichess.org/dow28i5b", moves: "1. e4 e5 2. f4 d5 3. exd5 exf4 4. Nf3 Nf6 5. d4?! Nxd5 6. Bc4 Qe7+ 7. Kf2 Ne3 8. Bxf7+??" },
    { url: "https://lichess.org/7uonqc1g", moves: "1. e4 e5 2. f4 d6 3. fxe5??" },
    { url: "https://lichess.org/lq0ynean", moves: "1. e4 e5 2. f4 f5?! 3. Qe2?! fxe4??" },
    { url: "https://lichess.org/fukwvjj2", moves: "1. e4 e5 2. f4?! d6 3. Nf3 Be7 4. Bc4?! Be6?! 5. Bxe6 fxe6 6. O-O?! Nf6?! 7. fxe5 dxe5 8. Nxe5??" },
    { url: "https://lichess.org/rcevrh4g", moves: "1. e4 e5 2. f4 d5 3. exd5 exf4 4. Nf3 Be7 5. Nc3 Bh4+ 6. g3 fxg3 7. Nxh4?! Qxh4 8. Qe2+ Ne7 9. Kd1??" },
    { url: "https://lichess.org/rjz5nyc0", moves: "1. e4 e5 2. f4?! exf4 3. Nf3 g5 4. Bc4?! h5?! 5. O-O f6 6. d4 Nc6 7. e5 Na5??" },
    { url: "https://lichess.org/sslx443c", moves: "1. e4 e5 2. f4 exf4 3. Nf3 Nc6 4. Bb5?! Nf6 5. Nc3 Qe7?! 6. d3 g6 7. Bxf4 d6??" },
    { url: "https://lichess.org/k14ksapk", moves: "1. e4 e5 2. f4?! exf4 3. Nf3 Nc6 4. Bc4?! d6?! 5. O-O Bg4 6. d4 Qf6 7. d5 Nd4??" },
    { url: "https://lichess.org/3ij0jxkw", moves: "1. e4 e5 2. f4?! d5 3. exd5 exf4 4. Nf3 Nf6 5. c4 c6 6. dxc6?! Nxc6 7. h3??" },
    { url: "https://lichess.org/is1ektba", moves: "1. e4 e5 2. f4 exf4 3. Nf3 Nc6 4. Bc4?! Bc5?! 5. d4 Nxd4 6. Nxd4 Qh4+ 7. Ke2??" },
    { url: "https://lichess.org/33bs4gld", moves: "1. e4 e5 2. f4 d5 3. exd5 c6?! 4. fxe5??" },
    { url: "https://lichess.org/mibno2pk", moves: "1. e4 e5 2. f4?! d5 3. fxe5??" },
    { url: "https://lichess.org/9ioxwp3n", moves: "1. e4 e5 2. f4?! d5?! 3. fxe5??" },
    { url: "https://lichess.org/0k1o321b", moves: "1. e4 e5 2. f4?! d5 3. exd5 e4?! 4. Nc3 Nf6 5. Bc4?! Bb4?! 6. a3 Ba5 7. b4 Bb6 8. Qe2?! O-O 9. Nxe4??" },
    { url: "https://lichess.org/7exq0shc", moves: "1. e4 e5 2. f4 d5 3. Nf3 Be6?! 4. exd5 Bd6??" },
    { url: "https://lichess.org/fp2766qg", moves: "1. e4 e5 2. f4?! Nc6 3. Nf3 d6 4. d4 exf4?! 5. Bxf4 Qf6 6. Nc3??" },
    { url: "https://lichess.org/my3bzusg", moves: "1. e4 e5 2. f4?! exf4 3. Nf3 g5 4. h4 g4 5. Ng5?! h6?! 6. Nxf7 Kxf7 7. Qxg4 Bd6??" },
    { url: "https://lichess.org/yk27r1zz", moves: "1. e4 e5 2. f4?! d5 3. d3?! dxe4 4. Nc3 exd3?! 5. Bxd3 exf4 6. Bxf4 Nc6 7. Qe2+ Nge7??" },
    { url: "https://lichess.org/345m6j0q", moves: "1. e4 e5 2. f4 exf4 3. Bc4?! Nf6?! 4. Nc3 d5 5. exd5 Nxd5??" },
    { url: "https://lichess.org/no26y36p", moves: "1. e4 e5 2. f4 exf4 3. Nf3 Nf6 4. e5 Nd5 5. Bc4 Nb6 6. Bb3 d6 7. O-O dxe5?! 8. Nxe5 Bd6??" },
    { url: "https://lichess.org/ii26rleb", moves: "1. e4 e5 2. f4?! d6 3. Nf3 Nc6 4. Bb5 Nf6?! 5. Qe2?! Bd7 6. c3?! Nxe4??" },
    { url: "https://lichess.org/k4fg6ece", moves: "1. e4 e5 2. f4?! exf4 3. Nf3 Be7 4. Bc4 Nc6?! 5. d3?! g5 6. Nc3 d6?! 7. O-O?! Ne5 8. Nxe5 dxe5 9. Qh5 Kd7??" },
    { url: "https://lichess.org/01l0luvo", moves: "1. e4 e5 2. f4 exf4 3. Nf3 g5 4. Bc4?! f6??" },
    { url: "https://lichess.org/m2s83p6p", moves: "1. e4 e5 2. f4?! exf4 3. Nf3 Nf6 4. e5 Ne4?! 5. d4 d6?! 6. Bxf4 dxe5?! 7. dxe5??" },
    { url: "https://lichess.org/4jif0f5d", moves: "1. e4 e5 2. f4 exf4 3. Nf3 Be7 4. Bc4 Bh4+ 5. g3 fxg3 6. O-O gxh2+ 7. Nxh2 Bg5??" },
    { url: "https://lichess.org/14ze2hdw", moves: "1. e4 e5 2. f4?! d5?! 3. fxe5??" },
    { url: "https://lichess.org/qwles99n", moves: "1. e4 e5 2. f4?! exf4 3. Nf3 f6?! 4. Bc4 Ne7 5. d4 g5 6. Nxg5??" }
];

var mcdonnell_puzzles = [
    { url: "https://lichess.org/z5q9oti0", moves: "1. e4 c5 2. f4 d6 3. Nf3 Nc6 4. d4?! cxd4 5. Nxd4 Nf6 6. Nc3 a6 7. Bc4 Bg4?! 8. Qd3?! Rac8 9. Be3??" },
    { url: "https://lichess.org/irqhjpdh", moves: "1. e4 c5 2. f4 d6 3. Nf3 Bd7 4. d3 Nc6 5. e5 Qc7 6. e6 Bxe6 7. Be2 O-O-O?! 8. O-O Bd5?! 9. Ng5 1-0" },
    { url: "https://lichess.org/2iks2izp", moves: "1. e4 c5 2. f4 e6 3. Nf3 d6 4. Bc4 g6?! 5. Nc3 Bg7 6. O-O?! Ne7 7. d4 Qb6?! 8. Be3 Qxb2??" },
    { url: "https://lichess.org/5fyap32n", moves: "1. e4 c5 2. f4 Nc6 3. Nf3 h6 4. c4 a6 5. d3 d6 6. Nbd2 Bg4 7. Be2 Nd4??" },
    { url: "https://lichess.org/p0cfwgk8", moves: "1. e4 c5 2. f4 e6 3. Nf3 d5 4. e5?! Nc6 5. Be2 f6 6. O-O Qc7?! 7. d4?! cxd4 8. Nxd4??" },
    { url: "https://lichess.org/4hw6yyy8", moves: "1. e4 c5 2. f4 Nc6 3. Nf3 b6 4. Bc4 Bb7 5. O-O e6 6. f5 Nf6 7. fxe6 fxe6 8. e5 Nd5?! 9. Ng5??" }
];

var caro_puzzles = [
    { url: "https://lichess.org/labc79y8", moves: "1. e4 c6 2. Nf3 d5 3. exd5 cxd5 4. d4 Qa5+?! 5. Bd2 Qb6 6. Nc3 Qxb2??" },
    { url: "https://lichess.org/bmf3o7ok", moves: "1. e4 c6 2. Nc3 d5 3. Nf3 dxe4 4. Nxe4 Nd7 5. Bc4 e6 6. d4 Ngf6 7. Bg5 Be7 8. O-O??" },
    { url: "https://lichess.org/1au12hwb", moves: "1. e4 c6 2. d3 d5 3. Nc3 Na6?! 4. Be3??" },
    { url: "https://lichess.org/9ml9hy24", moves: "1. e4 c6 2. d4 d5 3. Nc3 dxe4 4. Nxe4 Nd7 5. Qe2?! Ngf6??" },
    { url: "https://lichess.org/n68easo6", moves: "1. e4 Nc6 2. d4 d5 3. e5 Bf5 4. g4?! Bg6 5. h4 h5 6. f3?! hxg4 7. fxg4 Be4 8. Rh2 e6 9. Bd3??" },
    { url: "https://lichess.org/bfbwubcj", moves: "1. e4 c6 2. Nf3 d5 3. Nc3 dxe4 4. Nxe4 Bg4 5. h3 Bh5 6. Bc4?! Nd7 7. Nfg5 Bg6 8. Qe2 Ngf6??" },
    { url: "https://lichess.org/bc02hgii", moves: "1. d4 c6 2. e3 d5 3. c3 Nf6 4. b4?! Bg4 5. e4??" },
    { url: "https://lichess.org/tl2iqvi1", moves: "1. e4 c6 2. d4 d5 3. e5 Bf5 4. Nf3 e6 5. Bd3 Ne7 6. Bxf5 Nxf5 7. Qd3 c5 8. dxc5 Nc6 9. Nd4??" },
    { url: "https://lichess.org/xgsmfejq", moves: "1. e4 c6 2. Nf3 d5 3. e5 Bf5 4. d4 e6 5. Bd3 Bxd3 6. Qxd3 c5 7. dxc5 Bxc5 8. Qb5+ Qd7??" },
    { url: "https://lichess.org/laysqfqv", moves: "1. d4 Nc6 2. c3?! d5 3. Bf4 Bf5 4. Nd2 e6 5. h3 Bd6 6. Ngf3??" },
    { url: "https://lichess.org/bnvlrpfl", moves: "1. e3 c6 2. Bc4?! d5 3. Bd3?! Bg4??" },
    { url: "https://lichess.org/0ptmeoh7", moves: "1. e4 c6 2. d4 d5 3. e5 Bf5 4. f4?! e6 5. Nc3 Ne7 6. Be3 Qb6 7. Na4 Qb4+ 8. c3 Qa5 9. Nc5 b5??" },
    { url: "https://lichess.org/bz6w2mev", moves: "1. e4 c6 2. d4 d5 3. f3?! dxe4 4. fxe4 e5 5. Nf3 exd4 6. Bc4 Be7 7. Ne5??" },
    { url: "https://lichess.org/6br62r8j", moves: "1. e4 c6 2. d4 d5 3. exd5 cxd5 4. c4 Nf6 5. cxd5 Nxd5 6. Bb5+ Bd7 7. Bxd7+ Nxd7 8. Nc3 g6??" },
    { url: "https://lichess.org/tjsvdbxj", moves: "1. e4 c6 2. d4 d5 3. exd5 cxd5 4. c4 Nf6 5. cxd5 Nxd5 6. Bb5+ Bd7 7. Bxd7+ Nxd7 8. Nc3 g6??" },
    { url: "https://lichess.org/lc25cvpv", moves: "1. e4 Nc6 2. d4 d5 3. Nc3 e5 4. exd5 Nxd4 5. Be3 Nf5 6. Bc4??" },
    { url: "https://lichess.org/m99z7oke", moves: "1. e4 c6 2. Nc3 d5 3. Nf3 Nf6 4. e5 Ne4 5. Qe2 f5?! 6. exf6 Nxf6 7. Ne5?! d4 8. Ne4 Bf5??" },
    { url: "https://lichess.org/oghkhrjq", moves: "1. Nc3 c6 2. Nf3 d5 3. e4 dxe4 4. Nxe4 Bf5 5. Ng3 Bg6?! 6. Bc4?! e6?! 7. d3?! Nf6 8. Ne5??" },
    { url: "https://lichess.org/deo38r5g", moves: "1. e4 c6 2. Nf3 d5 3. exd5 cxd5 4. Nc3 Nf6 5. Bb5+ Bd7 6. d4 Bxb5 7. Nxb5 e6 8. Bf4 g6??" },
    { url: "https://lichess.org/g8vkc1zb", moves: "1. d4 Nc6 2. c3?! d5 3. e3 Bf5 4. Qf3?! e6 5. Bb5 Qd6?! 6. g4??" },
    { url: "https://lichess.org/dxkl81ja", moves: "1. e4 c6 2. Nc3 d5 3. Nf3 e6 4. exd5?! cxd5 5. d4 Nf6 6. Ne5 Be7 7. Be3 Bd6 8. Be2 Nbd7 9. Nxd7?! Qxd7??" },
    { url: "https://lichess.org/e03elxrg", moves: "1. d4 c6 2. Nf3 d5 3. Bf4 Nf6 4. e3 e6 5. h3?! Nbd7 6. c4 b6 7. Nc3 Ba6 8. b3??" },
    { url: "https://lichess.org/kbm524b4", moves: "1. e4 c6 2. Nf3 d5 3. exd5 cxd5 4. d4 Nc6 5. c4 Nf6 6. cxd5 e6??" },
    { url: "https://lichess.org/iwiq85o8", moves: "1. c4 c6 2. d4 d5 3. cxd5 Nf6 4. dxc6 Nxc6 5. Nf3 e6?! 6. a3 Bb4+??" },
    { url: "https://lichess.org/x29ahtsa", moves: "1. e4 c6 2. f4?! d5 3. e5 Nh6 4. Nf3 Bf5 5. Be2 e6 6. d4 Be7 7. c4 c5?! 8. cxd5 Qxd5 9. Nc3 Qc6??" },
    { url: "https://lichess.org/9fwd23my", moves: "1. e4 c6 2. f4?! d5 3. e5 e6 4. d4 Nd7?! 5. Nc3 b6?! 6. Nf3 c5?! 7. Be2?! cxd4 8. Nxd4 f6??" },
    { url: "https://lichess.org/ekzkkgpr", moves: "1. e4 c6 2. Nf3 d5 3. Bc4??" },
    { url: "https://lichess.org/ydg3vrqb", moves: "1. e4 c6 2. Bc4?! d5 3. exd5 cxd5 4. Bb5+ Nc6 5. Bxc6+ bxc6 6. Nc3 Nf6 7. Nf3 e6 8. Ne5 Bd6 9. Nxc6??" },
    { url: "https://lichess.org/1wxjw8y1", moves: "1. e4 c6 2. c4 d5 3. exd5 cxd5 4. cxd5 Qxd5 5. Nc3 Qd8 6. d4 Nf6 7. Bg5 e6 8. Nf3 Be7 9. Bd3 b6??" },
    { url: "https://lichess.org/sd02vm7s", moves: "1. e4 c6 2. Nf3 d5 3. e5 Bg4 4. Be2 e6 5. Nd4?! Bxe2 6. Qxe2 c5 7. Qb5+ Qd7 8. Qxc5??" },
    { url: "https://lichess.org/6608jui0", moves: "1. Nf3 Nc6 2. d4 d5 3. c4 dxc4?! 4. e3 b5?! 5. Nc3?! a6 6. a4 Na7??" },
    { url: "https://lichess.org/o3wngglw", moves: "1. d4 c6 2. Nf3 d5 3. e3 f5 4. Bd3 Nf6 5. e4??" },
    { url: "https://lichess.org/piadu9r1", moves: "1. e4 c6 2. f4?! d5 3. e5 Bf5 4. Nc3 e6 5. Nf3 Bb4 6. Nh4??" },
    { url: "https://lichess.org/iea6ac75", moves: "1. e4 c6 2. Nf3 d5 3. Nc3 Bg4 4. Be2 dxe4 5. Nxe4 Nd7 6. h3 Bh5 7. d4 Ngf6 8. c3??" }
];

var puzzles = kg_puzzles;

var tried = 0;
var correct = 0;
var moveindex = 0;
var puzzleindex = 0;
var board = ChessBoard('board', 'start');
var chess = new Chess();
var pgn = '';
var moves = {};
var move = {};

function loadPuzzle() {
    moveindex = 0;
    puzzleindex = Math.floor(Math.random() * puzzles.length);
    pgn = puzzles[puzzleindex].moves;
    chess.load_pgn(pgn);
    moves = chess.history({ verbose: true });
    chess.reset();
    board.start();
    updateScore(correct, tried);
}

function nextMove() {
    if (moveWasBlunder()) {
        failedToIdentifyBlunder("missed blunder");
    }
    else {
        move = moves[moveindex++];
        chess.move(move);
        board.position(chess.fen());
    }
}

function blunder() {
    if (moveWasBlunder()) {
        correctlyIdentifiedBlunder();
    }
    else {
        failedToIdentifyBlunder(move.san + " not a blunder");
    }
}

function correctlyIdentifiedBlunder() {
    tried++;
    correct++;
    prependToHistory(pgn + ' ' + linkToAnalysis('<b id="correct">correct</b>'));
    loadPuzzle();
}

function failedToIdentifyBlunder(text) {
    tried++;
    prependToHistory(pgn + ' ' + linkToAnalysis('<b id="failed">' + text + '</b>'));
    loadPuzzle();
}

function linkToAnalysis(text) {
    return '<a target="_blank" href="' + puzzles[puzzleindex].url + '">' + text + '</a>';
}

function moveWasBlunder() {
    return (moves.length == moveindex);
}

function updateScore(correct, tried) {
    $('#score').text("Score: " + correct + '/' + tried);
}

function prependToHistory(text) {
    $('#history').html(text + "<br/>" + $('#history').html());
}

function init() {
    $('#blunder').on('click', blunder);
    $('#next').on('click', nextMove);
    $('#flip').on('click', function f() { board.flip(); });
    $('#restart').on('click', restart);
    $(document).on('keypress', function(e) {
        if (e.which == 32) {
            nextMove();
            e.preventDefault();
            return false;
        }
        if (e.which == 98) { blunder(); }

    });
    loadPuzzle();
}

function selectPuzzle(a) {
    var selectedValue = a.options[a.selectedIndex].value;
    if (selectedValue === 'kg') { puzzles = kg_puzzles }
    if (selectedValue === 'mcdonnell') { puzzles = mcdonnell_puzzles }
    if (selectedValue === 'caro') { puzzles = caro_puzzles }
    restart();
}

function restart() {
    tried = 0;
    correct = 0;
    $('#history').html('');
    loadPuzzle();
}

$(document).ready(init);
