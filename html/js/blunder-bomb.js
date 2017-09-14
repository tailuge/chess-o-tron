/* globals clearHighlights, highlightFromDescriptions, 
    initializeClock, ChessBoard, $, problems, renderFeature, updateUrlWithState, getParameterByName,
    updateFilters, Chess */

'use strict';


var kg_puzzles = [
    "1. e4 e5 2. f4 Nc6 3. fxe5",
    "1. e4 e5 2. f4 d5 3. fxe5",
    "1. e4 e5 2. f4 f6 3. fxe5 fxe5",
    "1. e4 e5 2. f4 Nc6 3. f5",
    "1. e4 e5 2. f4 d6 3. f5",
    "1. e4 e5 2. f4 Bc5 3. Nf3 Bf2+",
    "1. e4 e5 2. f4 Bc5 3. fxe5",
    "1. e4 e5 2. f4 Qf6 3. fxe5",
    "1. e4 e5 2. f4 f5 3. fxe5",
    "1. e4 e5 2. f4 exf4 3. Nf3 g5 4. Bc4 f6",
    "1. e4 e5 2. f4 exf4 3. d4 Qh4+ 4. g3",
    "1. e4 e5 2. f4 d6 3. fxe5",
    "1. e4 e5 2. f4 exf4 3. Nf3 f6 4. Bc4 g5",
    "1. e4 e5 2. f4 exf4 3. Nf3 d5 4. Bc4",
    "1. e4 e5 2. f4 exf4 3. Nf3 g5 4. Bc4 g4 5. Ne5 Qh4+ 6. g3 fxg3 7. Qxg4",
    "1. e4 e5 2. f4 exf4 3. Nf3 d5 4. exd5 Qxd5 5. Nc3 Qc6",
    "1. e4 e5 2. f4 exf4 3. Nf3 g5 4. h4 g4 5. Ne5 g3",
    "1. e4 e5 2. f4 exf4 3. Nf3 g5 4. Bc4 g4 5. Ne5 Qh4+ 6. Kf1 Nh6 7. d4 d6 8. Nd3 f3 9. gxf3",
    "1. e4 e5 2. f4 exf4 3. Nf3 g5 4. h4 f6 5. Nxg5 fxg5 6. Qh5+ Ke7 7. Qxg5+ Ke8",
    "1. e4 e5 2. f4 exf4 3. Bc4 Qh4+ 4. Kf1 Bc5 5. d4 Bb6 6. Nf3 Qg4",
    "1. e4 e5 2. f4 d5 3. exd5 c6 4. fxe5",
    "1. e4 e5 2. f4 Nc6 3. Nf3 d6 4. Bc4 Be6 5. O-O",
    "1. e4 e5 2. f4 f5 3. exf5 Nf6",
    "1. e4 e5 2. f4 f5 3. exf5 exf4 4. Qh5+ g6 5. fxg6 Nf6",
    "1. e4 e5 2. f4 d5 3. Nf3 exf4 4. Ne5",
    "1. e4 e5 2. f4 d5 3. exd5 c6 4. dxc6 Nxc6 5. fxe5",
    "1. e4 e5 2. f4 Bd6 3. f5",
    "1. e4 e5 2. f4 Nf6 3. Nc3 Bc5",
    "1. e4 e5 2. f4 exf4 3. Nf3 g5 4. h4 g4 5. Ng5 Be7 6. Nxf7",
    "1. e4 e5 2. f4 exf4 3. Nf3 g5 4. Bc4 g4 5. O-O gxf3 6. Qxf3 Qf6 7. Nc3",
    "1. e4 e5 2. f4 exf4 3. Nf3 g5 4. Bc4 g4 5. O-O gxf3 6. Qxf3 Qf6 7. d4",
    "1. e4 e5 2. f4 exf4 3. Bc4 Qh4+ 4. Kf1 Nf6 5. Nf3 Qg4",
    "1. e4 e5 2. f4 d6 3. Nf3 Nc6 4. fxe5 Nxe5 5. Bc4",
    "1. e4 e5 2. f4 d6 3. Nf3 Bg4 4. Bc4 Bxf3 5. Qxf3 exf4 6. Qxf4 Qf6 7. O-O",
    "1. e4 e5 2. f4 d5 3. Nf3 dxe4 4. Nxe5 f6 5. Qh5+ Ke7",
    "1. e4 e5 2. f4 d5 3. f5",
    "1. e4 e5 2. f4 d5 3. exd5 exf4 4. Nc3 Qh4+ 5. g3 fxg3 6. Nf3",
    "1. e4 e5 2. f4 Qf6 3. f5",
    "1. e4 e5 2. f4 Nc6 3. Nf3 exf4 4. Bc4 Nf6 5. Bxf7+",
    "1. e4 e5 2. f4 Nc6 3. Nf3 d6 4. Bc4 Bg4 5. Bxf7+ Kxf7 6. Ng5+ Ke8",
    "1. e4 e5 2. f4 Nc6 3. Nf3 d5 4. Bc4",
    "1. e4 e5 2. f4 Ke7",
    "1. e4 e5 2. f4 f6 3. Nf3 Nc6 4. fxe5 Nxe5 5. Nxe5 fxe5",
    "1. e4 e5 2. f4 f6 3. Nf3 d6 4. fxe5 fxe5 5. Nxe5",
    "1. e4 e5 2. f4 exf4 3. Nf3 Nf6 4. Nc3 d5 5. e5 Ne4 6. Nxe4 dxe4 7. Ng1",
    "1. e4 e5 2. f4 exf4 3. Nf3 Nc6 4. Bc4 f6 5. d4 g5",
    "1. e4 e5 2. f4 exf4 3. Nf3 g5 4. h4 g4 5. Ng5 h6 6. Nxf7 Kxf7 7. Qxg4 Nf6 8. Qxf4 Bd6 9. e5",
    "1. e4 e5 2. f4 exf4 3. Nf3 g5 4. h4 g4 5. Ng5 h6 6. Nxf7 Kxf7 7. Bc4+ Ke8 8. Qxg4 d5",
    "1. e4 e5 2. f4 exf4 3. Nf3 g5 4. h4 g4 5. Ng5 f6 6. Qxg4 fxg5 7. Qh5+ Ke7 8. Qxg5+ Ke8",
    "1. e4 e5 2. f4 exf4 3. Nf3 g5 4. Bc4 Nc6 5. h4 f6",
    "1. e4 e5 2. f4 exf4 3. Nf3 g5 4. Bc4 g4 5. Bxf7+ Kxf7 6. Ne5+ Ke8 7. Qxg4 d6",
    "1. e4 e5 2. f4 exf4 3. Nf3 g5 4. Bc4 Bc5",
    "1. e4 e5 2. f4 exf4 3. Nf3 f6 4. Nh4 g5",
    "1. e4 e5 2. f4 exf4 3. Nf3 f6 4. d4 g5 5. Nxg5 fxg5",
    "1. e4 e5 2. f4 exf4 3. Nf3 f5 4. Bc4",
    "1. e4 e5 2. f4 exf4 3. Nf3 d6 4. d4 g5 5. h4 g4 6. Nh2",
    "1. e4 e5 2. f4 exf4 3. Nf3 d6 4. Bc4 Bg4 5. d4 Bxf3 6. Qxf3 Qh4+ 7. g3 fxg3",
    "1. e4 e5 2. f4 exf4 3. Nf3 d5 4. d4 dxe4 5. Ne5",
    "1. e4 e5 2. f4 exf4 3. Nf3 Be7 4. Bc4 Bh4+ 5. g3 fxg3 6. O-O gxh2+ 7. Kh1 Be7",
    "1. e4 e5 2. f4 d6 3. Nf3 Nc6 4. Bc4 Bg4 5. Bxf7+ Kxf7 6. Ng5+ Ke8",
    "1. e4 e5 2. f4 d6 3. Nf3 f6 4. fxe5 fxe5 5. Nxe5",
    "1. e4 e5 2. f4 d5 3. exd5 exf4 4. d4 Qh4+ 5. g3",
    "1. e4 e5 2. f4 Qh4+ 3. g3 exf4",
    "1. e4 e5 2. f4 Qe7 3. fxe5",
    "1. e4 e5 2. f4 Nf6 3. fxe5 Nxe4 4. Qe2 Nc5",
    "1. e4 e5 2. f4 Nc6 3. Nf3 Nf6 4. Nc3 b6",
    "1. e4 e5 2. f4 Nc6 3. Nf3 f5 4. Nxe5 Nxe5 5. fxe5 Qh4+ 6. Ke2",
    "1. e4 e5 2. f4 Nc6 3. Nf3 f5 4. Nxe5 Nxe5 5. fxe5",
    "1. e4 e5 2. f4 Nc6 3. Nf3 f5 4. Bc4 fxe4 5. Nxe5 d5 6. Qh5+",
    "1. e4 e5 2. f4 Nc6 3. Nf3 exf4 4. d4 Nf6 5. Nc3 d5 6. e5 Ne4 7. Nxe4 dxe4 8. Ng1",
    "1. e4 e5 2. f4 Nc6 3. Nf3 exf4 4. d4 Nf6 5. Nc3 d5 6. e5 Ne4 7. Nxe4 dxe4 8. Nd2",
    "1. e4 e5 2. f4 Nc6 3. Nf3 exf4 4. d4 d5 5. Bc4",
    "1. e4 e5 2. f4 Nc6 3. Nf3 exf4 4. Bc4 f6 5. O-O Ne5",
    "1. e4 e5 2. f4 Nc6 3. Nf3 d6 4. Bc4 h6 5. fxe5 Nxe5 6. Nxe5 dxe5 7. O-O",
    "1. e4 e5 2. f4 Nc6 3. Nf3 d6 4. Bc4 Bg4 5. O-O Nd4 6. Be2 Nf6",
    "1. e4 e5 2. f4 Nc6 3. Nf3 d6 4. Bc4 Bg4 5. Nc3 Nd4 6. Nxe5 Bxd1",
    "1. e4 e5 2. f4 Nc6 3. Nf3 d6 4. Bc4 Bg4 5. h3 Bxf3 6. Qxf3 Nd4 7. Qd1",
    "1. e4 e5 2. f4 Nc6 3. Nf3 d5 4. fxe5",
    "1. e4 e5 2. f4 Nc6 3. Nf3 d5 4. exd5 Qxd5 5. Nc3 Qd6 6. fxe5 Nxe5 7. Be2",
    "1. e4 e5 2. f4 Nc6 3. Nf3 d5 4. exd5 Qxd5 5. Nc3 Qa5 6. fxe5 Nxe5",
    "1. e4 e5 2. f4 Nc6 3. Nf3 d5 4. exd5 Qxd5 5. fxe5 Nxe5 6. Nxe5",
    "1. e4 e5 2. f4 Nc6 3. Nf3 Bc5 4. Nxe5 Nxe5 5. fxe5",
    "1. e4 e5 2. f4 Nc6 3. Nf3 Bc5 4. Nc3 Nf6 5. d3",
    "1. e4 e5 2. f4 Nc6 3. Nf3 Bc5 4. fxe5 d6 5. d4 Bb4+",
    "1. e4 e5 2. f4 g6 3. fxe5",
    "1. e4 e5 2. f4 f6 3. Nf3 Nc6 4. fxe5 fxe5 5. Nxe5",
    "1. e4 e5 2. f4 f6 3. Nf3 Nc6 4. Bc4 Bc5 5. fxe5 Nxe5",
    "1. e4 e5 2. f4 f5 3. Nf3 exf4 4. Bc4",
    "1. e4 e5 2. f4 f5 3. exf5 Nc6",
    "1. e4 e5 2. f4 f5 3. exf5 d6 4. fxe5",
    "1. e4 e5 2. f4 exf4 3. Nf3 Qf6 4. Bc4 Bc5 5. d4 Bb4+ 6. c3 Ba5 7. O-O c6",
    "1. e4 e5 2. f4 exf4 3. Nf3 Nf6 4. e5 Nd5 5. Bc4 c6 6. O-O Bc5+ 7. d4 Bb6 8. Bxf4",
    "1. e4 e5 2. f4 exf4 3. Nf3 Nc6 4. Bc4 Nf6 5. Nc3 Bc5 6. Ng5",
    "1. e4 e5 2. f4 exf4 3. Nf3 g5 4. h4 g4 5. Ng5 f6 6. Qxg4 fxg5 7. Qh5+ Ke7 8. hxg5",
    "1. e4 e5 2. f4 exf4 3. Nf3 g5 4. h4 g4 5. Ng5 f6 6. Qxg4 fxg5 7. hxg5",
    "1. e4 e5 2. f4 exf4 3. Nf3 g5 4. h4 g4 5. Ne5 h5 6. Bc4 Nh6 7. O-O",
    "1. e4 e5 2. f4 exf4 3. Nf3 g5 4. h4 g4 5. Ne5 h5 6. Bc4 Nh6 7. d4 d6 8. Nd3 Qe7 9. Nc3 f5",
    "1. e4 e5 2. f4 exf4 3. Nf3 g5 4. h4 f6 5. Nxg5 Qe7",
    "1. e4 e5 2. f4 exf4 3. Nf3 g5 4. h4 f6 5. Bc4 Nc6 6. Nxg5 fxg5",
    "1. e4 e5 2. f4 exf4 3. Nf3 g5 4. h4 Be7 5. d4"
];

