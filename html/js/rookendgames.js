var rook_puzzles = [
    { fen: '8/8/5R2/5P2/8/1k6/7r/5K2 b - - 0 55',
  moves: 'Kc3 Rc6+ Kd3 f6 Ke3 Re6+ Kf3 Re7??',
  url: 'https://lichess.org/icKhVqj0#110' },
{ fen: '8/8/8/5p2/6rk/8/4K3/R7 w - - 2 52',
  moves: 'Kf3 Rg3+ Kf4 Rg5??',
  url: 'https://lichess.org/A5vBpusY#103' },
{ fen: '8/8/8/8/3R4/4K3/6rp/7k w - - 3 97',
  moves: 'Rd1+ Rg1 Rd2 Rf1 Rf2??',
  url: 'https://lichess.org/3wYycb3B#193' },
{ fen: '8/8/8/4K3/R1pr4/2k5/8/8 w - - 6 56',
  moves: 'Ra3+ Kb4 Re3??',
  url: 'https://lichess.org/8wUhTdwW#111' },
{ fen: '8/2r5/2P2k2/2R5/8/K7/8/8 b - - 0 43',
  moves: 'Ke6 Kb4 Kd6 Kb5 Rh7??',
  url: 'https://lichess.org/mWnqISXS#86' },
{ fen: '8/8/8/2K5/7P/7r/3R3k/8 b - - 12 52',
  moves: 'Kg3 Rd3+ Kh2??',
  url: 'https://lichess.org/sZZYRy9p#104' },
{ fen: '8/8/8/8/8/5kp1/r7/6RK w - - 6 80',
  moves: 'Rf1+ Rf2 Rg1??',
  url: 'https://lichess.org/FrRQvm9j#159' },
{ fen: '8/8/8/1R6/7p/6r1/5K1k/8 b - - 0 70',
  moves: 'h3 Rb2??',
  url: 'https://lichess.org/xTGQ14Ek#140' },
{ fen: '8/3r4/8/5P1R/4k3/6K1/8/8 b - - 0 60',
  moves: 'Rd3+ Kg4 Rd4??',
  url: 'https://lichess.org/GTPqBLM3#120' },
{ fen: '8/k7/6R1/1K5p/8/7r/8/8 w - - 0 62',
  moves: 'Rg7+ Kb8 Kb6 Kc8 Kc6 Rc3+ Kd6 Kb8 Rh7 Rh3 Kc6 h4 Kb6 Rb3+ Kc6 h3 Rg7 h2 Rg8+ Ka7 Rg7+ Ka6 Rg8??',
  url: 'https://lichess.org/eIGgEyiP#123' },
{ fen: '4k3/2R3K1/5P2/7r/8/8/8/8 b - - 0 52',
  moves: 'Rg5+ Kh6 Rg4 Kh7 Kf8 Rc8+ Kf7 Rc6??',
  url: 'https://lichess.org/CopfxADY#104' },
{ fen: '1k6/8/1KP5/R7/8/8/8/6r1 b - - 4 76',
  moves: 'Rb1+ Rb5 Rc1 Rb2 Rc3 Rb4 Rc1 Rb5 Rc2 Rh5 Rb2+ Kc5 Rc2+ Kd6 Rd2+ Rd5 Rc2??',
  url: 'https://lichess.org/onPzROCO#152' },
{ fen: '8/8/1r6/1k2K3/p7/8/2R5/8 w - - 0 58',
  moves: 'Rb2+ Ka5 Ra2??',
  url: 'https://lichess.org/KRd0qdLd#115' },
{ fen: '2R5/8/8/3K3p/5r2/1k6/8/8 w - - 0 52',
  moves: 'Rb8+ Kc2 Re8 Kd3 Rh8??',
  url: 'https://lichess.org/VsSjVovy#103' },
{ fen: '8/8/8/5k2/4r1p1/4K3/8/6R1 w - - 2 71',
  moves: 'Kf2 Kf4 Kf1??',
  url: 'https://lichess.org/j728RN85#141' },
{ fen: '8/8/8/8/8/5k2/3Kpr2/4R3 w - - 8 67',
  moves: 'Rh1 Rg2 Re1??',
  url: 'https://lichess.org/jtn0rg4E#133' },
{ fen: '6RK/7P/5k2/8/6r1/8/8/8 b - - 4 64',
  moves: 'Rh4 Rg2 Rh5??',
  url: 'https://lichess.org/h8tKBHaD#128' },
{ fen: '8/8/6k1/4R3/1K2P3/8/8/r7 b - - 0 73',
  moves: 'Kf6 Rf5+ Ke6 Kc3 Re1 Kd3 Rd1+ Ke2 Ra1 Rh5 Ra2+ Kf3 Ra3+ Kf4 Ra1 Rh6+ Ke7 Kf5 Rf1+ Ke5 Ra1 Rh7+ Kf8 Rb7 Ra5+ Kf6 Ra6+ Kf5 Ra5+ e5 Ra1 Kf6 Rf1+ Ke6 Rd1??',
  url: 'https://lichess.org/3sBala88#146' },
{ fen: '5k2/7r/5KRP/8/8/8/8/8 b - - 2 67',
  moves: 'Rf7+ Kg5 Rh7??',
  url: 'https://lichess.org/uEpu1jEk#134' },
{ fen: 'R7/8/8/8/8/1K6/p7/kr6 w - - 2 71',
  moves: 'Kc2 Rb7 Ra3??',
  url: 'https://lichess.org/0UajBDlT#141' },
{ fen: '8/8/2k5/8/2P5/1K6/R6r/8 b - - 0 45',
  moves: 'Rh3+ Kb4 Rh4 Ra6+ Kb7 Rg6 Rh1 Kb5 Rb1+ Kc5 Ra1 Rg7+ Kb8 Kc6 Ra6+ Kb5 Ra1 c5 Rb1+ Kc6 Ra1 Rg8+ Ka7 Kc7 Rh1 Rg7 Rc1 c6 Ka6??',
  url: 'https://lichess.org/0v8EuK12#90' },
{ fen: '8/8/8/5R2/1k5p/7r/2K5/8 w - - 0 53',
  moves: 'Rf4+ Kc5 Re4??',
  url: 'https://lichess.org/rukEB7K8#105' },
{ fen: '8/8/8/R2K3p/7r/8/8/3k4 w - - 0 63',
  moves: 'Ke6 Rh1??',
  url: 'https://lichess.org/6rVI1HAS#125' },
{ fen: '7K/5kRP/8/8/8/8/8/7r b - - 16 69',
  moves: 'Kf8 Rg8+ Kf7 Rd8 Kg6??',
  url: 'https://lichess.org/JoDl5Ipa#138' },
{ fen: '8/1R6/2r5/8/8/8/p2K4/k7 w - - 0 51',
  moves: 'Kd3 Rc1 Kd4??',
  url: 'https://lichess.org/rtaFqVtu#101' },
{ fen: '8/8/8/8/3p3R/3k4/6r1/2K5 w - - 16 65',
  moves: 'Rh3+ Kc4 Kd1 d3 Rh4+??',
  url: 'https://lichess.org/oqPkRzUf#129' },
{ fen: '7k/7r/5R1P/7K/8/8/8/8 b - - 2 72',
  moves: 'Kg8 Kg6 Ra7 Re6 Rf7??',
  url: 'https://lichess.org/ruUfSQML#144' },
{ fen: '8/8/5k2/5PR1/6K1/8/4r3/8 w - - 0 68',
  moves: 'Rg6+ Ke5??',
  url: 'https://lichess.org/efVCdMgM#135' },
{ fen: 'K7/6r1/Pk6/8/R7/8/8/8 w - - 0 54',
  moves: 'Rb4+ Ka5 Rb7 Rg8+ Ka7 Rc8 Rh7 Kb5??',
  url: 'https://lichess.org/p8uqEEuG#107' },
{ fen: '8/8/8/6R1/8/6k1/3r2P1/5K2 b - - 5 44',
  moves: 'Kf4 Rg8 Ra2 g4 Ke5 g5 Ke6 Rf8 Ra7 g6 Ke7??',
  url: 'https://lichess.org/8iNfQewq#88' },
{ fen: '8/7R/1k2r3/p7/2K5/8/8/8 b - - 0 46',
  moves: 'Rc6+ Kb3 Rc5 Rh8 Rb5+ Ka4 Rb4+ Ka3 Rf4 Rb8+ Ka6 Ra8+ Kb6 Rb8+ Ka7 Rb5 Ka6 Rb8 Ka7 Rb5 Ka6 Rb6+??',
  url: 'https://lichess.org/CSKNx094#92' },
{ fen: '8/7p/3R4/8/5K2/2r5/6k1/8 w - - 0 54',
  moves: 'Rh6 Rc7 Kg5 Kg3 Kh5??',
  url: 'https://lichess.org/1FStKKhb#107' },
{ fen: '8/6k1/2K5/8/r2p3R/8/8/8 b - - 0 51',
  moves: 'Kf6 Rf4+??',
  url: 'https://lichess.org/elJuRV7H#102' },
{ fen: '8/5R2/r7/3KP3/6k1/8/8/8 b - - 0 65',
  moves: 'Ra5+ Kd6 Ra6+ Ke7 Ra7+??',
  url: 'https://lichess.org/rk9pR4cx#130' },
{ fen: '8/8/8/4k3/3r1p2/2K5/5R2/8 w - - 0 66',
  moves: 'Re2+ Re4 Rf2??',
  url: 'https://lichess.org/hplfm8QW#131' },
{ fen: '8/8/7P/5k2/7R/r3K3/8/8 w - - 0 54',
  moves: 'Kd2 Kg6??',
  url: 'https://lichess.org/C6g2pMhh#107' },
{ fen: '8/8/8/2r5/6R1/2p5/5k2/2K5 b - - 0 72',
  moves: 'Ke3 Kc2 Kf3 Rh4 Kg3 Rh8 Kf4 Rf8+ Ke5 Re8+ Kd4 Rd8+ Kc4 Rh8 Rb5 Rh3 Rb2+ Kc1 Rb3 Kc2 Rb2+ Kc1 Rb3 Rh2 Rb2 Rh4+ Kb3 Rh3??',
  url: 'https://lichess.org/7aXi3O5r#144' },
{ fen: '8/8/8/8/6k1/1r3p2/7K/5R2 w - - 0 60',
  moves: 'Rg1+ Kf4 Rf1??',
  url: 'https://lichess.org/eBITs2dR#119' },
{ fen: '8/8/8/4R3/5k2/5r2/6KP/8 w - - 0 43',
  moves: 'Re8 Re3??',
  url: 'https://lichess.org/eoEGPFMm#85' },
{ fen: '8/7r/8/P5k1/8/8/1R4K1/8 w - - 0 57',
  moves: 'Ra2 Ra7 Kf3 Kf6 Ke4 Ke6 Kd4 Kd6 Kc4 Kc6 Kb4 Rb7+ Ka4 Ra7 Rc2+ Kb7 Kb5 Ka8??',
  url: 'https://lichess.org/gLEps6MK#113' },
{ fen: '8/8/8/5k2/5r2/5p2/3K1R2/8 w - - 6 65',
  moves: 'Ke3 Kg4 Rh2??',
  url: 'https://lichess.org/eOgQ1IBJ#129' },
{ fen: '5R2/8/8/8/6k1/4K1p1/6r1/8 w - - 0 66',
  moves: 'Rg8+ Kh3 Rh8+ Kg4 Rg8+ Kf5 Kf3 Rg1 Rf8+ Kg6 Rg8+ Kh7 Rg4 Kh6 Rg8 Kh5 Rg7 Kh6 Rg8 Kh7 Rg4 Kh6 Kf4 Kh5 Rg8??',
  url: 'https://lichess.org/vOcK8cuH#131' },
{ fen: '8/8/2R5/8/Pk6/8/7r/2K5 w - - 0 42',
  moves: 'Ra6 Kc3 a5??',
  url: 'https://lichess.org/OcfsFWuq#83' },
{ fen: '8/8/5k2/1P2R3/4K3/1r6/8/8 w - - 0 68',
  moves: 'Rc5 Rb4+??',
  url: 'https://lichess.org/v0il8iNz#135' },
{ fen: '8/4k3/8/8/3K4/P6r/2R5/8 w - - 0 63',
  moves: 'Re2+ Kd6 Re3 Rh4+ Kd3 Kc5 Kc3 Rc4+ Kb3 Kb5??',
  url: 'https://lichess.org/qTn89CqV#125' },
{ fen: '8/8/8/KRk5/P7/8/8/r7 b - - 15 56',
  moves: 'Kc4 Rb4+ Kc3??',
  url: 'https://lichess.org/BoXVfjLU#112' },
{ fen: '8/8/3K4/7R/2k4P/8/8/7r b - - 0 54',
  moves: 'Kd4 Ke6 Ke4 Kf6 Kf4 Kg6 Kg4??',
  url: 'https://lichess.org/y1sJ2obC#108' },
{ fen: '5R2/8/4K3/8/4p1k1/6r1/8/8 w - - 0 56',
  moves: 'Ke5 e3 Rf4+??',
  url: 'https://lichess.org/MRWgEpWK#111' },
{ fen: '1k4r1/1P3R2/8/1K6/8/8/8/8 b - - 6 73',
  moves: 'Re8 Kc6 Re5??',
  url: 'https://lichess.org/Ks1ZHGeH#146' }
];