var caro_puzzles = [
    "1. e4 c6 2. Nf3 d5 3. Bc4",
    "1. e4 c6 2. d4 d5 3. e5 Bf5 4. f4 e6 5. g4",
    "1. e4 c6 2. d4 d5 3. e5 Bf5 4. Nf3 e6 5. Nh4",
    "1. e4 c6 2. Bc4 d5 3. Qf3",
    "1. b3 c6 2. Bb2 d5 3. Bxg7",
    "1. e4 c6 2. Nf3 d5 3. e5 Bf5 4. d4 e6 5. Nh4",
    "1. e4 c6 2. Nf3 d5 3. d3 dxe4 4. Ne5",
    "1. e4 c6 2. Qf3 d5 3. Bc4",
    "1. e4 Nc6 2. Nf3 d5 3. Bc4",
    "1. e4 Nc6 2. d4 d5 3. exd5 Qxd5 4. Nf3 Bg4 5. Be2 Bxf3 6. Bxf3 Qxd4",
    "1. e4 c6 2. Nf3 d5 3. e5 Bg4 4. d4 e6 5. Bg5",
    "1. e4 c6 2. d4 d5 3. Nc3 dxe4 4. Nxe4 Bf5 5. Ng3 Bg4",
    "1. e4 c6 2. d4 d5 3. e5 Bg4",
    "1. e4 c6 2. Bc4 d5 3. Qh5",
    "1. e4 c6 2. Bc4 d5 3. exd5 Bg4",
    "1. e4 c6 2. Bc4 d5 3. e5",
    "1. e4 c6 2. Bc4 d5 3. d3",
    "1. e4 Nc6 2. g3 d5 3. exd5 Qxd5 4. Nf3",
    "1. e4 c6 2. Nf3 d5 3. Be2 dxe4 4. Nd4",
    "1. e4 c6 2. d4 d5 3. Nc3 Bg4",
    "1. e4 c6 2. d4 d5 3. exd5 cxd5 4. Bd3 Bf5",
    "1. e4 c6 2. Bc4 d5 3. exd5 cxd5 4. Bb3 Bf5 5. Qf3 e6 6. g4",
    "1. d4 c6 2. Bg5 d5 3. Bxe7",
    "1. g3 c6 2. Bg2 d5 3. Nf3 Bh3",
    "1. e4 c6 2. Nf3 d5 3. exd5 cxd5 4. c3 Bg4 5. Be2 e6",
    "1. e4 c6 2. Nf3 d5 3. e5 Bg4 4. d4 e6 5. h3 Bh5 6. g4 Bg6 7. Nh4",
    "1. e4 c6 2. Nf3 d5 3. d3 dxe4 4. Ng5 exd3 5. Bxd3 h6",
    "1. e4 c6 2. Nc3 d5 3. Bc4",
    "1. e4 c6 2. f4 d5 3. e5 Bg4",
    "1. e4 c6 2. d4 d5 3. Nc3 dxe4 4. Nxe4 Nf6 5. Nf3",
    "1. e4 c6 2. d4 d5 3. Nc3 dxe4 4. Nxe4 Nd7 5. Qe2 Ngf6",
    "1. e4 c6 2. d4 d5 3. Nc3 dxe4 4. Nxe4 Bf5 5. Qd3 Nf6",
    "1. e4 c6 2. d4 d5 3. Nc3 dxe4 4. Nxe4 Bf5 5. Nf3",
    "1. d4 c6 2. c4 d5 3. Nc3 Nf6 4. Bg5 Ne4 5. Nxe4 dxe4 6. e3",
    "1. Nc3 c6 2. d4 d5 3. e4 Bf5",
    "1. g3 c6 2. Bg2 d5 3. Nf3 Nf6 4. O-O Bh3",
    "1. g3 c6 2. Bg2 d5 3. b3 e6 4. Bb2 Bd6",
    "1. e4 Nc6 2. Nf3 d5 3. exd5 Qxd5 4. Nc3 Qh5 5. Bc4 Bg4 6. d3",
    "1. e4 Nc6 2. Nf3 d5 3. exd5 Qxd5 4. d4 Bg4 5. Be2 Bxf3 6. Bxf3 Qxd4",
    "1. e4 Nc6 2. Nf3 d5 3. exd5 Qxd5 4. Bb5",
    "1. e4 Nc6 2. Nf3 d5 3. d4 dxe4 4. Ng5 Qxd4 5. Qxd4 Nxd4 6. Nxe4",
    "1. e4 Nc6 2. Nf3 d5 3. Bb5 dxe4 4. Bxc6+ bxc6 5. Ne5 Qd5 6. Qh5",
    "1. e4 Nc6 2. d4 d5 3. exd5 Qxd5 4. Be3 e5 5. Nc3 exd4",
    "1. e4 Nc6 2. d4 d5 3. exd5 Qd6",
    "1. e4 Nc6 2. d4 d5 3. e5 Bf5 4. Nf3 e6 5. Nh4",
    "1. e4 Nc6 2. Bc4 d5 3. exd5 Ne5 4. d6",
    "1. e4 c6 2. Qf3 d5 3. exd5 cxd5 4. c4 Nf6 5. cxd5 Qxd5 6. Bc4",
    "1. e4 c6 2. Nf3 d5 3. Nc3 Nf6 4. e5 Nfd7 5. d4 e6 6. Bg5 c5",
    "1. e4 c6 2. Nf3 d5 3. Nc3 dxe4 4. Nxe4 Bf5 5. Ng3 Bg6 6. h4 h6 7. Ne5 Bh7 8. Qh5 g6 9. Bc4 gxh5",
    "1. e4 c6 2. Nf3 d5 3. Nc3 dxe4 4. Bd3",
    "1. e4 c6 2. Nf3 d5 3. Nc3 dxe4 4. Bc4",
    "1. e4 c6 2. Nf3 d5 3. Nc3 d4 4. Nxd4",
    "1. e4 c6 2. Nf3 d5 3. g3 dxe4 4. Nd4",
    "1. e4 c6 2. Nf3 d5 3. exd5 cxd5 4. d4 Nf6 5. Bd3 Bf5",
    "1. e4 c6 2. Nf3 d5 3. exd5 cxd5 4. d4 Nc6 5. Bd3 Bg4 6. O-O Nxd4",
    "1. e4 c6 2. Nf3 d5 3. exd5 cxd5 4. d4 Bg4 5. Nc3 e6 6. Bb5+ Nd7 7. Qd3 a6",
    "1. e4 c6 2. Nf3 d5 3. exd5 cxd5 4. d4 Bg4 5. h3 e6",
    "1. e4 c6 2. Nf3 d5 3. exd5 cxd5 4. d4 Bf5 5. Nc3 e6 6. Bf4 Bd6 7. Bb5+ Nc6 8. O-O",
    "1. e4 c6 2. Nf3 d5 3. e5 Bg4 4. d4 e6 5. h3 Bh5 6. Bg5",
    "1. e4 c6 2. Nf3 d5 3. d3 dxe4 4. Nd4",
    "1. e4 c6 2. Nf3 d5 3. d3 Bg4 4. g3",
    "1. e4 c6 2. Nf3 d5 3. c4 dxe4 4. Ne5 Nf6 5. Nxf7",
    "1. e4 c6 2. Nf3 d5 3. Bd3 dxe4 4. Bxe4 Nf6 5. O-O",
    "1. e4 c6 2. Nc3 d5 3. exd5 Bg4",
    "1. e4 c6 2. Nc3 d5 3. d3 dxe4 4. Nxe4 Nf6 5. Nc5",
    "1. e4 c6 2. f4 d5 3. exd5 cxd5 4. Nf3 Nf6 5. Bb5+ Nc6 6. O-O",
    "1. e4 c6 2. f4 d5 3. e5 Bf5 4. d4 e6 5. g4",
    "1. e4 c6 2. f3 d5 3. d4 dxe4 4. fxe4 e5 5. d5",
    "1. e4 c6 2. e5 d5 3. f4 Bg4",
    "1. e4 c6 2. e5 d5 3. d4 Bf5 4. Qf3 e6 5. g4",
    "1. e4 c6 2. d4 d5 3. Nc3 Nf6 4. Bd3 e6 5. Nf3 Bb4 6. Bd2",
    "1. e4 c6 2. d4 d5 3. Nc3 dxe4 4. Nxe4 Nd7 5. Nf3 Ngf6 6. Bd3 Nxe4 7. Bxe4 Nf6 8. Bf5",
    "1. e4 c6 2. d4 d5 3. Nc3 dxe4 4. Nxe4 Nd7 5. Bg5 h6",
    "1. e4 c6 2. d4 d5 3. Nc3 dxe4 4. Nxe4 Bf5 5. Bd3 Nf6 6. Nxf6+ exf6 7. Bxf5 Bb4+",
    "1. e4 c6 2. d4 d5 3. f3 dxe4 4. fxe4 Bg4",
    "1. e4 c6 2. d4 d5 3. exd5 cxd5 4. Nc3 Bg4",
    "1. e4 c6 2. d4 d5 3. exd5 cxd5 4. c4 Nf6 5. cxd5 Nc6",
    "1. e4 c6 2. d4 d5 3. exd5 Bg4",
    "1. e4 c6 2. d4 d5 3. e5 c5 4. Nf3 cxd4 5. Bg5 Nc6 6. Bb5",
    "1. e4 c6 2. d4 d5 3. e5 c5 4. c3 Nc6 5. Nf3 Bg4 6. dxc5 Nxe5",
    "1. e4 c6 2. d3 d5 3. Nc3 dxe4 4. Nxe4 Bf5 5. Nc5",
    "1. e4 c6 2. c4 d5 3. exd5 cxd5 4. cxd5 Qxd5 5. Nc3 Qd8 6. Nf3 Bg4 7. Be2 e6",
    "1. e4 c6 2. Bc4 d5 3. exd5 e6 4. Bb5",
    "1. e4 c6 2. Bc4 d5 3. exd5 cxd5 4. Bxd5",
    "1. e4 c6 2. Bc4 d5 3. exd5 cxd5 4. Bb5+ Bd7 5. Bc6",
    "1. e4 c6 2. Bc4 d5 3. exd5 cxd5 4. Bb3 Nf6 5. c4 Bg4 6. cxd5",
    "1. e4 c6 2. Bc4 d5 3. exd5 cxd5 4. Bb3 Bf5 5. Qf3 Nf6",
    "1. e3 c6 2. d4 d5 3. Bc4",
    "1. d4 Nc6 2. e3 d5 3. Bd3 Bf5",
    "1. d4 Nc6 2. Bf4 d5 3. e3 e5 4. Nf3",
    "1. d4 c6 2. Nf3 d5 3. g3 Bh3",
    "1. d4 c6 2. e4 d5 3. e5 Bf5 4. Bd3 Bxd3 5. Qd2",
    "1. d4 c6 2. e3 d5 3. Bd3 Bf5",
    "1. c3 c6 2. d4 d5 3. Bf4 Nd7 4. Bc7",
    "1. b3 c6 2. Bb2 d5 3. e3 Nf6 4. c4 Bg4 5. cxd5",
    "1. Nh3 c6 2. g3 d5 3. d3 Nd7 4. f4 Ngf6 5. Nf2 e5 6. Bg2 exf4 7. Bxf4 Bd6",
    "1. Nf3 Nc6 2. Nc3 d5 3. e4 d4 4. Ne2 e5 5. d3 Bg4 6. Ng3 h5 7. h3 h4",
    "1. Nf3 Nc6 2. Nc3 d5 3. e4 d4 4. Ne2 e5 5. c3 d3 6. Ng3 h5 7. h4 Nf6 8. Qb3 Bc5 9. c4",
    "1. Nf3 Nc6 2. Nc3 d5 3. d4 Nf6 4. Bf4 e6 5. Nb5 Bd6 6. Nxd6+ cxd6 7. Qd3 Ne4 8. O-O-O",
    "1. Nf3 Nc6 2. Nc3 d5 3. d4 Bf5 4. Bf4 Nb4 5. Rb1 Bxc2 6. Qd2 Bxb1 7. Be5"
];

var puzzles = kg_puzzles;

var tried = 0;
var correct = 0;
var moveindex = 0;
var board = ChessBoard('board', 'start');
var chess = new Chess();
var pgn = '';
var moves = {};

function loadPuzzle() {
    moveindex = 0;
    pgn = puzzles[Math.floor(Math.random() * puzzles.length)];
    chess.load_pgn(pgn);
    moves = chess.history({ verbose: true });
    chess.reset();
    board.start();
    updateScore(correct, tried);
}

function nextMove() {
    if (moveWasBlunder()) {
        failedToIdentifyBlunder();
    }
    else {
        var move = moves[moveindex++];
        chess.move(move);
        board.position(chess.fen());
    }
}

function blunder() {
    if (moveWasBlunder()) {
        correctlyIdentifiedBlunder();
    }
    else {
        failedToIdentifyBlunder();
    }
}

function correctlyIdentifiedBlunder() {
    tried++;
    correct++;
    prependToHistory(pgn + '?? ' + linkToAnalysis('<b id="correct">CORRECT</b>'));
    loadPuzzle();
}

function failedToIdentifyBlunder() {
    tried++;
    prependToHistory(pgn + '?? ' + linkToAnalysis('<b id="failed">FAILED</b>'));
    loadPuzzle();
}

function linkToAnalysis(text) {
    return '<a target="_blank" href="https://lichess.org/analysis/' + encodeURI(chess.fen()) + '">' + text + '</a>';
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
    $('#kg').on('click', function f() { puzzles=kg_puzzles; restart(); });
    $('#caro').on('click', function f() { puzzles=caro_puzzles; restart(); });
    $(document).on('keypress', function(e) {
        if (e.which == 32) { nextMove();
            e.preventDefault(); return false; }
        if (e.which == 98) { blunder(); }

    });
    loadPuzzle();
}

function restart() {
    tried = 0;
    correct = 0;
    $('#history').html('');
    loadPuzzle();
}

$(document).ready(init);
