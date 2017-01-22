(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.Puzzle = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/* global history */

'use strict';

module.exports = {

    getParameterByName: function(name, url) {
        if (!url) {
            url = window.location.href;
        }
        name = name.replace(/[\[\]]/g, "\\$&");
        var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
            results = regex.exec(url);
        if (!results) return null;
        if (!results[2]) return '';
        return decodeURIComponent(results[2].replace(/\+/g, " "));
    },

    updateUrlWithState: function(fen, side, description, target) {
        if (history.pushState) {
            var newurl = window.location.protocol + "//" +
                window.location.host +
                window.location.pathname +
                '?fen=' + encodeURIComponent(fen) +
                (side ? "&side=" + encodeURIComponent(side) : "") +
                (description ? "&description=" + encodeURIComponent(description) : "") +
                (target ? "&target=" + encodeURIComponent(target) : "");
            window.history.pushState({
                path: newurl
            }, '', newurl);
        }
    }
};

},{}],2:[function(require,module,exports){
/*
 * Copyright (c) 2016, Jeff Hlywa (jhlywa@gmail.com)
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * 1. Redistributions of source code must retain the above copyright notice,
 *    this list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright notice,
 *    this list of conditions and the following disclaimer in the documentation
 *    and/or other materials provided with the distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
 * ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE
 * LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
 * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
 * SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
 * INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
 * CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 * POSSIBILITY OF SUCH DAMAGE.
 *
 *----------------------------------------------------------------------------*/

/* minified license below  */

/* @license
 * Copyright (c) 2016, Jeff Hlywa (jhlywa@gmail.com)
 * Released under the BSD license
 * https://github.com/jhlywa/chess.js/blob/master/LICENSE
 */

var Chess = function(fen) {

  /* jshint indent: false */

  var BLACK = 'b';
  var WHITE = 'w';

  var EMPTY = -1;

  var PAWN = 'p';
  var KNIGHT = 'n';
  var BISHOP = 'b';
  var ROOK = 'r';
  var QUEEN = 'q';
  var KING = 'k';

  var SYMBOLS = 'pnbrqkPNBRQK';

  var DEFAULT_POSITION = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

  var POSSIBLE_RESULTS = ['1-0', '0-1', '1/2-1/2', '*'];

  var PAWN_OFFSETS = {
    b: [16, 32, 17, 15],
    w: [-16, -32, -17, -15]
  };

  var PIECE_OFFSETS = {
    n: [-18, -33, -31, -14,  18, 33, 31,  14],
    b: [-17, -15,  17,  15],
    r: [-16,   1,  16,  -1],
    q: [-17, -16, -15,   1,  17, 16, 15,  -1],
    k: [-17, -16, -15,   1,  17, 16, 15,  -1]
  };

  var ATTACKS = [
    20, 0, 0, 0, 0, 0, 0, 24,  0, 0, 0, 0, 0, 0,20, 0,
     0,20, 0, 0, 0, 0, 0, 24,  0, 0, 0, 0, 0,20, 0, 0,
     0, 0,20, 0, 0, 0, 0, 24,  0, 0, 0, 0,20, 0, 0, 0,
     0, 0, 0,20, 0, 0, 0, 24,  0, 0, 0,20, 0, 0, 0, 0,
     0, 0, 0, 0,20, 0, 0, 24,  0, 0,20, 0, 0, 0, 0, 0,
     0, 0, 0, 0, 0,20, 2, 24,  2,20, 0, 0, 0, 0, 0, 0,
     0, 0, 0, 0, 0, 2,53, 56, 53, 2, 0, 0, 0, 0, 0, 0,
    24,24,24,24,24,24,56,  0, 56,24,24,24,24,24,24, 0,
     0, 0, 0, 0, 0, 2,53, 56, 53, 2, 0, 0, 0, 0, 0, 0,
     0, 0, 0, 0, 0,20, 2, 24,  2,20, 0, 0, 0, 0, 0, 0,
     0, 0, 0, 0,20, 0, 0, 24,  0, 0,20, 0, 0, 0, 0, 0,
     0, 0, 0,20, 0, 0, 0, 24,  0, 0, 0,20, 0, 0, 0, 0,
     0, 0,20, 0, 0, 0, 0, 24,  0, 0, 0, 0,20, 0, 0, 0,
     0,20, 0, 0, 0, 0, 0, 24,  0, 0, 0, 0, 0,20, 0, 0,
    20, 0, 0, 0, 0, 0, 0, 24,  0, 0, 0, 0, 0, 0,20
  ];

  var RAYS = [
     17,  0,  0,  0,  0,  0,  0, 16,  0,  0,  0,  0,  0,  0, 15, 0,
      0, 17,  0,  0,  0,  0,  0, 16,  0,  0,  0,  0,  0, 15,  0, 0,
      0,  0, 17,  0,  0,  0,  0, 16,  0,  0,  0,  0, 15,  0,  0, 0,
      0,  0,  0, 17,  0,  0,  0, 16,  0,  0,  0, 15,  0,  0,  0, 0,
      0,  0,  0,  0, 17,  0,  0, 16,  0,  0, 15,  0,  0,  0,  0, 0,
      0,  0,  0,  0,  0, 17,  0, 16,  0, 15,  0,  0,  0,  0,  0, 0,
      0,  0,  0,  0,  0,  0, 17, 16, 15,  0,  0,  0,  0,  0,  0, 0,
      1,  1,  1,  1,  1,  1,  1,  0, -1, -1,  -1,-1, -1, -1, -1, 0,
      0,  0,  0,  0,  0,  0,-15,-16,-17,  0,  0,  0,  0,  0,  0, 0,
      0,  0,  0,  0,  0,-15,  0,-16,  0,-17,  0,  0,  0,  0,  0, 0,
      0,  0,  0,  0,-15,  0,  0,-16,  0,  0,-17,  0,  0,  0,  0, 0,
      0,  0,  0,-15,  0,  0,  0,-16,  0,  0,  0,-17,  0,  0,  0, 0,
      0,  0,-15,  0,  0,  0,  0,-16,  0,  0,  0,  0,-17,  0,  0, 0,
      0,-15,  0,  0,  0,  0,  0,-16,  0,  0,  0,  0,  0,-17,  0, 0,
    -15,  0,  0,  0,  0,  0,  0,-16,  0,  0,  0,  0,  0,  0,-17
  ];

  var SHIFTS = { p: 0, n: 1, b: 2, r: 3, q: 4, k: 5 };

  var FLAGS = {
    NORMAL: 'n',
    CAPTURE: 'c',
    BIG_PAWN: 'b',
    EP_CAPTURE: 'e',
    PROMOTION: 'p',
    KSIDE_CASTLE: 'k',
    QSIDE_CASTLE: 'q'
  };

  var BITS = {
    NORMAL: 1,
    CAPTURE: 2,
    BIG_PAWN: 4,
    EP_CAPTURE: 8,
    PROMOTION: 16,
    KSIDE_CASTLE: 32,
    QSIDE_CASTLE: 64
  };

  var RANK_1 = 7;
  var RANK_2 = 6;
  var RANK_3 = 5;
  var RANK_4 = 4;
  var RANK_5 = 3;
  var RANK_6 = 2;
  var RANK_7 = 1;
  var RANK_8 = 0;

  var SQUARES = {
    a8:   0, b8:   1, c8:   2, d8:   3, e8:   4, f8:   5, g8:   6, h8:   7,
    a7:  16, b7:  17, c7:  18, d7:  19, e7:  20, f7:  21, g7:  22, h7:  23,
    a6:  32, b6:  33, c6:  34, d6:  35, e6:  36, f6:  37, g6:  38, h6:  39,
    a5:  48, b5:  49, c5:  50, d5:  51, e5:  52, f5:  53, g5:  54, h5:  55,
    a4:  64, b4:  65, c4:  66, d4:  67, e4:  68, f4:  69, g4:  70, h4:  71,
    a3:  80, b3:  81, c3:  82, d3:  83, e3:  84, f3:  85, g3:  86, h3:  87,
    a2:  96, b2:  97, c2:  98, d2:  99, e2: 100, f2: 101, g2: 102, h2: 103,
    a1: 112, b1: 113, c1: 114, d1: 115, e1: 116, f1: 117, g1: 118, h1: 119
  };

  var ROOKS = {
    w: [{square: SQUARES.a1, flag: BITS.QSIDE_CASTLE},
        {square: SQUARES.h1, flag: BITS.KSIDE_CASTLE}],
    b: [{square: SQUARES.a8, flag: BITS.QSIDE_CASTLE},
        {square: SQUARES.h8, flag: BITS.KSIDE_CASTLE}]
  };

  var board = new Array(128);
  var kings = {w: EMPTY, b: EMPTY};
  var turn = WHITE;
  var castling = {w: 0, b: 0};
  var ep_square = EMPTY;
  var half_moves = 0;
  var move_number = 1;
  var history = [];
  var header = {};

  /* if the user passes in a fen string, load it, else default to
   * starting position
   */
  if (typeof fen === 'undefined') {
    load(DEFAULT_POSITION);
  } else {
    load(fen);
  }

  function clear() {
    board = new Array(128);
    kings = {w: EMPTY, b: EMPTY};
    turn = WHITE;
    castling = {w: 0, b: 0};
    ep_square = EMPTY;
    half_moves = 0;
    move_number = 1;
    history = [];
    header = {};
    update_setup(generate_fen());
  }

  function reset() {
    load(DEFAULT_POSITION);
  }

  function load(fen) {
    var tokens = fen.split(/\s+/);
    var position = tokens[0];
    var square = 0;

    if (!validate_fen(fen).valid) {
      return false;
    }

    clear();

    for (var i = 0; i < position.length; i++) {
      var piece = position.charAt(i);

      if (piece === '/') {
        square += 8;
      } else if (is_digit(piece)) {
        square += parseInt(piece, 10);
      } else {
        var color = (piece < 'a') ? WHITE : BLACK;
        put({type: piece.toLowerCase(), color: color}, algebraic(square));
        square++;
      }
    }

    turn = tokens[1];

    if (tokens[2].indexOf('K') > -1) {
      castling.w |= BITS.KSIDE_CASTLE;
    }
    if (tokens[2].indexOf('Q') > -1) {
      castling.w |= BITS.QSIDE_CASTLE;
    }
    if (tokens[2].indexOf('k') > -1) {
      castling.b |= BITS.KSIDE_CASTLE;
    }
    if (tokens[2].indexOf('q') > -1) {
      castling.b |= BITS.QSIDE_CASTLE;
    }

    ep_square = (tokens[3] === '-') ? EMPTY : SQUARES[tokens[3]];
    half_moves = parseInt(tokens[4], 10);
    move_number = parseInt(tokens[5], 10);

    update_setup(generate_fen());

    return true;
  }

  /* TODO: this function is pretty much crap - it validates structure but
   * completely ignores content (e.g. doesn't verify that each side has a king)
   * ... we should rewrite this, and ditch the silly error_number field while
   * we're at it
   */
  function validate_fen(fen) {
    var errors = {
       0: 'No errors.',
       1: 'FEN string must contain six space-delimited fields.',
       2: '6th field (move number) must be a positive integer.',
       3: '5th field (half move counter) must be a non-negative integer.',
       4: '4th field (en-passant square) is invalid.',
       5: '3rd field (castling availability) is invalid.',
       6: '2nd field (side to move) is invalid.',
       7: '1st field (piece positions) does not contain 8 \'/\'-delimited rows.',
       8: '1st field (piece positions) is invalid [consecutive numbers].',
       9: '1st field (piece positions) is invalid [invalid piece].',
      10: '1st field (piece positions) is invalid [row too large].',
      11: 'Illegal en-passant square',
    };

    /* 1st criterion: 6 space-seperated fields? */
    var tokens = fen.split(/\s+/);
    if (tokens.length !== 6) {
      return {valid: false, error_number: 1, error: errors[1]};
    }

    /* 2nd criterion: move number field is a integer value > 0? */
    if (isNaN(tokens[5]) || (parseInt(tokens[5], 10) <= 0)) {
      return {valid: false, error_number: 2, error: errors[2]};
    }

    /* 3rd criterion: half move counter is an integer >= 0? */
    if (isNaN(tokens[4]) || (parseInt(tokens[4], 10) < 0)) {
      return {valid: false, error_number: 3, error: errors[3]};
    }

    /* 4th criterion: 4th field is a valid e.p.-string? */
    if (!/^(-|[abcdefgh][36])$/.test(tokens[3])) {
      return {valid: false, error_number: 4, error: errors[4]};
    }

    /* 5th criterion: 3th field is a valid castle-string? */
    if( !/^(KQ?k?q?|Qk?q?|kq?|q|-)$/.test(tokens[2])) {
      return {valid: false, error_number: 5, error: errors[5]};
    }

    /* 6th criterion: 2nd field is "w" (white) or "b" (black)? */
    if (!/^(w|b)$/.test(tokens[1])) {
      return {valid: false, error_number: 6, error: errors[6]};
    }

    /* 7th criterion: 1st field contains 8 rows? */
    var rows = tokens[0].split('/');
    if (rows.length !== 8) {
      return {valid: false, error_number: 7, error: errors[7]};
    }

    /* 8th criterion: every row is valid? */
    for (var i = 0; i < rows.length; i++) {
      /* check for right sum of fields AND not two numbers in succession */
      var sum_fields = 0;
      var previous_was_number = false;

      for (var k = 0; k < rows[i].length; k++) {
        if (!isNaN(rows[i][k])) {
          if (previous_was_number) {
            return {valid: false, error_number: 8, error: errors[8]};
          }
          sum_fields += parseInt(rows[i][k], 10);
          previous_was_number = true;
        } else {
          if (!/^[prnbqkPRNBQK]$/.test(rows[i][k])) {
            return {valid: false, error_number: 9, error: errors[9]};
          }
          sum_fields += 1;
          previous_was_number = false;
        }
      }
      if (sum_fields !== 8) {
        return {valid: false, error_number: 10, error: errors[10]};
      }
    }

    if ((tokens[3][1] == '3' && tokens[1] == 'w') ||
        (tokens[3][1] == '6' && tokens[1] == 'b')) {
          return {valid: false, error_number: 11, error: errors[11]};
    }

    /* everything's okay! */
    return {valid: true, error_number: 0, error: errors[0]};
  }

  function generate_fen() {
    var empty = 0;
    var fen = '';

    for (var i = SQUARES.a8; i <= SQUARES.h1; i++) {
      if (board[i] == null) {
        empty++;
      } else {
        if (empty > 0) {
          fen += empty;
          empty = 0;
        }
        var color = board[i].color;
        var piece = board[i].type;

        fen += (color === WHITE) ?
                 piece.toUpperCase() : piece.toLowerCase();
      }

      if ((i + 1) & 0x88) {
        if (empty > 0) {
          fen += empty;
        }

        if (i !== SQUARES.h1) {
          fen += '/';
        }

        empty = 0;
        i += 8;
      }
    }

    var cflags = '';
    if (castling[WHITE] & BITS.KSIDE_CASTLE) { cflags += 'K'; }
    if (castling[WHITE] & BITS.QSIDE_CASTLE) { cflags += 'Q'; }
    if (castling[BLACK] & BITS.KSIDE_CASTLE) { cflags += 'k'; }
    if (castling[BLACK] & BITS.QSIDE_CASTLE) { cflags += 'q'; }

    /* do we have an empty castling flag? */
    cflags = cflags || '-';
    var epflags = (ep_square === EMPTY) ? '-' : algebraic(ep_square);

    return [fen, turn, cflags, epflags, half_moves, move_number].join(' ');
  }

  function set_header(args) {
    for (var i = 0; i < args.length; i += 2) {
      if (typeof args[i] === 'string' &&
          typeof args[i + 1] === 'string') {
        header[args[i]] = args[i + 1];
      }
    }
    return header;
  }

  /* called when the initial board setup is changed with put() or remove().
   * modifies the SetUp and FEN properties of the header object.  if the FEN is
   * equal to the default position, the SetUp and FEN are deleted
   * the setup is only updated if history.length is zero, ie moves haven't been
   * made.
   */
  function update_setup(fen) {
    if (history.length > 0) return;

    if (fen !== DEFAULT_POSITION) {
      header['SetUp'] = '1';
      header['FEN'] = fen;
    } else {
      delete header['SetUp'];
      delete header['FEN'];
    }
  }

  function get(square) {
    var piece = board[SQUARES[square]];
    return (piece) ? {type: piece.type, color: piece.color} : null;
  }

  function put(piece, square) {
    /* check for valid piece object */
    if (!('type' in piece && 'color' in piece)) {
      return false;
    }

    /* check for piece */
    if (SYMBOLS.indexOf(piece.type.toLowerCase()) === -1) {
      return false;
    }

    /* check for valid square */
    if (!(square in SQUARES)) {
      return false;
    }

    var sq = SQUARES[square];

    /* don't let the user place more than one king */
    if (piece.type == KING &&
        !(kings[piece.color] == EMPTY || kings[piece.color] == sq)) {
      return false;
    }

    board[sq] = {type: piece.type, color: piece.color};
    if (piece.type === KING) {
      kings[piece.color] = sq;
    }

    update_setup(generate_fen());

    return true;
  }

  function remove(square) {
    var piece = get(square);
    board[SQUARES[square]] = null;
    if (piece && piece.type === KING) {
      kings[piece.color] = EMPTY;
    }

    update_setup(generate_fen());

    return piece;
  }

  function build_move(board, from, to, flags, promotion) {
    var move = {
      color: turn,
      from: from,
      to: to,
      flags: flags,
      piece: board[from].type
    };

    if (promotion) {
      move.flags |= BITS.PROMOTION;
      move.promotion = promotion;
    }

    if (board[to]) {
      move.captured = board[to].type;
    } else if (flags & BITS.EP_CAPTURE) {
        move.captured = PAWN;
    }
    return move;
  }

  function generate_moves(options) {
    function add_move(board, moves, from, to, flags) {
      /* if pawn promotion */
      if (board[from].type === PAWN &&
         (rank(to) === RANK_8 || rank(to) === RANK_1)) {
          var pieces = [QUEEN, ROOK, BISHOP, KNIGHT];
          for (var i = 0, len = pieces.length; i < len; i++) {
            moves.push(build_move(board, from, to, flags, pieces[i]));
          }
      } else {
       moves.push(build_move(board, from, to, flags));
      }
    }

    var moves = [];
    var us = turn;
    var them = swap_color(us);
    var second_rank = {b: RANK_7, w: RANK_2};

    var first_sq = SQUARES.a8;
    var last_sq = SQUARES.h1;
    var single_square = false;

    /* do we want legal moves? */
    var legal = (typeof options !== 'undefined' && 'legal' in options) ?
                options.legal : true;

    /* are we generating moves for a single square? */
    if (typeof options !== 'undefined' && 'square' in options) {
      if (options.square in SQUARES) {
        first_sq = last_sq = SQUARES[options.square];
        single_square = true;
      } else {
        /* invalid square */
        return [];
      }
    }

    for (var i = first_sq; i <= last_sq; i++) {
      /* did we run off the end of the board */
      if (i & 0x88) { i += 7; continue; }

      var piece = board[i];
      if (piece == null || piece.color !== us) {
        continue;
      }

      if (piece.type === PAWN) {
        /* single square, non-capturing */
        var square = i + PAWN_OFFSETS[us][0];
        if (board[square] == null) {
            add_move(board, moves, i, square, BITS.NORMAL);

          /* double square */
          var square = i + PAWN_OFFSETS[us][1];
          if (second_rank[us] === rank(i) && board[square] == null) {
            add_move(board, moves, i, square, BITS.BIG_PAWN);
          }
        }

        /* pawn captures */
        for (j = 2; j < 4; j++) {
          var square = i + PAWN_OFFSETS[us][j];
          if (square & 0x88) continue;

          if (board[square] != null &&
              board[square].color === them) {
              add_move(board, moves, i, square, BITS.CAPTURE);
          } else if (square === ep_square) {
              add_move(board, moves, i, ep_square, BITS.EP_CAPTURE);
          }
        }
      } else {
        for (var j = 0, len = PIECE_OFFSETS[piece.type].length; j < len; j++) {
          var offset = PIECE_OFFSETS[piece.type][j];
          var square = i;

          while (true) {
            square += offset;
            if (square & 0x88) break;

            if (board[square] == null) {
              add_move(board, moves, i, square, BITS.NORMAL);
            } else {
              if (board[square].color === us) break;
              add_move(board, moves, i, square, BITS.CAPTURE);
              break;
            }

            /* break, if knight or king */
            if (piece.type === 'n' || piece.type === 'k') break;
          }
        }
      }
    }

    /* check for castling if: a) we're generating all moves, or b) we're doing
     * single square move generation on the king's square
     */
    if ((!single_square) || last_sq === kings[us]) {
      /* king-side castling */
      if (castling[us] & BITS.KSIDE_CASTLE) {
        var castling_from = kings[us];
        var castling_to = castling_from + 2;

        if (board[castling_from + 1] == null &&
            board[castling_to]       == null &&
            !attacked(them, kings[us]) &&
            !attacked(them, castling_from + 1) &&
            !attacked(them, castling_to)) {
          add_move(board, moves, kings[us] , castling_to,
                   BITS.KSIDE_CASTLE);
        }
      }

      /* queen-side castling */
      if (castling[us] & BITS.QSIDE_CASTLE) {
        var castling_from = kings[us];
        var castling_to = castling_from - 2;

        if (board[castling_from - 1] == null &&
            board[castling_from - 2] == null &&
            board[castling_from - 3] == null &&
            !attacked(them, kings[us]) &&
            !attacked(them, castling_from - 1) &&
            !attacked(them, castling_to)) {
          add_move(board, moves, kings[us], castling_to,
                   BITS.QSIDE_CASTLE);
        }
      }
    }

    /* return all pseudo-legal moves (this includes moves that allow the king
     * to be captured)
     */
    if (!legal) {
      return moves;
    }

    /* filter out illegal moves */
    var legal_moves = [];
    for (var i = 0, len = moves.length; i < len; i++) {
      make_move(moves[i]);
      if (!king_attacked(us)) {
        legal_moves.push(moves[i]);
      }
      undo_move();
    }

    return legal_moves;
  }

  /* convert a move from 0x88 coordinates to Standard Algebraic Notation
   * (SAN)
   *
   * @param {boolean} sloppy Use the sloppy SAN generator to work around over
   * disambiguation bugs in Fritz and Chessbase.  See below:
   *
   * r1bqkbnr/ppp2ppp/2n5/1B1pP3/4P3/8/PPPP2PP/RNBQK1NR b KQkq - 2 4
   * 4. ... Nge7 is overly disambiguated because the knight on c6 is pinned
   * 4. ... Ne7 is technically the valid SAN
   */
  function move_to_san(move, sloppy) {

    var output = '';

    if (move.flags & BITS.KSIDE_CASTLE) {
      output = 'O-O';
    } else if (move.flags & BITS.QSIDE_CASTLE) {
      output = 'O-O-O';
    } else {
      var disambiguator = get_disambiguator(move, sloppy);

      if (move.piece !== PAWN) {
        output += move.piece.toUpperCase() + disambiguator;
      }

      if (move.flags & (BITS.CAPTURE | BITS.EP_CAPTURE)) {
        if (move.piece === PAWN) {
          output += algebraic(move.from)[0];
        }
        output += 'x';
      }

      output += algebraic(move.to);

      if (move.flags & BITS.PROMOTION) {
        output += '=' + move.promotion.toUpperCase();
      }
    }

    make_move(move);
    if (in_check()) {
      if (in_checkmate()) {
        output += '#';
      } else {
        output += '+';
      }
    }
    undo_move();

    return output;
  }

  // parses all of the decorators out of a SAN string
  function stripped_san(move) {
    return move.replace(/=/,'').replace(/[+#]?[?!]*$/,'');
  }

  function attacked(color, square) {
    if (square < 0) return false;
    for (var i = SQUARES.a8; i <= SQUARES.h1; i++) {
      /* did we run off the end of the board */
      if (i & 0x88) { i += 7; continue; }

      /* if empty square or wrong color */
      if (board[i] == null || board[i].color !== color) continue;

      var piece = board[i];
      var difference = i - square;
      var index = difference + 119;

      if (ATTACKS[index] & (1 << SHIFTS[piece.type])) {
        if (piece.type === PAWN) {
          if (difference > 0) {
            if (piece.color === WHITE) return true;
          } else {
            if (piece.color === BLACK) return true;
          }
          continue;
        }

        /* if the piece is a knight or a king */
        if (piece.type === 'n' || piece.type === 'k') return true;

        var offset = RAYS[index];
        var j = i + offset;

        var blocked = false;
        while (j !== square) {
          if (board[j] != null) { blocked = true; break; }
          j += offset;
        }

        if (!blocked) return true;
      }
    }

    return false;
  }

  function king_attacked(color) {
    return attacked(swap_color(color), kings[color]);
  }

  function in_check() {
    return king_attacked(turn);
  }

  function in_checkmate() {
    return in_check() && generate_moves().length === 0;
  }

  function in_stalemate() {
    return !in_check() && generate_moves().length === 0;
  }

  function insufficient_material() {
    var pieces = {};
    var bishops = [];
    var num_pieces = 0;
    var sq_color = 0;

    for (var i = SQUARES.a8; i<= SQUARES.h1; i++) {
      sq_color = (sq_color + 1) % 2;
      if (i & 0x88) { i += 7; continue; }

      var piece = board[i];
      if (piece) {
        pieces[piece.type] = (piece.type in pieces) ?
                              pieces[piece.type] + 1 : 1;
        if (piece.type === BISHOP) {
          bishops.push(sq_color);
        }
        num_pieces++;
      }
    }

    /* k vs. k */
    if (num_pieces === 2) { return true; }

    /* k vs. kn .... or .... k vs. kb */
    else if (num_pieces === 3 && (pieces[BISHOP] === 1 ||
                                 pieces[KNIGHT] === 1)) { return true; }

    /* kb vs. kb where any number of bishops are all on the same color */
    else if (num_pieces === pieces[BISHOP] + 2) {
      var sum = 0;
      var len = bishops.length;
      for (var i = 0; i < len; i++) {
        sum += bishops[i];
      }
      if (sum === 0 || sum === len) { return true; }
    }

    return false;
  }

  function in_threefold_repetition() {
    /* TODO: while this function is fine for casual use, a better
     * implementation would use a Zobrist key (instead of FEN). the
     * Zobrist key would be maintained in the make_move/undo_move functions,
     * avoiding the costly that we do below.
     */
    var moves = [];
    var positions = {};
    var repetition = false;

    while (true) {
      var move = undo_move();
      if (!move) break;
      moves.push(move);
    }

    while (true) {
      /* remove the last two fields in the FEN string, they're not needed
       * when checking for draw by rep */
      var fen = generate_fen().split(' ').slice(0,4).join(' ');

      /* has the position occurred three or move times */
      positions[fen] = (fen in positions) ? positions[fen] + 1 : 1;
      if (positions[fen] >= 3) {
        repetition = true;
      }

      if (!moves.length) {
        break;
      }
      make_move(moves.pop());
    }

    return repetition;
  }

  function push(move) {
    history.push({
      move: move,
      kings: {b: kings.b, w: kings.w},
      turn: turn,
      castling: {b: castling.b, w: castling.w},
      ep_square: ep_square,
      half_moves: half_moves,
      move_number: move_number
    });
  }

  function make_move(move) {
    var us = turn;
    var them = swap_color(us);
    push(move);

    board[move.to] = board[move.from];
    board[move.from] = null;

    /* if ep capture, remove the captured pawn */
    if (move.flags & BITS.EP_CAPTURE) {
      if (turn === BLACK) {
        board[move.to - 16] = null;
      } else {
        board[move.to + 16] = null;
      }
    }

    /* if pawn promotion, replace with new piece */
    if (move.flags & BITS.PROMOTION) {
      board[move.to] = {type: move.promotion, color: us};
    }

    /* if we moved the king */
    if (board[move.to].type === KING) {
      kings[board[move.to].color] = move.to;

      /* if we castled, move the rook next to the king */
      if (move.flags & BITS.KSIDE_CASTLE) {
        var castling_to = move.to - 1;
        var castling_from = move.to + 1;
        board[castling_to] = board[castling_from];
        board[castling_from] = null;
      } else if (move.flags & BITS.QSIDE_CASTLE) {
        var castling_to = move.to + 1;
        var castling_from = move.to - 2;
        board[castling_to] = board[castling_from];
        board[castling_from] = null;
      }

      /* turn off castling */
      castling[us] = '';
    }

    /* turn off castling if we move a rook */
    if (castling[us]) {
      for (var i = 0, len = ROOKS[us].length; i < len; i++) {
        if (move.from === ROOKS[us][i].square &&
            castling[us] & ROOKS[us][i].flag) {
          castling[us] ^= ROOKS[us][i].flag;
          break;
        }
      }
    }

    /* turn off castling if we capture a rook */
    if (castling[them]) {
      for (var i = 0, len = ROOKS[them].length; i < len; i++) {
        if (move.to === ROOKS[them][i].square &&
            castling[them] & ROOKS[them][i].flag) {
          castling[them] ^= ROOKS[them][i].flag;
          break;
        }
      }
    }

    /* if big pawn move, update the en passant square */
    if (move.flags & BITS.BIG_PAWN) {
      if (turn === 'b') {
        ep_square = move.to - 16;
      } else {
        ep_square = move.to + 16;
      }
    } else {
      ep_square = EMPTY;
    }

    /* reset the 50 move counter if a pawn is moved or a piece is captured */
    if (move.piece === PAWN) {
      half_moves = 0;
    } else if (move.flags & (BITS.CAPTURE | BITS.EP_CAPTURE)) {
      half_moves = 0;
    } else {
      half_moves++;
    }

    if (turn === BLACK) {
      move_number++;
    }
    turn = swap_color(turn);
  }

  function undo_move() {
    var old = history.pop();
    if (old == null) { return null; }

    var move = old.move;
    kings = old.kings;
    turn = old.turn;
    castling = old.castling;
    ep_square = old.ep_square;
    half_moves = old.half_moves;
    move_number = old.move_number;

    var us = turn;
    var them = swap_color(turn);

    board[move.from] = board[move.to];
    board[move.from].type = move.piece;  // to undo any promotions
    board[move.to] = null;

    if (move.flags & BITS.CAPTURE) {
      board[move.to] = {type: move.captured, color: them};
    } else if (move.flags & BITS.EP_CAPTURE) {
      var index;
      if (us === BLACK) {
        index = move.to - 16;
      } else {
        index = move.to + 16;
      }
      board[index] = {type: PAWN, color: them};
    }


    if (move.flags & (BITS.KSIDE_CASTLE | BITS.QSIDE_CASTLE)) {
      var castling_to, castling_from;
      if (move.flags & BITS.KSIDE_CASTLE) {
        castling_to = move.to + 1;
        castling_from = move.to - 1;
      } else if (move.flags & BITS.QSIDE_CASTLE) {
        castling_to = move.to - 2;
        castling_from = move.to + 1;
      }

      board[castling_to] = board[castling_from];
      board[castling_from] = null;
    }

    return move;
  }

  /* this function is used to uniquely identify ambiguous moves */
  function get_disambiguator(move, sloppy) {
    var moves = generate_moves({legal: !sloppy});

    var from = move.from;
    var to = move.to;
    var piece = move.piece;

    var ambiguities = 0;
    var same_rank = 0;
    var same_file = 0;

    for (var i = 0, len = moves.length; i < len; i++) {
      var ambig_from = moves[i].from;
      var ambig_to = moves[i].to;
      var ambig_piece = moves[i].piece;

      /* if a move of the same piece type ends on the same to square, we'll
       * need to add a disambiguator to the algebraic notation
       */
      if (piece === ambig_piece && from !== ambig_from && to === ambig_to) {
        ambiguities++;

        if (rank(from) === rank(ambig_from)) {
          same_rank++;
        }

        if (file(from) === file(ambig_from)) {
          same_file++;
        }
      }
    }

    if (ambiguities > 0) {
      /* if there exists a similar moving piece on the same rank and file as
       * the move in question, use the square as the disambiguator
       */
      if (same_rank > 0 && same_file > 0) {
        return algebraic(from);
      }
      /* if the moving piece rests on the same file, use the rank symbol as the
       * disambiguator
       */
      else if (same_file > 0) {
        return algebraic(from).charAt(1);
      }
      /* else use the file symbol */
      else {
        return algebraic(from).charAt(0);
      }
    }

    return '';
  }

  function ascii() {
    var s = '   +------------------------+\n';
    for (var i = SQUARES.a8; i <= SQUARES.h1; i++) {
      /* display the rank */
      if (file(i) === 0) {
        s += ' ' + '87654321'[rank(i)] + ' |';
      }

      /* empty piece */
      if (board[i] == null) {
        s += ' . ';
      } else {
        var piece = board[i].type;
        var color = board[i].color;
        var symbol = (color === WHITE) ?
                     piece.toUpperCase() : piece.toLowerCase();
        s += ' ' + symbol + ' ';
      }

      if ((i + 1) & 0x88) {
        s += '|\n';
        i += 8;
      }
    }
    s += '   +------------------------+\n';
    s += '     a  b  c  d  e  f  g  h\n';

    return s;
  }

  // convert a move from Standard Algebraic Notation (SAN) to 0x88 coordinates
  function move_from_san(move, sloppy) {
    // strip off any move decorations: e.g Nf3+?!
    var clean_move = stripped_san(move);

    // if we're using the sloppy parser run a regex to grab piece, to, and from
    // this should parse invalid SAN like: Pe2-e4, Rc1c4, Qf3xf7
    if (sloppy) {
      var matches = clean_move.match(/([pnbrqkPNBRQK])?([a-h][1-8])x?-?([a-h][1-8])([qrbnQRBN])?/);
      if (matches) {
        var piece = matches[1];
        var from = matches[2];
        var to = matches[3];
        var promotion = matches[4];
      }
    }

    var moves = generate_moves();
    for (var i = 0, len = moves.length; i < len; i++) {
      // try the strict parser first, then the sloppy parser if requested
      // by the user
      if ((clean_move === stripped_san(move_to_san(moves[i]))) ||
          (sloppy && clean_move === stripped_san(move_to_san(moves[i], true)))) {
        return moves[i];
      } else {
        if (matches &&
            (!piece || piece.toLowerCase() == moves[i].piece) &&
            SQUARES[from] == moves[i].from &&
            SQUARES[to] == moves[i].to &&
            (!promotion || promotion.toLowerCase() == moves[i].promotion)) {
          return moves[i];
        }
      }
    }

    return null;
  }


  /*****************************************************************************
   * UTILITY FUNCTIONS
   ****************************************************************************/
  function rank(i) {
    return i >> 4;
  }

  function file(i) {
    return i & 15;
  }

  function algebraic(i){
    var f = file(i), r = rank(i);
    return 'abcdefgh'.substring(f,f+1) + '87654321'.substring(r,r+1);
  }

  function swap_color(c) {
    return c === WHITE ? BLACK : WHITE;
  }

  function is_digit(c) {
    return '0123456789'.indexOf(c) !== -1;
  }

  /* pretty = external move object */
  function make_pretty(ugly_move) {
    var move = clone(ugly_move);
    move.san = move_to_san(move, false);
    move.to = algebraic(move.to);
    move.from = algebraic(move.from);

    var flags = '';

    for (var flag in BITS) {
      if (BITS[flag] & move.flags) {
        flags += FLAGS[flag];
      }
    }
    move.flags = flags;

    return move;
  }

  function clone(obj) {
    var dupe = (obj instanceof Array) ? [] : {};

    for (var property in obj) {
      if (typeof property === 'object') {
        dupe[property] = clone(obj[property]);
      } else {
        dupe[property] = obj[property];
      }
    }

    return dupe;
  }

  function trim(str) {
    return str.replace(/^\s+|\s+$/g, '');
  }

  /*****************************************************************************
   * DEBUGGING UTILITIES
   ****************************************************************************/
  function perft(depth) {
    var moves = generate_moves({legal: false});
    var nodes = 0;
    var color = turn;

    for (var i = 0, len = moves.length; i < len; i++) {
      make_move(moves[i]);
      if (!king_attacked(color)) {
        if (depth - 1 > 0) {
          var child_nodes = perft(depth - 1);
          nodes += child_nodes;
        } else {
          nodes++;
        }
      }
      undo_move();
    }

    return nodes;
  }

  return {
    /***************************************************************************
     * PUBLIC CONSTANTS (is there a better way to do this?)
     **************************************************************************/
    WHITE: WHITE,
    BLACK: BLACK,
    PAWN: PAWN,
    KNIGHT: KNIGHT,
    BISHOP: BISHOP,
    ROOK: ROOK,
    QUEEN: QUEEN,
    KING: KING,
    SQUARES: (function() {
                /* from the ECMA-262 spec (section 12.6.4):
                 * "The mechanics of enumerating the properties ... is
                 * implementation dependent"
                 * so: for (var sq in SQUARES) { keys.push(sq); } might not be
                 * ordered correctly
                 */
                var keys = [];
                for (var i = SQUARES.a8; i <= SQUARES.h1; i++) {
                  if (i & 0x88) { i += 7; continue; }
                  keys.push(algebraic(i));
                }
                return keys;
              })(),
    FLAGS: FLAGS,

    /***************************************************************************
     * PUBLIC API
     **************************************************************************/
    load: function(fen) {
      return load(fen);
    },

    reset: function() {
      return reset();
    },

    moves: function(options) {
      /* The internal representation of a chess move is in 0x88 format, and
       * not meant to be human-readable.  The code below converts the 0x88
       * square coordinates to algebraic coordinates.  It also prunes an
       * unnecessary move keys resulting from a verbose call.
       */

      var ugly_moves = generate_moves(options);
      var moves = [];

      for (var i = 0, len = ugly_moves.length; i < len; i++) {

        /* does the user want a full move object (most likely not), or just
         * SAN
         */
        if (typeof options !== 'undefined' && 'verbose' in options &&
            options.verbose) {
          moves.push(make_pretty(ugly_moves[i]));
        } else {
          moves.push(move_to_san(ugly_moves[i], false));
        }
      }

      return moves;
    },

    in_check: function() {
      return in_check();
    },

    in_checkmate: function() {
      return in_checkmate();
    },

    in_stalemate: function() {
      return in_stalemate();
    },

    in_draw: function() {
      return half_moves >= 100 ||
             in_stalemate() ||
             insufficient_material() ||
             in_threefold_repetition();
    },

    insufficient_material: function() {
      return insufficient_material();
    },

    in_threefold_repetition: function() {
      return in_threefold_repetition();
    },

    game_over: function() {
      return half_moves >= 100 ||
             in_checkmate() ||
             in_stalemate() ||
             insufficient_material() ||
             in_threefold_repetition();
    },

    validate_fen: function(fen) {
      return validate_fen(fen);
    },

    fen: function() {
      return generate_fen();
    },

    pgn: function(options) {
      /* using the specification from http://www.chessclub.com/help/PGN-spec
       * example for html usage: .pgn({ max_width: 72, newline_char: "<br />" })
       */
      var newline = (typeof options === 'object' &&
                     typeof options.newline_char === 'string') ?
                     options.newline_char : '\n';
      var max_width = (typeof options === 'object' &&
                       typeof options.max_width === 'number') ?
                       options.max_width : 0;
      var result = [];
      var header_exists = false;

      /* add the PGN header headerrmation */
      for (var i in header) {
        /* TODO: order of enumerated properties in header object is not
         * guaranteed, see ECMA-262 spec (section 12.6.4)
         */
        result.push('[' + i + ' \"' + header[i] + '\"]' + newline);
        header_exists = true;
      }

      if (header_exists && history.length) {
        result.push(newline);
      }

      /* pop all of history onto reversed_history */
      var reversed_history = [];
      while (history.length > 0) {
        reversed_history.push(undo_move());
      }

      var moves = [];
      var move_string = '';

      /* build the list of moves.  a move_string looks like: "3. e3 e6" */
      while (reversed_history.length > 0) {
        var move = reversed_history.pop();

        /* if the position started with black to move, start PGN with 1. ... */
        if (!history.length && move.color === 'b') {
          move_string = move_number + '. ...';
        } else if (move.color === 'w') {
          /* store the previous generated move_string if we have one */
          if (move_string.length) {
            moves.push(move_string);
          }
          move_string = move_number + '.';
        }

        move_string = move_string + ' ' + move_to_san(move, false);
        make_move(move);
      }

      /* are there any other leftover moves? */
      if (move_string.length) {
        moves.push(move_string);
      }

      /* is there a result? */
      if (typeof header.Result !== 'undefined') {
        moves.push(header.Result);
      }

      /* history should be back to what is was before we started generating PGN,
       * so join together moves
       */
      if (max_width === 0) {
        return result.join('') + moves.join(' ');
      }

      /* wrap the PGN output at max_width */
      var current_width = 0;
      for (var i = 0; i < moves.length; i++) {
        /* if the current move will push past max_width */
        if (current_width + moves[i].length > max_width && i !== 0) {

          /* don't end the line with whitespace */
          if (result[result.length - 1] === ' ') {
            result.pop();
          }

          result.push(newline);
          current_width = 0;
        } else if (i !== 0) {
          result.push(' ');
          current_width++;
        }
        result.push(moves[i]);
        current_width += moves[i].length;
      }

      return result.join('');
    },

    load_pgn: function(pgn, options) {
      // allow the user to specify the sloppy move parser to work around over
      // disambiguation bugs in Fritz and Chessbase
      var sloppy = (typeof options !== 'undefined' && 'sloppy' in options) ?
                    options.sloppy : false;

      function mask(str) {
        return str.replace(/\\/g, '\\');
      }

      function has_keys(object) {
        for (var key in object) {
          return true;
        }
        return false;
      }

      function parse_pgn_header(header, options) {
        var newline_char = (typeof options === 'object' &&
                            typeof options.newline_char === 'string') ?
                            options.newline_char : '\r?\n';
        var header_obj = {};
        var headers = header.split(new RegExp(mask(newline_char)));
        var key = '';
        var value = '';

        for (var i = 0; i < headers.length; i++) {
          key = headers[i].replace(/^\[([A-Z][A-Za-z]*)\s.*\]$/, '$1');
          value = headers[i].replace(/^\[[A-Za-z]+\s"(.*)"\]$/, '$1');
          if (trim(key).length > 0) {
            header_obj[key] = value;
          }
        }

        return header_obj;
      }

      var newline_char = (typeof options === 'object' &&
                          typeof options.newline_char === 'string') ?
                          options.newline_char : '\r?\n';
      var regex = new RegExp('^(\\[(.|' + mask(newline_char) + ')*\\])' +
                             '(' + mask(newline_char) + ')*' +
                             '1.(' + mask(newline_char) + '|.)*$', 'g');

      /* get header part of the PGN file */
      var header_string = pgn.replace(regex, '$1');

      /* no info part given, begins with moves */
      if (header_string[0] !== '[') {
        header_string = '';
      }

      reset();

      /* parse PGN header */
      var headers = parse_pgn_header(header_string, options);
      for (var key in headers) {
        set_header([key, headers[key]]);
      }

      /* load the starting position indicated by [Setup '1'] and
      * [FEN position] */
      if (headers['SetUp'] === '1') {
          if (!(('FEN' in headers) && load(headers['FEN']))) {
            return false;
          }
      }

      /* delete header to get the moves */
      var ms = pgn.replace(header_string, '').replace(new RegExp(mask(newline_char), 'g'), ' ');

      /* delete comments */
      ms = ms.replace(/(\{[^}]+\})+?/g, '');

      /* delete recursive annotation variations */
      var rav_regex = /(\([^\(\)]+\))+?/g
      while (rav_regex.test(ms)) {
        ms = ms.replace(rav_regex, '');
      }

      /* delete move numbers */
      ms = ms.replace(/\d+\.(\.\.)?/g, '');

      /* delete ... indicating black to move */
      ms = ms.replace(/\.\.\./g, '');

      /* delete numeric annotation glyphs */
      ms = ms.replace(/\$\d+/g, '');

      /* trim and get array of moves */
      var moves = trim(ms).split(new RegExp(/\s+/));

      /* delete empty entries */
      moves = moves.join(',').replace(/,,+/g, ',').split(',');
      var move = '';

      for (var half_move = 0; half_move < moves.length - 1; half_move++) {
        move = move_from_san(moves[half_move], sloppy);

        /* move not possible! (don't clear the board to examine to show the
         * latest valid position)
         */
        if (move == null) {
          return false;
        } else {
          make_move(move);
        }
      }

      /* examine last move */
      move = moves[moves.length - 1];
      if (POSSIBLE_RESULTS.indexOf(move) > -1) {
        if (has_keys(header) && typeof header.Result === 'undefined') {
          set_header(['Result', move]);
        }
      }
      else {
        move = move_from_san(move, sloppy);
        if (move == null) {
          return false;
        } else {
          make_move(move);
        }
      }
      return true;
    },

    header: function() {
      return set_header(arguments);
    },

    ascii: function() {
      return ascii();
    },

    turn: function() {
      return turn;
    },

    move: function(move, options) {
      /* The move function can be called with in the following parameters:
       *
       * .move('Nxb7')      <- where 'move' is a case-sensitive SAN string
       *
       * .move({ from: 'h7', <- where the 'move' is a move object (additional
       *         to :'h8',      fields are ignored)
       *         promotion: 'q',
       *      })
       */

      // allow the user to specify the sloppy move parser to work around over
      // disambiguation bugs in Fritz and Chessbase
      var sloppy = (typeof options !== 'undefined' && 'sloppy' in options) ?
                    options.sloppy : false;

      var move_obj = null;

      if (typeof move === 'string') {
        move_obj = move_from_san(move, sloppy);
      } else if (typeof move === 'object') {
        var moves = generate_moves();

        /* convert the pretty move object to an ugly move object */
        for (var i = 0, len = moves.length; i < len; i++) {
          if (move.from === algebraic(moves[i].from) &&
              move.to === algebraic(moves[i].to) &&
              (!('promotion' in moves[i]) ||
              move.promotion === moves[i].promotion)) {
            move_obj = moves[i];
            break;
          }
        }
      }

      /* failed to find move */
      if (!move_obj) {
        return null;
      }

      /* need to make a copy of move because we can't generate SAN after the
       * move is made
       */
      var pretty_move = make_pretty(move_obj);

      make_move(move_obj);

      return pretty_move;
    },

    undo: function() {
      var move = undo_move();
      return (move) ? make_pretty(move) : null;
    },

    clear: function() {
      return clear();
    },

    put: function(piece, square) {
      return put(piece, square);
    },

    get: function(square) {
      return get(square);
    },

    remove: function(square) {
      return remove(square);
    },

    perft: function(depth) {
      return perft(depth);
    },

    square_color: function(square) {
      if (square in SQUARES) {
        var sq_0x88 = SQUARES[square];
        return ((rank(sq_0x88) + file(sq_0x88)) % 2 === 0) ? 'light' : 'dark';
      }

      return null;
    },

    history: function(options) {
      var reversed_history = [];
      var move_history = [];
      var verbose = (typeof options !== 'undefined' && 'verbose' in options &&
                     options.verbose);

      while (history.length > 0) {
        reversed_history.push(undo_move());
      }

      while (reversed_history.length > 0) {
        var move = reversed_history.pop();
        if (verbose) {
          move_history.push(make_pretty(move));
        } else {
          move_history.push(move_to_san(move));
        }
        make_move(move);
      }

      return move_history;
    }

  };
};

/* export Chess object if using node or any other CommonJS compatible
 * environment */
if (typeof exports !== 'undefined') exports.Chess = Chess;
/* export Chess object for any RequireJS compatible environment */
if (typeof define !== 'undefined') define( function () { return Chess;  });

},{}],3:[function(require,module,exports){
var Chess = require('chess.js').Chess;
var c = require('./chessutils');

module.exports = function(puzzle) {
    var chess = new Chess();
    chess.load(puzzle.fen);
    addCheckingSquares(puzzle.fen, puzzle.features);
    addCheckingSquares(c.fenForOtherSide(puzzle.fen), puzzle.features);
    return puzzle;
};

function addCheckingSquares(fen, features) {
    var chess = new Chess();
    chess.load(fen);
    var moves = chess.moves({
        verbose: true
    });

    var mates = moves.filter(move => /\#/.test(move.san));
    var checks = moves.filter(move => /\+/.test(move.san));
    features.push({
        description: "Checking squares",
        side: chess.turn(),
        targets: checks.map(m => targetAndDiagram(m.from, m.to, checkingMoves(fen, m), '♔+'))
    });

    features.push({
        description: "Mating squares",
        side: chess.turn(),
        targets: mates.map(m => targetAndDiagram(m.from, m.to, checkingMoves(fen, m), '♔#'))
    });

    if (mates.length > 0) {
        features.forEach(f => {
            if (f.description === "Mate-in-1 threats") {
                f.targets = [];
            }
        });
    }
}

function checkingMoves(fen, move) {
    var chess = new Chess();
    chess.load(fen);
    chess.move(move);
    chess.load(c.fenForOtherSide(chess.fen()));
    var moves = chess.moves({
        verbose: true
    });
    return moves.filter(m => m.captured && m.captured.toLowerCase() === 'k');
}


function targetAndDiagram(from, to, checks, marker) {
    return {
        target: to,
        marker: marker,
        diagram: [{
            orig: from,
            dest: to,
            brush: 'paleBlue'
        }].concat(checks.map(m => {
            return {
                orig: m.from,
                dest: m.to,
                brush: 'red'
            };
        }))
    };
}

},{"./chessutils":4,"chess.js":2}],4:[function(require,module,exports){
/**
 * Chess extensions
 */

var Chess = require('chess.js').Chess;

var allSquares = ['a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7', 'a8', 'b1', 'b2', 'b3', 'b4', 'b5', 'b6', 'b7', 'b8', 'c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8', 'd1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7', 'd8', 'e1', 'e2', 'e3', 'e4', 'e5', 'e6', 'e7', 'e8', 'f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7', 'f8', 'g1', 'g2', 'g3', 'g4', 'g5', 'g6', 'g7', 'g8', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'h7', 'h8'];

/**
 * Place king at square and find out if it is in check.
 */
function isCheckAfterPlacingKingAtSquare(fen, king, square) {
    var chess = new Chess(fen);
    chess.remove(square);
    chess.remove(king);
    chess.put({
        type: 'k',
        color: chess.turn()
    }, square);
    return chess.in_check();
}


function movesThatResultInCaptureThreat(fen, from, to, sameSide) {
    var chess = new Chess(fen);

    if (!sameSide) {
        //null move for player to allow opponent a move
        chess.load(fenForOtherSide(chess.fen()));
        fen = chess.fen();

    }
    var moves = chess.moves({
        verbose: true
    });
    var squaresBetween = between(from, to);

    // do any of the moves reveal the desired capture 
    return moves.filter(move => squaresBetween.indexOf(move.from) !== -1)
        .filter(m => doesMoveResultInCaptureThreat(m, fen, from, to, sameSide));
}

function doesMoveResultInCaptureThreat(move, fen, from, to, sameSide) {
    var chess = new Chess(fen);

    //apply move of intermediary piece (state becomes other sides turn)
    chess.move(move);

    //console.log(chess.ascii());
    //console.log(chess.turn());

    if (sameSide) {
        //null move for opponent to regain the move for original side
        chess.load(fenForOtherSide(chess.fen()));
    }

    //get legal moves
    var moves = chess.moves({
        verbose: true
    });

    // do any of the moves match from,to 
    return moves.filter(m => m.from === from && m.to === to).length > 0;
}

/**
 * Switch side to play (and remove en-passent information)
 */
function fenForOtherSide(fen) {
    if (fen.search(" w ") > 0) {
        return fen.replace(/ w .*/, " b - - 0 1");
    }
    else {
        return fen.replace(/ b .*/, " w - - 0 2");
    }
}

/**
 * Where is the king.
 */
function kingsSquare(fen, colour) {
    return squaresOfPiece(fen, colour, 'k');
}

function squaresOfPiece(fen, colour, pieceType) {
    var chess = new Chess(fen);
    return allSquares.find(square => {
        var r = chess.get(square);
        return r === null ? false : (r.color == colour && r.type.toLowerCase() === pieceType);
    });
}

function movesOfPieceOn(fen, square) {
    var chess = new Chess(fen);
    return chess.moves({
        verbose: true,
        square: square
    });
}

/**
 * Find position of all of one colours pieces excluding the king.
 */
function piecesForColour(fen, colour) {
    var chess = new Chess(fen);
    return allSquares.filter(square => {
        var r = chess.get(square);
        if ((r === null) || (r.type === 'k')) {
            return false;
        }
        return r.color == colour;
    });
}

function allPiecesForColour(fen, colour) {
    var chess = new Chess(fen);
    return allSquares.filter(square => {
        var r = chess.get(square);
        return r && r.color == colour;
    });
}

function majorPiecesForColour(fen, colour) {
    var chess = new Chess(fen);
    return allSquares.filter(square => {
        var r = chess.get(square);
        if ((r === null) || (r.type === 'p')) {
            return false;
        }
        return r.color == colour;
    });
}

function canCapture(from, fromPiece, to, toPiece) {
    var chess = new Chess();
    chess.clear();
    chess.put({
        type: fromPiece.type,
        color: 'w'
    }, from);
    chess.put({
        type: toPiece.type,
        color: 'b'
    }, to);
    var moves = chess.moves({
        square: from,
        verbose: true
    }).filter(m => (/.*x.*/.test(m.san)));
    return moves.length > 0;
}

function between(from, to) {
    var result = [];
    var n = from;
    while (n !== to) {
        n = String.fromCharCode(n.charCodeAt() + Math.sign(to.charCodeAt() - n.charCodeAt())) +
            String.fromCharCode(n.charCodeAt(1) + Math.sign(to.charCodeAt(1) - n.charCodeAt(1)));
        result.push(n);
    }
    result.pop();
    return result;
}

function repairFen(fen) {
    if (/^[^ ]*$/.test(fen)) {
        return fen + " w - - 0 1";
    }
    return fen.replace(/ w .*/, ' w - - 0 1').replace(/ b .*/, ' b - - 0 1');
}

module.exports.allSquares = allSquares;
module.exports.kingsSquare = kingsSquare;
module.exports.piecesForColour = piecesForColour;
module.exports.allPiecesForColour = allPiecesForColour;
module.exports.isCheckAfterPlacingKingAtSquare = isCheckAfterPlacingKingAtSquare;
module.exports.fenForOtherSide = fenForOtherSide;

module.exports.movesThatResultInCaptureThreat = movesThatResultInCaptureThreat;
module.exports.movesOfPieceOn = movesOfPieceOn;
module.exports.majorPiecesForColour = majorPiecesForColour;
module.exports.canCapture = canCapture;
module.exports.between = between;
module.exports.repairFen = repairFen;

},{"chess.js":2}],5:[function(require,module,exports){
var uniq = require('./util/uniq');

/**
 * Find all diagrams associated with target square in the list of features.
 */
function diagramForTarget(side, description, target, features) {
  var diagram = [];
  features
    .filter(f => side ? side === f.side : true)
    .filter(f => description ? description === f.description : true)
    .forEach(f => f.targets.forEach(t => {
      if (!target || t.target === target) {
        diagram = diagram.concat(t.diagram);
        t.selected = true;
      }
    }));
  return uniq(diagram);
}

function allDiagrams(features) {
  var diagram = [];
  features.forEach(f => f.targets.forEach(t => {
    diagram = diagram.concat(t.diagram);
    t.selected = true;
  }));
  return uniq(diagram);
}

function clearDiagrams(features) {
  features.forEach(f => f.targets.forEach(t => {
    t.selected = false;
  }));
}

function clickedSquares(features, correct, incorrect, target) {
  var diagram = diagramForTarget(null, null, target, features);
  correct.forEach(target => {
    diagram.push({
      orig: target,
      brush: 'green'
    });
  });
  incorrect.forEach(target => {
    diagram.push({
      orig: target,
      brush: 'red'
    });
  });
  return diagram;
}

module.exports = {
  diagramForTarget: diagramForTarget,
  allDiagrams: allDiagrams,
  clearDiagrams: clearDiagrams,
  clickedSquares: clickedSquares
};

},{"./util/uniq":19}],6:[function(require,module,exports){
module.exports = [
"r1bk3r/pppq1ppp/5n2/4N1N1/2Bp4/Bn6/P4PPP/4R1K1 w - - 0 1",
"3r1rk1/ppqn3p/1npb1P2/5B2/2P5/2N3B1/PP2Q1PP/R5K1 w - - 0 1",
"r3rk2/6b1/q2pQBp1/1NpP4/1n2PP2/nP6/P3N1K1/R6R w - - 0 1",
"r4n1k/ppBnN1p1/2p1p3/6Np/q2bP1b1/3B4/PPP3PP/R4Q1K w - - 0 1",
"r3QnR1/1bk5/pp5q/2b5/2p1P3/P7/1BB4P/3R3K w - - 0 1",
"q1r2b1k/rb4np/1p2p2N/pB1n4/6Q1/1P2P3/PB3PPP/2RR2K1 w - - 0 1",
"k2n1q1r/p1pB2p1/P4pP1/1Qp1p3/8/2P1BbN1/P7/2KR4 w - - 0 1",
"r2qk2r/pb4pp/1n2Pb2/2B2Q2/p1p5/2P5/2B2PPP/RN2R1K1 w - - 0 1",
"1Q1R4/5k2/6pp/2N1bp2/1Bn5/2P2P1P/1r3PK1/8 b - - 0 1",
"rnR5/p3p1kp/4p1pn/bpP5/5BP1/5N1P/2P2P2/2K5 w - - 0 1",
"r6r/1p2pp1k/p1b2q1p/4pP2/6QR/3B2P1/P1P2K2/7R w - - 0 1",
"2k4r/ppp2p2/2b2B2/7p/6pP/2P1q1bP/PP3N2/R4QK1 b - - 0 1",
"1r2k1r1/pbppnp1p/1b3P2/8/Q7/B1PB1q2/P4PPP/3R2K1 w - - 0 1",
"r4r1k/1bpq1p1n/p1np4/1p1Bb1BQ/P7/6R1/1P3PPP/1N2R1K1 w - - 0 1",
"r4rk1/p4ppp/Pp4n1/4BN2/1bq5/7Q/2P2PPP/3RR1K1 w - - 0 1",
"r3rknQ/1p1R1pb1/p3pqBB/2p5/8/6P1/PPP2P1P/4R1K1 w - - 0 1",
"3k1r1r/pb3p2/1p4p1/1B2B3/3qn3/6QP/P4RP1/2R3K1 w - - 0 1",
"1b4rk/4R1pp/p1b4r/2PB4/Pp1Q4/6Pq/1P3P1P/4RNK1 w - - 0 1",
"r1b1r1k1/ppp1np1p/2np2pQ/5qN1/1bP5/6P1/PP2PPBP/R1B2RK1 w - - 0 1",
"5qrk/p3b1rp/4P2Q/5P2/1pp5/5PR1/P6P/B6K w - - 0 1",
"r2q2nr/5p1p/p1Bp3b/1p1NkP2/3pP1p1/2PP2P1/PP5P/R1Bb1RK1 w - - 0 1",
"2r3k1/1p1r1p1p/pnb1pB2/5p2/1bP5/1P2QP2/P1B3PP/4RK2 w - - 0 1",
"2r5/2p2k1p/pqp1RB2/2r5/PbQ2N2/1P3PP1/2P3P1/4R2K w - - 0 1",
"7r/pRpk4/2np2p1/5b2/2P4q/2b1BBN1/P4PP1/3Q1K2 b - - 0 1",
"R4rk1/4r1p1/1q2p1Qp/1pb5/1n5R/5NB1/1P3PPP/6K1 w - - 0 1",
"2r4k/ppqbpQ1p/3p1bpB/8/8/1Nr2P2/PPP3P1/2KR3R w - - 0 1",
"2r1k2r/1p2pp1p/1p2b1pQ/4B3/3n4/2qB4/P1P2PPP/2KRR3 b - - 0 1",
"r1b2rk1/p3Rp1p/3q2pQ/2pp2B1/3b4/3B4/PPP2PPP/4R1K1 w - - 0 1",
"7k/1b1n1q1p/1p1p4/pP2pP1N/P6b/3pB2P/8/1R1Q2K1 b - - 0 1",
"1r1kr3/Nbppn1pp/1b6/8/6Q1/3B1P2/Pq3P1P/3RR1K1 w - - 0 1",
"r1bqr3/ppp1B1kp/1b4p1/n2B4/3PQ1P1/2P5/P4P2/RN4K1 w - - 0 1",
"r1nk3r/2b2ppp/p3bq2/3pN3/Q2P4/B1NB4/P4PPP/4R1K1 w - - 0 1",
"2r1r1k1/p2n1p1p/5pp1/qQ1P1b2/N7/5N2/PP3RPP/3K1B1R b - - 0 1",
"r1nk3r/2b2ppp/p3b3/3NN3/Q2P3q/B2B4/P4PPP/4R1K1 w - - 0 1",
"r1b1nn1k/p3p1b1/1qp1B1p1/1p1p4/3P3N/2N1B3/PPP3PP/R2Q1K2 w - - 0 1",
"r1bnk2r/pppp1ppp/1b4q1/4P3/2B1N3/Q1Pp1N2/P4PPP/R3R1K1 w - - 0 1",
"6k1/B2N1pp1/p6p/P3N1r1/4nb2/8/2R3B1/6K1 w - - 0 1",
"r1b3nr/ppp1kB1p/3p4/8/3PPBnb/1Q3p2/PPP2q2/RN4RK b - - 0 1",
"r2b2Q1/1bq5/pp1k2p1/2p1n1B1/P3P3/2N5/1PP3PP/5R1K w - - 0 1",
"1R4Q1/3nr1pp/3p1k2/5Bb1/4P3/2q1B1P1/5P1P/6K1 w - - 0 1",
"1r4kr/Q1bRBppp/2b5/8/2B1q3/6P1/P4P1P/5RK1 w - - 0 1",
"6k1/1p5p/3P3r/4p3/2N1PBpb/PPr5/3R1P1K/5b1R b - - 0 1",
"5rk1/1p1r2pp/p2p3q/3P2b1/PP1pP3/5Pp1/4B1P1/2RRQNK1 b - - 0 1",
"2k4r/ppp5/4bqp1/3p2Q1/6n1/2NB3P/PPP2bP1/R1B2R1K b - - 0 1",
"5r1k/3q3p/p2B1npb/P2np3/4N3/2N2b2/5PPP/R3QRK1 b - - 0 1",
"4r3/p4pkp/q7/3Bbb2/P2P1ppP/2N3n1/1PP2KPR/R1BQ4 b - - 0 1",
"3r1q1k/6bp/p1p5/1p2B1Q1/P1B5/3P4/5PPP/4R1K1 w - - 0 1",
"r4kr1/pbNn1q1p/1p6/2p2BPQ/5B2/8/P6P/b4RK1 w - - 0 1",
"r3r2k/4b2B/pn3p2/q1p4R/6b1/4P3/PPQ1NPPP/5RK1 w - - 0 1",
"rnbk1b1r/ppqpnQ1p/4p1p1/2p1N1B1/4N3/8/PPP2PPP/R3KB1R w - - 0 1",
"6rk/p1pb1p1p/2pp1P2/2b1n2Q/4PR2/3B4/PPP1K2P/RNB3q1 w - - 0 1",
"rn3rk1/2qp2pp/p3P3/1p1b4/3b4/3B4/PPP1Q1PP/R1B2R1K w - - 0 1",
"r2B1bk1/1p5p/2p2p2/p1n5/4P1BP/P1Nb4/KPn3PN/3R3R b - - 0 1",
"6k1/2b3r1/8/6pR/2p3N1/2PbP1PP/1PB2R1K/2r5 w - - 0 1",
"r5k1/p1p3bp/1p1p4/2PP2qp/1P6/1Q1bP3/PB3rPP/R2N2RK b - - 0 1",
"3rr2k/pp1b2b1/4q1pp/2Pp1p2/3B4/1P2QNP1/P6P/R4RK1 w - - 0 1",
"2bqr2k/1r1n2bp/pp1pBp2/2pP1PQ1/P3PN2/1P4P1/1B5P/R3R1K1 w - - 0 1",
"q2br1k1/1b4pp/3Bp3/p6n/1p3R2/3B1N2/PP2QPPP/6K1 w - - 0 1",
];

},{}],7:[function(require,module,exports){
module.exports = [
"r1bk3r/pppq1ppp/5n2/4N1N1/2Bp4/Bn6/P4PPP/4R1K1 w - - 0 1",
"2r2bk1/pb3ppp/1p6/n7/q2P4/P1P1R2Q/B2B1PPP/R5K1 w - - 0 1",
"k1n3rr/Pp3p2/3q4/3N4/3Pp2p/1Q2P1p1/3B1PP1/R4RK1 w - - 0 1",
"3r1rk1/ppqn3p/1npb1P2/5B2/2P5/2N3B1/PP2Q1PP/R5K1 w - - 0 1",
"N1bk4/pp1p1Qpp/8/2b5/3n3q/8/PPP2RPP/RNB1rBK1 b - - 0 1",
"r3br1k/pp5p/4B1p1/4NpP1/P2Pn3/q1PQ3R/7P/3R2K1 w - - 0 1",
"8/4R1pk/p5p1/8/1pB1n1b1/1P2b1P1/P4r1P/5R1K b - - 0 1",
"r1bk1r2/pp1n2pp/3NQ3/1P6/8/2n2PB1/q1B3PP/3R1RK1 w - - 0 1",
"rn3rk1/pp3p2/2b1pnp1/4N3/3q4/P1NB3R/1P1Q1PPP/R5K1 w - - 0 1",
"3qrk2/p1r2pp1/1p2pb2/nP1bN2Q/3PN3/P6R/5PPP/R5K1 w - - 0 1",
"r4n1k/ppBnN1p1/2p1p3/6Np/q2bP1b1/3B4/PPP3PP/R4Q1K w - - 0 1",
"5k1r/4npp1/p3p2p/3nP2P/3P3Q/3N4/qB2KPP1/2R5 w - - 0 1",
"r3r1k1/1b6/p1np1ppQ/4n3/4P3/PNB4R/2P1BK1P/1q6 w - - 0 1",
"r3q1k1/5p2/3P2pQ/Ppp5/1pnbN2R/8/1P4PP/5R1K w - - 0 1",
"2r2b1k/p2Q3p/b1n2PpP/2p5/3r1BN1/3q2P1/P4PB1/R3R1K1 w - - 0 1",
"q1r2b1k/rb4np/1p2p2N/pB1n4/6Q1/1P2P3/PB3PPP/2RR2K1 w - - 0 1",
"2r1k2r/pR2p1bp/2n1P1p1/8/2QP4/q2b1N2/P2B1PPP/4K2R w - - 0 1",
"3br3/pp2r3/2p4k/4N1pp/3PP3/P1N5/1P2K3/6RR w - - 0 1",
"2rr1k2/pb4p1/1p1qpp2/4R2Q/3n4/P1N5/1P3PPP/1B2R1K1 w - - 0 1",
"4q1rk/pb2bpnp/2r4Q/1p1p1pP1/4NP2/1P3R2/PBn4P/RB4K1 w - - 0 1",
"rnb2b1r/p3kBp1/3pNn1p/2pQN3/1p2PP2/4B3/Pq5P/4K3 w - - 0 1",
"r5nr/6Rp/p1NNkp2/1p3b2/2p5/5K2/PP2P3/3R4 w - - 0 1",
"r1b1kb1r/pp1n1pp1/1qp1p2p/6B1/2PPQ3/3B1N2/P4PPP/R4RK1 w - - 0 1",
"rn3k1r/pbpp1Bbp/1p4pN/4P1B1/3n4/2q3Q1/PPP2PPP/2KR3R w - - 0 1",
"r1bqkb2/6p1/p1p4p/1p1N4/8/1B3Q2/PP3PPP/3R2K1 w - - 0 1",
"rnbq1bnr/pp1p1p1p/3pk3/3NP1p1/5p2/5N2/PPP1Q1PP/R1B1KB1R w - - 0 1",
"r3rk2/5pn1/pb1nq1pR/1p2p1P1/2p1P3/2P2QN1/PPBB1P2/2K4R w - - 0 1",
"r1bq3r/ppp1nQ2/2kp1N2/6N1/3bP3/8/P2n1PPP/1R3RK1 w - - 0 1",
"4r3/pbpn2n1/1p1prp1k/8/2PP2PB/P5N1/2B2R1P/R5K1 w - - 0 1",
"rq3rk1/3n1pp1/pb4n1/3N2P1/1pB1QP2/4B3/PP6/2KR3R w - - 0 1",
"4b3/k1r1q2p/p3p3/3pQ3/2pN4/1R6/P4PPP/1R4K1 w - - 0 1",
"2b2r1k/1p2R3/2n2r1p/p1P1N1p1/2B3P1/P6P/1P3R2/6K1 w - - 0 1",
"1qr2bk1/pb3pp1/1pn3np/3N2NQ/8/P7/BP3PPP/2B1R1K1 w - - 0 1",
"1k5r/pP3ppp/3p2b1/1BN1n3/1Q2P3/P1B5/KP3P1P/7q w - - 0 1",
"5kqQ/1b1r2p1/ppn1p1Bp/2b5/2P2rP1/P4N2/1B5P/4RR1K w - - 0 1",
"3rnr1k/p1q1b1pB/1pb1p2p/2p1P3/2P2N2/PP4P1/1BQ4P/4RRK1 w - - 0 1",
"r2qr2k/pp1b3p/2nQ4/2pB1p1P/3n1PpR/2NP2P1/PPP5/2K1R1N1 w - - 0 1",
"r2q1r1k/pppb2pp/2np4/5p2/5N2/1B1Q4/PPP1RPPP/R5K1 w - - 0 1",
"r1b1qr2/pp2n1k1/3pp1pR/2p2pQ1/4PN2/2NP2P1/PP1K1PB1/n7 w - - 0 1",
"3r1r1k/1p3p1p/p2p4/4n1NN/6bQ/1BPq4/P3p1PP/1R5K w - - 0 1",
"1r3r1k/6p1/p6p/2bpNBP1/1p2n3/1P5Q/PBP1q2P/1K5R w - - 0 1",
"r4rk1/4bp2/1Bppq1p1/4p1n1/2P1Pn2/3P2N1/P2Q1PBK/1R5R b - - 0 1",
"r2q3r/ppp5/2n4p/4Pbk1/2BP1Npb/P2QB3/1PP3P1/R5K1 w - - 0 1",
"2r2bk1/2qn1ppp/pn1p4/5N2/N3r3/1Q6/5PPP/BR3BK1 w - - 0 1",
"r5kr/pppN1pp1/1bn1R3/1q1N2Bp/3p2Q1/8/PPP2PPP/R5K1 w - - 0 1",
"r3n1k1/pb5p/4N1p1/2pr4/q7/3B3P/1P1Q1PP1/2B1R1K1 w - - 0 1",
"1k1r2r1/ppq4p/4Q3/1B2np2/2P1p3/P7/2P1RPPR/2B1K3 b - - 0 1",
"rn4nr/pppq2bk/7p/5b1P/4NBQ1/3B4/PPP3P1/R3K2R w - - 0 1",
"r1br4/1p2bpk1/p1nppn1p/5P2/4P2B/qNNB3R/P1PQ2PP/7K w - - 0 1",
"2r5/2p2k1p/pqp1RB2/2r5/PbQ2N2/1P3PP1/2P3P1/4R2K w - - 0 1",
"6k1/5p2/R5p1/P6n/8/5PPp/2r3rP/R4N1K b - - 0 1",
"r3kr2/6Qp/1Pb2p2/pB3R2/3pq2B/4n3/1P4PP/4R1K1 w - - 0 1",
"r1r3k1/1bq2pbR/p5p1/1pnpp1B1/3NP3/3B1P2/PPPQ4/1K5R w - - 0 1",
"5Q2/1p3p1N/2p3p1/5b1k/2P3n1/P4RP1/3q2rP/5R1K w - - 0 1",
"rnb1k2r/ppppbN1p/5n2/7Q/4P3/2N5/PPPP3P/R1B1KB1q w - - 0 1",
"r1b2rk1/1p4qp/p5pQ/2nN1p2/2B2P2/8/PPP3PP/2K1R3 w - - 0 1",
"4r1k1/pb4pp/1p2p3/4Pp2/1P3N2/P2Qn2P/3n1qPK/RBB1R3 b - - 0 1",
"3q1r2/2rbnp2/p3pp1k/1p1p2N1/3P2Q1/P3P3/1P3PPP/5RK1 w - - 0 1",
"q5k1/5rb1/r6p/1Np1n1p1/3p1Pn1/1N4P1/PP5P/R1BQRK2 b - - 0 1",
"rn1q3r/pp2kppp/3Np3/2b1n3/3N2Q1/3B4/PP4PP/R1B2RK1 w - - 0 1",
"rnb1kb1r/pp3ppp/2p5/4q3/4n3/3Q4/PPPB1PPP/2KR1BNR w - - 0 1",
"4r1k1/3r1p1p/bqp1n3/p2p1NP1/Pn1Q1b2/7P/1PP3B1/R2NR2K w - - 0 1",
"7r/6kr/p5p1/1pNb1pq1/PPpPp3/4P1b1/R3R1Q1/2B2BK1 b - - 0 1",
"rnbkn2r/pppp1Qpp/5b2/3NN3/3Pp3/8/PPP1KP1P/R1B4q w - - 0 1",
"r7/6R1/ppkqrn1B/2pp3p/P6n/2N5/8/1Q1R1K2 w - - 0 1",
"r1b2rk1/1p3ppp/p2p4/3NnQ2/2B1R3/8/PqP3PP/5RK1 w - - 0 1",
"r4r1k/2qb3p/p2p1p2/1pnPN3/2p1Pn2/2P1N3/PPB1QPR1/6RK w - - 0 1",
"rnbq1b1r/pp4kp/5np1/4p2Q/2BN1R2/4B3/PPPN2PP/R5K1 w - - 0 1",
"1nbk1b1r/1r6/p2P2pp/1B2PpN1/2p2P2/2P1B3/7P/R3K2R w - - 0 1",
"1r1kr3/Nbppn1pp/1b6/8/6Q1/3B1P2/Pq3P1P/3RR1K1 w - - 0 1",
"4k1r1/5p2/p1q5/1p2p2p/6n1/P4bQ1/1P4RP/3NR1BK b - - 0 1",
"5nk1/2N2p2/2b2Qp1/p3PpNp/2qP3P/6P1/5P1K/8 w - - 0 1",
"1k5r/pp1Q1pp1/2p4r/b4Pn1/3NPp2/2P2P2/1q4B1/1R2R1K1 b - - 0 1",
"6rk/5p2/2p1p2p/2PpP1q1/3PnQn1/8/4P2P/1N2BR1K b - - 0 1",
"4rk1r/p2b1pp1/1q5p/3pR1n1/3N1p2/1P1Q1P2/PBP3PK/4R3 w - - 0 1",
"r1bq1rk1/pp1nb1pp/5p2/6B1/3pQ3/3BPN2/PP3PPP/R4RK1 w - - 0 1",
"rn1r4/pp2p1b1/5kpp/q1PQ1b2/6n1/2N2N2/PPP3PP/R1B2RK1 w - - 0 1",
"k7/p1Qnr2p/b1pB1p2/3p3q/N1p5/3P3P/PPP3P1/6K1 w - - 0 1",
"3r4/4RRpk/5n1N/8/p1p2qPP/P1Qp1P2/1P4K1/3b4 w - - 0 1",
"qr6/1b1p1krQ/p2Pp1p1/4PP2/1p1B1n2/3B4/PP3K1P/2R2R2 w - - 0 1",
"r1nk3r/2b2ppp/p3bq2/3pN3/Q2P4/B1NB4/P4PPP/4R1K1 w - - 0 1",
"4r2k/4Q1bp/4B1p1/1q2n3/4pN2/P1B3P1/4pP1P/4R1K1 w - - 0 1",
"4r1k1/5ppp/p2p4/4r3/1pNn4/1P6/1PPK2PP/R3R3 b - - 0 1",
"r1nk3r/2b2ppp/p3b3/3NN3/Q2P3q/B2B4/P4PPP/4R1K1 w - - 0 1",
"r1b1k1nr/p2p1ppp/n2B4/1p1NPN1P/6P1/3P1Q2/P1P1K3/q5b1 w - - 0 1",
"2r1rk2/1b2b1p1/p1q2nP1/1p2Q3/4P3/P1N1B3/1PP1B2R/2K4R w - - 0 1",
"4r1k1/pR3pp1/7p/3n1b1N/2pP4/2P2PQ1/3B1KPP/q7 b - - 0 1",
"2R1R1nk/1p4rp/p1n5/3N2p1/1P6/2P5/P6P/2K5 w - - 0 1",
"r1b1r1kq/pppnpp1p/1n4pB/8/4N2P/1BP5/PP2QPP1/R3K2R w - - 0 1",
"rnb2rk1/ppp2qb1/6pQ/2pN1p2/8/1P3BP1/PB2PP1P/R4RK1 w - - 0 1",
"r2qkb1r/2p1nppp/p2p4/np1NN3/4P3/1BP5/PP1P1PPP/R1B1K2R w - - 0 1",
"r6r/1q1nbkp1/pn2p2p/1p1pP1P1/3P1N1P/1P1Q1P2/P2B1K2/R6R w - - 0 1",
"3k4/1pp3b1/4b2p/1p3qp1/3Pn3/2P1RN2/r5P1/1Q2R1K1 b - - 0 1",
"rn3k2/pR2b3/4p1Q1/2q1N2P/3R2P1/3K4/P3Br2/8 w - - 0 1",
"2r1r3/pp1nbN2/4p3/q7/P1pP2nk/2P2P2/1PQ5/R3R1K1 w - - 0 1",
"6k1/5p2/p5n1/8/1p1p2P1/1Pb2B1r/P3KPN1/2RQ3q b - - 0 1",
"r1bqr1k1/ppp2pp1/3p4/4n1NQ/2B1PN2/8/P4PPP/b4RK1 w - - 0 1",
"1r2q2k/4N2p/3p1Pp1/2p1n1P1/2P5/p2P2KQ/P3R3/8 w - - 0 1",
"r5rk/pp2qb1p/2p2pn1/2bp4/3pP1Q1/1B1P1N1R/PPP3PP/R1B3K1 w - - 0 1",
"rnbq1bkr/pp3p1p/2p3pQ/3N2N1/2B2p2/8/PPPP2PP/R1B1R1K1 w - - 0 1",
"2r2n1k/2q3pp/p2p1b2/2nB1P2/1p1N4/8/PPP4Q/2K3RR w - - 0 1",
"r1q5/2p2k2/p4Bp1/2Nb1N2/p6Q/7P/nn3PP1/R5K1 w - - 0 1",
"rn2kb1r/1pQbpppp/1p6/qp1N4/6n1/8/PPP3PP/2KR2NR w - - 0 1",
"2r1k3/3n1p2/6p1/1p1Qb3/1B2N1q1/2P1p3/P4PP1/2KR4 w - - 0 1",
"r1b1r3/qp1n1pk1/2pp2p1/p3n3/N1PNP1P1/1P3P2/P6Q/1K1R1B1R w - - 0 1",
"5rk1/2pb1ppp/p2r4/1p1Pp3/4Pn1q/1B1PNP2/PP1Q1P1P/R5RK b - - 0 1",
"3nbr2/4q2p/r3pRpk/p2pQRN1/1ppP2p1/2P5/PPB4P/6K1 w - - 0 1",
"r1bnrn2/ppp1k2p/4p3/3PNp1P/5Q2/3B2R1/PPP2PP1/2K1R3 w - - 0 1",
"7k/p5b1/1p4Bp/2q1p1p1/1P1n1r2/P2Q2N1/6P1/3R2K1 b - - 0 1",
"r1bq1k1r/pp2R1pp/2pp1p2/1n1N4/8/3P1Q2/PPP2PPP/R1B3K1 w - - 0 1",
"r1bn1b2/ppk1n2r/2p3pp/5p2/N1PNpPP1/2B1P3/PP2B2P/2KR2R1 w - - 0 1",
"2rq2k1/3bb2p/n2p2pQ/p2Pp3/2P1N1P1/1P5P/6B1/2B2R1K w - - 0 1",
"r6k/pp4pp/1b1P4/8/1n4Q1/2N1RP2/PPq3p1/1RB1K3 b - - 0 1",
"rnb2b1r/ppp1n1kp/3p1q2/7Q/4PB2/2N5/PPP3PP/R4RK1 w - - 0 1",
"r2k2nr/pp1b1Q1p/2n4b/3N4/3q4/3P4/PPP3PP/4RR1K w - - 0 1",
"5r1k/3q3p/p2B1npb/P2np3/4N3/2N2b2/5PPP/R3QRK1 b - - 0 1",
"4r3/p4pkp/q7/3Bbb2/P2P1ppP/2N3n1/1PP2KPR/R1BQ4 b - - 0 1",
"6k1/6p1/3r1n1p/p4p1n/P1N4P/2N5/Q2RK3/7q b - - 0 1",
"8/8/2K2b2/2N2k2/1p4R1/1B3n1P/3r1P2/8 w - - 0 1",
"2q2r2/5rk1/4pNpp/p2pPn2/P1pP2QP/2P2R2/2B3P1/6K1 w - - 0 1",
"5kr1/pp4p1/3b1rb1/2Bp2NQ/1q6/8/PP3PPP/R3R1K1 w - - 0 1",
"r1b2r2/pp3Npk/6np/8/2q1N3/4Q3/PPP2RPP/6K1 w - - 0 1",
"r2q1rk1/p4p1p/3p1Q2/2n3B1/B2R4/8/PP3PPP/5bK1 w - - 0 1",
"3q2r1/p2b1k2/1pnBp1N1/3p1pQP/6P1/5R2/2r2P2/4RK2 w - - 0 1",
"3rnn2/p1r2pkp/1p2pN2/2p1P3/5Q1N/2P3P1/PP2qPK1/R6R w - - 0 1",
"r1b2rk1/pp2b1pp/q3pn2/3nN1N1/3p4/P2Q4/1P3PPP/RBB1R1K1 w - - 0 1",
"qr3b1r/Q5pp/3p4/1kp5/2Nn1B2/Pp6/1P3PPP/2R1R1K1 w - - 0 1",
"r2qr1k1/1p3pP1/p2p1np1/2pPp1B1/2PnP1b1/2N2p2/PP1Q4/2KR1BNR w - - 0 1",
"6rk/p3p2p/1p2Pp2/2p2P2/2P1nBr1/1P6/P6P/3R1R1K b - - 0 1",
"rk3q1r/pbp4p/1p3P2/2p1N3/3p2Q1/3P4/PPP3PP/R3R1K1 w - - 0 1",
"3q1r2/pb3pp1/1p6/3pP1Nk/2r2Q2/8/Pn3PP1/3RR1K1 w - - 0 1",
"r7/3bb1kp/q4p1N/1pnPp1np/2p4Q/2P5/1PB3P1/2B2RK1 w - - 0 1",
"1r1qrbk1/3b3p/p2p1pp1/3NnP2/3N4/1Q4BP/PP4P1/1R2R2K w - - 0 1",
"r2r2k1/1q4p1/ppb3p1/2bNp3/P1Q5/1N5R/1P4BP/n6K w - - 0 1",
"1b2r1k1/3n2p1/p3p2p/1p3r2/3PNp1q/3BnP1P/PP1BQP1K/R6R b - - 0 1",
"6rk/1pqbbp1p/p3p2Q/6R1/4N1nP/3B4/PPP5/2KR4 w - - 0 1",
"r3r1n1/pp3pk1/2q2p1p/P2NP3/2p1QP2/8/1P5P/1B1R3K w - - 0 1",
"rnbk1b1r/ppqpnQ1p/4p1p1/2p1N1B1/4N3/8/PPP2PPP/R3KB1R w - - 0 1",
"2br3k/pp3Pp1/1n2p3/1P2N1pr/2P2qP1/8/1BQ2P1P/4R1K1 w - - 0 1",
"5rk1/pp2p2p/3p2pb/2pPn2P/2P2q2/2N4P/PP3BR1/R2BK1N1 b - - 0 1",
"r3q1r1/1p2bNkp/p3n3/2PN1B1Q/PP1P1p2/7P/5PP1/6K1 w - - 0 1",
"r5rk/ppq2p2/2pb1P1B/3n4/3P4/2PB3P/PP1QNP2/1K6 w - - 0 1",
"2b1rqk1/r1p2pp1/pp4n1/3Np1Q1/4P2P/1BP5/PP3P2/2KR2R1 w - - 0 1",
"r1b4r/1k2bppp/p1p1p3/8/Np2nB2/3R4/PPP1BPPP/2KR4 w - - 0 1",
"r2qr1k1/1p1n2pp/2b1p3/p2pP1b1/P2P1Np1/3BPR2/1PQB3P/5RK1 w - - 0 1",
"2rb3r/3N1pk1/p2pp2p/qp2PB1Q/n2N1P2/6P1/P1P4P/1K1RR3 w - - 0 1",
"r1b2k1r/2q1b3/p3ppBp/2n3B1/1p6/2N4Q/PPP3PP/2KRR3 w - - 0 1",
"r1b1rk2/pp1nbNpB/2p1p2p/q2nB3/3P3P/2N1P3/PPQ2PP1/2KR3R w - - 0 1",
"r1bq1r1k/pp4pp/2pp4/2b2p2/4PN2/1BPP1Q2/PP3PPP/R4RK1 w - - 0 1",
"r2q4/p2nR1bk/1p1Pb2p/4p2p/3nN3/B2B3P/PP1Q2P1/6K1 w - - 0 1",
"5r1k/pp1n1p1p/5n1Q/3p1pN1/3P4/1P4RP/P1r1qPP1/R5K1 w - - 0 1",
"4nrk1/rR5p/4pnpQ/4p1N1/2p1N3/6P1/q4P1P/4R1K1 w - - 0 1",
"7R/r1p1q1pp/3k4/1p1n1Q2/3N4/8/1PP2PPP/2B3K1 w - - 0 1",
"r1qbr2k/1p2n1pp/3B1n2/2P1Np2/p4N2/PQ4P1/1P3P1P/3RR1K1 w - - 0 1",
"1r1rb3/p1q2pkp/Pnp2np1/4p3/4P3/Q1N1B1PP/2PRBP2/3R2K1 w - - 0 1",
"4r3/2q1rpk1/p3bN1p/2p3p1/4QP2/2N4P/PP4P1/5RK1 w - - 0 1",
"rq3rk1/1p1bpp1p/3p2pQ/p2N3n/2BnP1P1/5P2/PPP5/2KR3R w - - 0 1",
"4r1k1/Q4bpp/p7/5N2/1P3qn1/2P5/P1B3PP/R5K1 b - - 0 1",
"4r3/2p5/2p1q1kp/p1r1p1pN/P5P1/1P3P2/4Q3/3RB1K1 w - - 0 1",
"3r3k/1b2b1pp/3pp3/p3n1P1/1pPqP2P/1P2N2R/P1QB1r2/2KR3B b - - 0 1",
];

},{}],8:[function(require,module,exports){
module.exports = [
"r2q1rk1/ppp1n1p1/1b1p1p2/1B1N2BQ/3pP3/2P3P1/PP3P2/R5K1 w - - 0 1",
"3r1rk1/ppqn3p/1npb1P2/5B2/2P5/2N3B1/PP2Q1PP/R5K1 w - - 0 1",
"2bq1k1r/r5pp/p2b1Pn1/1p1Q4/3P4/1B6/PP3PPP/2R1R1K1 w - - 0 1",
"2r1k3/2P3R1/3P2K1/6N1/8/8/8/3r4 w - - 0 1",
"1r1b1n2/1pk3p1/4P2p/3pP3/3N4/1p2B3/6PP/R5K1 w - - 0 1",
"r1b2k1r/ppp1bppp/8/1B1Q4/5q2/2P5/PPP2PPP/R3R1K1 w - - 0 1",
"5qrk/p3b1rp/4P2Q/5P2/1pp5/5PR1/P6P/B6K w - - 0 1",
"2rnk3/pq3p2/3P1Q1R/1p6/3P4/5P2/P1b1N1P1/5K2 w - - 0 1",
"2rrk3/QR3pp1/2n1b2p/1BB1q3/3P4/8/P4PPP/6K1 w - - 0 1",
"r1b2k1r/1p1p1pp1/p2P4/4N1Bp/3p4/8/PPB2P2/2K1R3 w - - 0 1",
"7R/5rp1/2p1r1k1/2q5/4pP1Q/4P3/5PK1/7R w - - 0 1",
"r1b2k1r/pppp4/1bP2qp1/5pp1/4pP2/1BP5/PBP3PP/R2Q1R1K b - - 0 1",
"r1bnk2r/pppp1ppp/1b4q1/4P3/2B1N3/Q1Pp1N2/P4PPP/R3R1K1 w - - 0 1",
"2kr3r/1p3ppp/p3pn2/2b1B2q/Q1N5/2P5/PP3PPP/R2R2K1 w - - 0 1",
"6k1/1p3pp1/p1b1p2p/q3r1b1/P7/1P5P/1NQ1RPP1/1B4K1 b - - 0 1",
"5r2/1qp2pp1/bnpk3p/4NQ2/2P5/1P5P/5PP1/4R1K1 w - - 0 1",
"1r2r2k/1q1n1p1p/p1b1pp2/3pP3/1b5R/2N1BBQ1/1PP3PP/3R3K w - - 0 1",
"4R3/p2r1q1k/5B1P/6P1/2p4K/3b4/4Q3/8 w - - 0 1",
"4k3/p5p1/2p4r/2NPb3/4p1pr/1P4q1/P1QR1R1P/7K b - - 0 1",
"6r1/r5PR/2p3R1/2Pk1n2/3p4/1P1NP3/4K3/8 w - - 0 1",
"6k1/5p1p/2Q1p1p1/5n1r/N7/1B3P1P/1PP3PK/4q3 b - - 0 1",
"8/3n2pp/2qBkp2/ppPpp1P1/1P2P3/1Q6/P4PP1/6K1 w - - 0 1",
"r2qkb1r/1pp1pppp/p1nn4/3N1b2/Q1BP1B2/4P3/PP3PPP/R3K1NR w - - 0 1",
"3br1k1/3N1ppp/1p1QP3/3P4/6P1/5q2/5P1P/5RK1 b - - 0 1",
"8/5p2/4b1kp/3pPp1N/3Pn1P1/B6P/7K/8 b - - 0 1",
"r2qkb1r/n2bnpp1/2p1p2p/RP6/Q1BPP2B/2N2N2/1P3PPP/4K2R b - - 0 1",
"r1bq1rk1/pp1p1pp1/1b3n1p/n2p4/1P2P3/3B1N2/P4PPP/RNBQ1RK1 w - - 0 1",
"r1bq1rk1/ppp2pp1/2np1n1p/2b1p3/N1B1P3/3P1N1P/PPP2PP1/R1BQ1RK1 b - - 0 1",
"5k1r/p1p1q1pp/1pB2p1n/3p1b2/1P6/P3p2P/2PN1PP1/R1BQ1RK1 w - - 0 1",
"rnbq1rk1/ppp2ppp/3b1n2/8/4P3/3PBN2/PPP3PP/RN1QKB1R b - - 0 1",
"r1bq1rk1/ppp1bppn/3P3p/8/2BQ4/2N1B3/PPP2PPP/R4RK1 b - - 0 1",
"r2q1r1k/1p3ppp/p2pbb1n/2p5/P1BpPPPP/NP1P4/2P3Q1/2K1R2R b - - 0 1",
"rnbqkb1r/p5pp/2pp3n/1p2pp2/4P3/1PNB1N1P/P1PPQPP1/R1B2RK1 w - - 0 1",
"rnbq1rk1/ppp1b1pp/3p1n2/4p3/5p2/1P2P1P1/PBPPNPBP/RN1Q1RK1 w - - 0 1",
"r1bq1rk1/pp2bppp/2n2n2/2p1p3/4p3/2PP1N2/PPB1QPPP/RNB2RK1 w - - 0 1",
"r1b2r1k/1pp3p1/p1q1pPBp/5p1Q/3P4/P5N1/1P3PPP/3R1RK1 b - - 0 1",
"rnbqkb1r/ppp3pp/3p1P2/6B1/8/3B1N2/PPP2PPP/RN1QK2R b - - 0 1",
"rn3rk1/pp2n1pp/1q1p4/2pP1p1b/2P1PP2/3BBN2/P1Q3PP/R4RK1 w - - 0 1",
"rnq2rk1/pp1b1ppp/2pb1n2/3p4/3NP3/1BN1P2P/PPP2PP1/R1BQ1RK1 b - - 0 1",
"2kr4/ppp4Q/6p1/2b2pq1/8/2P1p1P1/PP1PN2P/R1B1K2R w - - 0 1",
"r1bqkbnr/pp1p1ppp/8/2p5/3nP3/1PNQ2p1/P1PPN2P/R1B1KB1R w - - 0 1",
"rnbqk2r/pppp1pp1/7p/2b1N3/2B1N3/8/PPPP1PPP/R1BQK2R b - - 0 1",
"r1b1k2r/ppppq1p1/7p/2b1P3/2B1Q3/8/PPP2PPP/R1B2RK1 b - - 0 1",
"rnbq1rk1/pp3pp1/2pbpn1p/3p4/4P3/1QN4N/PPPP1PPP/R1B1KB1R b - - 0 1",
"rn2k2r/ppp2pp1/3p1n1p/2P1p3/2B1N3/8/P1PP1P1P/R1B1K1R1 b - - 0 1",
"6k1/6p1/8/8/3P1q1r/7P/PP4P1/3R3K b - - 0 1",
"r2q2k1/1pp3p1/p1npbb1p/8/3PP3/7P/PP3PP1/R1BQ1RK1 w - - 0 1",
"r1b2rk1/pppp1ppp/n4n2/4q3/1b5Q/2P1PpP1/PB1P2BP/RN2K1NR w - - 0 1",
"3r1rk1/b1p3pp/p1p1Pp2/2P2P2/1P2N1n1/2B5/P3K2P/R6R b - - 0 1",
"r4nk1/4q1pp/1r1p1p2/2pPp3/2P2B2/1p6/P4PPP/R1Q1R1K1 w - - 0 1",
"r1b3r1/pp1p2pp/k1Pb4/2p1p3/8/2QP4/PPP2PPP/RN2K2R b - - 0 1",
"1r4k1/p1p1q1pp/5p2/2pPpP2/br4PP/1P1RPB2/P1Q5/2K4R b - - 0 1",
"3q2k1/p1pn2pp/1rn1b1r1/1p1pp3/4PpNb/2PP1B1P/PPN1QPP1/R1B1R1K1 w - - 0 1",
"r1bq1r1k/ppppn1pp/1b1P4/n4p2/2B1P2B/2N2N2/PP3PPP/R2Q1RK1 b - - 0 1",
"r4rk1/pp3ppp/1qnb1n2/1B1pp3/2P5/3P1N1P/PP3P1P/R1BQ1RK1 b - - 0 1",
"r1bqk1nr/pppp3p/5pp1/4p3/1bBnP3/5Q1N/PPPP1PPP/RNB2RK1 w - - 0 1",
"r3k2r/ppb1q2p/n1p1Bpp1/2PP4/3P4/P4N1P/1P3PP1/1R1Q1RK1 b - - 0 1",
"r1bq1rk1/pp1pbpp1/5n1p/2p5/2BpPN1B/3P4/PPP2PPP/R2Q1RK1 b - - 0 1",
"r4rk1/1pp1bpp1/2pq1n1p/p3pQ2/4PP2/3PB2P/PPP1N1P1/R4RK1 b - - 0 1",
"r1b1k2b/p1pn3p/1p2P1p1/5n2/5B2/2NB4/PPP2PPP/2KRR3 b - - 0 1",
"r1bqkbnr/pp3ppp/2n1p3/2ppP3/3P4/2N1B3/PPP2PPP/R2QKBNR b - - 0 1",
"r1b2rk1/1p4pp/1pn2p2/1N2qp2/8/P2Bp2P/1PP2PP1/1R1Q1RK1 w - - 0 1",
"r7/7k/1Bp3pp/4pq1n/P3Q3/1PP4P/2P3P1/3R2K1 w - - 0 1",
"r2qr1k1/2p1nppp/p7/1p1pN1N1/3P4/1B5P/PP3PP1/R3Q1K1 b - - 0 1",
"rnb1kr2/ppp1n1pp/3P2q1/8/8/4PN2/PPPP2PP/RNB2RK1 b - - 0 1",
"r2q4/pbpp1kp1/1p1b1n1p/8/3pP3/3P4/PPP2PPP/RN1QK2R w - - 0 1",
"rnbqk1nr/pp1p2pp/1b2pP2/2p3B1/3P4/2P2N2/PP3PPP/RN1QKB1R b - - 0 1",
"r1bq1rk1/ppp1n1p1/1bn1pP2/3p2N1/3P1PP1/2P2Q2/PP5P/RNB2RK1 b - - 0 1",
"rn2k2r/ppp2p1p/4p1p1/4b1qn/3PB3/4P2P/PPP2P2/R1BQK2R w - - 0 1",
"2r3k1/5ppp/4p3/2bnNnN1/5P2/8/1P4PP/2B2R1K w - - 0 1",
"r3kbnr/pp4p1/2n1p2p/q1ppPb2/3P3P/P1N1BN2/1PP2PB1/R2QK2R b - - 0 1",
"rnbqk2r/p3bppp/1p2p3/2p5/2pPP3/P1N1BP2/1PPQN1PP/2KR3R w - - 0 1",
"8/6QP/pk6/8/5b1r/5K2/PP4P1/8 b - - 0 1",
"rn1qk1nr/pp2bppp/2p1p3/3p4/3PP3/2NQ1N2/PPP2PPP/R1B1K2R b - - 0 1",
"r1bq1rk1/ppp2ppp/3b1n2/3Pn3/2B1pP2/8/PPPPQ1PP/RNB2RK1 w - - 0 1",
"5rk1/p4ppp/1rp1p3/3pB1Q1/3Pn3/1P4PP/P1P2P2/R3R1K1 b - - 0 1",
"rn1qkb1r/ppp1pppp/5n2/5bN1/8/2Np4/PPP2PPP/R1BQKB1R w - - 0 1",
"5rk1/rb3p1p/5p2/3p4/4P3/PP1BnNB1/1P3RPP/R5K1 w - - 0 1",
"r2q1rk1/ppbn1pp1/3p3p/3p4/1PB1PNb1/P2Q1N2/2P3PP/R4R1K w - - 0 1",
"r5nr/3k1ppp/p2Pp3/n7/3N1B2/8/PP3PPP/R3K2R b - - 0 1",
"rn1qkbnr/1p6/p1pp1p2/6pp/Q1BPPpb1/2P2N2/PP1N2PP/R1B2RK1 w - - 0 1",
"r3k2r/pp1n1pp1/1qpbpn1p/3p4/3PP3/P1NQ1N1P/1PP2PP1/R1B1R1K1 b - - 0 1",
"7r/2qn1rk1/2p2bpp/p1p1pp2/P1P2P2/1P1PBRQN/6PP/4R1K1 w - - 0 1",
"r2qk1nr/ppp3pp/2n2p2/2bp4/3pPPb1/3B1N2/PPP3PP/RNBQ1R1K w - - 0 1",
"r1b2qk1/ppQ4p/2P1pprp/3p4/3n4/P5P1/1P1NPPBP/R4RK1 b - - 0 1",
"r2qkb1r/pp3p1p/2b1p1p1/2ppP2n/3P1P2/2N1BN2/PPP3PP/R2Q1RK1 b - - 0 1",
"rnbqk2r/ppp2ppp/5n2/2bP4/5P2/3p2N1/PPP3PP/RNBQKB1R w - - 0 1",
"r1b4r/1pk3pp/p1np4/3Bn1b1/PP2K3/5P2/3P3P/2R5 w - - 0 1",
"r1bqkbnr/p5pp/1pnp1P2/2p5/2BP1B2/5N2/PPP3PP/RN1QK2R b - - 0 1",
];

},{}],9:[function(require,module,exports){
module.exports = [
"1rb2k2/1pq3pQ/pRpNp3/P1P2n2/3P1P2/4P3/6PP/6K1 w - - 0 1",
"2r2bk1/pb3ppp/1p6/n7/q2P4/P1P1R2Q/B2B1PPP/R5K1 w - - 0 1",
"3r2k1/p1p2p2/bp2p1nQ/4PB1P/2pr3q/6R1/PP3PP1/3R2K1 w - - 0 1",
"r1br1b2/4pPk1/1p1q3p/p2PR3/P1P2N2/1P1Q2P1/5PBK/4R3 w - - 0 1",
"7r/3kbp1p/1Q3R2/3p3q/p2P3B/1P5K/P6P/8 w - - 0 1",
"4Rnk1/pr3ppp/1p3q2/5NQ1/2p5/8/P4PPP/6K1 w - - 0 1",
"4qk2/6p1/p7/1p1Qp3/r1P2b2/1K5P/1P6/4RR2 w - - 0 1",
"3r1rk1/ppqn3p/1npb1P2/5B2/2P5/2N3B1/PP2Q1PP/R5K1 w - - 0 1",
"r3rk2/6b1/q2pQBp1/1NpP4/1n2PP2/nP6/P3N1K1/R6R w - - 0 1",
"r5k1/pp2ppb1/3p4/q3P1QR/6b1/r2B1p2/1PP5/1K4R1 w - - 0 1",
"6k1/5pp1/p3p2p/3bP2P/6QN/8/rq4P1/2R4K w - - 0 1",
"N1bk4/pp1p1Qpp/8/2b5/3n3q/8/PPP2RPP/RNB1rBK1 b - - 0 1",
"r3br1k/pp5p/4B1p1/4NpP1/P2Pn3/q1PQ3R/7P/3R2K1 w - - 0 1",
"6kr/pp2r2p/n1p1PB1Q/2q5/2B4P/2N3p1/PPP3P1/7K w - - 0 1",
"1R6/5qpk/4p2p/1Pp1Bp1P/r1n2QP1/5PK1/4P3/8 w - - 0 1",
"8/4R1pk/p5p1/8/1pB1n1b1/1P2b1P1/P4r1P/5R1K b - - 0 1",
"r1bk1r2/pp1n2pp/3NQ3/1P6/8/2n2PB1/q1B3PP/3R1RK1 w - - 0 1",
"rn3rk1/pp3p2/2b1pnp1/4N3/3q4/P1NB3R/1P1Q1PPP/R5K1 w - - 0 1",
"2kr1b1r/pp3ppp/2p1b2q/4B3/4Q3/2PB2R1/PPP2PPP/3R2K1 w - - 0 1",
"5qr1/kp2R3/5p2/1b1N1p2/5Q2/P5P1/6BP/6K1 w - - 0 1",
"r2qrk2/p5b1/2b1p1Q1/1p1pP3/2p1nB2/2P1P3/PP3P2/2KR3R w - - 0 1",
"r5rk/pp1np1bn/2pp2q1/3P1bN1/2P1N2Q/1P6/PB2PPBP/3R1RK1 w - - 0 1",
"r4n1k/ppBnN1p1/2p1p3/6Np/q2bP1b1/3B4/PPP3PP/R4Q1K w - - 0 1",
"r3QnR1/1bk5/pp5q/2b5/2p1P3/P7/1BB4P/3R3K w - - 0 1",
"1r4k1/3b2pp/1b1pP2r/pp1P4/4q3/8/PP4RP/2Q2R1K b - - 0 1",
"r2Nqb1r/pQ1bp1pp/1pn1p3/1k1p4/2p2B2/2P5/PPP2PPP/R3KB1R w - - 0 1",
"r6k/pb4bp/5Q2/2p1Np2/1qB5/8/P4PPP/4RK2 w - - 0 1",
"2r2b1k/p2Q3p/b1n2PpP/2p5/3r1BN1/3q2P1/P4PB1/R3R1K1 w - - 0 1",
"r3r2k/pb1n3p/1p1q1pp1/4p1B1/2BP3Q/2P1R3/P4PPP/4R1K1 w - - 0 1",
"q1r2b1k/rb4np/1p2p2N/pB1n4/6Q1/1P2P3/PB3PPP/2RR2K1 w - - 0 1",
"2r1k2r/pR2p1bp/2n1P1p1/8/2QP4/q2b1N2/P2B1PPP/4K2R w - - 0 1",
"5rk1/pp2Rppp/nqp5/8/5Q2/6PB/PPP2P1P/6K1 w - - 0 1",
"1Q1R4/5k2/6pp/2N1bp2/1Bn5/2P2P1P/1r3PK1/8 b - - 0 1",
"1q5r/1b1r1p1k/2p1pPpb/p1Pp4/3B1P1Q/1P4P1/P4KB1/2RR4 w - - 0 1",
"r1bqn1rk/1p1np1bp/p1pp2p1/6P1/2PPP3/2N1BPN1/PP1Q4/2KR1B1R w - - 0 1",
"r2q4/pp1rpQbk/3p2p1/2pPP2p/5P2/2N5/PPP2P2/2KR3R w - - 0 1",
"4q1rk/pb2bpnp/2r4Q/1p1p1pP1/4NP2/1P3R2/PBn4P/RB4K1 w - - 0 1",
"5rk1/pbppq1bN/1pn1p1Q1/6N1/3P4/8/PPP2PP1/2K4R w - - 0 1",
"r2r4/1p1bn2p/pn2ppkB/5p2/4PQN1/6P1/PPq2PBP/R2R2K1 w - - 0 1",
"5rk1/ppp3pp/8/3pQ3/3P2b1/5rPq/PP1P1P2/R1BB1RK1 b - - 0 1",
"r6r/1p2pp1k/p1b2q1p/4pP2/6QR/3B2P1/P1P2K2/7R w - - 0 1",
"r2Q1q1k/pp5r/4B1p1/5p2/P7/4P2R/7P/1R4K1 w - - 0 1",
"5k2/p2Q1pp1/1b5p/1p2PB1P/2p2P2/8/PP3qPK/8 w - - 0 1",
"r3kb1r/pb6/2p2p1p/1p2pq2/2pQ3p/2N2B2/PP3PPP/3RR1K1 w - - 0 1",
"rn3k1r/pbpp1Bbp/1p4pN/4P1B1/3n4/2q3Q1/PPP2PPP/2KR3R w - - 0 1",
"r1b3kr/ppp1Bp1p/1b6/n2P4/2p3q1/2Q2N2/P4PPP/RN2R1K1 w - - 0 1",
"1R1br1k1/pR5p/2p3pB/2p2P2/P1qp2Q1/2n4P/P5P1/6K1 w - - 0 1",
"6rk/2p2p1p/p2q1p1Q/2p1pP2/1nP1R3/1P5P/P5P1/2B3K1 w - - 0 1",
"r3rk2/5pn1/pb1nq1pR/1p2p1P1/2p1P3/2P2QN1/PPBB1P2/2K4R w - - 0 1",
"3rkq1r/1pQ2p1p/p3bPp1/3pR3/8/8/PPP2PP1/1K1R4 w - - 0 1",
"n2q1r1k/4bp1p/4p3/4P1p1/2pPNQ2/2p4R/5PPP/2B3K1 w - - 0 1",
"2Rr1qk1/5ppp/p2N4/P7/5Q2/8/1r4PP/5BK1 w - - 0 1",
"r1bq2rk/pp3pbp/2p1p1pQ/7P/3P4/2PB1N2/PP3PPR/2KR4 w - - 0 1",
"5qr1/pr3p1k/1n1p2p1/2pPpP1p/P3P2Q/2P1BP1R/7P/6RK w - - 0 1",
"7k/pb4rp/2qp1Q2/1p3pP1/np3P2/3PrN1R/P1P4P/R3N1K1 w - - 0 1",
"8/p4pk1/6p1/3R4/3nqN1P/2Q3P1/5P2/3r1BK1 b - - 0 1",
"r1b2rk1/p1qnbp1p/2p3p1/2pp3Q/4pP2/1P1BP1R1/PBPP2PP/RN4K1 w - - 0 1",
"rqr3k1/3bppBp/3p2P1/p7/1n2P3/1p3P2/1PPQ2P1/2KR3R w - - 0 1",
"r3q1rk/1pp3pb/pb5Q/3pB3/3P4/2P2N1P/PP1N2P1/7K w - - 0 1",
"3Q1rk1/8/7R/p1N1p1Bp/P1q5/7b/3Q1PPK/1r6 b - - 0 1",
"1r2k1r1/pbppnp1p/1b3P2/8/Q7/B1PB1q2/P4PPP/3R2K1 w - - 0 1",
"2r3k1/6pp/p2p4/1p6/1p2P3/1PNK1bQ1/1BP3qP/R7 b - - 0 1",
"1r3rk1/1nqb2n1/6R1/1p1Pp3/1Pp3p1/2P4P/2B2QP1/2B2RK1 w - - 0 1",
"3r1rk1/p1p4p/8/1PP1p1bq/2P5/3N1Pp1/PB2Q3/1R3RK1 b - - 0 1",
"2b3k1/6p1/p2bp2r/1p1p4/3Np1B1/1PP1PRq1/P1R3P1/3Q2K1 b - - 0 1",
"5q2/1ppr1br1/1p1p1knR/1N4R1/P1P1PP2/1P6/2P4Q/2K5 w - - 0 1",
"r2q1b1r/1pN1n1pp/p1n3k1/4Pb2/2BP4/8/PPP3PP/R1BQ1RK1 w - - 0 1",
"4n3/pbq2rk1/1p3pN1/8/2p2Q2/Pn4N1/B4PP1/4R1K1 w - - 0 1",
"8/1p2p1kp/2rRB3/pq2n1Pp/4P3/8/PPP2Q2/2K5 w - - 0 1",
"3r1rk1/1q2b1n1/p1b1pRpQ/1p2P3/3BN3/P1PB4/1P4PP/4R2K w - - 0 1",
"r4r1k/1bpq1p1n/p1np4/1p1Bb1BQ/P7/6R1/1P3PPP/1N2R1K1 w - - 0 1",
"k1b4r/1p6/pR3p2/P1Qp2p1/2pp4/6PP/2P2qBK/8 w - - 0 1",
"r3rknQ/1p1R1pb1/p3pqBB/2p5/8/6P1/PPP2P1P/4R1K1 w - - 0 1",
"k2r4/pp3p2/2p5/Q3p2p/4Kp1P/5R2/PP4q1/7R b - - 0 1",
"5rk1/1bR2pbp/4p1p1/8/1p1P1PPq/1B2P2r/P2NQ2P/5RK1 b - - 0 1",
"6rk/3b3p/p2b1p2/2pPpP2/2P1B3/1P4q1/P2BQ1PR/6K1 w - - 0 1",
"3k1r1r/pb3p2/1p4p1/1B2B3/3qn3/6QP/P4RP1/2R3K1 w - - 0 1",
"5kqQ/1b1r2p1/ppn1p1Bp/2b5/2P2rP1/P4N2/1B5P/4RR1K w - - 0 1",
"3rnr1k/p1q1b1pB/1pb1p2p/2p1P3/2P2N2/PP4P1/1BQ4P/4RRK1 w - - 0 1",
"6rk/5p1p/5p2/1p2bP2/1P2R2Q/2q1BBPP/5PK1/r7 w - - 0 1",
"5r1k/2q1r1p1/1npbBpQB/1p1p3P/p2P2R1/P4PP1/1PR2PK1/8 w - - 0 1",
"r1b2rk1/1p3pb1/2p3p1/p1B5/P3N3/1B1Q1Pn1/1PP3q1/2KR3R w - - 0 1",
"8/QrkbR3/3p3p/2pP4/1P3N2/6P1/6pK/2q5 w - - 0 1",
"8/pp3pk1/2b2b2/8/2Q2P1r/2P1q2B/PP4PK/5R2 b - - 0 1",
"1r3r1k/2R4p/q4ppP/3PpQ2/2RbP3/pP6/P2B2P1/1K6 w - - 0 1",
"r1q2b2/p4p1k/1p1r3p/3B1P2/3B2Q1/4P3/P5PP/5RK1 w - - 0 1",
"6k1/6pp/1q6/4pp2/P5n1/1P6/1P3BPr/R4QK1 b - - 0 1",
"5r2/6k1/p2p4/6n1/P3p3/8/5P2/2q2QKR b - - 0 1",
"1k1r4/1b1p2pp/PQ2p3/nN6/P3P3/8/6PP/2q2BK1 w - - 0 1",
"2b3k1/1p5p/2p1n1pQ/3qB3/3P4/3B3P/r5P1/5RK1 w - - 0 1",
"2r1rk2/6b1/1q2ppP1/pp1PpQB1/8/PPP2BP1/6K1/7R w - - 0 1",
"rr3k2/pppq1pN1/1b1p1BnQ/1b2p1N1/4P3/2PP3P/PP3PP1/R4RK1 w - - 0 1",
"7R/1bpkp3/p2pp3/3P4/4B1q1/2Q5/4NrP1/3K4 w - - 0 1",
"2b1r2r/2q1p1kn/pN1pPp2/P2P1RpQ/3p4/3B4/1P4PP/R6K w - - 0 1",
"3r1kbR/1p1r2p1/2qp1n2/p3pPQ1/P1P1P3/BP6/2B5/6RK w - - 0 1",
"5qrk/p3b1rp/4P2Q/5P2/1pp5/5PR1/P6P/B6K w - - 0 1",
"1r3r1k/6p1/p6p/2bpNBP1/1p2n3/1P5Q/PBP1q2P/1K5R w - - 0 1",
"8/1r5p/kpQ3p1/p3rp2/P6P/8/4bPPK/1R6 w - - 0 1",
"3r1k2/1pr2pR1/p1bq1n1Q/P3pP2/3pP3/3P4/1P2N2P/6RK w - - 0 1",
"3Rrk2/1p1R1pr1/2p1p2Q/2q1P1p1/5P2/8/1PP5/1K6 w - - 0 1",
"1R3nk1/5pp1/3N2b1/4p1n1/2BqP1Q1/8/8/7K w - - 0 1",
"2r2rk1/1b3pp1/4p3/p3P1Q1/1pqP1R2/2P5/PP1B1K1P/R7 w - - 0 1",
"6k1/pp3r2/2p4q/3p2p1/3Pp1b1/4P1P1/PP4RP/2Q1RrNK b - - 0 1",
"8/8/p3p3/3b1pR1/1B3P1k/8/4r1PK/8 w - - 0 1",
"r1b2nrk/1p3p1p/p2p1P2/5P2/2q1P2Q/8/PpP5/1K1R3R w - - 0 1",
"r5kr/pppN1pp1/1bn1R3/1q1N2Bp/3p2Q1/8/PPP2PPP/R5K1 w - - 0 1",
"b3r1k1/5ppp/p2p4/p4qN1/Q2b4/6R1/5PPP/5RK1 b - - 0 1",
"r2Rnk1r/1p2q1b1/7p/6pQ/4Ppb1/1BP5/PP3BPP/2K4R w - - 0 1",
"r3nr1k/1b2Nppp/pn6/q3p1P1/P1p4Q/R7/1P2PP1P/2B2RK1 w - - 0 1",
"r5rR/3Nkp2/4p3/1Q4q1/np1N4/8/bPPR2P1/2K5 w - - 0 1",
"5rk1/pp3ppp/7r/6n1/NB1P3q/PQ3P2/1P4P1/R4RK1 b - - 0 1",
"4R3/2p2kpQ/3p3p/p2r2q1/8/1Pr2P2/P1P3PP/4R1K1 w - - 0 1",
"2q1r3/4pR2/3rQ1pk/p1pnN2p/Pn5B/8/1P4PP/3R3K w - - 0 1",
"rn4nr/pppq2bk/7p/5b1P/4NBQ1/3B4/PPP3P1/R3K2R w - - 0 1",
"3rn2r/3kb2p/p4ppB/1q1Pp3/8/3P1N2/1P2Q1PP/R1R4K w - - 0 1",
"4kr2/3rn2p/1P4p1/2p5/Q1B2P2/8/P2q2PP/4R1K1 w - - 0 1",
"r1br4/1p2bpk1/p1nppn1p/5P2/4P2B/qNNB3R/P1PQ2PP/7K w - - 0 1",
"3q3r/r4pk1/pp2pNp1/3bP1Q1/7R/8/PP3PPP/3R2K1 w - - 0 1",
"r1kq1b1r/5ppp/p4n2/2pPR1B1/Q7/2P5/P4PPP/1R4K1 w - - 0 1",
"r3kr2/6Qp/1Pb2p2/pB3R2/3pq2B/4n3/1P4PP/4R1K1 w - - 0 1",
"2rrk3/QR3pp1/2n1b2p/1BB1q3/3P4/8/P4PPP/6K1 w - - 0 1",
"1qbk2nr/1pNp2Bp/2n1pp2/8/2P1P3/8/Pr3PPP/R2QKB1R w - - 0 1",
"2Q5/6pk/5b1p/5P2/3p4/1Rr2qNK/7P/8 b - - 0 1",
"4Br1k/p5pp/1n6/8/3PQbq1/6P1/PP5P/RNB3K1 b - - 0 1",
"rnb1k2r/ppppbN1p/5n2/7Q/4P3/2N5/PPPP3P/R1B1KB1q w - - 0 1",
"6k1/2R1Qpb1/3Bp1p1/1p2n2p/3q4/1P5P/2N2PPK/r7 b - - 0 1",
"r1b2rk1/pp3ppp/3p4/3Q1nq1/2B1R3/8/PP3PPP/R5K1 w - - 0 1",
"1r3b2/1bp2pkp/p1q4N/1p1n1pBn/8/2P3QP/PPB2PP1/4R1K1 w - - 0 1",
"7r/pRpk4/2np2p1/5b2/2P4q/2b1BBN1/P4PP1/3Q1K2 b - - 0 1",
"R4rk1/4r1p1/1q2p1Qp/1pb5/1n5R/5NB1/1P3PPP/6K1 w - - 0 1",
"r1b2rk1/1p2nppp/p2R1b2/4qP1Q/4P3/1B2B3/PPP2P1P/2K3R1 w - - 0 1",
"7k/p1p2bp1/3q1N1p/4rP2/4pQ2/2P4R/P2r2PP/4R2K w - - 0 1",
"4r1k1/pb4pp/1p2p3/4Pp2/1P3N2/P2Qn2P/3n1qPK/RBB1R3 b - - 0 1",
"r1bq1r1k/pp2n1pp/8/3N1p2/2B4R/8/PPP2QPP/7K w - - 0 1",
"5rk1/3p1p1p/p4Qq1/1p1P2R1/7N/n6P/2r3PK/8 w - - 0 1",
"r2r2k1/p3bppp/3p4/q2p3n/3QP3/1P4R1/PB3PPP/R5K1 w - - 0 1",
"r4r2/2qnbpkp/b3p3/2ppP1N1/p2P1Q2/P1P5/5PPP/nBBR2K1 w - - 0 1",
"5r1k/1p1b1p1p/p2ppb2/5P1B/1q6/1Pr3R1/2PQ2PP/5R1K w - - 0 1",
"5r2/pp2R3/1q1p3Q/2pP1b2/2Pkrp2/3B4/PPK2PP1/R7 w - - 0 1",
"q5k1/5rb1/r6p/1Np1n1p1/3p1Pn1/1N4P1/PP5P/R1BQRK2 b - - 0 1",
"7r/1p3bk1/1Pp2p2/3p2p1/3P1nq1/1QPNR1P1/5P2/5BK1 b - - 0 1",
"rn1q3r/pp2kppp/3Np3/2b1n3/3N2Q1/3B4/PP4PP/R1B2RK1 w - - 0 1",
"2rkr3/3b1p1R/3R1P2/1p2Q1P1/pPq5/P1N5/1KP5/8 w - - 0 1",
"r1bq1rk1/4np1p/1p3RpB/p1Q5/2Bp4/3P4/PPP3PP/R5K1 w - - 0 1",
"1rbk1r2/pp4R1/3Np3/3p2p1/6q1/BP2P3/P2P2B1/2R3K1 w - - 0 1",
"2k4r/1r1q2pp/QBp2p2/1p6/8/8/P4PPP/2R3K1 w - - 0 1",
"r1qr3k/3R2p1/p3Q3/1p2p1p1/3bN3/8/PP3PPP/5RK1 w - - 0 1",
"2rr3k/1p1b1pq1/4pNp1/Pp2Q2p/3P4/7R/5PPP/4R1K1 w - - 0 1",
"5rk1/pb2npp1/1pq4p/5p2/5B2/1B6/P2RQ1PP/2r1R2K b - - 0 1",
"r3Rnkr/1b5p/p3NpB1/3p4/1p6/8/PPP3P1/2K2R2 w - - 0 1",
"4r1k1/3r1p1p/bqp1n3/p2p1NP1/Pn1Q1b2/7P/1PP3B1/R2NR2K w - - 0 1",
"7r/6kr/p5p1/1pNb1pq1/PPpPp3/4P1b1/R3R1Q1/2B2BK1 b - - 0 1",
"2r4k/ppqbpQ1p/3p1bpB/8/8/1Nr2P2/PPP3P1/2KR3R w - - 0 1",
"2r1k2r/1p2pp1p/1p2b1pQ/4B3/3n4/2qB4/P1P2PPP/2KRR3 b - - 0 1",
"1r1r4/Rp2np2/3k4/3P3p/2Q2p2/2P4q/1P1N1P1P/6RK w - - 0 1",
"r1b2rk1/p3Rp1p/3q2pQ/2pp2B1/3b4/3B4/PPP2PPP/4R1K1 w - - 0 1",
"6rk/6pp/2p2p2/2B2P1q/1P2Pb2/1Q5P/2P2P2/3R3K w - - 0 1",
"rnbq1b1r/pp4kp/5np1/4p2Q/2BN1R2/4B3/PPPN2PP/R5K1 w - - 0 1",
"1r1kr3/Nbppn1pp/1b6/8/6Q1/3B1P2/Pq3P1P/3RR1K1 w - - 0 1",
"3r2k1/1b2Qp2/pqnp3b/1pn5/3B3p/1PR4P/P4PP1/1B4K1 w - - 0 1",
"4k1r1/5p2/p1q5/1p2p2p/6n1/P4bQ1/1P4RP/3NR1BK b - - 0 1",
"1k5r/pp1Q1pp1/2p4r/b4Pn1/3NPp2/2P2P2/1q4B1/1R2R1K1 b - - 0 1",
"k2r3r/p3Rppp/1p4q1/1P1b4/3Q1B2/6N1/PP3PPP/6K1 w - - 0 1",
"4rk1r/p2b1pp1/1q5p/3pR1n1/3N1p2/1P1Q1P2/PBP3PK/4R3 w - - 0 1",
"r1bq1rk1/pp1nb1pp/5p2/6B1/3pQ3/3BPN2/PP3PPP/R4RK1 w - - 0 1",
"kb3R2/1p5r/5p2/1P1Q4/p5P1/q7/5P2/4RK2 w - - 0 1",
"rn1r4/pp2p1b1/5kpp/q1PQ1b2/6n1/2N2N2/PPP3PP/R1B2RK1 w - - 0 1",
"rr2k3/5p2/p1bppPpQ/2p1n1P1/1q2PB2/2N4R/PP4BP/6K1 w - - 0 1",
"r5k1/2Rb3r/p2p3b/P2Pp3/4P1pq/5p2/1PQ2B1P/2R2BKN b - - 0 1",
"r1bqr3/ppp1B1kp/1b4p1/n2B4/3PQ1P1/2P5/P4P2/RN4K1 w - - 0 1",
"3r4/4RRpk/5n1N/8/p1p2qPP/P1Qp1P2/1P4K1/3b4 w - - 0 1",
"2rr2k1/1b1q2p1/p2Pp1Qp/1pn1P2P/2p5/8/PP3PP1/1BR2RK1 w - - 0 1",
"1r3r1k/6R1/1p2Qp1p/p1p4N/3pP3/3P1P2/PP2q2P/5R1K w - - 0 1",
"4r3/p1r2p1k/1p2pPpp/2qpP3/3R2P1/1PPQ3R/1P5P/7K w - - 0 1",
"1R4nr/p1k1ppb1/2p4p/4Pp2/3N1P1B/8/q1P3PP/3Q2K1 w - - 0 1",
"2R2bk1/5rr1/p3Q2R/3Ppq2/1p3p2/8/PP1B2PP/7K w - - 0 1",
"4r2k/4Q1bp/4B1p1/1q2n3/4pN2/P1B3P1/4pP1P/4R1K1 w - - 0 1",
"2rq1r1k/1b2bp1p/p1nppp1Q/1p3P2/4P1PP/2N2N2/PPP5/1K1R1B1R w - - 0 1",
"3r2k1/pp5p/6p1/2Ppq3/4Nr2/4B2b/PP2P2K/R1Q1R2B b - - 0 1",
"r2Bk2r/pb1n1pQ1/3np3/1p2P3/2p3K1/3p4/PP1b1PPP/R4B1R b - - 0 1",
"4r1k1/3n1ppp/4r3/3n3q/Q2P4/5P2/PP2BP1P/R1B1R1K1 b - - 0 1",
"r1nk3r/2b2ppp/p3b3/3NN3/Q2P3q/B2B4/P4PPP/4R1K1 w - - 0 1",
"4N1nk/p5R1/4b2p/3pPp1Q/2pB1P1K/2P3PP/7r/2q5 w - - 0 1",
"7k/pbp3bp/3p4/1p5q/3n2p1/5rB1/PP1NrN1P/1Q1BRRK1 b - - 0 1",
"3n2b1/1pr1r2k/p1p1pQpp/P1P5/2BP1PP1/5K2/1P5R/8 w - - 0 1",
"4rk2/1bq2p1Q/3p1bp1/1p1n2N1/4PB2/2Pp3P/1P1N4/5RK1 w - - 0 1",
"b4rk1/p4p2/1p4Pq/4p3/8/P1N2PQ1/BP3PK1/8 w - - 0 1",
"3r1r2/ppb1qBpk/2pp1R1p/7Q/4P3/2PP2P1/PP4KP/5R2 w - - 0 1",
"4r3/5p1k/2p1nBpp/q2p4/P1bP4/2P1R2Q/2B2PPP/6K1 w - - 0 1",
"6r1/pp3N1k/1q2bQpp/3pP3/8/6RP/PP3PP1/6K1 w - - 0 1",
"2r1rk2/1b2b1p1/p1q2nP1/1p2Q3/4P3/P1N1B3/1PP1B2R/2K4R w - - 0 1",
"br1qr1k1/b1pnnp2/p2p2p1/P4PB1/3NP2Q/2P3N1/B5PP/R3R1K1 w - - 0 1",
"r2r4/pp2ppkp/2P3p1/q1p5/4PQ2/2P2b2/P4PPP/2R1KB1R b - - 0 1",
"6k1/5pp1/1pq4p/p3P3/P4P2/2P1Q1PK/7P/R1Br3r b - - 0 1",
"r1b2k1r/pppp4/1bP2qp1/5pp1/4pP2/1BP5/PBP3PP/R2Q1R1K b - - 0 1",
"r1b1nn1k/p3p1b1/1qp1B1p1/1p1p4/3P3N/2N1B3/PPP3PP/R2Q1K2 w - - 0 1",
"rnb2rk1/ppp2qb1/6pQ/2pN1p2/8/1P3BP1/PB2PP1P/R4RK1 w - - 0 1",
"5rkr/pp2Rp2/1b1p1Pb1/3P2Q1/2n3P1/2p5/P4P2/4R1K1 w - - 0 1",
"rn1k3r/1b1q1ppp/p2P4/2B2p2/8/1QNBR3/PP3PPP/2R3K1 w - - 0 1",
"rnb2r1k/pp2q2p/2p2R2/8/2Bp3Q/8/PPP3PP/RN4K1 w - - 0 1",
"3k4/1pp3b1/4b2p/1p3qp1/3Pn3/2P1RN2/r5P1/1Q2R1K1 b - - 0 1",
"r1bnk2r/pppp1ppp/1b4q1/4P3/2B1N3/Q1Pp1N2/P4PPP/R3R1K1 w - - 0 1",
"2q5/p3p2k/3pP1p1/2rN2Pn/1p1Q4/7R/PPr5/1K5R w - - 0 1",
"2r1r3/pp1nbN2/4p3/q7/P1pP2nk/2P2P2/1PQ5/R3R1K1 w - - 0 1",
"6k1/p1p3pp/6q1/3pr3/3Nn3/1QP1B1Pb/PP3r1P/R3R1K1 b - - 0 1",
"6k1/5p2/p5n1/8/1p1p2P1/1Pb2B1r/P3KPN1/2RQ3q b - - 0 1",
"4r1r1/pb1Q2bp/1p1Rnkp1/5p2/2P1P3/4BP2/qP2B1PP/2R3K1 w - - 0 1",
"r1bqr1k1/ppp2pp1/3p4/4n1NQ/2B1PN2/8/P4PPP/b4RK1 w - - 0 1",
"6k1/p2rR1p1/1p1r1p1R/3P4/4QPq1/1P6/P5PK/8 w - - 0 1",
"r5rk/pp2qb1p/2p2pn1/2bp4/3pP1Q1/1B1P1N1R/PPP3PP/R1B3K1 w - - 0 1",
"r2q1bk1/5n1p/2p3pP/p7/3Br3/1P3PQR/P5P1/2KR4 w - - 0 1",
"2r2n1k/2q3pp/p2p1b2/2nB1P2/1p1N4/8/PPP4Q/2K3RR w - - 0 1",
"1R4Q1/3nr1pp/3p1k2/5Bb1/4P3/2q1B1P1/5P1P/6K1 w - - 0 1",
"5k1r/3b4/3p1p2/p4Pqp/1pB5/1P4r1/P1P5/1K1RR2Q w - - 0 1",
"Q7/p1p1q1pk/3p2rp/4n3/3bP3/7b/PP3PPK/R1B2R2 b - - 0 1",
"7r/p3ppk1/3p4/2p1P1Kp/2Pb4/3P1QPq/PP5P/R6R b - - 0 1",
"6k1/6pp/pp1p3q/3P4/P1Q2b2/1NN1r2b/1PP4P/6RK b - - 0 1",
"8/2Q2pk1/3Pp1p1/1b5p/1p3P1P/1P2PK2/6RP/7q b - - 0 1",
"1r2k3/2pn1p2/p1Qb3p/7q/3PP3/2P1BN1b/PP1N1Pr1/RR5K b - - 0 1",
"8/5p1k/3p2q1/3Pp3/4Pn1r/R4Qb1/1P5B/5B1K b - - 0 1",
"2r3k1/ppq3p1/2n2p1p/2pr4/5P1N/6QP/PP2R1P1/4R2K w - - 0 1",
"5k2/r3pp1p/6p1/q1pP3R/5B2/2b3PP/PQ3PK1/R7 w - - 0 1",
"r1b2k2/1p1p1r1B/n4p2/p1qPp3/2P4N/4P1R1/PPQ3PP/R5K1 w - - 0 1",
"2r1k3/3n1p2/6p1/1p1Qb3/1B2N1q1/2P1p3/P4PP1/2KR4 w - - 0 1",
"5rk1/2pb1ppp/p2r4/1p1Pp3/4Pn1q/1B1PNP2/PP1Q1P1P/R5RK b - - 0 1",
"3nbr2/4q2p/r3pRpk/p2pQRN1/1ppP2p1/2P5/PPB4P/6K1 w - - 0 1",
"5rk1/pp1qpR2/6Pp/3ppNbQ/2nP4/B1P5/P5PP/6K1 w - - 0 1",
"5k2/ppqrRB2/3r1p2/2p2p2/7P/P1PP2P1/1P2QP2/6K1 w - - 0 1",
"8/kp1R4/2q2p1p/3Qb2P/p7/P5P1/KP6/N1r5 b - - 0 1",
"4rk2/pp2N1bQ/5p2/8/2q5/P7/3r2PP/4RR1K w - - 0 1",
"r4r1k/1p3p1p/pp1p1p2/4qN1R/PP2P1n1/6Q1/5PPP/R5K1 w - - 0 1",
"r4b1r/pp1n2k1/1qp1p2p/3pP1pQ/1P6/2BP2N1/P4PPP/R4RK1 w - - 0 1",
"6rk/Q2n2rp/5p2/3P4/4P3/2q4P/P5P1/5RRK b - - 0 1",
"2k4r/ppp5/4bqp1/3p2Q1/6n1/2NB3P/PPP2bP1/R1B2R1K b - - 0 1",
"rnb2b1r/ppp1n1kp/3p1q2/7Q/4PB2/2N5/PPP3PP/R4RK1 w - - 0 1",
"1r2r2k/1q1n1p1p/p1b1pp2/3pP3/1b5R/2N1BBQ1/1PP3PP/3R3K w - - 0 1",
"3r1r1k/p4p1p/1pp2p2/2b2P1Q/3q1PR1/1PN2R1P/1P4P1/7K w - - 0 1",
"r1b1r1k1/p1q3p1/1pp1pn1p/8/3PQ3/B1PB4/P5PP/R4RK1 w - - 0 1",
"k7/4rp1p/p1q3p1/Q1r2p2/1R6/8/P5PP/1R5K w - - 0 1",
"r1b2r2/p1q1npkB/1pn1p1p1/2ppP1N1/3P4/P1P2Q2/2P2PPP/R1B2RK1 w - - 0 1",
"rnb3kr/ppp2ppp/1b6/3q4/3pN3/Q4N2/PPP2KPP/R1B1R3 w - - 0 1",
"3q1r1k/2p4p/1p1pBrp1/p2Pp3/2PnP3/5PP1/PP1Q2K1/5R1R w - - 0 1",
"5rk1/1R4b1/3p4/1P1P4/4Pp2/3B1Pnb/PqRK1Q2/8 b - - 0 1",
"r4rk1/1q2bp1p/5Rp1/pp1Pp3/4B2Q/P2R4/1PP3PP/7K w - - 0 1",
"4Nr1k/1bp2p1p/1r4p1/3P4/1p1q1P1Q/4R3/P5PP/4R2K w - - 0 1",
"4kb1Q/5p2/1p6/1K1N4/2P2P2/8/q7/8 w - - 0 1",
"4r3/p4pkp/q7/3Bbb2/P2P1ppP/2N3n1/1PP2KPR/R1BQ4 b - - 0 1",
"r4rk1/3R3p/1q2pQp1/p7/P7/8/1P5P/4RK2 w - - 0 1",
"r6k/1p5p/2p1b1pB/7B/p1P1q2r/8/P5QP/3R2RK b - - 0 1",
"2kr3r/1pp2ppp/pbp4n/5q2/1PP5/2Q5/PB3PPP/RN3RK1 b - - 0 1",
"8/4n2k/b1Pp2p1/3Ppp1p/p2qP3/3B1P2/Q2NK1PP/3R4 b - - 0 1",
"2q1rnk1/p4r2/1p3pp1/3P3Q/2bPp2B/2P4R/P1B3PP/4R1K1 w - - 0 1",
"r5k1/2p2ppp/p1P2n2/8/1pP2bbQ/1B3PP1/PP1Pq2P/RNB3K1 b - - 0 1",
"r1b5/5p2/5Npk/p1pP2q1/4P2p/1PQ2R1P/6P1/6K1 w - - 0 1",
"r2q1rk1/p4p1p/3p1Q2/2n3B1/B2R4/8/PP3PPP/5bK1 w - - 0 1",
"r4r1k/pp5p/n5p1/1q2Np1n/1Pb5/6P1/PQ2PPBP/1RB3K1 w - - 0 1",
"1n1N2rk/2Q2pb1/p3p2p/Pq2P3/3R4/6B1/1P3P1P/6K1 w - - 0 1",
"bn5k/7p/p2p2r1/1p2p3/5p2/2P4q/PP1B1QPP/4N1RK b - - 0 1",
"rnb3kb/pp5p/4p1pB/q1p2pN1/2r1PQ2/2P5/P4PPP/2R2RK1 w - - 0 1",
"3rkb1r/ppn2pp1/1qp1p2p/4P3/2P4P/3Q2N1/PP1B1PP1/1K1R3R w - - 0 1",
"8/5prk/p5rb/P3N2R/1p1PQ2p/7P/1P3RPq/5K2 w - - 0 1",
"3q2r1/p2b1k2/1pnBp1N1/3p1pQP/6P1/5R2/2r2P2/4RK2 w - - 0 1",
"r1b2rk1/pp2b1pp/q3pn2/3nN1N1/3p4/P2Q4/1P3PPP/RBB1R1K1 w - - 0 1",
"k7/1p1rr1pp/pR1p1p2/Q1pq4/P7/8/2P3PP/1R4K1 w - - 0 1",
"r1b2rk1/ppppbpp1/7p/4R3/6Qq/2BB4/PPP2PPP/R5K1 w - - 0 1",
"4kb1r/1R6/p2rp3/2Q1p1q1/4p3/3B4/P6P/4KR2 w - - 0 1",
"qr3b1r/Q5pp/3p4/1kp5/2Nn1B2/Pp6/1P3PPP/2R1R1K1 w - - 0 1",
"r1bq1rk1/p3b1np/1pp2ppQ/3nB3/3P4/2NB1N1P/PP3PP1/3R1RK1 w - - 0 1",
"r4kr1/pbNn1q1p/1p6/2p2BPQ/5B2/8/P6P/b4RK1 w - - 0 1",
"3r1k2/r1q2p1Q/pp2B3/4P3/1P1p4/2N5/P1P3PP/5R1K w - - 0 1",
"1Q6/5pp1/1B2p1k1/3pPn1p/1b1P4/2r3PN/2q2PKP/R7 b - - 0 1",
"3q4/1p3p1k/1P1prPp1/P1rNn1Qp/8/7R/6PP/3R2K1 w - - 0 1",
"r1b2r2/4nn1k/1q2PQ1p/5p2/pp5R/5N2/5PPP/5RK1 w - - 0 1",
"6rk/1b6/p5pB/1q2P2Q/4p2P/6R1/PP4PK/3r4 w - - 0 1",
"8/2r5/1k5p/1pp4P/8/K2P4/PR2QB2/2q5 b - - 0 1",
"3r4/pk3pq1/Nb2p2p/3n4/2QP4/6P1/1P3PBP/5RK1 w - - 0 1",
"3q1r2/pb3pp1/1p6/3pP1Nk/2r2Q2/8/Pn3PP1/3RR1K1 w - - 0 1",
"5qrk/5p1n/pp3p1Q/2pPp3/2P1P1rN/2P4R/P5P1/2B3K1 w - - 0 1",
"8/6pk/pb5p/8/1P2qP2/P3p3/2r2PNP/1QR3K1 b - - 0 1",
"rn3rk1/1p3pB1/p4b2/q4P1p/6Q1/1B6/PPp2P1P/R1K3R1 w - - 0 1",
"b3n1k1/5pP1/2N5/pp1P4/4Bb2/qP4QP/5P1K/8 w - - 0 1",
"4b1k1/2r2p2/1q1pnPpQ/7p/p3P2P/pN5B/P1P5/1K1R2R1 w - - 0 1",
"4r2k/pp2q2b/2p2p1Q/4rP2/P7/1B5P/1P2R1R1/7K w - - 0 1",
"r2r2k1/1q4p1/ppb3p1/2bNp3/P1Q5/1N5R/1P4BP/n6K w - - 0 1",
"6rk/1pqbbp1p/p3p2Q/6R1/4N1nP/3B4/PPP5/2KR4 w - - 0 1",
"r5k1/1b2q1p1/p2bp1Qp/1pp5/P5P1/3B4/1PP2P1P/R4RK1 b - - 0 1",
"r3r1n1/pp3pk1/2q2p1p/P2NP3/2p1QP2/8/1P5P/1B1R3K w - - 0 1",
"3r1r1k/q2n3p/b1p2ppQ/p1n1p3/Pp2P3/1B1PBR2/1PPN2PP/R5K1 w - - 0 1",
"r3r1k1/7p/2pRR1p1/p7/2P5/qnQ1P1P1/6BP/6K1 w - - 0 1",
"rk6/N4ppp/Qp2q3/3p4/8/8/5PPP/2R3K1 w - - 0 1",
"r4b1r/pppq2pp/2n1b1k1/3n4/2Bp4/5Q2/PPP2PPP/RNB1R1K1 w - - 0 1",
"r6r/pp3pk1/2p2Rp1/2p1P2B/3bQ3/6PK/7P/6q1 w - - 0 1",
"6rk/p1pb1p1p/2pp1P2/2b1n2Q/4PR2/3B4/PPP1K2P/RNB3q1 w - - 0 1",
"rn3rk1/2qp2pp/p3P3/1p1b4/3b4/3B4/PPP1Q1PP/R1B2R1K w - - 0 1",
"2R3nk/3r2b1/p2pr1Q1/4pN2/1P6/P6P/q7/B4RK1 w - - 0 1",
"1r2qrk1/p4p1p/bp1p1Qp1/n1ppP3/P1P5/2PB1PN1/6PP/R4RK1 w - - 0 1",
"r5k1/p1p3bp/1p1p4/2PP2qp/1P6/1Q1bP3/PB3rPP/R2N2RK b - - 0 1",
"4k3/r2bnn1r/1q2pR1p/p2pPp1B/2pP1N1P/PpP1B3/1P4Q1/5KR1 w - - 0 1",
"2q2r1k/5Qp1/4p1P1/3p4/r6b/7R/5BPP/5RK1 w - - 0 1",
"5r1k/1q4bp/3pB1p1/2pPn1B1/1r6/1p5R/1P2PPQP/R5K1 w - - 0 1",
"4Q3/1b5r/1p1kp3/5p1r/3p1nq1/P4NP1/1P3PB1/2R3K1 w - - 0 1",
"r1b2k1r/2q1b3/p3ppBp/2n3B1/1p6/2N4Q/PPP3PP/2KRR3 w - - 0 1",
"6r1/r5PR/2p3R1/2Pk1n2/3p4/1P1NP3/4K3/8 w - - 0 1",
"r4qk1/2p4p/p1p1N3/2bpQ3/4nP2/8/PPP3PP/5R1K b - - 0 1",
"r2n1rk1/1ppb2pp/1p1p4/3Ppq1n/2B3P1/2P4P/PP1N1P1K/R2Q1RN1 b - - 0 1",
"r1b2rk1/pp1p1p1p/2n3pQ/5qB1/8/2P5/P4PPP/4RRK1 w - - 0 1",
"r3q2k/p2n1r2/2bP1ppB/b3p2Q/N1Pp4/P5R1/5PPP/R5K1 w - - 0 1",
"6r1/3p2qk/4P3/1R5p/3b1prP/3P2B1/2P1QP2/6RK b - - 0 1",
"3rr2k/pp1b2b1/4q1pp/2Pp1p2/3B4/1P2QNP1/P6P/R4RK1 w - - 0 1",
"r1b2rk1/2p2ppp/p7/1p6/3P3q/1BP3bP/PP3QP1/RNB1R1K1 w - - 0 1",
"1rb2RR1/p1p3p1/2p3k1/5p1p/8/3N1PP1/PP5r/2K5 w - - 0 1",
"3q2r1/4n2k/p1p1rBpp/PpPpPp2/1P3P1Q/2P3R1/7P/1R5K w - - 0 1",
"2bqr2k/1r1n2bp/pp1pBp2/2pP1PQ1/P3PN2/1P4P1/1B5P/R3R1K1 w - - 0 1",
"2r2k2/pb4bQ/1p1qr1pR/3p1pB1/3Pp3/2P5/PPB2PP1/1K5R w - - 0 1",
"r5k1/q4ppp/rnR1pb2/1Q1p4/1P1P4/P4N1P/1B3PP1/2R3K1 w - - 0 1",
"r1brn3/p1q4p/p1p2P1k/2PpPPp1/P7/1Q2B2P/1P6/1K1R1R2 w - - 0 1",
"7k/2p3pp/p7/1p1p4/PP2pr2/B1P3qP/4N1B1/R1Qn2K1 b - - 0 1",
"5rk1/4Rp1p/1q1pBQp1/5r2/1p6/1P4P1/2n2P2/3R2K1 w - - 0 1",
"2Q5/pp2rk1p/3p2pq/2bP1r2/5RR1/1P2P3/PB3P1P/7K w - - 0 1",
"5b2/1p3rpk/p1b3Rp/4B1RQ/3P1p1P/7q/5P2/6K1 w - - 0 1",
"3Rr2k/pp4pb/2p4p/2P1n3/1P1Q3P/4r1q1/PB4B1/5RK1 b - - 0 1",
"8/2Q1R1bk/3r3p/p2N1p1P/P2P4/1p3Pq1/1P4P1/1K6 w - - 0 1",
"3r3k/1p3Rpp/p2nn3/3N4/8/1PB1PQ1P/q4PP1/6K1 w - - 0 1",
"3r1kr1/8/p2q2p1/1p2R3/1Q6/8/PPP5/1K4R1 w - - 0 1",
"3r3k/1b2b1pp/3pp3/p3n1P1/1pPqP2P/1P2N2R/P1QB1r2/2KR3B b - - 0 1",
"5rkr/1p2Qpbp/pq1P4/2nB4/5p2/2N5/PPP4P/1K1RR3 w - - 0 1",
];

},{}],10:[function(require,module,exports){
module.exports = [
"2R5/4bppk/1p1p4/5R1P/4PQ2/5P2/r4q1P/7K w - - 0 1",
"7r/1qr1nNp1/p1k4p/1pB5/4P1Q1/8/PP3PPP/6K1 w - - 0 1",
"r1b2k1r/ppppq3/5N1p/4P2Q/4PP2/1B6/PP5P/n2K2R1 w - - 0 1",
"2kr1b1r/ppq5/1np1pp2/P3Pn2/1P3P2/2P2Qp1/6P1/RNB1RBK1 b - - 0 1",
"r2qrb2/p1pn1Qp1/1p4Nk/4PR2/3n4/7N/P5PP/R6K w - - 0 1",
"r1bk3r/pppq1ppp/5n2/4N1N1/2Bp4/Bn6/P4PPP/4R1K1 w - - 0 1",
"1rb2k2/1pq3pQ/pRpNp3/P1P2n2/3P1P2/4P3/6PP/6K1 w - - 0 1",
"1rr4k/7p/p3Qpp1/3p1P2/8/1P1q3P/PK4P1/3B3R b - - 0 1",
"2r2bk1/pb3ppp/1p6/n7/q2P4/P1P1R2Q/B2B1PPP/R5K1 w - - 0 1",
"r4rk1/pp4b1/6pp/2pP4/5pKn/P2B2N1/1PQP1Pq1/1RB2R2 b - - 0 1",
"r4r1k/p2p3p/bp1Np3/4P3/2P2nR1/3B1q2/P1PQ4/2K3R1 w - - 0 1",
"3r2k1/p1p2p2/bp2p1nQ/4PB1P/2pr3q/6R1/PP3PP1/3R2K1 w - - 0 1",
"r2q1rk1/ppp1n1p1/1b1p1p2/1B1N2BQ/3pP3/2P3P1/PP3P2/R5K1 w - - 0 1",
"5rk1/pR4pp/4p2r/2p1n2q/2P1p3/P1Q1P1P1/1P3P1P/R1B2NK1 b - - 0 1",
"8/p2pQ2p/2p1p2k/4Bqp1/2P2P2/P6P/6PK/3r4 w - - 0 1",
"4r1k1/5p1p/p4PpQ/4q3/P6P/6P1/3p3K/8 b - - 0 1",
"r1br1b2/4pPk1/1p1q3p/p2PR3/P1P2N2/1P1Q2P1/5PBK/4R3 w - - 0 1",
"7r/3kbp1p/1Q3R2/3p3q/p2P3B/1P5K/P6P/8 w - - 0 1",
"2r4b/pp1kprNp/3pNp1P/q2P2p1/2n5/4B2Q/PPP3R1/1K1R4 w - - 0 1",
"r6r/pp1Q2pp/2p4k/4R3/5P2/2q5/P1P3PP/R5K1 w - - 0 1",
"2rqrb2/p2nk3/bp2pnQp/4B1p1/3P4/P1N5/1P3PPP/1B1RR1K1 w - - 0 1",
"8/pp2Q1p1/2p3kp/6q1/5n2/1B2R2P/PP1r1PP1/6K1 w - - 0 1",
"k1n3rr/Pp3p2/3q4/3N4/3Pp2p/1Q2P1p1/3B1PP1/R4RK1 w - - 0 1",
"3r4/pp5Q/B7/k7/3q4/2b5/P4PPP/1R4K1 w - - 0 1",
"4Rnk1/pr3ppp/1p3q2/5NQ1/2p5/8/P4PPP/6K1 w - - 0 1",
"4qk2/6p1/p7/1p1Qp3/r1P2b2/1K5P/1P6/4RR2 w - - 0 1",
"3r1rk1/ppqn3p/1npb1P2/5B2/2P5/2N3B1/PP2Q1PP/R5K1 w - - 0 1",
"r3rk2/6b1/q2pQBp1/1NpP4/1n2PP2/nP6/P3N1K1/R6R w - - 0 1",
"r5k1/pp2ppb1/3p4/q3P1QR/6b1/r2B1p2/1PP5/1K4R1 w - - 0 1",
"2b5/3qr2k/5Q1p/P3B3/1PB1PPp1/4K1P1/8/8 w - - 0 1",
"6k1/5pp1/p3p2p/3bP2P/6QN/8/rq4P1/2R4K w - - 0 1",
"N1bk4/pp1p1Qpp/8/2b5/3n3q/8/PPP2RPP/RNB1rBK1 b - - 0 1",
"r3br1k/pp5p/4B1p1/4NpP1/P2Pn3/q1PQ3R/7P/3R2K1 w - - 0 1",
"6kr/pp2r2p/n1p1PB1Q/2q5/2B4P/2N3p1/PPP3P1/7K w - - 0 1",
"2r3r1/7p/b3P2k/p1bp1p1B/P2N1P2/1P4Q1/2P4P/7K w - - 0 1",
"1Q6/1R3pk1/4p2p/p3n3/P3P2P/6PK/r5B1/3q4 b - - 0 1",
"5rk1/1p1n2bp/p7/P2P2p1/4R3/4N1Pb/2QB1q1P/4R2K b - - 0 1",
"1R6/5qpk/4p2p/1Pp1Bp1P/r1n2QP1/5PK1/4P3/8 w - - 0 1",
"4k1r1/pp2bp2/2p5/3PPP2/1q6/7r/1P2Q2P/2RR3K b - - 0 1",
"r1bk1r2/pp1n2pp/3NQ3/1P6/8/2n2PB1/q1B3PP/3R1RK1 w - - 0 1",
"rn3rk1/pp3p2/2b1pnp1/4N3/3q4/P1NB3R/1P1Q1PPP/R5K1 w - - 0 1",
"2kr1b1r/pp3ppp/2p1b2q/4B3/4Q3/2PB2R1/PPP2PPP/3R2K1 w - - 0 1",
"3qrk2/p1r2pp1/1p2pb2/nP1bN2Q/3PN3/P6R/5PPP/R5K1 w - - 0 1",
"5r1k/1p4pp/p2N4/3Qp3/P2n1bP1/5P1q/1PP2R1P/4R2K w - - 0 1",
"6r1/p5bk/4N1pp/2B1p3/4Q2N/8/2P2KPP/q7 w - - 0 1",
"4r1k1/5bpp/2p5/3pr3/8/1B3pPq/PPR2P2/2R2QK1 b - - 0 1",
"5r2/pq4k1/1pp1Qn2/2bp1PB1/3R1R2/2P3P1/P6P/6K1 w - - 0 1",
"r3k3/3b3R/1n1p1b1Q/1p1PpP1N/1P2P1P1/6K1/2B1q3/8 w - - 0 1",
"5qr1/kp2R3/5p2/1b1N1p2/5Q2/P5P1/6BP/6K1 w - - 0 1",
"7k/1p1P1Qpq/p6p/5p1N/6N1/7P/PP1r1PPK/8 w - - 0 1",
"2b3rk/1q3p1p/p1p1pPpQ/4N3/2pP4/2P1p1P1/1P4PK/5R2 w - - 0 1",
"r2qrk2/p5b1/2b1p1Q1/1p1pP3/2p1nB2/2P1P3/PP3P2/2KR3R w - - 0 1",
"r4k2/1pp3q1/3p1NnQ/p3P3/2P3p1/8/PP6/2K4R w - - 0 1",
"r5rk/pp1np1bn/2pp2q1/3P1bN1/2P1N2Q/1P6/PB2PPBP/3R1RK1 w - - 0 1",
"r4n1k/ppBnN1p1/2p1p3/6Np/q2bP1b1/3B4/PPP3PP/R4Q1K w - - 0 1",
"r3nrkq/pp3p1p/2p3nQ/5NN1/8/3BP3/PPP3PP/2KR4 w - - 0 1",
"r3QnR1/1bk5/pp5q/2b5/2p1P3/P7/1BB4P/3R3K w - - 0 1",
"1r4k1/3b2pp/1b1pP2r/pp1P4/4q3/8/PP4RP/2Q2R1K b - - 0 1",
"r2Nqb1r/pQ1bp1pp/1pn1p3/1k1p4/2p2B2/2P5/PPP2PPP/R3KB1R w - - 0 1",
"rq2r1k1/1b3pp1/p3p1n1/1p4BQ/8/7R/PP3PPP/4R1K1 w - - 0 1",
"3q1r2/6k1/p2pQb2/4pR1p/4B3/2P3P1/P4PK1/8 w - - 0 1",
"3R1rk1/1pp2pp1/1p6/8/8/P7/1q4BP/3Q2K1 w - - 0 1",
"rqb2bk1/3n2pr/p1pp2Qp/1p6/3BP2N/2N4P/PPP3P1/2KR3R w - - 0 1",
"5k1r/4npp1/p3p2p/3nP2P/3P3Q/3N4/qB2KPP1/2R5 w - - 0 1",
"r3r1k1/1b6/p1np1ppQ/4n3/4P3/PNB4R/2P1BK1P/1q6 w - - 0 1",
"2Q5/4ppbk/3p4/3P1NPp/4P3/5NB1/5PPK/rq6 w - - 0 1",
"r6k/pb4bp/5Q2/2p1Np2/1qB5/8/P4PPP/4RK2 w - - 0 1",
"3Q4/6kp/4q1p1/2pnN2P/1p3P2/1Pn3P1/6BK/8 w - - 0 1",
"r3q1k1/5p2/3P2pQ/Ppp5/1pnbN2R/8/1P4PP/5R1K w - - 0 1",
"2r2b1k/p2Q3p/b1n2PpP/2p5/3r1BN1/3q2P1/P4PB1/R3R1K1 w - - 0 1",
"r2r2k1/1q2bpB1/pp1p1PBp/8/P7/7Q/1PP3PP/R6K w - - 0 1",
"r3r2k/pb1n3p/1p1q1pp1/4p1B1/2BP3Q/2P1R3/P4PPP/4R1K1 w - - 0 1",
"2rr2k1/1b3p1p/1p1b2p1/p1qP3Q/3R4/1P6/PB3PPP/1B2R1K1 w - - 0 1",
"2r5/3nbkp1/2q1p1p1/1p1n2P1/3P4/2p1P1NQ/1P1B1P2/1B4KR w - - 0 1",
"rnbqr1k1/ppp3p1/4pR1p/4p2Q/3P4/B1PB4/P1P3PP/R5K1 w - - 0 1",
"b3r1k1/p4RbN/P3P1p1/1p6/1qp4P/4Q1P1/5P2/5BK1 w - - 0 1",
"q1r2b1k/rb4np/1p2p2N/pB1n4/6Q1/1P2P3/PB3PPP/2RR2K1 w - - 0 1",
"5rbk/2pq3p/5PQR/p7/3p3R/1P4N1/P5PP/6K1 w - - 0 1",
"2r1k2r/pR2p1bp/2n1P1p1/8/2QP4/q2b1N2/P2B1PPP/4K2R w - - 0 1",
"k2n1q1r/p1pB2p1/P4pP1/1Qp1p3/8/2P1BbN1/P7/2KR4 w - - 0 1",
"4r3/p2r1p1k/3q1Bpp/4P3/1PppR3/P5P1/5P1P/2Q3K1 w - - 0 1",
"2rr1k2/pb4p1/1p1qpp2/4R2Q/3n4/P1N5/1P3PPP/1B2R1K1 w - - 0 1",
"1r2q3/1R6/3p1kp1/1ppBp1b1/p3Pp2/2PP4/PP3P2/5K1Q w - - 0 1",
"5rk1/pp2Rppp/nqp5/8/5Q2/6PB/PPP2P1P/6K1 w - - 0 1",
"r2qk2r/pb4pp/1n2Pb2/2B2Q2/p1p5/2P5/2B2PPP/RN2R1K1 w - - 0 1",
"r1bq3r/ppp1b1kp/2n3p1/3B3Q/3p4/8/PPP2PPP/RNB2RK1 w - - 0 1",
"2q4k/5pNP/p2p1BpP/4p3/1p2b3/1P6/P1r2R2/1K4Q1 w - - 0 1",
"6k1/2rB1p2/RB1p2pb/3Pp2p/4P3/3K2NQ/5Pq1/8 b - - 0 1",
"2bk4/6b1/2pNp3/r1PpP1P1/P1pP1Q2/2rq4/7R/6RK w - - 0 1",
"5bk1/1Q3p2/1Np4p/6p1/8/1P2P1PK/4q2P/8 b - - 0 1",
"5rk1/1p1q2bp/p2pN1p1/2pP2Bn/2P3P1/1P6/P4QKP/5R2 w - - 0 1",
"3r3r/p1pqppbp/1kN3p1/2pnP3/Q5b1/1NP5/PP3PPP/R1B2RK1 w - - 0 1",
"1Q1R4/5k2/6pp/2N1bp2/1Bn5/2P2P1P/1r3PK1/8 b - - 0 1",
"2r1rk2/p1q3pQ/4p3/1pppP1N1/7p/4P2P/PP3P2/1K4R1 w - - 0 1",
"4q3/pb5p/1p2p2k/4N3/PP1QP3/2P2PP1/6K1/8 w - - 0 1",
"2bq1k1r/r5pp/p2b1Pn1/1p1Q4/3P4/1B6/PP3PPP/2R1R1K1 w - - 0 1",
"3r3k/6pp/p3Qn2/P3N3/4q3/2P4P/5PP1/6K1 w - - 0 1",
"6k1/6p1/p5p1/3pB3/1p1b4/2r1q1PP/P4R1K/5Q2 w - - 0 1",
"3r1b2/3P1p2/p3rpkp/2q2N2/5Q1R/2P3BP/P5PK/8 w - - 0 1",
"1q5r/1b1r1p1k/2p1pPpb/p1Pp4/3B1P1Q/1P4P1/P4KB1/2RR4 w - - 0 1",
"4r1rk/pQ2P2p/P7/2pqb3/3p1p2/8/3B2PP/4RRK1 b - - 0 1",
"1r2Rr2/3P1p1k/5Rpp/qp6/2pQ4/7P/5PPK/8 w - - 0 1",
"r1bk2nr/ppp2ppp/3p4/bQ3q2/3p4/B1P5/P3BPPP/RN1KR3 w - - 0 1",
"r4kr1/1b2R1n1/pq4p1/4Q3/1p4P1/5P2/PPP4P/1K2R3 w - - 0 1",
"6k1/5p2/4nQ1P/p4N2/1p1b4/7K/PP3r2/8 w - - 0 1",
"2r2rk1/pp3nbp/2p1bq2/2Pp4/1P1P1PP1/P1NB4/1BQK4/7R w - - 0 1",
"5k2/6r1/p7/2p1P3/1p2Q3/8/1q4PP/3R2K1 w - - 0 1",
"r2q4/pp1rpQbk/3p2p1/2pPP2p/5P2/2N5/PPP2P2/2KR3R w - - 0 1",
"4R3/1p4rk/6p1/2pQBpP1/p1P1pP2/Pq6/1P6/K7 w - - 0 1",
"2b2k2/2p2r1p/p2pR3/1p3PQ1/3q3N/1P6/2P3PP/5K2 w - - 0 1",
"r1b1r3/ppq2pk1/2n1p2p/b7/3PB3/2P2Q2/P2B1PPP/1R3RK1 w - - 0 1",
"2r5/2k4p/1p2pp2/1P2qp2/8/Q5P1/4PP1P/R5K1 w - - 0 1",
"4q1rk/pb2bpnp/2r4Q/1p1p1pP1/4NP2/1P3R2/PBn4P/RB4K1 w - - 0 1",
"2r4k/p4rRp/1p1R3B/5p1q/2Pn4/5p2/PP4QP/1B5K w - - 0 1",
"r1b1kb1r/pp2nppp/2pQ4/8/2q1P3/8/P1PB1PPP/3RK2R w - - 0 1",
"2r1b3/1pp1qrk1/p1n1P1p1/7R/2B1p3/4Q1P1/PP3PP1/3R2K1 w - - 0 1",
"5rk1/pbppq1bN/1pn1p1Q1/6N1/3P4/8/PPP2PP1/2K4R w - - 0 1",
"qn1r1k2/2r1b1np/pp1pQ1p1/3P2P1/1PP2P2/7R/PB4BP/4R1K1 w - - 0 1",
"r2r4/1p1bn2p/pn2ppkB/5p2/4PQN1/6P1/PPq2PBP/R2R2K1 w - - 0 1",
"3k1r2/2pb4/2p3P1/2Np1p2/1P6/4nN1R/2P1q3/Q5K1 w - - 0 1",
"5rk1/ppp3pp/8/3pQ3/3P2b1/5rPq/PP1P1P2/R1BB1RK1 b - - 0 1",
"r6r/1p2pp1k/p1b2q1p/4pP2/6QR/3B2P1/P1P2K2/7R w - - 0 1",
"2k4r/ppp2p2/2b2B2/7p/6pP/2P1q1bP/PP3N2/R4QK1 b - - 0 1",
"2QR4/6b1/1p4pk/7p/5n1P/4rq2/5P2/5BK1 w - - 0 1",
"rnb2b1r/p3kBp1/3pNn1p/2pQN3/1p2PP2/4B3/Pq5P/4K3 w - - 0 1",
"2rq1n1Q/p1r2k2/2p1p1p1/1p1pP3/3P2p1/2N4R/PPP2P2/2K4R w - - 0 1",
"r2Q1q1k/pp5r/4B1p1/5p2/P7/4P2R/7P/1R4K1 w - - 0 1",
"3k4/2p1q1p1/8/1QPPp2p/4Pp2/7P/6P1/7K w - - 0 1",
"8/1p3Qb1/p5pk/P1p1p1p1/1P2P1P1/2P1N2n/5P1P/4qB1K w - - 0 1",
"1r3k2/3Rnp2/6p1/6q1/p1BQ1p2/P1P5/1P3PP1/6K1 w - - 0 1",
"2rn2k1/1q1N1pbp/4pB1P/pp1pPn2/3P4/1Pr2N2/P2Q1P1K/6R1 w - - 0 1",
"5k2/p2Q1pp1/1b5p/1p2PB1P/2p2P2/8/PP3qPK/8 w - - 0 1",
"r3kb1r/pb6/2p2p1p/1p2pq2/2pQ3p/2N2B2/PP3PPP/3RR1K1 w - - 0 1",
"r1b1kb1r/pp1n1pp1/1qp1p2p/6B1/2PPQ3/3B1N2/P4PPP/R4RK1 w - - 0 1",
"rn3k1r/pbpp1Bbp/1p4pN/4P1B1/3n4/2q3Q1/PPP2PPP/2KR3R w - - 0 1",
"3R4/p1r3rk/1q2P1p1/5p1p/1n6/1B5P/P2Q2P1/3R3K w - - 0 1",
"8/6bk/1p6/5pBp/1P2b3/6QP/P5PK/5q2 b - - 0 1",
"r1bqkb2/6p1/p1p4p/1p1N4/8/1B3Q2/PP3PPP/3R2K1 w - - 0 1",
"5rrk/5pb1/p1pN3p/7Q/1p2PP1R/1q5P/6P1/6RK w - - 0 1",
"rnbq1bnr/pp1p1p1p/3pk3/3NP1p1/5p2/5N2/PPP1Q1PP/R1B1KB1R w - - 0 1",
"1r3rk1/1pnnq1bR/p1pp2B1/P2P1p2/1PP1pP2/2B3P1/5PK1/2Q4R w - - 0 1",
"2Q5/1p3p2/3b1k1p/3Pp3/4B1R1/4q1P1/r4PK1/8 w - - 0 1",
"r1b3kr/ppp1Bp1p/1b6/n2P4/2p3q1/2Q2N2/P4PPP/RN2R1K1 w - - 0 1",
"1R1br1k1/pR5p/2p3pB/2p2P2/P1qp2Q1/2n4P/P5P1/6K1 w - - 0 1",
"r1b2n2/2q3rk/p3p2n/1p3p1P/4N3/PN1B1P2/1PPQ4/2K3R1 w - - 0 1",
"r3q3/ppp3k1/3p3R/5b2/2PR3Q/2P1PrP1/P7/4K3 w - - 0 1",
"2r3k1/3b2b1/5pp1/3P4/pB2P3/2NnqN2/1P2B2Q/5K1R b - - 0 1",
"6rk/2p2p1p/p2q1p1Q/2p1pP2/1nP1R3/1P5P/P5P1/2B3K1 w - - 0 1",
"1r2bk2/1p3ppp/p1n2q2/2N5/1P6/P3R1P1/5PBP/4Q1K1 w - - 0 1",
"r3rk2/5pn1/pb1nq1pR/1p2p1P1/2p1P3/2P2QN1/PPBB1P2/2K4R w - - 0 1",
"3rkq1r/1pQ2p1p/p3bPp1/3pR3/8/8/PPP2PP1/1K1R4 w - - 0 1",
"r1bq3r/ppp1nQ2/2kp1N2/6N1/3bP3/8/P2n1PPP/1R3RK1 w - - 0 1",
"n2q1r1k/4bp1p/4p3/4P1p1/2pPNQ2/2p4R/5PPP/2B3K1 w - - 0 1",
"2Rr1qk1/5ppp/p2N4/P7/5Q2/8/1r4PP/5BK1 w - - 0 1",
"8/6k1/3p1rp1/3Bp1p1/1pP1P1K1/4bPR1/P5Q1/4q3 b - - 0 1",
"r1bq2rk/pp3pbp/2p1p1pQ/7P/3P4/2PB1N2/PP3PPR/2KR4 w - - 0 1",
"5qr1/pr3p1k/1n1p2p1/2pPpP1p/P3P2Q/2P1BP1R/7P/6RK w - - 0 1",
"rn2kb1r/pp2pp1p/2p2p2/8/8/3Q1N2/qPPB1PPP/2KR3R w - - 0 1",
"7k/pb4rp/2qp1Q2/1p3pP1/np3P2/3PrN1R/P1P4P/R3N1K1 w - - 0 1",
"8/p4pk1/6p1/3R4/3nqN1P/2Q3P1/5P2/3r1BK1 b - - 0 1",
"r3rk2/p3bp2/2p1qB2/1p1nP1RP/3P4/2PQ4/P5P1/5RK1 w - - 0 1",
"6k1/pp3ppp/4p3/2P3b1/bPP3P1/3K4/P3Q1q1/1R5R b - - 0 1",
"r1b2rk1/p1qnbp1p/2p3p1/2pp3Q/4pP2/1P1BP1R1/PBPP2PP/RN4K1 w - - 0 1",
"3r4/p4Q1p/1p2P2k/2p3pq/2P2B2/1P2p2P/P5P1/6K1 w - - 0 1",
"6k1/8/3q1p2/p5p1/P1b1P2p/R1Q4P/5KN1/3r4 b - - 0 1",
];

},{}],11:[function(require,module,exports){
module.exports = [
"r4r1k/p2p3p/bp1Np3/4P3/2P2nR1/3B1q2/P1PQ4/2K3R1 w - - 0 1",
"3r2k1/p1p2p2/bp2p1nQ/4PB1P/2pr3q/6R1/PP3PP1/3R2K1 w - - 0 1",
"2r3k1/p6R/1p2p1p1/nK4N1/P4P2/3n4/4r1P1/7R b - - 0 1",
"N1bk4/pp1p1Qpp/8/2b5/3n3q/8/PPP2RPP/RNB1rBK1 b - - 0 1",
"5rk1/1p1n2bp/p7/P2P2p1/4R3/4N1Pb/2QB1q1P/4R2K b - - 0 1",
"4k1r1/pp2bp2/2p5/3PPP2/1q6/7r/1P2Q2P/2RR3K b - - 0 1",
"8/4R1pk/p5p1/8/1pB1n1b1/1P2b1P1/P4r1P/5R1K b - - 0 1",
"2kr1b1r/pp3ppp/2p1b2q/4B3/4Q3/2PB2R1/PPP2PPP/3R2K1 w - - 0 1",
"r3k3/3b3R/1n1p1b1Q/1p1PpP1N/1P2P1P1/6K1/2B1q3/8 w - - 0 1",
"r3QnR1/1bk5/pp5q/2b5/2p1P3/P7/1BB4P/3R3K w - - 0 1",
"1r4k1/3b2pp/1b1pP2r/pp1P4/4q3/8/PP4RP/2Q2R1K b - - 0 1",
"2r2b1k/p2Q3p/b1n2PpP/2p5/3r1BN1/3q2P1/P4PB1/R3R1K1 w - - 0 1",
"r4R2/1b2n1pp/p2Np1k1/1pn5/4pP1P/8/PPP1B1P1/2K4R w - - 0 1",
"b3r1k1/p4RbN/P3P1p1/1p6/1qp4P/4Q1P1/5P2/5BK1 w - - 0 1",
"q1r2b1k/rb4np/1p2p2N/pB1n4/6Q1/1P2P3/PB3PPP/2RR2K1 w - - 0 1",
"2r1k2r/pR2p1bp/2n1P1p1/8/2QP4/q2b1N2/P2B1PPP/4K2R w - - 0 1",
"1k5r/3R1pbp/1B2p3/2NpPn2/5p2/8/1PP3PP/6K1 w - - 0 1",
"2rr1k2/pb4p1/1p1qpp2/4R2Q/3n4/P1N5/1P3PPP/1B2R1K1 w - - 0 1",
"2q4k/5pNP/p2p1BpP/4p3/1p2b3/1P6/P1r2R2/1K4Q1 w - - 0 1",
"6k1/2rB1p2/RB1p2pb/3Pp2p/4P3/3K2NQ/5Pq1/8 b - - 0 1",
"5rk1/1p1q2bp/p2pN1p1/2pP2Bn/2P3P1/1P6/P4QKP/5R2 w - - 0 1",
"3rk2b/5R1P/6B1/8/1P3pN1/7P/P2pbP2/6K1 w - - 0 1",
"2bq1k1r/r5pp/p2b1Pn1/1p1Q4/3P4/1B6/PP3PPP/2R1R1K1 w - - 0 1",
"4B3/6R1/1p5k/p2r3N/Pn1p2P1/7P/1P3P2/6K1 w - - 0 1",
"1r2Rr2/3P1p1k/5Rpp/qp6/2pQ4/7P/5PPK/8 w - - 0 1",
"r4kr1/1b2R1n1/pq4p1/4Q3/1p4P1/5P2/PPP4P/1K2R3 w - - 0 1",
"2b2k2/2p2r1p/p2pR3/1p3PQ1/3q3N/1P6/2P3PP/5K2 w - - 0 1",
"4q1rk/pb2bpnp/2r4Q/1p1p1pP1/4NP2/1P3R2/PBn4P/RB4K1 w - - 0 1",
"2r4k/p4rRp/1p1R3B/5p1q/2Pn4/5p2/PP4QP/1B5K w - - 0 1",
"r2r4/1p1bn2p/pn2ppkB/5p2/4PQN1/6P1/PPq2PBP/R2R2K1 w - - 0 1",
"5r1k/7b/4B3/6K1/3R1N2/8/8/8 w - - 0 1",
"r5nr/6Rp/p1NNkp2/1p3b2/2p5/5K2/PP2P3/3R4 w - - 0 1",
"1r3k2/3Rnp2/6p1/6q1/p1BQ1p2/P1P5/1P3PP1/6K1 w - - 0 1",
"2rn2k1/1q1N1pbp/4pB1P/pp1pPn2/3P4/1Pr2N2/P2Q1P1K/6R1 w - - 0 1",
"3R4/p1r3rk/1q2P1p1/5p1p/1n6/1B5P/P2Q2P1/3R3K w - - 0 1",
"r1b2n2/2q3rk/p3p2n/1p3p1P/4N3/PN1B1P2/1PPQ4/2K3R1 w - - 0 1",
"r3q3/ppp3k1/3p3R/5b2/2PR3Q/2P1PrP1/P7/4K3 w - - 0 1",
"1r2bk2/1p3ppp/p1n2q2/2N5/1P6/P3R1P1/5PBP/4Q1K1 w - - 0 1",
"2Rr1qk1/5ppp/p2N4/P7/5Q2/8/1r4PP/5BK1 w - - 0 1",
"7k/pb4rp/2qp1Q2/1p3pP1/np3P2/3PrN1R/P1P4P/R3N1K1 w - - 0 1",
"8/p4pk1/6p1/3R4/3nqN1P/2Q3P1/5P2/3r1BK1 b - - 0 1",
"4r3/pbpn2n1/1p1prp1k/8/2PP2PB/P5N1/2B2R1P/R5K1 w - - 0 1",
"r4r1k/pp1b2pn/8/3pR3/5N2/3Q4/Pq3PPP/5RK1 w - - 0 1",
"1r2r1k1/5p2/5Rp1/4Q2p/P2B2qP/1NP5/1KP5/8 w - - 0 1",
"1r3rk1/1nqb2n1/6R1/1p1Pp3/1Pp3p1/2P4P/2B2QP1/2B2RK1 w - - 0 1",
"r7/1p3Q2/2kpr2p/p1p2Rp1/P3Pp2/1P3P2/1B2q1PP/3R3K w - - 0 1",
"1r3r2/1p5R/p1n2pp1/1n1B1Pk1/8/8/P1P2BPP/2K1R3 w - - 0 1",
"4k2r/1R3R2/p3p1pp/4b3/1BnNr3/8/P1P5/5K2 w - - 0 1",
"5q2/1ppr1br1/1p1p1knR/1N4R1/P1P1PP2/1P6/2P4Q/2K5 w - - 0 1",
"7k/3qbR1n/r5p1/3Bp1P1/1p1pP1r1/3P2Q1/1P5K/2R5 w - - 0 1",
"4n3/pbq2rk1/1p3pN1/8/2p2Q2/Pn4N1/B4PP1/4R1K1 w - - 0 1",
"8/1p2p1kp/2rRB3/pq2n1Pp/4P3/8/PPP2Q2/2K5 w - - 0 1",
"3r1rk1/1q2b1n1/p1b1pRpQ/1p2P3/3BN3/P1PB4/1P4PP/4R2K w - - 0 1",
"2b2r1k/1p2R3/2n2r1p/p1P1N1p1/2B3P1/P6P/1P3R2/6K1 w - - 0 1",
"1qr2bk1/pb3pp1/1pn3np/3N2NQ/8/P7/BP3PPP/2B1R1K1 w - - 0 1",
"2rk4/5R2/3pp1Q1/pb2q2N/1p2P3/8/PPr5/1K1R4 w - - 0 1",
"r4r1k/pp4R1/3pN1p1/3P2Qp/1q2Ppn1/8/6PP/5RK1 w - - 0 1",
"r2r1b1k/pR6/6pp/5Q2/3qB3/6P1/P3PP1P/6K1 w - - 0 1",
"r3rknQ/1p1R1pb1/p3pqBB/2p5/8/6P1/PPP2P1P/4R1K1 w - - 0 1",
"3rb1k1/ppq3p1/2p1p1p1/6P1/2Pr3R/1P1Q4/P1B4P/5RK1 w - - 0 1",
"5rk1/1bR2pbp/4p1p1/8/1p1P1PPq/1B2P2r/P2NQ2P/5RK1 b - - 0 1",
"3q1rk1/4bp1p/1n2P2Q/1p1p1p2/6r1/Pp2R2N/1B1P2PP/7K w - - 0 1",
"3nk1r1/1pq4p/p3PQpB/5p2/2r5/8/P4PPP/3RR1K1 w - - 0 1",
"6rk/5p1p/5p2/1p2bP2/1P2R2Q/2q1BBPP/5PK1/r7 w - - 0 1",
"1b4rk/4R1pp/p1b4r/2PB4/Pp1Q4/6Pq/1P3P1P/4RNK1 w - - 0 1",
"Q4R2/3kr3/1q3n1p/2p1p1p1/1p1bP1P1/1B1P3P/2PBK3/8 w - - 0 1",
"2rk2r1/3b3R/n3pRB1/p2pP1P1/3N4/1Pp5/P1K4P/8 w - - 0 1",
"2r5/2R5/3npkpp/3bN3/p4PP1/4K3/P1B4P/8 w - - 0 1",
"r2qr2k/pp1b3p/2nQ4/2pB1p1P/3n1PpR/2NP2P1/PPP5/2K1R1N1 w - - 0 1",
"1r3r1k/2R4p/q4ppP/3PpQ2/2RbP3/pP6/P2B2P1/1K6 w - - 0 1",
"2r3k1/pp3ppp/1qr2n2/3p1Q2/1P6/P2BP2P/5PP1/2R2RK1 w - - 0 1",
"5k2/p3Rr2/1p4pp/q4p2/1nbQ1P2/6P1/5N1P/3R2K1 w - - 0 1",
"r3r3/3R1Qp1/pqb1p2k/1p4N1/8/4P3/Pb3PPP/2R3K1 w - - 0 1",
"8/4k3/1p2p1p1/pP1pPnP1/P1rPq2p/1KP2R1N/8/5Q2 b - - 0 1",
"2q3k1/1p4pp/3R1r2/p2bQ3/P7/1N2B3/1PP3rP/R3K3 b - - 0 1",
"4rk2/5p1b/1p3R1K/p6p/2P2P2/1P6/2q4P/Q5R1 w - - 0 1",
"2r2bk1/2qn1ppp/pn1p4/5N2/N3r3/1Q6/5PPP/BR3BK1 w - - 0 1",
"6k1/pp3r2/2p4q/3p2p1/3Pp1b1/4P1P1/PP4RP/2Q1RrNK b - - 0 1",
"r5kr/pppN1pp1/1bn1R3/1q1N2Bp/3p2Q1/8/PPP2PPP/R5K1 w - - 0 1",
"1q1r1k2/1b2Rpp1/p1pQ3p/PpPp4/3P1NP1/1P3P1P/6K1/8 w - - 0 1",
"4r3/2RN4/p1r5/1k1p4/5Bp1/p2P4/1P4PK/8 w - - 0 1",
"r2Rnk1r/1p2q1b1/7p/6pQ/4Ppb1/1BP5/PP3BPP/2K4R w - - 0 1",
"r3n1k1/pb5p/4N1p1/2pr4/q7/3B3P/1P1Q1PP1/2B1R1K1 w - - 0 1",
"6k1/5p2/3P1Bpp/2b1P3/b1p2p2/p1P5/R5rP/2N1K3 b - - 0 1",
"r5rR/3Nkp2/4p3/1Q4q1/np1N4/8/bPPR2P1/2K5 w - - 0 1",
"6k1/1p2q2p/p3P1pB/8/1P2p3/2Qr2P1/P4P1P/2R3K1 w - - 0 1",
"4R3/2p2kpQ/3p3p/p2r2q1/8/1Pr2P2/P1P3PP/4R1K1 w - - 0 1",
"8/2k2r2/pp6/2p1R1Np/6pn/8/Pr4B1/3R3K w - - 0 1",
"5R2/4r1r1/1p4k1/p1pB2Bp/P1P4K/2P1p3/1P6/8 w - - 0 1",
"6k1/ppp2ppp/8/2n2K1P/2P2P1P/2Bpr3/PP4r1/4RR2 b - - 0 1",
"2qr2k1/4rppN/ppnp4/2pR3Q/2P2P2/1P4P1/PB5P/6K1 w - - 0 1",
"3R4/3Q1p2/q1rn2kp/4p3/4P3/2N3P1/5P1P/6K1 w - - 0 1",
"4kr2/3rn2p/1P4p1/2p5/Q1B2P2/8/P2q2PP/4R1K1 w - - 0 1",
"3q3r/r4pk1/pp2pNp1/3bP1Q1/7R/8/PP3PPP/3R2K1 w - - 0 1",
"rnb3kr/ppp4p/3b3B/3Pp2n/2BP4/4KRp1/PPP3q1/RN1Q4 w - - 0 1",
"r1kq1b1r/5ppp/p4n2/2pPR1B1/Q7/2P5/P4PPP/1R4K1 w - - 0 1",
"2r5/2p2k1p/pqp1RB2/2r5/PbQ2N2/1P3PP1/2P3P1/4R2K w - - 0 1",
"6k1/5p2/R5p1/P6n/8/5PPp/2r3rP/R4N1K b - - 0 1",
"r3kr2/6Qp/1Pb2p2/pB3R2/3pq2B/4n3/1P4PP/4R1K1 w - - 0 1",
"5rk1/n1p1R1bp/p2p4/1qpP1QB1/7P/2P3P1/PP3P2/6K1 w - - 0 1",
"2rrk3/QR3pp1/2n1b2p/1BB1q3/3P4/8/P4PPP/6K1 w - - 0 1",
"2q1b1k1/p5pp/n2R4/1p2P3/2p5/B1P5/5QPP/6K1 w - - 0 1",
"b4rk1/6p1/4p1N1/q3P1Q1/1p1R4/1P5r/P4P2/3R2K1 w - - 0 1",
"6k1/1p5p/p2p1q2/3Pb3/1Q2P3/3b1BpP/PPr3P1/KRN5 b - - 0 1",
"5Q2/1p3p1N/2p3p1/5b1k/2P3n1/P4RP1/3q2rP/5R1K w - - 0 1",
"6k1/1r4np/pp1p1R1B/2pP2p1/P1P5/1n5P/6P1/4R2K w - - 0 1",
"R4rk1/4r1p1/1q2p1Qp/1pb5/1n5R/5NB1/1P3PPP/6K1 w - - 0 1",
"8/p1p5/2p3k1/2b1rpB1/7K/2P3PP/P1P2r2/3R3R b - - 0 1",
"r1b2rk1/1p2nppp/p2R1b2/4qP1Q/4P3/1B2B3/PPP2P1P/2K3R1 w - - 0 1",
"7k/p1p2bp1/3q1N1p/4rP2/4pQ2/2P4R/P2r2PP/4R2K w - - 0 1",
"6k1/4R3/p5q1/2pP1Q2/3bn1r1/P7/6PP/5R1K b - - 0 1",
"r5k1/3npp1p/2b3p1/1pn5/2pRP3/2P1BPP1/r1P4P/1NKR1B2 b - - 0 1",
"5rk1/3p1p1p/p4Qq1/1p1P2R1/7N/n6P/2r3PK/8 w - - 0 1",
"5r1k/1p1b1p1p/p2ppb2/5P1B/1q6/1Pr3R1/2PQ2PP/5R1K w - - 0 1",
"5r2/pp2R3/1q1p3Q/2pP1b2/2Pkrp2/3B4/PPK2PP1/R7 w - - 0 1",
"5b2/pp2r1pk/2pp1R1p/4rP1N/2P1P3/1P4Q1/P3q1PP/5R1K w - - 0 1",
"5n1k/rq4rp/p1bp1b2/2p1pP1Q/P1B1P2R/2N3R1/1P4PP/6K1 w - - 0 1",
"2rkr3/3b1p1R/3R1P2/1p2Q1P1/pPq5/P1N5/1KP5/8 w - - 0 1",
"1rbk1r2/pp4R1/3Np3/3p2p1/6q1/BP2P3/P2P2B1/2R3K1 w - - 0 1",
"6k1/5p2/p3bRpQ/4q3/2r3P1/6NP/P1p2R1K/1r6 w - - 0 1",
"r1qr3k/3R2p1/p3Q3/1p2p1p1/3bN3/8/PP3PPP/5RK1 w - - 0 1",
"5rk1/pb2npp1/1pq4p/5p2/5B2/1B6/P2RQ1PP/2r1R2K b - - 0 1",
"r4br1/3b1kpp/1q1P4/1pp1RP1N/p7/6Q1/PPB3PP/2KR4 w - - 0 1",
"r3Rnkr/1b5p/p3NpB1/3p4/1p6/8/PPP3P1/2K2R2 w - - 0 1",
"2r3k1/p4p2/1p2P1pQ/3bR2p/1q6/1B6/PP2RPr1/5K2 w - - 0 1",
"2r5/1Nr1kpRp/p3b3/N3p3/1P3n2/P7/5PPP/K6R b - - 0 1",
"2r4k/ppqbpQ1p/3p1bpB/8/8/1Nr2P2/PPP3P1/2KR3R w - - 0 1",
"r1br2k1/4p1b1/pq2pn2/1p4N1/7Q/3B4/PPP3PP/R4R1K w - - 0 1",
"1r1kr3/Nbppn1pp/1b6/8/6Q1/3B1P2/Pq3P1P/3RR1K1 w - - 0 1",
"n7/pk3pp1/1rR3p1/QP1pq3/4n3/6PB/4PP1P/2R3K1 w - - 0 1",
"6k1/pp4p1/2p5/2bp4/8/P5Pb/1P3rrP/2BRRN1K b - - 0 1",
"3b2r1/5Rn1/2qP2pk/p1p1B3/2P1N3/1P3Q2/6K1/8 w - - 0 1",
"2r1rk2/1p2qp1R/4p1p1/1b1pP1N1/p2P4/nBP1Q3/P4PPP/R5K1 w - - 0 1",
"2r3k1/1p3ppp/p3p3/7P/P4P2/1R2QbP1/6q1/1B2K3 b - - 0 1",
"k2r3r/p3Rppp/1p4q1/1P1b4/3Q1B2/6N1/PP3PPP/6K1 w - - 0 1",
"4rk1r/p2b1pp1/1q5p/3pR1n1/3N1p2/1P1Q1P2/PBP3PK/4R3 w - - 0 1",
"R6R/2kr4/1p3pb1/3prN2/6P1/2P2K2/1P6/8 w - - 0 1",
"r5k1/2Rb3r/p2p3b/P2Pp3/4P1pq/5p2/1PQ2B1P/2R2BKN b - - 0 1",
"1k6/5Q2/2Rr2pp/pqP5/1p6/7P/2P3PK/4r3 w - - 0 1",
"1q2r3/k4p2/prQ2b1p/R7/1PP1B1p1/6P1/P5K1/8 w - - 0 1",
"2k4r/pp3pQ1/2q5/2n5/8/N3pPP1/P3r3/R1R3K1 b - - 0 1",
"4r1k1/1p3q1p/p1pQ4/2P1R1p1/5n2/2B5/PP5P/6K1 b - - 0 1",
"4r1k1/pR3pp1/1n3P1p/q2p4/5N1P/P1rQpP2/8/2B2RK1 w - - 0 1",
"1R4nr/p1k1ppb1/2p4p/4Pp2/3N1P1B/8/q1P3PP/3Q2K1 w - - 0 1",
"2R2bk1/5rr1/p3Q2R/3Ppq2/1p3p2/8/PP1B2PP/7K w - - 0 1",
"3r3k/pp4p1/3qQp1p/P1p5/7R/3rN1PP/1B3P2/6K1 w - - 0 1",
"kr6/pR5R/1q1pp3/8/1Q6/2P5/PKP5/5r2 w - - 0 1",
"4r1k1/5ppp/p2p4/4r3/1pNn4/1P6/1PPK2PP/R3R3 b - - 0 1",
"7k/pbp3bp/3p4/1p5q/3n2p1/5rB1/PP1NrN1P/1Q1BRRK1 b - - 0 1",
"r3r3/ppp4p/2bq2Nk/8/1PP5/P1B3Q1/6PP/4R1K1 w - - 0 1",
"4r1k1/3N1ppp/3r4/8/1n3p1P/5P2/PP3K1P/RN5R b - - 0 1",
"4rk2/2pQ1p2/2p2B2/2P1P2q/1b4R1/1P6/r5PP/2R3K1 w - - 0 1",
"3r2k1/6pp/1nQ1R3/3r4/3N2q1/6N1/n4PPP/4R1K1 w - - 0 1",
"b1r3k1/pq2b1r1/1p3R1p/5Q2/2P5/P4N1P/5PP1/1B2R1K1 w - - 0 1",
"2R1R1nk/1p4rp/p1n5/3N2p1/1P6/2P5/P6P/2K5 w - - 0 1",
"n3r1k1/Q4R1p/p5pb/1p2p1N1/1q2P3/1P4PB/2P3KP/8 w - - 0 1",
"4r1k1/5q2/p5pQ/3b1pB1/2pP4/2P3P1/1P2R1PK/8 w - - 0 1",
"6k1/pp3p2/2p2np1/2P1pbqp/P3P3/2N2nP1/2Pr1P2/1RQ1RB1K b - - 0 1",
"2r3k1/pb3ppp/8/qP2b3/8/1P6/1P1RQPPP/1K3B1R b - - 0 1",
"r3rn1k/4b1Rp/pp1p2pB/3Pp3/P2qB1Q1/8/2P3PP/5R1K w - - 0 1",
"rnb2r1k/pp2q2p/2p2R2/8/2Bp3Q/8/PPP3PP/RN4K1 w - - 0 1",
"3k4/1pp3b1/4b2p/1p3qp1/3Pn3/2P1RN2/r5P1/1Q2R1K1 b - - 0 1",
"2kr3r/1p3ppp/p3pn2/2b1B2q/Q1N5/2P5/PP3PPP/R2R2K1 w - - 0 1",
"5q1k/p3R1rp/2pr2p1/1pN2bP1/3Q1P2/1B6/PP5P/2K5 w - - 0 1",
"8/7p/5pk1/3n2pq/3N1nR1/1P3P2/P6P/4QK2 w - - 0 1",
"4r2R/3q1kbR/1p4p1/p1pP1pP1/P1P2P2/K5Q1/1P2p3/8 w - - 0 1",
"rn3k2/pR2b3/4p1Q1/2q1N2P/3R2P1/3K4/P3Br2/8 w - - 0 1",
"2q5/p3p2k/3pP1p1/2rN2Pn/1p1Q4/7R/PPr5/1K5R w - - 0 1",
"b5r1/2r5/2pk4/2N1R1p1/1P4P1/4K2p/4P2P/R7 w - - 0 1",
"6k1/p1p3pp/6q1/3pr3/3Nn3/1QP1B1Pb/PP3r1P/R3R1K1 b - - 0 1",
"4r1r1/pb1Q2bp/1p1Rnkp1/5p2/2P1P3/4BP2/qP2B1PP/2R3K1 w - - 0 1",
"1k3r2/4R1Q1/p2q1r2/8/2p1Bb2/5R2/pP5P/K7 w - - 0 1",
"3r4/1p6/2p4p/5k2/p1P1n2P/3NK1nN/P1r5/1R2R3 b - - 0 1",
"r1b3nr/ppp1kB1p/3p4/8/3PPBnb/1Q3p2/PPP2q2/RN4RK b - - 0 1",
"6k1/p2rR1p1/1p1r1p1R/3P4/4QPq1/1P6/P5PK/8 w - - 0 1",
"3r1b1k/1p3R2/7p/2p4N/p4P2/2K3R1/PP6/3r4 w - - 0 1",
"8/6R1/p2kp2r/qb5P/3p1N1Q/1p1Pr3/PP6/1K5R w - - 0 1",
"8/4k3/P4RR1/2b1r3/3n2Pp/8/5KP1/8 b - - 0 1",
"r2q1bk1/5n1p/2p3pP/p7/3Br3/1P3PQR/P5P1/2KR4 w - - 0 1",
"1Q6/r3R2p/k2p2pP/p1q5/Pp4P1/5P2/1PP3K1/8 w - - 0 1",
"6k1/6pp/pp1p3q/3P4/P1Q2b2/1NN1r2b/1PP4P/6RK b - - 0 1",
"3r2k1/6p1/3Np2p/2P1P3/1p2Q1Pb/1P3R1P/1qr5/5RK1 w - - 0 1",
"1r2k3/2pn1p2/p1Qb3p/7q/3PP3/2P1BN1b/PP1N1Pr1/RR5K b - - 0 1",
"3r1k1r/p1q2p2/1pp2N1p/n3RQ2/3P4/2p1PR2/PP4PP/6K1 w - - 0 1",
"r3n2R/pp2n3/3p1kp1/1q1Pp1N1/6P1/2P1BP2/PP6/2KR4 w - - 0 1",
"2R2bk1/r4ppp/3pp3/1B2n1P1/3QP2P/5P2/1PK5/7q w - - 0 1",
"3nbr2/4q2p/r3pRpk/p2pQRN1/1ppP2p1/2P5/PPB4P/6K1 w - - 0 1",
"7k/p5b1/1p4Bp/2q1p1p1/1P1n1r2/P2Q2N1/6P1/3R2K1 b - - 0 1",
"5k2/ppqrRB2/3r1p2/2p2p2/7P/P1PP2P1/1P2QP2/6K1 w - - 0 1",
"4r3/5kp1/1N1p4/2pR1q1p/8/pP3PP1/6K1/3Qr3 b - - 0 1",
"1k2r3/pp6/3b4/3P2Q1/8/6P1/PP3q1P/2R4K b - - 0 1",
"2kr3r/R4Q2/1pq1n3/7p/3R1B1P/2p3P1/2P2P2/6K1 w - - 0 1",
"2rq2k1/3bb2p/n2p2pQ/p2Pp3/2P1N1P1/1P5P/6B1/2B2R1K w - - 0 1",
"r2q3k/ppb3pp/2p1B3/2P1RQ2/8/6P1/PP1r3P/5RK1 w - - 0 1",
"3k4/1p3Bp1/p5r1/2b5/P3P1N1/5Pp1/1P1r4/2R4K b - - 0 1",
"k7/4rp1p/p1q3p1/Q1r2p2/1R6/8/P5PP/1R5K w - - 0 1",
"5rk1/1R4b1/3p4/1P1P4/4Pp2/3B1Pnb/PqRK1Q2/8 b - - 0 1",
"7k/1p4p1/p4b1p/3N3P/2p5/2rb4/PP2r3/K2R2R1 b - - 0 1",
"r1qb1rk1/3R1pp1/p1nR2p1/1p2p2N/6Q1/2P1B3/PP3PPP/6K1 w - - 0 1",
"3r1rk1/2qP1p2/p2R2pp/6b1/6P1/2pQR2P/P1B2P2/6K1 w - - 0 1",
"1R2R3/p1r2pk1/3b1pp1/8/2Pr4/4N1P1/P4PK1/8 w - - 0 1",
"r2k2nr/pp1b1Q1p/2n4b/3N4/3q4/3P4/PPP3PP/4RR1K w - - 0 1",
"r4rk1/3R3p/1q2pQp1/p7/P7/8/1P5P/4RK2 w - - 0 1",
"r6k/1p5p/2p1b1pB/7B/p1P1q2r/8/P5QP/3R2RK b - - 0 1",
"4r1k1/1R4bp/pB2p1p1/P4p2/2r1pP1Q/2P4P/1q4P1/3R3K w - - 0 1",
"6k1/6p1/3r1n1p/p4p1n/P1N4P/2N5/Q2RK3/7q b - - 0 1",
"8/1R4pp/k2rQp2/2p2P2/p2q1P2/1n1r2P1/6BP/4R2K w - - 0 1",
"4R3/p2r1q1k/5B1P/6P1/2p4K/3b4/4Q3/8 w - - 0 1",
"4n3/p3N1rk/5Q2/2q4p/2p5/1P3P1P/P1P2P2/6RK w - - 0 1",
"rr4Rb/2pnqb1k/np1p1p1B/3PpP2/p1P1P2P/2N3R1/PP2BP2/1KQ5 w - - 0 1",
"r1bq2rk/pp1n1p1p/5P1Q/1B3p2/3B3b/P5R1/2P3PP/3K3R w - - 0 1",
"q5k1/1b2R1pp/1p3n2/4BQ2/8/7P/5PPK/4r3 w - - 0 1",
"3r4/1nb1kp2/p1p2N2/1p2pPr1/8/1BP2P2/PP1R4/2KR4 w - - 0 1",
"7R/3Q2p1/2p2nk1/pp4P1/3P2r1/2P5/4q3/5R1K w - - 0 1",
"3q2r1/p2b1k2/1pnBp1N1/3p1pQP/6P1/5R2/2r2P2/4RK2 w - - 0 1",
"k7/1p1rr1pp/pR1p1p2/Q1pq4/P7/8/2P3PP/1R4K1 w - - 0 1",
"4kb1r/1R6/p2rp3/2Q1p1q1/4p3/3B4/P6P/4KR2 w - - 0 1",
"1r3r1k/qp5p/3N4/3p2Q1/p6P/P7/1b6/1KR3R1 w - - 0 1",
"r4kr1/pbNn1q1p/1p6/2p2BPQ/5B2/8/P6P/b4RK1 w - - 0 1",
"3r3k/7p/pp2B1p1/3N2P1/P2qPQ2/8/1Pr4P/5R1K w - - 0 1",
"3q1r2/pb3pp1/1p6/3pP1Nk/2r2Q2/8/Pn3PP1/3RR1K1 w - - 0 1",
"1k1r4/pp5R/2p5/P5p1/7b/4Pq2/1PQ2P2/3NK3 b - - 0 1",
"6R1/2k2P2/1n5r/3p1p2/3P3b/1QP2p1q/3R4/6K1 b - - 0 1",
"1k1r4/1p5p/1P3pp1/b7/P3K3/1B3rP1/2N1bP1P/RR6 b - - 0 1",
"3r2k1/3q2p1/1b3p1p/4p3/p1R1P2N/Pr5P/1PQ3P1/5R1K b - - 0 1",
"2b3k1/r3q2p/4p1pB/p4r2/4N3/P1Q5/1P4PP/2R2R1K w - - 0 1",
"r5r1/p1q2p1k/1p1R2pB/3pP3/6bQ/2p5/P1P1NPPP/6K1 w - - 0 1",
"1r1qrbk1/3b3p/p2p1pp1/3NnP2/3N4/1Q4BP/PP4P1/1R2R2K w - - 0 1",
"4b1k1/2r2p2/1q1pnPpQ/7p/p3P2P/pN5B/P1P5/1K1R2R1 w - - 0 1",
"4r2k/pp2q2b/2p2p1Q/4rP2/P7/1B5P/1P2R1R1/7K w - - 0 1",
"2k5/1b1r1Rbp/p3p3/Bp4P1/3p1Q1P/P7/1PP1q3/1K6 w - - 0 1",
"6rk/1pqbbp1p/p3p2Q/6R1/4N1nP/3B4/PPP5/2KR4 w - - 0 1",
"r4rk1/5Rbp/p1qN2p1/P1n1P3/8/1Q3N1P/5PP1/5RK1 w - - 0 1",
"r3r1k1/7p/2pRR1p1/p7/2P5/qnQ1P1P1/6BP/6K1 w - - 0 1",
"r4b1r/pppq2pp/2n1b1k1/3n4/2Bp4/5Q2/PPP2PPP/RNB1R1K1 w - - 0 1",
"6R1/5r1k/p6b/1pB1p2q/1P6/5rQP/5P1K/6R1 w - - 0 1",
"rn3rk1/2qp2pp/p3P3/1p1b4/3b4/3B4/PPP1Q1PP/R1B2R1K w - - 0 1",
"2R3nk/3r2b1/p2pr1Q1/4pN2/1P6/P6P/q7/B4RK1 w - - 0 1",
"r5k1/p1p3bp/1p1p4/2PP2qp/1P6/1Q1bP3/PB3rPP/R2N2RK b - - 0 1",
"4k3/r2bnn1r/1q2pR1p/p2pPp1B/2pP1N1P/PpP1B3/1P4Q1/5KR1 w - - 0 1",
"r1b2k2/1p4pp/p4N1r/4Pp2/P3pP1q/4P2P/1P2Q2K/3R2R1 w - - 0 1",
"3r4/pR2N3/2pkb3/5p2/8/2B5/qP3PPP/4R1K1 w - - 0 1",
"r1b4r/1k2bppp/p1p1p3/8/Np2nB2/3R4/PPP1BPPP/2KR4 w - - 0 1",
"2q2r1k/5Qp1/4p1P1/3p4/r6b/7R/5BPP/5RK1 w - - 0 1",
"Q7/2r2rpk/2p4p/7N/3PpN2/1p2P3/1K4R1/5q2 w - - 0 1",
"5r1k/1q4bp/3pB1p1/2pPn1B1/1r6/1p5R/1P2PPQP/R5K1 w - - 0 1",
"r1b2k1r/2q1b3/p3ppBp/2n3B1/1p6/2N4Q/PPP3PP/2KRR3 w - - 0 1",
"5r1k/7p/8/4NP2/8/3p2R1/2r3PP/2n1RK2 w - - 0 1",
"6r1/r5PR/2p3R1/2Pk1n2/3p4/1P1NP3/4K3/8 w - - 0 1",
"r2q4/p2nR1bk/1p1Pb2p/4p2p/3nN3/B2B3P/PP1Q2P1/6K1 w - - 0 1",
"5rk1/pR4bp/6p1/6B1/5Q2/4P3/q2r1PPP/5RK1 w - - 0 1",
"4nrk1/rR5p/4pnpQ/4p1N1/2p1N3/6P1/q4P1P/4R1K1 w - - 0 1",
"1R1n3k/6pp/2Nr4/P4p2/r7/8/4PPBP/6K1 b - - 0 1",
"6r1/3p2qk/4P3/1R5p/3b1prP/3P2B1/2P1QP2/6RK b - - 0 1",
"r5q1/pp1b1kr1/2p2p2/2Q5/2PpB3/1P4NP/P4P2/4RK2 w - - 0 1",
"r2r2k1/pp2bppp/2p1p3/4qb1P/8/1BP1BQ2/PP3PP1/2KR3R b - - 0 1",
"1r1rb3/p1q2pkp/Pnp2np1/4p3/4P3/Q1N1B1PP/2PRBP2/3R2K1 w - - 0 1",
"r2k1r2/3b2pp/p5p1/2Q1R3/1pB1Pq2/1P6/PKP4P/7R w - - 0 1",
"r5k1/q4ppp/rnR1pb2/1Q1p4/1P1P4/P4N1P/1B3PP1/2R3K1 w - - 0 1",
"5r1k/7p/p2b4/1pNp1p1q/3Pr3/2P2bP1/PP1B3Q/R3R1K1 b - - 0 1",
"5b2/1p3rpk/p1b3Rp/4B1RQ/3P1p1P/7q/5P2/6K1 w - - 0 1",
"3Rr2k/pp4pb/2p4p/2P1n3/1P1Q3P/4r1q1/PB4B1/5RK1 b - - 0 1",
"R7/5pkp/3N2p1/2r3Pn/5r2/1P6/P1P5/2KR4 w - - 0 1",
"1r3k2/5p1p/1qbRp3/2r1Pp2/ppB4Q/1P6/P1P4P/1K1R4 w - - 0 1",
"8/2Q1R1bk/3r3p/p2N1p1P/P2P4/1p3Pq1/1P4P1/1K6 w - - 0 1",
"5r1k/r2b1p1p/p4Pp1/1p2R3/3qBQ2/P7/6PP/2R4K w - - 0 1",
"3r3k/1p3Rpp/p2nn3/3N4/8/1PB1PQ1P/q4PP1/6K1 w - - 0 1",
"3r1kr1/8/p2q2p1/1p2R3/1Q6/8/PPP5/1K4R1 w - - 0 1",
"4r2k/2pb1R2/2p4P/3pr1N1/1p6/7P/P1P5/2K4R w - - 0 1",
"3r3k/1b2b1pp/3pp3/p3n1P1/1pPqP2P/1P2N2R/P1QB1r2/2KR3B b - - 0 1",
];

},{}],12:[function(require,module,exports){
var Chess = require('chess.js').Chess;
var c = require('./chessutils');

var forkMap = [];
forkMap['n'] = {
    pieceEnglish: 'Knight',
    marker: '♘♆'
};
forkMap['q'] = {
    pieceEnglish: 'Queen',
    marker: '♕♆'
};
forkMap['p'] = {
    pieceEnglish: 'Pawn',
    marker: '♙♆'
};
forkMap['b'] = {
    pieceEnglish: 'Bishop',
    marker: '♗♆'
};
forkMap['r'] = {
    pieceEnglish: 'Rook',
    marker: '♖♆'
};


module.exports = function(puzzle, forkType) {
    var chess = new Chess();
    chess.load(puzzle.fen);
    addForks(puzzle.fen, puzzle.features, forkType);
    addForks(c.fenForOtherSide(puzzle.fen), puzzle.features, forkType);
    return puzzle;
};

function addForks(fen, features, forkType) {

    var chess = new Chess();
    chess.load(fen);

    var moves = chess.moves({
        verbose: true
    });

    moves = moves.map(m => enrichMoveWithForkCaptures(fen, m));
    moves = moves.filter(m => m.captures.length >= 2);

    if (!forkType || forkType == 'q') {
        addForksBy(moves, 'q', chess.turn(), features);
    }
    if (!forkType || forkType == 'p') {
        addForksBy(moves, 'p', chess.turn(), features);
    }
    if (!forkType || forkType == 'r') {
        addForksBy(moves, 'r', chess.turn(), features);
    }
    if (!forkType || forkType == 'b') {
        addForksBy(moves, 'b', chess.turn(), features);
    }
    if (!forkType || forkType == 'n') {
        addForksBy(moves, 'n', chess.turn(), features);
    }
}

function enrichMoveWithForkCaptures(fen, move) {
    var chess = new Chess();
    chess.load(fen);

    var kingsSide = chess.turn();
    var king = c.kingsSquare(fen, kingsSide);

    chess.move(move);

    // replace moving sides king with a pawn to avoid pinned state reducing branches on fork

    chess.remove(king);
    chess.put({
        type: 'p',
        color: kingsSide
    }, king);

    var sameSidesTurnFen = c.fenForOtherSide(chess.fen());

    var pieceMoves = c.movesOfPieceOn(sameSidesTurnFen, move.to);
    var captures = pieceMoves.filter(capturesMajorPiece);

    move.captures = uniqTo(captures);
    return move;
}

function uniqTo(moves) {
    var dests = [];
    return moves.filter(m => {
        if (dests.indexOf(m.to) != -1) {
            return false;
        }
        dests.push(m.to);
        return true;
    });
}

function capturesMajorPiece(move) {
    return move.captured && move.captured !== 'p';
}

function diagram(move) {
    var main = [{
        orig: move.from,
        dest: move.to,
        brush: 'paleBlue'
    }];
    var forks = move.captures.map(m => {
        return {
            orig: move.to,
            dest: m.to,
            brush: m.captured === 'k' ? 'red' : 'blue'
        };
    });
    return main.concat(forks);
}

function addForksBy(moves, piece, side, features) {
    var bypiece = moves.filter(m => m.piece === piece);
    if (piece === 'p') {
        bypiece = bypiece.filter(m => !m.promotion);
    }
    features.push({
        description: forkMap[piece].pieceEnglish + " forks",
        side: side,
        targets: bypiece.map(m => {
            return {
                target: m.to,
                diagram: diagram(m),
                marker: forkMap[piece].marker
            };
        })
    });
}

},{"./chessutils":4,"chess.js":2}],13:[function(require,module,exports){
var c = require('./chessutils');
var forks = require('./forks');
var knightforkfens = require('./fens/knightforks');
var queenforkfens = require('./fens/queenforks');
var pawnforkfens = require('./fens/pawnforks');
var rookforkfens = require('./fens/rookforks');
var bishopforkfens = require('./fens/bishopforks');
var pinfens = require('./fens/pins');
var pin = require('./pins');
var hidden = require('./hidden');
var loose = require('./loose');
var immobile = require('./immobile');
var matethreat = require('./matethreat');
var checks = require('./checks');

/**
 * Feature map 
 */
var featureMap = [{
    description: "Knight forks",
    fullDescription: "Squares from where a knight can move and fork two pieces (not pawns).",
    data: knightforkfens,
    extract: function(puzzle) {
      return forks(puzzle, 'n');
    }
  }, {
    description: "Queen forks",
    fullDescription: "Squares from where a queen can move and fork two pieces (not pawns).",
    data: queenforkfens,
    extract: function(puzzle) {
      return forks(puzzle, 'q');
    }
  }, {
    description: "Pawn forks",
    fullDescription: "Squares from where a pawn can move and fork two pieces (not pawns).",
    data: pawnforkfens,
    extract: function(puzzle) {
      return forks(puzzle, 'p');
    }
  }, {
    description: "Rook forks",
    fullDescription: "Squares from where a rook can move and fork two pieces (not pawns).",
    data: rookforkfens,
    extract: function(puzzle) {
      return forks(puzzle, 'r');
    }
  }, {
    description: "Bishop forks",
    fullDescription: "Squares from where a bishop can move and fork two pieces (not pawns).",
    data: bishopforkfens,
    extract: function(puzzle) {
      return forks(puzzle, 'b');
    }
  }, {
    description: "Loose pieces",
    fullDescription: "Pieces that are not protected by any piece of the same colour.",
    data: knightforkfens,
    extract: function(puzzle) {
      return loose(puzzle);
    }
  }, {
    description: "Checking squares",
    fullDescription: "Squares from where check can be delivered.",
    data: knightforkfens,
    extract: function(puzzle) {
      return checks(puzzle);
    }
  }, {
    description: "Hidden attackers",
    fullDescription: "Pieces that will attack an opponents piece (but not pawn) if an interviening piece of the same colour moves.",
    data: knightforkfens,
    extract: function(puzzle) {
      return hidden(puzzle);
    }
  }, {
    description: "Pins and Skewers",
    fullDescription: "Pieces that are pinned or skewered to a piece (but not pawn) of the same colour.",
    data: pinfens,
    extract: function(puzzle) {
      return pin(puzzle);
    }
  }, {
    description: "Low mobility pieces",
    fullDescription: "Pieces that have reduced mobility. i.e. Pawns that are immobile, knights with only 1 legal move, bishops with no more than 3 legal moves, rooks with no more than 6 legal moves, queens with no more than 10 legal moves and the king with no more than 2 legal moves.",
    data: knightforkfens,
    extract: function(puzzle) {
      return immobile(puzzle);
    }
  }, {
    description: "Mixed",
    fullDescription: "Use the icons to determine which feature to find.",
    data: null,
    extract: null
  }


];

module.exports = {

  /**
   * Calculate all features in the position.
   */
  extractFeatures: function(fen) {
    var puzzle = {
      fen: c.repairFen(fen),
      features: []
    };

    puzzle = forks(puzzle);
    puzzle = hidden(puzzle);
    puzzle = loose(puzzle);
    puzzle = pin(puzzle);
    puzzle = matethreat(puzzle);
    puzzle = checks(puzzle);
    puzzle = immobile(puzzle);

    return puzzle.features;
  },


  featureMap: featureMap,

  /**
   * Calculate single features in the position.
   */
  extractSingleFeature: function(featureDescription, fen) {
    var puzzle = {
      fen: c.repairFen(fen),
      features: []
    };

    featureMap.forEach(f => {
      if (featureDescription === f.description) {
        puzzle = f.extract(puzzle);
      }
    });

    return puzzle.features;
  },

  featureFound: function(features, target) {
    var found = 0;
    features
      .forEach(f => {
        f.targets.forEach(t => {
          if (t.target === target) {
            found++;
          }
        });
      });
    return found;
  },

  allFeaturesFound: function(features) {
    var found = true;
    features
      .forEach(f => {
        f.targets.forEach(t => {
          if (!t.selected) {
            found = false;
          }
        });
      });
    return found;
  },

  randomFeature: function() {
    return featureMap[Math.floor(Math.random() * (featureMap.length - 1))].description;
  },

  randomFenForFeature: function(featureDescription) {
    var fens = featureMap.find(f => f.description === featureDescription).data;
    return fens[Math.floor(Math.random() * fens.length)];
  },

};

},{"./checks":3,"./chessutils":4,"./fens/bishopforks":6,"./fens/knightforks":7,"./fens/pawnforks":8,"./fens/pins":9,"./fens/queenforks":10,"./fens/rookforks":11,"./forks":12,"./hidden":14,"./immobile":15,"./loose":16,"./matethreat":17,"./pins":18}],14:[function(require,module,exports){
var Chess = require('chess.js').Chess;
var c = require('./chessutils');

module.exports = function(puzzle) {
    inspectAligned(puzzle.fen, puzzle.features);
    inspectAligned(c.fenForOtherSide(puzzle.fen), puzzle.features);
    return puzzle;
};

function inspectAligned(fen, features) {
    var chess = new Chess(fen);

    var moves = chess.moves({
        verbose: true
    });

    var pieces = c.majorPiecesForColour(fen, chess.turn());
    var opponentsPieces = c.majorPiecesForColour(fen, chess.turn() == 'w' ? 'b' : 'w');

    var potentialCaptures = [];
    pieces.forEach(from => {
        var type = chess.get(from).type;
        if ((type !== 'k') && (type !== 'n')) {
            opponentsPieces.forEach(to => {
                if (c.canCapture(from, chess.get(from), to, chess.get(to))) {
                    var availableOnBoard = moves.filter(m => m.from === from && m.to === to);
                    if (availableOnBoard.length === 0) {
                        potentialCaptures.push({
                            attacker: from,
                            attacked: to
                        });
                    }
                }
            });
        }
    });

    addHiddenAttackers(fen, features, potentialCaptures);
}

function addHiddenAttackers(fen, features, potentialCaptures) {
    var chess = new Chess(fen);
    var targets = [];
    potentialCaptures.forEach(pair => {
        var revealingMoves = c.movesThatResultInCaptureThreat(fen, pair.attacker, pair.attacked, true);
        if (revealingMoves.length > 0) {
            targets.push({
                target: pair.attacker,
                marker: '⥇',
                diagram: diagram(pair.attacker, pair.attacked, revealingMoves)
            });
        }
    });

    features.push({
        description: "Hidden attacker",
        side: chess.turn(),
        targets: targets
    });

}


function diagram(from, to, revealingMoves) {
    var main = [{
        orig: from,
        dest: to,
        brush: 'red'
    }];
    var reveals = revealingMoves.map(m => {
        return {
            orig: m.from,
            dest: m.to,
            brush: 'paleBlue'
        };
    });
    return main.concat(reveals);
}

},{"./chessutils":4,"chess.js":2}],15:[function(require,module,exports){
var Chess = require('chess.js').Chess;
var c = require('./chessutils');

module.exports = function(puzzle) {
    addLowMobility(puzzle.fen, puzzle.features);
    addLowMobility(c.fenForOtherSide(puzzle.fen), puzzle.features);
    return puzzle;
};

var mobilityMap = {};
mobilityMap['p'] = 1;
mobilityMap['n'] = 2;
mobilityMap['b'] = 4;
mobilityMap['r'] = 7;
mobilityMap['q'] = 11;
mobilityMap['k'] = 2;

function addLowMobility(fen, features) {
    var chess = new Chess(fen);
    var pieces = c.allPiecesForColour(fen, chess.turn());

    pieces = pieces.map(square => {
        return {
            square: square,
            type: chess.get(square).type,
            moves: chess.moves({
                verbose: true,
                square: square
            })
        };
    });

    pieces = pieces.filter(m => m.moves.length < mobilityMap[m.type]);

    features.push({
        description: "Low mobility",
        side: chess.turn(),
        targets: pieces.map(t => {
            return {
                target: t.square,
                marker: '⧀',
                diagram: [{
                    orig: t.square,
                    brush: 'yellow'
                }]
            };
        })
    });
}

},{"./chessutils":4,"chess.js":2}],16:[function(require,module,exports){
var Chess = require('chess.js').Chess;
var c = require('./chessutils');



module.exports = function(puzzle) {
    var chess = new Chess();
    addLoosePieces(puzzle.fen, puzzle.features);
    addLoosePieces(c.fenForOtherSide(puzzle.fen), puzzle.features);
    return puzzle;
};

function addLoosePieces(fen, features) {
    var chess = new Chess();
    chess.load(fen);
    var king = c.kingsSquare(fen, chess.turn());
    var opponent = chess.turn() === 'w' ? 'b' : 'w';
    var pieces = c.piecesForColour(fen, opponent);
    pieces = pieces.filter(square => !c.isCheckAfterPlacingKingAtSquare(fen, king, square));
    features.push({
        description: "Loose pieces",
        side: opponent,
        targets: pieces.map(t => {
            return {
                target: t,
                marker: '⚮',
                diagram: [{
                    orig: t,
                    brush: 'yellow'
                }]
            };
        })
    });
}

},{"./chessutils":4,"chess.js":2}],17:[function(require,module,exports){
var Chess = require('chess.js').Chess;
var c = require('./chessutils');



module.exports = function(puzzle) {
    var chess = new Chess();
    chess.load(puzzle.fen);
    addMateInOneThreats(puzzle.fen, puzzle.features);
    addMateInOneThreats(c.fenForOtherSide(puzzle.fen), puzzle.features);
    return puzzle;
};

function addMateInOneThreats(fen, features) {
    var chess = new Chess();
    chess.load(fen);
    var moves = chess.moves({
        verbose: true
    });

    moves = moves.filter(m => canMateOnNextTurn(fen, m));

    features.push({
        description: "Mate-in-1 threats",
        side: chess.turn(),
        targets: moves.map(m => targetAndDiagram(m))
    });

}

function canMateOnNextTurn(fen, move) {
    var chess = new Chess(fen);
    chess.move(move);
    if (chess.in_check()) {
        return false;
    }

    chess.load(c.fenForOtherSide(chess.fen()));
    var moves = chess.moves({
        verbose: true
    });

    // stuff mating moves into move object for diagram
    move.matingMoves = moves.filter(m => /#/.test(m.san));
    return move.matingMoves.length > 0;
}

function targetAndDiagram(move) {
    return {
        target: move.to,
        diagram: [{
            orig: move.from,
            dest: move.to,
            brush: "paleGreen"
        }].concat(move.matingMoves.map(m => {
            return {
                orig: m.from,
                dest: m.to,
                brush: "paleGreen"
            };
        })).concat(move.matingMoves.map(m => {
            return {
                orig: m.from,
                brush: "paleGreen"
            };
        }))
    };
}

},{"./chessutils":4,"chess.js":2}],18:[function(require,module,exports){
var Chess = require('chess.js').Chess;
var c = require('./chessutils');

module.exports = function(puzzle) {
    inspectAligned(puzzle.fen, puzzle.features);
    inspectAligned(c.fenForOtherSide(puzzle.fen), puzzle.features);
    return puzzle;
};

function inspectAligned(fen, features) {
    var chess = new Chess(fen);

    var moves = chess.moves({
        verbose: true
    });

    var pieces = c.majorPiecesForColour(fen, chess.turn());
    var opponentsPieces = c.majorPiecesForColour(fen, chess.turn() == 'w' ? 'b' : 'w');

    var potentialCaptures = [];
    pieces.forEach(from => {
        var type = chess.get(from).type;
        if ((type !== 'k') && (type !== 'n')) {
            opponentsPieces.forEach(to => {
                if (c.canCapture(from, chess.get(from), to, chess.get(to))) {
                    var availableOnBoard = moves.filter(m => m.from === from && m.to === to);
                    if (availableOnBoard.length === 0) {
                        potentialCaptures.push({
                            attacker: from,
                            attacked: to
                        });
                    }
                }
            });
        }
    });

    addGeometricPins(fen, features, potentialCaptures);
}

// pins are found if there is 1 piece in between a capture of the opponents colour.

function addGeometricPins(fen, features, potentialCaptures) {
    var chess = new Chess(fen);
    var targets = [];
    potentialCaptures.forEach(pair => {
        pair.piecesBetween = c.between(pair.attacker, pair.attacked).map(square => {
            return {
                square: square,
                piece: chess.get(square)
            };
        }).filter(item => item.piece);
    });

    var otherSide = chess.turn() === 'w' ? 'b' : 'w';

    potentialCaptures = potentialCaptures.filter(pair => pair.piecesBetween.length === 1);
    potentialCaptures = potentialCaptures.filter(pair => pair.piecesBetween[0].piece.color === otherSide);
    potentialCaptures.forEach(pair => {
        targets.push({
            target: pair.piecesBetween[0].square,
            marker: marker(fen, pair.piecesBetween[0].square, pair.attacked),
            diagram: diagram(pair.attacker, pair.attacked, pair.piecesBetween[0].square)
        });

    });

    features.push({
        description: "Pins and Skewers",
        side: chess.turn() === 'w' ? 'b' : 'w',
        targets: targets
    });

}

function marker(fen, pinned, attacked) {
    var chess = new Chess(fen);
    var p = chess.get(pinned).type;
    var a = chess.get(attacked).type;
    var checkModifier = a === 'k' ? '+' : '';
    if ((p === 'q') || (p === 'r' && (a === 'b' || a === 'n'))) {
        return '🍢' + checkModifier;
    }
    return '📌' + checkModifier;
}

function diagram(from, to, middle) {
    return [{
        orig: from,
        dest: to,
        brush: 'red'
    }, {
        orig: middle,
        brush: 'red'
    }];
}

},{"./chessutils":4,"chess.js":2}],19:[function(require,module,exports){
module.exports = function(list) {

    var occured = [];
    var result = [];

    list.forEach(x => {
        var json = JSON.stringify(x);
        if (!occured.includes(json)) {
            occured.push(json);
            result.push(x);
        }
    });
    return result;
};

},{}],20:[function(require,module,exports){
var m = (function app(window, undefined) {
	"use strict";
  	var VERSION = "v0.2.1";
	function isFunction(object) {
		return typeof object === "function";
	}
	function isObject(object) {
		return type.call(object) === "[object Object]";
	}
	function isString(object) {
		return type.call(object) === "[object String]";
	}
	var isArray = Array.isArray || function (object) {
		return type.call(object) === "[object Array]";
	};
	var type = {}.toString;
	var parser = /(?:(^|#|\.)([^#\.\[\]]+))|(\[.+?\])/g, attrParser = /\[(.+?)(?:=("|'|)(.*?)\2)?\]/;
	var voidElements = /^(AREA|BASE|BR|COL|COMMAND|EMBED|HR|IMG|INPUT|KEYGEN|LINK|META|PARAM|SOURCE|TRACK|WBR)$/;
	var noop = function () {};

	// caching commonly used variables
	var $document, $location, $requestAnimationFrame, $cancelAnimationFrame;

	// self invoking function needed because of the way mocks work
	function initialize(window) {
		$document = window.document;
		$location = window.location;
		$cancelAnimationFrame = window.cancelAnimationFrame || window.clearTimeout;
		$requestAnimationFrame = window.requestAnimationFrame || window.setTimeout;
	}

	initialize(window);

	m.version = function() {
		return VERSION;
	};

	/**
	 * @typedef {String} Tag
	 * A string that looks like -> div.classname#id[param=one][param2=two]
	 * Which describes a DOM node
	 */

	/**
	 *
	 * @param {Tag} The DOM node tag
	 * @param {Object=[]} optional key-value pairs to be mapped to DOM attrs
	 * @param {...mNode=[]} Zero or more Mithril child nodes. Can be an array, or splat (optional)
	 *
	 */
	function m(tag, pairs) {
		for (var args = [], i = 1; i < arguments.length; i++) {
			args[i - 1] = arguments[i];
		}
		if (isObject(tag)) return parameterize(tag, args);
		var hasAttrs = pairs != null && isObject(pairs) && !("tag" in pairs || "view" in pairs || "subtree" in pairs);
		var attrs = hasAttrs ? pairs : {};
		var classAttrName = "class" in attrs ? "class" : "className";
		var cell = {tag: "div", attrs: {}};
		var match, classes = [];
		if (!isString(tag)) throw new Error("selector in m(selector, attrs, children) should be a string");
		while ((match = parser.exec(tag)) != null) {
			if (match[1] === "" && match[2]) cell.tag = match[2];
			else if (match[1] === "#") cell.attrs.id = match[2];
			else if (match[1] === ".") classes.push(match[2]);
			else if (match[3][0] === "[") {
				var pair = attrParser.exec(match[3]);
				cell.attrs[pair[1]] = pair[3] || (pair[2] ? "" :true);
			}
		}

		var children = hasAttrs ? args.slice(1) : args;
		if (children.length === 1 && isArray(children[0])) {
			cell.children = children[0];
		}
		else {
			cell.children = children;
		}

		for (var attrName in attrs) {
			if (attrs.hasOwnProperty(attrName)) {
				if (attrName === classAttrName && attrs[attrName] != null && attrs[attrName] !== "") {
					classes.push(attrs[attrName]);
					cell.attrs[attrName] = ""; //create key in correct iteration order
				}
				else cell.attrs[attrName] = attrs[attrName];
			}
		}
		if (classes.length) cell.attrs[classAttrName] = classes.join(" ");

		return cell;
	}
	function forEach(list, f) {
		for (var i = 0; i < list.length && !f(list[i], i++);) {}
	}
	function forKeys(list, f) {
		forEach(list, function (attrs, i) {
			return (attrs = attrs && attrs.attrs) && attrs.key != null && f(attrs, i);
		});
	}
	// This function was causing deopts in Chrome.
	// Well no longer
	function dataToString(data) {
    if (data == null) return '';
    if (typeof data === 'object') return data;
    if (data.toString() == null) return ""; // prevent recursion error on FF
    return data;
	}
	// This function was causing deopts in Chrome.
	function injectTextNode(parentElement, first, index, data) {
		try {
			insertNode(parentElement, first, index);
			first.nodeValue = data;
		} catch (e) {} //IE erroneously throws error when appending an empty text node after a null
	}

	function flatten(list) {
		//recursively flatten array
		for (var i = 0; i < list.length; i++) {
			if (isArray(list[i])) {
				list = list.concat.apply([], list);
				//check current index again and flatten until there are no more nested arrays at that index
				i--;
			}
		}
		return list;
	}

	function insertNode(parentElement, node, index) {
		parentElement.insertBefore(node, parentElement.childNodes[index] || null);
	}

	var DELETION = 1, INSERTION = 2, MOVE = 3;

	function handleKeysDiffer(data, existing, cached, parentElement) {
		forKeys(data, function (key, i) {
			existing[key = key.key] = existing[key] ? {
				action: MOVE,
				index: i,
				from: existing[key].index,
				element: cached.nodes[existing[key].index] || $document.createElement("div")
			} : {action: INSERTION, index: i};
		});
		var actions = [];
		for (var prop in existing) actions.push(existing[prop]);
		var changes = actions.sort(sortChanges), newCached = new Array(cached.length);
		newCached.nodes = cached.nodes.slice();

		forEach(changes, function (change) {
			var index = change.index;
			if (change.action === DELETION) {
				clear(cached[index].nodes, cached[index]);
				newCached.splice(index, 1);
			}
			if (change.action === INSERTION) {
				var dummy = $document.createElement("div");
				dummy.key = data[index].attrs.key;
				insertNode(parentElement, dummy, index);
				newCached.splice(index, 0, {
					attrs: {key: data[index].attrs.key},
					nodes: [dummy]
				});
				newCached.nodes[index] = dummy;
			}

			if (change.action === MOVE) {
				var changeElement = change.element;
				var maybeChanged = parentElement.childNodes[index];
				if (maybeChanged !== changeElement && changeElement !== null) {
					parentElement.insertBefore(changeElement, maybeChanged || null);
				}
				newCached[index] = cached[change.from];
				newCached.nodes[index] = changeElement;
			}
		});

		return newCached;
	}

	function diffKeys(data, cached, existing, parentElement) {
		var keysDiffer = data.length !== cached.length;
		if (!keysDiffer) {
			forKeys(data, function (attrs, i) {
				var cachedCell = cached[i];
				return keysDiffer = cachedCell && cachedCell.attrs && cachedCell.attrs.key !== attrs.key;
			});
		}

		return keysDiffer ? handleKeysDiffer(data, existing, cached, parentElement) : cached;
	}

	function diffArray(data, cached, nodes) {
		//diff the array itself

		//update the list of DOM nodes by collecting the nodes from each item
		forEach(data, function (_, i) {
			if (cached[i] != null) nodes.push.apply(nodes, cached[i].nodes);
		})
		//remove items from the end of the array if the new array is shorter than the old one. if errors ever happen here, the issue is most likely
		//a bug in the construction of the `cached` data structure somewhere earlier in the program
		forEach(cached.nodes, function (node, i) {
			if (node.parentNode != null && nodes.indexOf(node) < 0) clear([node], [cached[i]]);
		})
		if (data.length < cached.length) cached.length = data.length;
		cached.nodes = nodes;
	}

	function buildArrayKeys(data) {
		var guid = 0;
		forKeys(data, function () {
			forEach(data, function (attrs) {
				if ((attrs = attrs && attrs.attrs) && attrs.key == null) attrs.key = "__mithril__" + guid++;
			})
			return 1;
		});
	}

	function maybeRecreateObject(data, cached, dataAttrKeys) {
		//if an element is different enough from the one in cache, recreate it
		if (data.tag !== cached.tag ||
				dataAttrKeys.sort().join() !== Object.keys(cached.attrs).sort().join() ||
				data.attrs.id !== cached.attrs.id ||
				data.attrs.key !== cached.attrs.key ||
				(m.redraw.strategy() === "all" && (!cached.configContext || cached.configContext.retain !== true)) ||
				(m.redraw.strategy() === "diff" && cached.configContext && cached.configContext.retain === false)) {
			if (cached.nodes.length) clear(cached.nodes);
			if (cached.configContext && isFunction(cached.configContext.onunload)) cached.configContext.onunload();
			if (cached.controllers) {
				forEach(cached.controllers, function (controller) {
					if (controller.unload) controller.onunload({preventDefault: noop});
				});
			}
		}
	}

	function getObjectNamespace(data, namespace) {
		return data.attrs.xmlns ? data.attrs.xmlns :
			data.tag === "svg" ? "http://www.w3.org/2000/svg" :
			data.tag === "math" ? "http://www.w3.org/1998/Math/MathML" :
			namespace;
	}

	function unloadCachedControllers(cached, views, controllers) {
		if (controllers.length) {
			cached.views = views;
			cached.controllers = controllers;
			forEach(controllers, function (controller) {
				if (controller.onunload && controller.onunload.$old) controller.onunload = controller.onunload.$old;
				if (pendingRequests && controller.onunload) {
					var onunload = controller.onunload;
					controller.onunload = noop;
					controller.onunload.$old = onunload;
				}
			});
		}
	}

	function scheduleConfigsToBeCalled(configs, data, node, isNew, cached) {
		//schedule configs to be called. They are called after `build`
		//finishes running
		if (isFunction(data.attrs.config)) {
			var context = cached.configContext = cached.configContext || {};

			//bind
			configs.push(function() {
				return data.attrs.config.call(data, node, !isNew, context, cached);
			});
		}
	}

	function buildUpdatedNode(cached, data, editable, hasKeys, namespace, views, configs, controllers) {
		var node = cached.nodes[0];
		if (hasKeys) setAttributes(node, data.tag, data.attrs, cached.attrs, namespace);
		cached.children = build(node, data.tag, undefined, undefined, data.children, cached.children, false, 0, data.attrs.contenteditable ? node : editable, namespace, configs);
		cached.nodes.intact = true;

		if (controllers.length) {
			cached.views = views;
			cached.controllers = controllers;
		}

		return node;
	}

	function handleNonexistentNodes(data, parentElement, index) {
		var nodes;
		if (data.$trusted) {
			nodes = injectHTML(parentElement, index, data);
		}
		else {
			nodes = [$document.createTextNode(data)];
			if (!parentElement.nodeName.match(voidElements)) insertNode(parentElement, nodes[0], index);
		}

		var cached = typeof data === "string" || typeof data === "number" || typeof data === "boolean" ? new data.constructor(data) : data;
		cached.nodes = nodes;
		return cached;
	}

	function reattachNodes(data, cached, parentElement, editable, index, parentTag) {
		var nodes = cached.nodes;
		if (!editable || editable !== $document.activeElement) {
			if (data.$trusted) {
				clear(nodes, cached);
				nodes = injectHTML(parentElement, index, data);
			}
			//corner case: replacing the nodeValue of a text node that is a child of a textarea/contenteditable doesn't work
			//we need to update the value property of the parent textarea or the innerHTML of the contenteditable element instead
			else if (parentTag === "textarea") {
				parentElement.value = data;
			}
			else if (editable) {
				editable.innerHTML = data;
			}
			else {
				//was a trusted string
				if (nodes[0].nodeType === 1 || nodes.length > 1) {
					clear(cached.nodes, cached);
					nodes = [$document.createTextNode(data)];
				}
				injectTextNode(parentElement, nodes[0], index, data);
			}
		}
		cached = new data.constructor(data);
		cached.nodes = nodes;
		return cached;
	}

	function handleText(cached, data, index, parentElement, shouldReattach, editable, parentTag) {
		//handle text nodes
		return cached.nodes.length === 0 ? handleNonexistentNodes(data, parentElement, index) :
			cached.valueOf() !== data.valueOf() || shouldReattach === true ?
				reattachNodes(data, cached, parentElement, editable, index, parentTag) :
			(cached.nodes.intact = true, cached);
	}

	function getSubArrayCount(item) {
		if (item.$trusted) {
			//fix offset of next element if item was a trusted string w/ more than one html element
			//the first clause in the regexp matches elements
			//the second clause (after the pipe) matches text nodes
			var match = item.match(/<[^\/]|\>\s*[^<]/g);
			if (match != null) return match.length;
		}
		else if (isArray(item)) {
			return item.length;
		}
		return 1;
	}

	function buildArray(data, cached, parentElement, index, parentTag, shouldReattach, editable, namespace, configs) {
		data = flatten(data);
		var nodes = [], intact = cached.length === data.length, subArrayCount = 0;

		//keys algorithm: sort elements without recreating them if keys are present
		//1) create a map of all existing keys, and mark all for deletion
		//2) add new keys to map and mark them for addition
		//3) if key exists in new list, change action from deletion to a move
		//4) for each key, handle its corresponding action as marked in previous steps
		var existing = {}, shouldMaintainIdentities = false;
		forKeys(cached, function (attrs, i) {
			shouldMaintainIdentities = true;
			existing[cached[i].attrs.key] = {action: DELETION, index: i};
		});

		buildArrayKeys(data);
		if (shouldMaintainIdentities) cached = diffKeys(data, cached, existing, parentElement);
		//end key algorithm

		var cacheCount = 0;
		//faster explicitly written
		for (var i = 0, len = data.length; i < len; i++) {
			//diff each item in the array
			var item = build(parentElement, parentTag, cached, index, data[i], cached[cacheCount], shouldReattach, index + subArrayCount || subArrayCount, editable, namespace, configs);

			if (item !== undefined) {
				intact = intact && item.nodes.intact;
				subArrayCount += getSubArrayCount(item);
				cached[cacheCount++] = item;
			}
		}

		if (!intact) diffArray(data, cached, nodes);
		return cached
	}

	function makeCache(data, cached, index, parentIndex, parentCache) {
		if (cached != null) {
			if (type.call(cached) === type.call(data)) return cached;

			if (parentCache && parentCache.nodes) {
				var offset = index - parentIndex, end = offset + (isArray(data) ? data : cached.nodes).length;
				clear(parentCache.nodes.slice(offset, end), parentCache.slice(offset, end));
			} else if (cached.nodes) {
				clear(cached.nodes, cached);
			}
		}

		cached = new data.constructor();
		//if constructor creates a virtual dom element, use a blank object
		//as the base cached node instead of copying the virtual el (#277)
		if (cached.tag) cached = {};
		cached.nodes = [];
		return cached;
	}

	function constructNode(data, namespace) {
		return namespace === undefined ?
			data.attrs.is ? $document.createElement(data.tag, data.attrs.is) : $document.createElement(data.tag) :
			data.attrs.is ? $document.createElementNS(namespace, data.tag, data.attrs.is) : $document.createElementNS(namespace, data.tag);
	}

	function constructAttrs(data, node, namespace, hasKeys) {
		return hasKeys ? setAttributes(node, data.tag, data.attrs, {}, namespace) : data.attrs;
	}

	function constructChildren(data, node, cached, editable, namespace, configs) {
		return data.children != null && data.children.length > 0 ?
			build(node, data.tag, undefined, undefined, data.children, cached.children, true, 0, data.attrs.contenteditable ? node : editable, namespace, configs) :
			data.children;
	}

	function reconstructCached(data, attrs, children, node, namespace, views, controllers) {
		var cached = {tag: data.tag, attrs: attrs, children: children, nodes: [node]};
		unloadCachedControllers(cached, views, controllers);
		if (cached.children && !cached.children.nodes) cached.children.nodes = [];
		//edge case: setting value on <select> doesn't work before children exist, so set it again after children have been created
		if (data.tag === "select" && "value" in data.attrs) setAttributes(node, data.tag, {value: data.attrs.value}, {}, namespace);
		return cached
	}

	function getController(views, view, cachedControllers, controller) {
		var controllerIndex = m.redraw.strategy() === "diff" && views ? views.indexOf(view) : -1;
		return controllerIndex > -1 ? cachedControllers[controllerIndex] :
			typeof controller === "function" ? new controller() : {};
	}

	function updateLists(views, controllers, view, controller) {
		if (controller.onunload != null) unloaders.push({controller: controller, handler: controller.onunload});
		views.push(view);
		controllers.push(controller);
	}

	function checkView(data, view, cached, cachedControllers, controllers, views) {
		var controller = getController(cached.views, view, cachedControllers, data.controller);
		//Faster to coerce to number and check for NaN
		var key = +(data && data.attrs && data.attrs.key);
		data = pendingRequests === 0 || forcing || cachedControllers && cachedControllers.indexOf(controller) > -1 ? data.view(controller) : {tag: "placeholder"};
		if (data.subtree === "retain") return cached;
		if (key === key) (data.attrs = data.attrs || {}).key = key;
		updateLists(views, controllers, view, controller);
		return data;
	}

	function markViews(data, cached, views, controllers) {
		var cachedControllers = cached && cached.controllers;
		while (data.view != null) data = checkView(data, data.view.$original || data.view, cached, cachedControllers, controllers, views);
		return data;
	}

	function buildObject(data, cached, editable, parentElement, index, shouldReattach, namespace, configs) {
		var views = [], controllers = [];
		data = markViews(data, cached, views, controllers);
		if (!data.tag && controllers.length) throw new Error("Component template must return a virtual element, not an array, string, etc.");
		data.attrs = data.attrs || {};
		cached.attrs = cached.attrs || {};
		var dataAttrKeys = Object.keys(data.attrs);
		var hasKeys = dataAttrKeys.length > ("key" in data.attrs ? 1 : 0);
		maybeRecreateObject(data, cached, dataAttrKeys);
		if (!isString(data.tag)) return;
		var isNew = cached.nodes.length === 0;
		namespace = getObjectNamespace(data, namespace);
		var node;
		if (isNew) {
			node = constructNode(data, namespace);
			//set attributes first, then create children
			var attrs = constructAttrs(data, node, namespace, hasKeys)
			var children = constructChildren(data, node, cached, editable, namespace, configs);
			cached = reconstructCached(data, attrs, children, node, namespace, views, controllers);
		}
		else {
			node = buildUpdatedNode(cached, data, editable, hasKeys, namespace, views, configs, controllers);
		}
		if (isNew || shouldReattach === true && node != null) insertNode(parentElement, node, index);
		//schedule configs to be called. They are called after `build`
		//finishes running
		scheduleConfigsToBeCalled(configs, data, node, isNew, cached);
		return cached
	}

	function build(parentElement, parentTag, parentCache, parentIndex, data, cached, shouldReattach, index, editable, namespace, configs) {
		//`build` is a recursive function that manages creation/diffing/removal
		//of DOM elements based on comparison between `data` and `cached`
		//the diff algorithm can be summarized as this:
		//1 - compare `data` and `cached`
		//2 - if they are different, copy `data` to `cached` and update the DOM
		//    based on what the difference is
		//3 - recursively apply this algorithm for every array and for the
		//    children of every virtual element

		//the `cached` data structure is essentially the same as the previous
		//redraw's `data` data structure, with a few additions:
		//- `cached` always has a property called `nodes`, which is a list of
		//   DOM elements that correspond to the data represented by the
		//   respective virtual element
		//- in order to support attaching `nodes` as a property of `cached`,
		//   `cached` is *always* a non-primitive object, i.e. if the data was
		//   a string, then cached is a String instance. If data was `null` or
		//   `undefined`, cached is `new String("")`
		//- `cached also has a `configContext` property, which is the state
		//   storage object exposed by config(element, isInitialized, context)
		//- when `cached` is an Object, it represents a virtual element; when
		//   it's an Array, it represents a list of elements; when it's a
		//   String, Number or Boolean, it represents a text node

		//`parentElement` is a DOM element used for W3C DOM API calls
		//`parentTag` is only used for handling a corner case for textarea
		//values
		//`parentCache` is used to remove nodes in some multi-node cases
		//`parentIndex` and `index` are used to figure out the offset of nodes.
		//They're artifacts from before arrays started being flattened and are
		//likely refactorable
		//`data` and `cached` are, respectively, the new and old nodes being
		//diffed
		//`shouldReattach` is a flag indicating whether a parent node was
		//recreated (if so, and if this node is reused, then this node must
		//reattach itself to the new parent)
		//`editable` is a flag that indicates whether an ancestor is
		//contenteditable
		//`namespace` indicates the closest HTML namespace as it cascades down
		//from an ancestor
		//`configs` is a list of config functions to run after the topmost
		//`build` call finishes running

		//there's logic that relies on the assumption that null and undefined
		//data are equivalent to empty strings
		//- this prevents lifecycle surprises from procedural helpers that mix
		//  implicit and explicit return statements (e.g.
		//  function foo() {if (cond) return m("div")}
		//- it simplifies diffing code
		data = dataToString(data);
		if (data.subtree === "retain") return cached;
		cached = makeCache(data, cached, index, parentIndex, parentCache);
		return isArray(data) ? buildArray(data, cached, parentElement, index, parentTag, shouldReattach, editable, namespace, configs) :
			data != null && isObject(data) ? buildObject(data, cached, editable, parentElement, index, shouldReattach, namespace, configs) :
			!isFunction(data) ? handleText(cached, data, index, parentElement, shouldReattach, editable, parentTag) :
			cached;
	}
	function sortChanges(a, b) { return a.action - b.action || a.index - b.index; }
	function setAttributes(node, tag, dataAttrs, cachedAttrs, namespace) {
		for (var attrName in dataAttrs) {
			var dataAttr = dataAttrs[attrName];
			var cachedAttr = cachedAttrs[attrName];
			if (!(attrName in cachedAttrs) || (cachedAttr !== dataAttr)) {
				cachedAttrs[attrName] = dataAttr;
				//`config` isn't a real attributes, so ignore it
				if (attrName === "config" || attrName === "key") continue;
				//hook event handlers to the auto-redrawing system
				else if (isFunction(dataAttr) && attrName.slice(0, 2) === "on") {
				node[attrName] = autoredraw(dataAttr, node);
				}
				//handle `style: {...}`
				else if (attrName === "style" && dataAttr != null && isObject(dataAttr)) {
				for (var rule in dataAttr) {
						if (cachedAttr == null || cachedAttr[rule] !== dataAttr[rule]) node.style[rule] = dataAttr[rule];
				}
				for (var rule in cachedAttr) {
						if (!(rule in dataAttr)) node.style[rule] = "";
				}
				}
				//handle SVG
				else if (namespace != null) {
				if (attrName === "href") node.setAttributeNS("http://www.w3.org/1999/xlink", "href", dataAttr);
				else node.setAttribute(attrName === "className" ? "class" : attrName, dataAttr);
				}
				//handle cases that are properties (but ignore cases where we should use setAttribute instead)
				//- list and form are typically used as strings, but are DOM element references in js
				//- when using CSS selectors (e.g. `m("[style='']")`), style is used as a string, but it's an object in js
				else if (attrName in node && attrName !== "list" && attrName !== "style" && attrName !== "form" && attrName !== "type" && attrName !== "width" && attrName !== "height") {
				//#348 don't set the value if not needed otherwise cursor placement breaks in Chrome
				if (tag !== "input" || node[attrName] !== dataAttr) node[attrName] = dataAttr;
				}
				else node.setAttribute(attrName, dataAttr);
			}
			//#348 dataAttr may not be a string, so use loose comparison (double equal) instead of strict (triple equal)
			else if (attrName === "value" && tag === "input" && node.value != dataAttr) {
				node.value = dataAttr;
			}
		}
		return cachedAttrs;
	}
	function clear(nodes, cached) {
		for (var i = nodes.length - 1; i > -1; i--) {
			if (nodes[i] && nodes[i].parentNode) {
				try { nodes[i].parentNode.removeChild(nodes[i]); }
				catch (e) {} //ignore if this fails due to order of events (see http://stackoverflow.com/questions/21926083/failed-to-execute-removechild-on-node)
				cached = [].concat(cached);
				if (cached[i]) unload(cached[i]);
			}
		}
		//release memory if nodes is an array. This check should fail if nodes is a NodeList (see loop above)
		if (nodes.length) nodes.length = 0;
	}
	function unload(cached) {
		if (cached.configContext && isFunction(cached.configContext.onunload)) {
			cached.configContext.onunload();
			cached.configContext.onunload = null;
		}
		if (cached.controllers) {
			forEach(cached.controllers, function (controller) {
				if (isFunction(controller.onunload)) controller.onunload({preventDefault: noop});
			});
		}
		if (cached.children) {
			if (isArray(cached.children)) forEach(cached.children, unload);
			else if (cached.children.tag) unload(cached.children);
		}
	}

	var insertAdjacentBeforeEnd = (function () {
		var rangeStrategy = function (parentElement, data) {
			parentElement.appendChild($document.createRange().createContextualFragment(data));
		};
		var insertAdjacentStrategy = function (parentElement, data) {
			parentElement.insertAdjacentHTML("beforeend", data);
		};

		try {
			$document.createRange().createContextualFragment('x');
			return rangeStrategy;
		} catch (e) {
			return insertAdjacentStrategy;
		}
	})();

	function injectHTML(parentElement, index, data) {
		var nextSibling = parentElement.childNodes[index];
		if (nextSibling) {
			var isElement = nextSibling.nodeType !== 1;
			var placeholder = $document.createElement("span");
			if (isElement) {
				parentElement.insertBefore(placeholder, nextSibling || null);
				placeholder.insertAdjacentHTML("beforebegin", data);
				parentElement.removeChild(placeholder);
			}
			else nextSibling.insertAdjacentHTML("beforebegin", data);
		}
		else insertAdjacentBeforeEnd(parentElement, data);

		var nodes = [];
		while (parentElement.childNodes[index] !== nextSibling) {
			nodes.push(parentElement.childNodes[index]);
			index++;
		}
		return nodes;
	}
	function autoredraw(callback, object) {
		return function(e) {
			e = e || event;
			m.redraw.strategy("diff");
			m.startComputation();
			try { return callback.call(object, e); }
			finally {
				endFirstComputation();
			}
		};
	}

	var html;
	var documentNode = {
		appendChild: function(node) {
			if (html === undefined) html = $document.createElement("html");
			if ($document.documentElement && $document.documentElement !== node) {
				$document.replaceChild(node, $document.documentElement);
			}
			else $document.appendChild(node);
			this.childNodes = $document.childNodes;
		},
		insertBefore: function(node) {
			this.appendChild(node);
		},
		childNodes: []
	};
	var nodeCache = [], cellCache = {};
	m.render = function(root, cell, forceRecreation) {
		var configs = [];
		if (!root) throw new Error("Ensure the DOM element being passed to m.route/m.mount/m.render is not undefined.");
		var id = getCellCacheKey(root);
		var isDocumentRoot = root === $document;
		var node = isDocumentRoot || root === $document.documentElement ? documentNode : root;
		if (isDocumentRoot && cell.tag !== "html") cell = {tag: "html", attrs: {}, children: cell};
		if (cellCache[id] === undefined) clear(node.childNodes);
		if (forceRecreation === true) reset(root);
		cellCache[id] = build(node, null, undefined, undefined, cell, cellCache[id], false, 0, null, undefined, configs);
		forEach(configs, function (config) { config(); });
	};
	function getCellCacheKey(element) {
		var index = nodeCache.indexOf(element);
		return index < 0 ? nodeCache.push(element) - 1 : index;
	}

	m.trust = function(value) {
		value = new String(value);
		value.$trusted = true;
		return value;
	};

	function gettersetter(store) {
		var prop = function() {
			if (arguments.length) store = arguments[0];
			return store;
		};

		prop.toJSON = function() {
			return store;
		};

		return prop;
	}

	m.prop = function (store) {
		//note: using non-strict equality check here because we're checking if store is null OR undefined
		if ((store != null && isObject(store) || isFunction(store)) && isFunction(store.then)) {
			return propify(store);
		}

		return gettersetter(store);
	};

	var roots = [], components = [], controllers = [], lastRedrawId = null, lastRedrawCallTime = 0, computePreRedrawHook = null, computePostRedrawHook = null, topComponent, unloaders = [];
	var FRAME_BUDGET = 16; //60 frames per second = 1 call per 16 ms
	function parameterize(component, args) {
		var controller = function() {
			return (component.controller || noop).apply(this, args) || this;
		};
		if (component.controller) controller.prototype = component.controller.prototype;
		var view = function(ctrl) {
			var currentArgs = arguments.length > 1 ? args.concat([].slice.call(arguments, 1)) : args;
			return component.view.apply(component, currentArgs ? [ctrl].concat(currentArgs) : [ctrl]);
		};
		view.$original = component.view;
		var output = {controller: controller, view: view};
		if (args[0] && args[0].key != null) output.attrs = {key: args[0].key};
		return output;
	}
	m.component = function(component) {
		for (var args = [], i = 1; i < arguments.length; i++) args.push(arguments[i]);
		return parameterize(component, args);
	};
	m.mount = m.module = function(root, component) {
		if (!root) throw new Error("Please ensure the DOM element exists before rendering a template into it.");
		var index = roots.indexOf(root);
		if (index < 0) index = roots.length;

		var isPrevented = false;
		var event = {preventDefault: function() {
			isPrevented = true;
			computePreRedrawHook = computePostRedrawHook = null;
		}};

		forEach(unloaders, function (unloader) {
			unloader.handler.call(unloader.controller, event);
			unloader.controller.onunload = null;
		});

		if (isPrevented) {
			forEach(unloaders, function (unloader) {
				unloader.controller.onunload = unloader.handler;
			});
		}
		else unloaders = [];

		if (controllers[index] && isFunction(controllers[index].onunload)) {
			controllers[index].onunload(event);
		}

		var isNullComponent = component === null;

		if (!isPrevented) {
			m.redraw.strategy("all");
			m.startComputation();
			roots[index] = root;
			var currentComponent = component ? (topComponent = component) : (topComponent = component = {controller: noop});
			var controller = new (component.controller || noop)();
			//controllers may call m.mount recursively (via m.route redirects, for example)
			//this conditional ensures only the last recursive m.mount call is applied
			if (currentComponent === topComponent) {
				controllers[index] = controller;
				components[index] = component;
			}
			endFirstComputation();
			if (isNullComponent) {
				removeRootElement(root, index);
			}
			return controllers[index];
		}
		if (isNullComponent) {
			removeRootElement(root, index);
		}
	};

	function removeRootElement(root, index) {
		roots.splice(index, 1);
		controllers.splice(index, 1);
		components.splice(index, 1);
		reset(root);
		nodeCache.splice(getCellCacheKey(root), 1);
	}

	var redrawing = false, forcing = false;
	m.redraw = function(force) {
		if (redrawing) return;
		redrawing = true;
		if (force) forcing = true;
		try {
			//lastRedrawId is a positive number if a second redraw is requested before the next animation frame
			//lastRedrawID is null if it's the first redraw and not an event handler
			if (lastRedrawId && !force) {
				//when setTimeout: only reschedule redraw if time between now and previous redraw is bigger than a frame, otherwise keep currently scheduled timeout
				//when rAF: always reschedule redraw
				if ($requestAnimationFrame === window.requestAnimationFrame || new Date - lastRedrawCallTime > FRAME_BUDGET) {
					if (lastRedrawId > 0) $cancelAnimationFrame(lastRedrawId);
					lastRedrawId = $requestAnimationFrame(redraw, FRAME_BUDGET);
				}
			}
			else {
				redraw();
				lastRedrawId = $requestAnimationFrame(function() { lastRedrawId = null; }, FRAME_BUDGET);
			}
		}
		finally {
			redrawing = forcing = false;
		}
	};
	m.redraw.strategy = m.prop();
	function redraw() {
		if (computePreRedrawHook) {
			computePreRedrawHook();
			computePreRedrawHook = null;
		}
		forEach(roots, function (root, i) {
			var component = components[i];
			if (controllers[i]) {
				var args = [controllers[i]];
				m.render(root, component.view ? component.view(controllers[i], args) : "");
			}
		});
		//after rendering within a routed context, we need to scroll back to the top, and fetch the document title for history.pushState
		if (computePostRedrawHook) {
			computePostRedrawHook();
			computePostRedrawHook = null;
		}
		lastRedrawId = null;
		lastRedrawCallTime = new Date;
		m.redraw.strategy("diff");
	}

	var pendingRequests = 0;
	m.startComputation = function() { pendingRequests++; };
	m.endComputation = function() {
		if (pendingRequests > 1) pendingRequests--;
		else {
			pendingRequests = 0;
			m.redraw();
		}
	}

	function endFirstComputation() {
		if (m.redraw.strategy() === "none") {
			pendingRequests--;
			m.redraw.strategy("diff");
		}
		else m.endComputation();
	}

	m.withAttr = function(prop, withAttrCallback, callbackThis) {
		return function(e) {
			e = e || event;
			var currentTarget = e.currentTarget || this;
			var _this = callbackThis || this;
			withAttrCallback.call(_this, prop in currentTarget ? currentTarget[prop] : currentTarget.getAttribute(prop));
		};
	};

	//routing
	var modes = {pathname: "", hash: "#", search: "?"};
	var redirect = noop, routeParams, currentRoute, isDefaultRoute = false;
	m.route = function(root, arg1, arg2, vdom) {
		//m.route()
		if (arguments.length === 0) return currentRoute;
		//m.route(el, defaultRoute, routes)
		else if (arguments.length === 3 && isString(arg1)) {
			redirect = function(source) {
				var path = currentRoute = normalizeRoute(source);
				if (!routeByValue(root, arg2, path)) {
					if (isDefaultRoute) throw new Error("Ensure the default route matches one of the routes defined in m.route");
					isDefaultRoute = true;
					m.route(arg1, true);
					isDefaultRoute = false;
				}
			};
			var listener = m.route.mode === "hash" ? "onhashchange" : "onpopstate";
			window[listener] = function() {
				var path = $location[m.route.mode];
				if (m.route.mode === "pathname") path += $location.search;
				if (currentRoute !== normalizeRoute(path)) redirect(path);
			};

			computePreRedrawHook = setScroll;
			window[listener]();
		}
		//config: m.route
		else if (root.addEventListener || root.attachEvent) {
			root.href = (m.route.mode !== 'pathname' ? $location.pathname : '') + modes[m.route.mode] + vdom.attrs.href;
			if (root.addEventListener) {
				root.removeEventListener("click", routeUnobtrusive);
				root.addEventListener("click", routeUnobtrusive);
			}
			else {
				root.detachEvent("onclick", routeUnobtrusive);
				root.attachEvent("onclick", routeUnobtrusive);
			}
		}
		//m.route(route, params, shouldReplaceHistoryEntry)
		else if (isString(root)) {
			var oldRoute = currentRoute;
			currentRoute = root;
			var args = arg1 || {};
			var queryIndex = currentRoute.indexOf("?");
			var params = queryIndex > -1 ? parseQueryString(currentRoute.slice(queryIndex + 1)) : {};
			for (var i in args) params[i] = args[i];
			var querystring = buildQueryString(params);
			var currentPath = queryIndex > -1 ? currentRoute.slice(0, queryIndex) : currentRoute;
			if (querystring) currentRoute = currentPath + (currentPath.indexOf("?") === -1 ? "?" : "&") + querystring;

			var shouldReplaceHistoryEntry = (arguments.length === 3 ? arg2 : arg1) === true || oldRoute === root;

			if (window.history.pushState) {
				computePreRedrawHook = setScroll;
				computePostRedrawHook = function() {
					window.history[shouldReplaceHistoryEntry ? "replaceState" : "pushState"](null, $document.title, modes[m.route.mode] + currentRoute);
				};
				redirect(modes[m.route.mode] + currentRoute);
			}
			else {
				$location[m.route.mode] = currentRoute;
				redirect(modes[m.route.mode] + currentRoute);
			}
		}
	};
	m.route.param = function(key) {
		if (!routeParams) throw new Error("You must call m.route(element, defaultRoute, routes) before calling m.route.param()");
		if( !key ){
			return routeParams;
		}
		return routeParams[key];
	};
	m.route.mode = "search";
	function normalizeRoute(route) {
		return route.slice(modes[m.route.mode].length);
	}
	function routeByValue(root, router, path) {
		routeParams = {};

		var queryStart = path.indexOf("?");
		if (queryStart !== -1) {
			routeParams = parseQueryString(path.substr(queryStart + 1, path.length));
			path = path.substr(0, queryStart);
		}

		// Get all routes and check if there's
		// an exact match for the current path
		var keys = Object.keys(router);
		var index = keys.indexOf(path);
		if(index !== -1){
			m.mount(root, router[keys [index]]);
			return true;
		}

		for (var route in router) {
			if (route === path) {
				m.mount(root, router[route]);
				return true;
			}

			var matcher = new RegExp("^" + route.replace(/:[^\/]+?\.{3}/g, "(.*?)").replace(/:[^\/]+/g, "([^\\/]+)") + "\/?$");

			if (matcher.test(path)) {
				path.replace(matcher, function() {
					var keys = route.match(/:[^\/]+/g) || [];
					var values = [].slice.call(arguments, 1, -2);
					forEach(keys, function (key, i) {
						routeParams[key.replace(/:|\./g, "")] = decodeURIComponent(values[i]);
					})
					m.mount(root, router[route]);
				});
				return true;
			}
		}
	}
	function routeUnobtrusive(e) {
		e = e || event;

		if (e.ctrlKey || e.metaKey || e.which === 2) return;

		if (e.preventDefault) e.preventDefault();
		else e.returnValue = false;

		var currentTarget = e.currentTarget || e.srcElement;
		var args = m.route.mode === "pathname" && currentTarget.search ? parseQueryString(currentTarget.search.slice(1)) : {};
		while (currentTarget && currentTarget.nodeName.toUpperCase() !== "A") currentTarget = currentTarget.parentNode;
		m.route(currentTarget[m.route.mode].slice(modes[m.route.mode].length), args);
	}
	function setScroll() {
		if (m.route.mode !== "hash" && $location.hash) $location.hash = $location.hash;
		else window.scrollTo(0, 0);
	}
	function buildQueryString(object, prefix) {
		var duplicates = {};
		var str = [];
		for (var prop in object) {
			var key = prefix ? prefix + "[" + prop + "]" : prop;
			var value = object[prop];

			if (value === null) {
				str.push(encodeURIComponent(key));
			} else if (isObject(value)) {
				str.push(buildQueryString(value, key));
			} else if (isArray(value)) {
				var keys = [];
				duplicates[key] = duplicates[key] || {};
				forEach(value, function (item) {
					if (!duplicates[key][item]) {
						duplicates[key][item] = true;
						keys.push(encodeURIComponent(key) + "=" + encodeURIComponent(item));
					}
				});
				str.push(keys.join("&"));
			} else if (value !== undefined) {
				str.push(encodeURIComponent(key) + "=" + encodeURIComponent(value));
			}
		}
		return str.join("&");
	}
	function parseQueryString(str) {
		if (str === "" || str == null) return {};
		if (str.charAt(0) === "?") str = str.slice(1);

		var pairs = str.split("&"), params = {};
		forEach(pairs, function (string) {
			var pair = string.split("=");
			var key = decodeURIComponent(pair[0]);
			var value = pair.length === 2 ? decodeURIComponent(pair[1]) : null;
			if (params[key] != null) {
				if (!isArray(params[key])) params[key] = [params[key]];
				params[key].push(value);
			}
			else params[key] = value;
		});

		return params;
	}
	m.route.buildQueryString = buildQueryString;
	m.route.parseQueryString = parseQueryString;

	function reset(root) {
		var cacheKey = getCellCacheKey(root);
		clear(root.childNodes, cellCache[cacheKey]);
		cellCache[cacheKey] = undefined;
	}

	m.deferred = function () {
		var deferred = new Deferred();
		deferred.promise = propify(deferred.promise);
		return deferred;
	};
	function propify(promise, initialValue) {
		var prop = m.prop(initialValue);
		promise.then(prop);
		prop.then = function(resolve, reject) {
			return propify(promise.then(resolve, reject), initialValue);
		};
		prop["catch"] = prop.then.bind(null, null);
		prop["finally"] = function(callback) {
			var _callback = function() {return m.deferred().resolve(callback()).promise;};
			return prop.then(function(value) {
				return propify(_callback().then(function() {return value;}), initialValue);
			}, function(reason) {
				return propify(_callback().then(function() {throw new Error(reason);}), initialValue);
			});
		};
		return prop;
	}
	//Promiz.mithril.js | Zolmeister | MIT
	//a modified version of Promiz.js, which does not conform to Promises/A+ for two reasons:
	//1) `then` callbacks are called synchronously (because setTimeout is too slow, and the setImmediate polyfill is too big
	//2) throwing subclasses of Error cause the error to be bubbled up instead of triggering rejection (because the spec does not account for the important use case of default browser error handling, i.e. message w/ line number)
	function Deferred(successCallback, failureCallback) {
		var RESOLVING = 1, REJECTING = 2, RESOLVED = 3, REJECTED = 4;
		var self = this, state = 0, promiseValue = 0, next = [];

		self.promise = {};

		self.resolve = function(value) {
			if (!state) {
				promiseValue = value;
				state = RESOLVING;

				fire();
			}
			return this;
		};

		self.reject = function(value) {
			if (!state) {
				promiseValue = value;
				state = REJECTING;

				fire();
			}
			return this;
		};

		self.promise.then = function(successCallback, failureCallback) {
			var deferred = new Deferred(successCallback, failureCallback)
			if (state === RESOLVED) {
				deferred.resolve(promiseValue);
			}
			else if (state === REJECTED) {
				deferred.reject(promiseValue);
			}
			else {
				next.push(deferred);
			}
			return deferred.promise
		};

		function finish(type) {
			state = type || REJECTED;
			next.map(function(deferred) {
				state === RESOLVED ? deferred.resolve(promiseValue) : deferred.reject(promiseValue);
			});
		}

		function thennable(then, successCallback, failureCallback, notThennableCallback) {
			if (((promiseValue != null && isObject(promiseValue)) || isFunction(promiseValue)) && isFunction(then)) {
				try {
					// count protects against abuse calls from spec checker
					var count = 0;
					then.call(promiseValue, function(value) {
						if (count++) return;
						promiseValue = value;
						successCallback();
					}, function (value) {
						if (count++) return;
						promiseValue = value;
						failureCallback();
					});
				}
				catch (e) {
					m.deferred.onerror(e);
					promiseValue = e;
					failureCallback();
				}
			} else {
				notThennableCallback();
			}
		}

		function fire() {
			// check if it's a thenable
			var then;
			try {
				then = promiseValue && promiseValue.then;
			}
			catch (e) {
				m.deferred.onerror(e);
				promiseValue = e;
				state = REJECTING;
				return fire();
			}

			thennable(then, function() {
				state = RESOLVING;
				fire();
			}, function() {
				state = REJECTING;
				fire();
			}, function() {
				try {
					if (state === RESOLVING && isFunction(successCallback)) {
						promiseValue = successCallback(promiseValue);
					}
					else if (state === REJECTING && isFunction(failureCallback)) {
						promiseValue = failureCallback(promiseValue);
						state = RESOLVING;
					}
				}
				catch (e) {
					m.deferred.onerror(e);
					promiseValue = e;
					return finish();
				}

				if (promiseValue === self) {
					promiseValue = TypeError();
					finish();
				} else {
					thennable(then, function () {
						finish(RESOLVED);
					}, finish, function () {
						finish(state === RESOLVING && RESOLVED);
					});
				}
			});
		}
	}
	m.deferred.onerror = function(e) {
		if (type.call(e) === "[object Error]" && !e.constructor.toString().match(/ Error/)) {
			pendingRequests = 0;
			throw e;
		}
	};

	m.sync = function(args) {
		var method = "resolve";

		function synchronizer(pos, resolved) {
			return function(value) {
				results[pos] = value;
				if (!resolved) method = "reject";
				if (--outstanding === 0) {
					deferred.promise(results);
					deferred[method](results);
				}
				return value;
			};
		}

		var deferred = m.deferred();
		var outstanding = args.length;
		var results = new Array(outstanding);
		if (args.length > 0) {
			forEach(args, function (arg, i) {
				arg.then(synchronizer(i, true), synchronizer(i, false));
			});
		}
		else deferred.resolve([]);

		return deferred.promise;
	};
	function identity(value) { return value; }

	function ajax(options) {
		if (options.dataType && options.dataType.toLowerCase() === "jsonp") {
			var callbackKey = "mithril_callback_" + new Date().getTime() + "_" + (Math.round(Math.random() * 1e16)).toString(36)
			var script = $document.createElement("script");

			window[callbackKey] = function(resp) {
				script.parentNode.removeChild(script);
				options.onload({
					type: "load",
					target: {
						responseText: resp
					}
				});
				window[callbackKey] = undefined;
			};

			script.onerror = function() {
				script.parentNode.removeChild(script);

				options.onerror({
					type: "error",
					target: {
						status: 500,
						responseText: JSON.stringify({
							error: "Error making jsonp request"
						})
					}
				});
				window[callbackKey] = undefined;

				return false;
			}

			script.onload = function() {
				return false;
			};

			script.src = options.url
				+ (options.url.indexOf("?") > 0 ? "&" : "?")
				+ (options.callbackKey ? options.callbackKey : "callback")
				+ "=" + callbackKey
				+ "&" + buildQueryString(options.data || {});
			$document.body.appendChild(script);
		}
		else {
			var xhr = new window.XMLHttpRequest();
			xhr.open(options.method, options.url, true, options.user, options.password);
			xhr.onreadystatechange = function() {
				if (xhr.readyState === 4) {
					if (xhr.status >= 200 && xhr.status < 300) options.onload({type: "load", target: xhr});
					else options.onerror({type: "error", target: xhr});
				}
			};
			if (options.serialize === JSON.stringify && options.data && options.method !== "GET") {
				xhr.setRequestHeader("Content-Type", "application/json; charset=utf-8");
			}
			if (options.deserialize === JSON.parse) {
				xhr.setRequestHeader("Accept", "application/json, text/*");
			}
			if (isFunction(options.config)) {
				var maybeXhr = options.config(xhr, options);
				if (maybeXhr != null) xhr = maybeXhr;
			}

			var data = options.method === "GET" || !options.data ? "" : options.data;
			if (data && (!isString(data) && data.constructor !== window.FormData)) {
				throw new Error("Request data should be either be a string or FormData. Check the `serialize` option in `m.request`");
			}
			xhr.send(data);
			return xhr;
		}
	}

	function bindData(xhrOptions, data, serialize) {
		if (xhrOptions.method === "GET" && xhrOptions.dataType !== "jsonp") {
			var prefix = xhrOptions.url.indexOf("?") < 0 ? "?" : "&";
			var querystring = buildQueryString(data);
			xhrOptions.url = xhrOptions.url + (querystring ? prefix + querystring : "");
		}
		else xhrOptions.data = serialize(data);
		return xhrOptions;
	}

	function parameterizeUrl(url, data) {
		var tokens = url.match(/:[a-z]\w+/gi);
		if (tokens && data) {
			forEach(tokens, function (token) {
				var key = token.slice(1);
				url = url.replace(token, data[key]);
				delete data[key];
			});
		}
		return url;
	}

	m.request = function(xhrOptions) {
		if (xhrOptions.background !== true) m.startComputation();
		var deferred = new Deferred();
		var isJSONP = xhrOptions.dataType && xhrOptions.dataType.toLowerCase() === "jsonp"
		var serialize = xhrOptions.serialize = isJSONP ? identity : xhrOptions.serialize || JSON.stringify;
		var deserialize = xhrOptions.deserialize = isJSONP ? identity : xhrOptions.deserialize || JSON.parse;
		var extract = isJSONP ? function(jsonp) { return jsonp.responseText } : xhrOptions.extract || function(xhr) {
			if (xhr.responseText.length === 0 && deserialize === JSON.parse) {
				return null
			} else {
				return xhr.responseText
			}
		};
		xhrOptions.method = (xhrOptions.method || "GET").toUpperCase();
		xhrOptions.url = parameterizeUrl(xhrOptions.url, xhrOptions.data);
		xhrOptions = bindData(xhrOptions, xhrOptions.data, serialize);
		xhrOptions.onload = xhrOptions.onerror = function(e) {
			try {
				e = e || event;
				var unwrap = (e.type === "load" ? xhrOptions.unwrapSuccess : xhrOptions.unwrapError) || identity;
				var response = unwrap(deserialize(extract(e.target, xhrOptions)), e.target);
				if (e.type === "load") {
					if (isArray(response) && xhrOptions.type) {
						forEach(response, function (res, i) {
							response[i] = new xhrOptions.type(res);
						});
					} else if (xhrOptions.type) {
						response = new xhrOptions.type(response);
					}
				}

				deferred[e.type === "load" ? "resolve" : "reject"](response);
			} catch (e) {
				m.deferred.onerror(e);
				deferred.reject(e);
			}

			if (xhrOptions.background !== true) m.endComputation()
		}

		ajax(xhrOptions);
		deferred.promise = propify(deferred.promise, xhrOptions.initialValue);
		return deferred.promise;
	};

	//testing API
	m.deps = function(mock) {
		initialize(window = mock || window);
		return window;
	};
	//for internal testing only, do not use `m.deps.factory`
	m.deps.factory = app;

	return m;
})(typeof window !== "undefined" ? window : {});

if (typeof module === "object" && module != null && module.exports) module.exports = m;
else if (typeof define === "function" && define.amd) define(function() { return m });

},{}],21:[function(require,module,exports){
var util = require('./util');

// https://gist.github.com/gre/1650294
var easing = {
  easeInOutCubic: function(t) {
    return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
  },
};

function makePiece(k, piece, invert) {
  var key = invert ? util.invertKey(k) : k;
  return {
    key: key,
    pos: util.key2pos(key),
    role: piece.role,
    color: piece.color
  };
}

function samePiece(p1, p2) {
  return p1.role === p2.role && p1.color === p2.color;
}

function closer(piece, pieces) {
  return pieces.sort(function(p1, p2) {
    return util.distance(piece.pos, p1.pos) - util.distance(piece.pos, p2.pos);
  })[0];
}

function computePlan(prev, current) {
  var bounds = current.bounds(),
    width = bounds.width / 8,
    height = bounds.height / 8,
    anims = {},
    animedOrigs = [],
    fadings = [],
    missings = [],
    news = [],
    invert = prev.orientation !== current.orientation,
    prePieces = {},
    white = current.orientation === 'white';
  for (var pk in prev.pieces) {
    var piece = makePiece(pk, prev.pieces[pk], invert);
    prePieces[piece.key] = piece;
  }
  for (var i = 0; i < util.allKeys.length; i++) {
    var key = util.allKeys[i];
    if (key !== current.movable.dropped[1]) {
      var curP = current.pieces[key];
      var preP = prePieces[key];
      if (curP) {
        if (preP) {
          if (!samePiece(curP, preP)) {
            missings.push(preP);
            news.push(makePiece(key, curP, false));
          }
        } else
          news.push(makePiece(key, curP, false));
      } else if (preP)
        missings.push(preP);
    }
  }
  news.forEach(function(newP) {
    var preP = closer(newP, missings.filter(util.partial(samePiece, newP)));
    if (preP) {
      var orig = white ? preP.pos : newP.pos;
      var dest = white ? newP.pos : preP.pos;
      var vector = [(orig[0] - dest[0]) * width, (dest[1] - orig[1]) * height];
      anims[newP.key] = [vector, vector];
      animedOrigs.push(preP.key);
    }
  });
  missings.forEach(function(p) {
    if (
      p.key !== current.movable.dropped[0] &&
      !util.containsX(animedOrigs, p.key) &&
      !(current.items ? current.items.render(p.pos, p.key) : false)
    )
      fadings.push({
        piece: p,
        opacity: 1
      });
  });

  return {
    anims: anims,
    fadings: fadings
  };
}

function roundBy(n, by) {
  return Math.round(n * by) / by;
}

function go(data) {
  if (!data.animation.current.start) return; // animation was canceled
  var rest = 1 - (new Date().getTime() - data.animation.current.start) / data.animation.current.duration;
  if (rest <= 0) {
    data.animation.current = {};
    data.render();
  } else {
    var ease = easing.easeInOutCubic(rest);
    for (var key in data.animation.current.anims) {
      var cfg = data.animation.current.anims[key];
      cfg[1] = [roundBy(cfg[0][0] * ease, 10), roundBy(cfg[0][1] * ease, 10)];
    }
    for (var i in data.animation.current.fadings) {
      data.animation.current.fadings[i].opacity = roundBy(ease, 100);
    }
    data.render();
    util.requestAnimationFrame(function() {
      go(data);
    });
  }
}

function animate(transformation, data) {
  // clone data
  var prev = {
    orientation: data.orientation,
    pieces: {}
  };
  // clone pieces
  for (var key in data.pieces) {
    prev.pieces[key] = {
      role: data.pieces[key].role,
      color: data.pieces[key].color
    };
  }
  var result = transformation();
  if (data.animation.enabled) {
    var plan = computePlan(prev, data);
    if (Object.keys(plan.anims).length > 0 || plan.fadings.length > 0) {
      var alreadyRunning = data.animation.current.start;
      data.animation.current = {
        start: new Date().getTime(),
        duration: data.animation.duration,
        anims: plan.anims,
        fadings: plan.fadings
      };
      if (!alreadyRunning) go(data);
    } else {
      // don't animate, just render right away
      data.renderRAF();
    }
  } else {
    // animations are now disabled
    data.renderRAF();
  }
  return result;
}

// transformation is a function
// accepts board data and any number of arguments,
// and mutates the board.
module.exports = function(transformation, data, skip) {
  return function() {
    var transformationArgs = [data].concat(Array.prototype.slice.call(arguments, 0));
    if (!data.render) return transformation.apply(null, transformationArgs);
    else if (data.animation.enabled && !skip)
      return animate(util.partialApply(transformation, transformationArgs), data);
    else {
      var result = transformation.apply(null, transformationArgs);
      data.renderRAF();
      return result;
    }
  };
};

},{"./util":35}],22:[function(require,module,exports){
var board = require('./board');

module.exports = function(controller) {

  return {
    set: controller.set,
    toggleOrientation: controller.toggleOrientation,
    getOrientation: controller.getOrientation,
    getPieces: function() {
      return controller.data.pieces;
    },
    getMaterialDiff: function() {
      return board.getMaterialDiff(controller.data);
    },
    getFen: controller.getFen,
    move: controller.apiMove,
    newPiece: controller.apiNewPiece,
    setPieces: controller.setPieces,
    setCheck: controller.setCheck,
    playPremove: controller.playPremove,
    playPredrop: controller.playPredrop,
    cancelPremove: controller.cancelPremove,
    cancelPredrop: controller.cancelPredrop,
    cancelMove: controller.cancelMove,
    stop: controller.stop,
    explode: controller.explode,
    setAutoShapes: controller.setAutoShapes,
    setShapes: controller.setShapes,
    data: controller.data // directly exposes chessground state for more messing around
  };
};

},{"./board":23}],23:[function(require,module,exports){
var util = require('./util');
var premove = require('./premove');
var anim = require('./anim');
var hold = require('./hold');

function callUserFunction(f) {
  setTimeout(f, 1);
}

function toggleOrientation(data) {
  data.orientation = util.opposite(data.orientation);
}

function reset(data) {
  data.lastMove = null;
  setSelected(data, null);
  unsetPremove(data);
  unsetPredrop(data);
}

function setPieces(data, pieces) {
  Object.keys(pieces).forEach(function(key) {
    if (pieces[key]) data.pieces[key] = pieces[key];
    else delete data.pieces[key];
  });
  data.movable.dropped = [];
}

function setCheck(data, color) {
  var checkColor = color || data.turnColor;
  Object.keys(data.pieces).forEach(function(key) {
    if (data.pieces[key].color === checkColor && data.pieces[key].role === 'king') data.check = key;
  });
}

function setPremove(data, orig, dest) {
  unsetPredrop(data);
  data.premovable.current = [orig, dest];
  callUserFunction(util.partial(data.premovable.events.set, orig, dest));
}

function unsetPremove(data) {
  if (data.premovable.current) {
    data.premovable.current = null;
    callUserFunction(data.premovable.events.unset);
  }
}

function setPredrop(data, role, key) {
  unsetPremove(data);
  data.predroppable.current = {
    role: role,
    key: key
  };
  callUserFunction(util.partial(data.predroppable.events.set, role, key));
}

function unsetPredrop(data) {
  if (data.predroppable.current.key) {
    data.predroppable.current = {};
    callUserFunction(data.predroppable.events.unset);
  }
}

function tryAutoCastle(data, orig, dest) {
  if (!data.autoCastle) return;
  var king = data.pieces[dest];
  if (king.role !== 'king') return;
  var origPos = util.key2pos(orig);
  if (origPos[0] !== 5) return;
  if (origPos[1] !== 1 && origPos[1] !== 8) return;
  var destPos = util.key2pos(dest),
    oldRookPos, newRookPos, newKingPos;
  if (destPos[0] === 7 || destPos[0] === 8) {
    oldRookPos = util.pos2key([8, origPos[1]]);
    newRookPos = util.pos2key([6, origPos[1]]);
    newKingPos = util.pos2key([7, origPos[1]]);
  } else if (destPos[0] === 3 || destPos[0] === 1) {
    oldRookPos = util.pos2key([1, origPos[1]]);
    newRookPos = util.pos2key([4, origPos[1]]);
    newKingPos = util.pos2key([3, origPos[1]]);
  } else return;
  delete data.pieces[orig];
  delete data.pieces[dest];
  delete data.pieces[oldRookPos];
  data.pieces[newKingPos] = {
    role: 'king',
    color: king.color
  };
  data.pieces[newRookPos] = {
    role: 'rook',
    color: king.color
  };
}

function baseMove(data, orig, dest) {
  var success = anim(function() {
    if (orig === dest || !data.pieces[orig]) return false;
    var captured = (
      data.pieces[dest] &&
      data.pieces[dest].color !== data.pieces[orig].color
    ) ? data.pieces[dest] : null;
    callUserFunction(util.partial(data.events.move, orig, dest, captured));
    data.pieces[dest] = data.pieces[orig];
    delete data.pieces[orig];
    data.lastMove = [orig, dest];
    data.check = null;
    tryAutoCastle(data, orig, dest);
    callUserFunction(data.events.change);
    return true;
  }, data)();
  if (success) data.movable.dropped = [];
  return success;
}

function baseNewPiece(data, piece, key) {
  if (data.pieces[key]) return false;
  callUserFunction(util.partial(data.events.dropNewPiece, piece, key));
  data.pieces[key] = piece;
  data.lastMove = [key, key];
  data.check = null;
  callUserFunction(data.events.change);
  data.movable.dropped = [];
  data.movable.dests = {};
  data.turnColor = util.opposite(data.turnColor);
  data.renderRAF();
  return true;
}

function baseUserMove(data, orig, dest) {
  var result = baseMove(data, orig, dest);
  if (result) {
    data.movable.dests = {};
    data.turnColor = util.opposite(data.turnColor);
  }
  return result;
}

function apiMove(data, orig, dest) {
  return baseMove(data, orig, dest);
}

function apiNewPiece(data, piece, key) {
  return baseNewPiece(data, piece, key);
}

function userMove(data, orig, dest) {
  if (!dest) {
    hold.cancel();
    setSelected(data, null);
    if (data.movable.dropOff === 'trash') {
      delete data.pieces[orig];
      callUserFunction(data.events.change);
    }
  } else if (canMove(data, orig, dest)) {
    if (baseUserMove(data, orig, dest)) {
      var holdTime = hold.stop();
      setSelected(data, null);
      callUserFunction(util.partial(data.movable.events.after, orig, dest, {
        premove: false,
        holdTime: holdTime
      }));
      return true;
    }
  } else if (canPremove(data, orig, dest)) {
    setPremove(data, orig, dest);
    setSelected(data, null);
  } else if (isMovable(data, dest) || isPremovable(data, dest)) {
    setSelected(data, dest);
    hold.start();
  } else setSelected(data, null);
}

function dropNewPiece(data, orig, dest) {
  if (canDrop(data, orig, dest)) {
    var piece = data.pieces[orig];
    delete data.pieces[orig];
    baseNewPiece(data, piece, dest);
    data.movable.dropped = [];
    callUserFunction(util.partial(data.movable.events.afterNewPiece, piece.role, dest, {
      predrop: false
    }));
  } else if (canPredrop(data, orig, dest)) {
    setPredrop(data, data.pieces[orig].role, dest);
  } else {
    unsetPremove(data);
    unsetPredrop(data);
  }
  delete data.pieces[orig];
  setSelected(data, null);
}

function selectSquare(data, key) {
  if (data.selected) {
    if (key) {
      if (data.selected === key && !data.draggable.enabled) {
        setSelected(data, null);
        hold.cancel();
      } else if (data.selectable.enabled && data.selected !== key) {
        if (userMove(data, data.selected, key)) data.stats.dragged = false;
      } else hold.start();
    } else {
      setSelected(data, null);
      hold.cancel();
    }
  } else if (isMovable(data, key) || isPremovable(data, key)) {
    setSelected(data, key);
    hold.start();
  }
  if (key) callUserFunction(util.partial(data.events.select, key));
}

function setSelected(data, key) {
  data.selected = key;
  if (key && isPremovable(data, key))
    data.premovable.dests = premove(data.pieces, key, data.premovable.castle);
  else
    data.premovable.dests = null;
}

function isMovable(data, orig) {
  var piece = data.pieces[orig];
  return piece && (
    data.movable.color === 'both' || (
      data.movable.color === piece.color &&
      data.turnColor === piece.color
    ));
}

function canMove(data, orig, dest) {
  return orig !== dest && isMovable(data, orig) && (
    data.movable.free || util.containsX(data.movable.dests[orig], dest)
  );
}

function canDrop(data, orig, dest) {
  var piece = data.pieces[orig];
  return piece && dest && (orig === dest || !data.pieces[dest]) && (
    data.movable.color === 'both' || (
      data.movable.color === piece.color &&
      data.turnColor === piece.color
    ));
}


function isPremovable(data, orig) {
  var piece = data.pieces[orig];
  return piece && data.premovable.enabled &&
    data.movable.color === piece.color &&
    data.turnColor !== piece.color;
}

function canPremove(data, orig, dest) {
  return orig !== dest &&
    isPremovable(data, orig) &&
    util.containsX(premove(data.pieces, orig, data.premovable.castle), dest);
}

function canPredrop(data, orig, dest) {
  var piece = data.pieces[orig];
  return piece && dest &&
    (!data.pieces[dest] || data.pieces[dest].color !== data.movable.color) &&
    data.predroppable.enabled &&
    (piece.role !== 'pawn' || (dest[1] !== '1' && dest[1] !== '8')) &&
    data.movable.color === piece.color &&
    data.turnColor !== piece.color;
}

function isDraggable(data, orig) {
  var piece = data.pieces[orig];
  return piece && data.draggable.enabled && (
    data.movable.color === 'both' || (
      data.movable.color === piece.color && (
        data.turnColor === piece.color || data.premovable.enabled
      )
    )
  );
}

function playPremove(data) {
  var move = data.premovable.current;
  if (!move) return;
  var orig = move[0],
    dest = move[1],
    success = false;
  if (canMove(data, orig, dest)) {
    if (baseUserMove(data, orig, dest)) {
      callUserFunction(util.partial(data.movable.events.after, orig, dest, {
        premove: true
      }));
      success = true;
    }
  }
  unsetPremove(data);
  return success;
}

function playPredrop(data, validate) {
  var drop = data.predroppable.current,
    success = false;
  if (!drop.key) return;
  if (validate(drop)) {
    var piece = {
      role: drop.role,
      color: data.movable.color
    };
    if (baseNewPiece(data, piece, drop.key)) {
      callUserFunction(util.partial(data.movable.events.afterNewPiece, drop.role, drop.key, {
        predrop: true
      }));
      success = true;
    }
  }
  unsetPredrop(data);
  return success;
}

function cancelMove(data) {
  unsetPremove(data);
  unsetPredrop(data);
  selectSquare(data, null);
}

function stop(data) {
  data.movable.color = null;
  data.movable.dests = {};
  cancelMove(data);
}

function getKeyAtDomPos(data, pos, bounds) {
  if (!bounds && !data.bounds) return;
  bounds = bounds || data.bounds(); // use provided value, or compute it
  var file = Math.ceil(8 * ((pos[0] - bounds.left) / bounds.width));
  file = data.orientation === 'white' ? file : 9 - file;
  var rank = Math.ceil(8 - (8 * ((pos[1] - bounds.top) / bounds.height)));
  rank = data.orientation === 'white' ? rank : 9 - rank;
  if (file > 0 && file < 9 && rank > 0 && rank < 9) return util.pos2key([file, rank]);
}

// {white: {pawn: 3 queen: 1}, black: {bishop: 2}}
function getMaterialDiff(data) {
  var counts = {
    king: 0,
    queen: 0,
    rook: 0,
    bishop: 0,
    knight: 0,
    pawn: 0
  };
  for (var k in data.pieces) {
    var p = data.pieces[k];
    counts[p.role] += ((p.color === 'white') ? 1 : -1);
  }
  var diff = {
    white: {},
    black: {}
  };
  for (var role in counts) {
    var c = counts[role];
    if (c > 0) diff.white[role] = c;
    else if (c < 0) diff.black[role] = -c;
  }
  return diff;
}

var pieceScores = {
  pawn: 1,
  knight: 3,
  bishop: 3,
  rook: 5,
  queen: 9,
  king: 0
};

function getScore(data) {
  var score = 0;
  for (var k in data.pieces) {
    score += pieceScores[data.pieces[k].role] * (data.pieces[k].color === 'white' ? 1 : -1);
  }
  return score;
}

module.exports = {
  reset: reset,
  toggleOrientation: toggleOrientation,
  setPieces: setPieces,
  setCheck: setCheck,
  selectSquare: selectSquare,
  setSelected: setSelected,
  isDraggable: isDraggable,
  canMove: canMove,
  userMove: userMove,
  dropNewPiece: dropNewPiece,
  apiMove: apiMove,
  apiNewPiece: apiNewPiece,
  playPremove: playPremove,
  playPredrop: playPredrop,
  unsetPremove: unsetPremove,
  unsetPredrop: unsetPredrop,
  cancelMove: cancelMove,
  stop: stop,
  getKeyAtDomPos: getKeyAtDomPos,
  getMaterialDiff: getMaterialDiff,
  getScore: getScore
};

},{"./anim":21,"./hold":31,"./premove":33,"./util":35}],24:[function(require,module,exports){
var merge = require('merge');
var board = require('./board');
var fen = require('./fen');

module.exports = function(data, config) {

  if (!config) return;

  // don't merge destinations. Just override.
  if (config.movable && config.movable.dests) delete data.movable.dests;

  merge.recursive(data, config);

  // if a fen was provided, replace the pieces
  if (data.fen) {
    data.pieces = fen.read(data.fen);
    data.check = config.check;
    data.drawable.shapes = [];
    delete data.fen;
  }

  if (data.check === true) board.setCheck(data);

  // forget about the last dropped piece
  data.movable.dropped = [];

  // fix move/premove dests
  if (data.selected) board.setSelected(data, data.selected);

  // no need for such short animations
  if (!data.animation.duration || data.animation.duration < 40)
    data.animation.enabled = false;

  if (!data.movable.rookCastle) {
    var rank = data.movable.color === 'white' ? 1 : 8;
    var kingStartPos = 'e' + rank;
    if (data.movable.dests) {
      var dests = data.movable.dests[kingStartPos];
      if (!dests || data.pieces[kingStartPos].role !== 'king') return;
      data.movable.dests[kingStartPos] = dests.filter(function(d) {
        return d !== 'a' + rank && d !== 'h' + rank
      });
    }
  }
};

},{"./board":23,"./fen":30,"merge":37}],25:[function(require,module,exports){
var m = require('mithril');
var util = require('./util');

function renderCoords(elems, klass, orient) {
  var el = document.createElement('coords');
  el.className = klass;
  elems.forEach(function(content) {
    var f = document.createElement('coord');
    f.textContent = content;
    el.appendChild(f);
  });
  return el;
}

module.exports = function(orientation, el) {

  util.requestAnimationFrame(function() {
    var coords = document.createDocumentFragment();
    var orientClass = orientation === 'black' ? ' black' : '';
    coords.appendChild(renderCoords(util.ranks, 'ranks' + orientClass));
    coords.appendChild(renderCoords(util.files, 'files' + orientClass));
    el.appendChild(coords);
  });

  var orientation;

  return function(o) {
    if (o === orientation) return;
    orientation = o;
    var coords = el.querySelectorAll('coords');
    for (i = 0; i < coords.length; ++i)
      coords[i].classList.toggle('black', o === 'black');
  };
}

},{"./util":35,"mithril":20}],26:[function(require,module,exports){
var board = require('./board');
var data = require('./data');
var fen = require('./fen');
var configure = require('./configure');
var anim = require('./anim');
var drag = require('./drag');

module.exports = function(cfg) {

  this.data = data(cfg);

  this.vm = {
    exploding: false
  };

  this.getFen = function() {
    return fen.write(this.data.pieces);
  }.bind(this);

  this.getOrientation = function() {
    return this.data.orientation;
  }.bind(this);

  this.set = anim(configure, this.data);

  this.toggleOrientation = function() {
    anim(board.toggleOrientation, this.data)();
    if (this.data.redrawCoords) this.data.redrawCoords(this.data.orientation);
  }.bind(this);

  this.setPieces = anim(board.setPieces, this.data);

  this.selectSquare = anim(board.selectSquare, this.data, true);

  this.apiMove = anim(board.apiMove, this.data);

  this.apiNewPiece = anim(board.apiNewPiece, this.data);

  this.playPremove = anim(board.playPremove, this.data);

  this.playPredrop = anim(board.playPredrop, this.data);

  this.cancelPremove = anim(board.unsetPremove, this.data, true);

  this.cancelPredrop = anim(board.unsetPredrop, this.data, true);

  this.setCheck = anim(board.setCheck, this.data, true);

  this.cancelMove = anim(function(data) {
    board.cancelMove(data);
    drag.cancel(data);
  }.bind(this), this.data, true);

  this.stop = anim(function(data) {
    board.stop(data);
    drag.cancel(data);
  }.bind(this), this.data, true);

  this.explode = function(keys) {
    if (!this.data.render) return;
    this.vm.exploding = {
      stage: 1,
      keys: keys
    };
    this.data.renderRAF();
    setTimeout(function() {
      this.vm.exploding.stage = 2;
      this.data.renderRAF();
      setTimeout(function() {
        this.vm.exploding = false;
        this.data.renderRAF();
      }.bind(this), 120);
    }.bind(this), 120);
  }.bind(this);

  this.setAutoShapes = function(shapes) {
    anim(function(data) {
      data.drawable.autoShapes = shapes;
    }, this.data, false)();
  }.bind(this);

  this.setShapes = function(shapes) {
    anim(function(data) {
      data.drawable.shapes = shapes;
    }, this.data, false)();
  }.bind(this);
};

},{"./anim":21,"./board":23,"./configure":24,"./data":27,"./drag":28,"./fen":30}],27:[function(require,module,exports){
var fen = require('./fen');
var configure = require('./configure');

module.exports = function(cfg) {
  var defaults = {
    pieces: fen.read(fen.initial),
    orientation: 'white', // board orientation. white | black
    turnColor: 'white', // turn to play. white | black
    check: null, // square currently in check "a2" | null
    lastMove: null, // squares part of the last move ["c3", "c4"] | null
    selected: null, // square currently selected "a1" | null
    coordinates: true, // include coords attributes
    render: null, // function that rerenders the board
    renderRAF: null, // function that rerenders the board using requestAnimationFrame
    element: null, // DOM element of the board, required for drag piece centering
    bounds: null, // function that calculates the board bounds
    autoCastle: false, // immediately complete the castle by moving the rook after king move
    viewOnly: false, // don't bind events: the user will never be able to move pieces around
    disableContextMenu: false, // because who needs a context menu on a chessboard
    resizable: true, // listens to chessground.resize on document.body to clear bounds cache
    pieceKey: false, // add a data-key attribute to piece elements
    highlight: {
      lastMove: true, // add last-move class to squares
      check: true, // add check class to squares
      dragOver: true // add drag-over class to square when dragging over it
    },
    animation: {
      enabled: true,
      duration: 200,
      /*{ // current
       *  start: timestamp,
       *  duration: ms,
       *  anims: {
       *    a2: [
       *      [-30, 50], // animation goal
       *      [-20, 37]  // animation current status
       *    ], ...
       *  },
       *  fading: [
       *    {
       *      pos: [80, 120], // position relative to the board
       *      opacity: 0.34,
       *      role: 'rook',
       *      color: 'black'
       *    }
       *  }
       *}*/
      current: {}
    },
    movable: {
      free: true, // all moves are valid - board editor
      color: 'both', // color that can move. white | black | both | null
      dests: {}, // valid moves. {"a2" ["a3" "a4"] "b1" ["a3" "c3"]} | null
      dropOff: 'revert', // when a piece is dropped outside the board. "revert" | "trash"
      dropped: [], // last dropped [orig, dest], not to be animated
      showDests: true, // whether to add the move-dest class on squares
      events: {
        after: function(orig, dest, metadata) {}, // called after the move has been played
        afterNewPiece: function(role, pos) {} // called after a new piece is dropped on the board
      },
      rookCastle: true // castle by moving the king to the rook
    },
    premovable: {
      enabled: true, // allow premoves for color that can not move
      showDests: true, // whether to add the premove-dest class on squares
      castle: true, // whether to allow king castle premoves
      dests: [], // premove destinations for the current selection
      current: null, // keys of the current saved premove ["e2" "e4"] | null
      events: {
        set: function(orig, dest) {}, // called after the premove has been set
        unset: function() {} // called after the premove has been unset
      }
    },
    predroppable: {
      enabled: false, // allow predrops for color that can not move
      current: {}, // current saved predrop {role: 'knight', key: 'e4'} | {}
      events: {
        set: function(role, key) {}, // called after the predrop has been set
        unset: function() {} // called after the predrop has been unset
      }
    },
    draggable: {
      enabled: true, // allow moves & premoves to use drag'n drop
      distance: 3, // minimum distance to initiate a drag, in pixels
      autoDistance: true, // lets chessground set distance to zero when user drags pieces
      centerPiece: true, // center the piece on cursor at drag start
      showGhost: true, // show ghost of piece being dragged
      /*{ // current
       *  orig: "a2", // orig key of dragging piece
       *  rel: [100, 170] // x, y of the piece at original position
       *  pos: [20, -12] // relative current position
       *  dec: [4, -8] // piece center decay
       *  over: "b3" // square being moused over
       *  bounds: current cached board bounds
       *  started: whether the drag has started, as per the distance setting
       *}*/
      current: {}
    },
    selectable: {
      // disable to enforce dragging over click-click move
      enabled: true
    },
    stats: {
      // was last piece dragged or clicked?
      // needs default to false for touch
      dragged: !('ontouchstart' in window)
    },
    events: {
      change: function() {}, // called after the situation changes on the board
      // called after a piece has been moved.
      // capturedPiece is null or like {color: 'white', 'role': 'queen'}
      move: function(orig, dest, capturedPiece) {},
      dropNewPiece: function(role, pos) {},
      capture: function(key, piece) {}, // DEPRECATED called when a piece has been captured
      select: function(key) {} // called when a square is selected
    },
    items: null, // items on the board { render: key -> vdom }
    drawable: {
      enabled: false, // allows SVG drawings
      eraseOnClick: true,
      onChange: function(shapes) {},
      // user shapes
      shapes: [
        // {brush: 'green', orig: 'e8'},
        // {brush: 'yellow', orig: 'c4', dest: 'f7'}
      ],
      // computer shapes
      autoShapes: [
        // {brush: 'paleBlue', orig: 'e8'},
        // {brush: 'paleRed', orig: 'c4', dest: 'f7'}
      ],
      /*{ // current
       *  orig: "a2", // orig key of drawing
       *  pos: [20, -12] // relative current position
       *  dest: "b3" // square being moused over
       *  bounds: // current cached board bounds
       *  brush: 'green' // brush name for shape
       *}*/
      current: {},
      brushes: {
        green: {
          key: 'g',
          color: '#15781B',
          opacity: 1,
          lineWidth: 10
        },
        red: {
          key: 'r',
          color: '#882020',
          opacity: 1,
          lineWidth: 10
        },
        blue: {
          key: 'b',
          color: '#003088',
          opacity: 1,
          lineWidth: 10
        },
        yellow: {
          key: 'y',
          color: '#e68f00',
          opacity: 1,
          lineWidth: 10
        },
        paleBlue: {
          key: 'pb',
          color: '#003088',
          opacity: 0.4,
          lineWidth: 15
        },
        paleGreen: {
          key: 'pg',
          color: '#15781B',
          opacity: 0.4,
          lineWidth: 15
        },
        paleRed: {
          key: 'pr',
          color: '#882020',
          opacity: 0.4,
          lineWidth: 15
        },
        paleGrey: {
          key: 'pgr',
          color: '#4a4a4a',
          opacity: 0.35,
          lineWidth: 15
        }
      },
      // drawable SVG pieces, used for crazyhouse drop
      pieces: {
        baseUrl: 'https://lichess1.org/assets/piece/cburnett/'
      }
    }
  };

  configure(defaults, cfg || {});

  return defaults;
};

},{"./configure":24,"./fen":30}],28:[function(require,module,exports){
var board = require('./board');
var util = require('./util');
var draw = require('./draw');

var originTarget;

function hashPiece(piece) {
  return piece ? piece.color + piece.role : '';
}

function computeSquareBounds(data, bounds, key) {
  var pos = util.key2pos(key);
  if (data.orientation !== 'white') {
    pos[0] = 9 - pos[0];
    pos[1] = 9 - pos[1];
  }
  return {
    left: bounds.left + bounds.width * (pos[0] - 1) / 8,
    top: bounds.top + bounds.height * (8 - pos[1]) / 8,
    width: bounds.width / 8,
    height: bounds.height / 8
  };
}

function start(data, e) {
  if (e.button !== undefined && e.button !== 0) return; // only touch or left click
  if (e.touches && e.touches.length > 1) return; // support one finger touch only
  e.stopPropagation();
  e.preventDefault();
  originTarget = e.target;
  var previouslySelected = data.selected;
  var position = util.eventPosition(e);
  var bounds = data.bounds();
  var orig = board.getKeyAtDomPos(data, position, bounds);
  var piece = data.pieces[orig];
  if (!previouslySelected && (
    data.drawable.eraseOnClick ||
    (!piece || piece.color !== data.turnColor)
  )) draw.clear(data);
  if (data.viewOnly) return;
  var hadPremove = !!data.premovable.current;
  var hadPredrop = !!data.predroppable.current.key;
  board.selectSquare(data, orig);
  var stillSelected = data.selected === orig;
  if (piece && stillSelected && board.isDraggable(data, orig)) {
    var squareBounds = computeSquareBounds(data, bounds, orig);
    data.draggable.current = {
      previouslySelected: previouslySelected,
      orig: orig,
      piece: hashPiece(piece),
      rel: position,
      epos: position,
      pos: [0, 0],
      dec: data.draggable.centerPiece ? [
        position[0] - (squareBounds.left + squareBounds.width / 2),
        position[1] - (squareBounds.top + squareBounds.height / 2)
      ] : [0, 0],
      bounds: bounds,
      started: data.draggable.autoDistance && data.stats.dragged
    };
  } else {
    if (hadPremove) board.unsetPremove(data);
    if (hadPredrop) board.unsetPredrop(data);
  }
  processDrag(data);
}

function processDrag(data) {
  util.requestAnimationFrame(function() {
    var cur = data.draggable.current;
    if (cur.orig) {
      // cancel animations while dragging
      if (data.animation.current.start && data.animation.current.anims[cur.orig])
        data.animation.current = {};
      // if moving piece is gone, cancel
      if (hashPiece(data.pieces[cur.orig]) !== cur.piece) cancel(data);
      else {
        if (!cur.started && util.distance(cur.epos, cur.rel) >= data.draggable.distance)
          cur.started = true;
        if (cur.started) {
          cur.pos = [
            cur.epos[0] - cur.rel[0],
            cur.epos[1] - cur.rel[1]
          ];
          cur.over = board.getKeyAtDomPos(data, cur.epos, cur.bounds);
        }
      }
    }
    data.render();
    if (cur.orig) processDrag(data);
  });
}

function move(data, e) {
  if (e.touches && e.touches.length > 1) return; // support one finger touch only
  if (data.draggable.current.orig)
    data.draggable.current.epos = util.eventPosition(e);
}

function end(data, e) {
  var cur = data.draggable.current;
  var orig = cur ? cur.orig : null;
  if (!orig) return;
  // comparing with the origin target is an easy way to test that the end event
  // has the same touch origin
  if (e.type === "touchend" && originTarget !== e.target && !cur.newPiece) {
    data.draggable.current = {};
    return;
  }
  board.unsetPremove(data);
  board.unsetPredrop(data);
  var eventPos = util.eventPosition(e)
  var dest = eventPos ? board.getKeyAtDomPos(data, eventPos, cur.bounds) : cur.over;
  if (cur.started) {
    if (cur.newPiece) board.dropNewPiece(data, orig, dest);
    else {
      if (orig !== dest) data.movable.dropped = [orig, dest];
      if (board.userMove(data, orig, dest)) data.stats.dragged = true;
    }
  }
  if (orig === cur.previouslySelected && (orig === dest || !dest))
    board.setSelected(data, null);
  else if (!data.selectable.enabled) board.setSelected(data, null);
  data.draggable.current = {};
}

function cancel(data) {
  if (data.draggable.current.orig) {
    data.draggable.current = {};
    board.selectSquare(data, null);
  }
}

module.exports = {
  start: start,
  move: move,
  end: end,
  cancel: cancel,
  processDrag: processDrag // must be exposed for board editors
};

},{"./board":23,"./draw":29,"./util":35}],29:[function(require,module,exports){
var board = require('./board');
var util = require('./util');

var brushes = ['green', 'red', 'blue', 'yellow'];

function hashPiece(piece) {
  return piece ? piece.color + ' ' + piece.role : '';
}

function start(data, e) {
  if (e.touches && e.touches.length > 1) return; // support one finger touch only
  e.stopPropagation();
  e.preventDefault();
  board.cancelMove(data);
  var position = util.eventPosition(e);
  var bounds = data.bounds();
  var orig = board.getKeyAtDomPos(data, position, bounds);
  data.drawable.current = {
    orig: orig,
    epos: position,
    bounds: bounds,
    brush: brushes[(e.shiftKey & util.isRightButton(e)) + (e.altKey ? 2 : 0)]
  };
  processDraw(data);
}

function processDraw(data) {
  util.requestAnimationFrame(function() {
    var cur = data.drawable.current;
    if (cur.orig) {
      var dest = board.getKeyAtDomPos(data, cur.epos, cur.bounds);
      if (cur.orig === dest) cur.dest = undefined;
      else cur.dest = dest;
    }
    data.render();
    if (cur.orig) processDraw(data);
  });
}

function move(data, e) {
  if (data.drawable.current.orig)
    data.drawable.current.epos = util.eventPosition(e);
}

function end(data, e) {
  var drawable = data.drawable;
  var orig = drawable.current.orig;
  var dest = drawable.current.dest;
  if (orig && dest) addLine(drawable, orig, dest);
  else if (orig) addCircle(drawable, orig);
  drawable.current = {};
  data.render();
}

function cancel(data) {
  if (data.drawable.current.orig) data.drawable.current = {};
}

function clear(data) {
  if (data.drawable.shapes.length) {
    data.drawable.shapes = [];
    data.render();
    onChange(data.drawable);
  }
}

function not(f) {
  return function(x) {
    return !f(x);
  };
}

function addCircle(drawable, key) {
  var brush = drawable.current.brush;
  var sameCircle = function(s) {
    return s.orig === key && !s.dest;
  };
  var similar = drawable.shapes.filter(sameCircle)[0];
  if (similar) drawable.shapes = drawable.shapes.filter(not(sameCircle));
  if (!similar || similar.brush !== brush) drawable.shapes.push({
    brush: brush,
    orig: key
  });
  onChange(drawable);
}

function addLine(drawable, orig, dest) {
  var brush = drawable.current.brush;
  var sameLine = function(s) {
    return s.orig && s.dest && (
      (s.orig === orig && s.dest === dest) ||
      (s.dest === orig && s.orig === dest)
    );
  };
  var exists = drawable.shapes.filter(sameLine).length > 0;
  if (exists) drawable.shapes = drawable.shapes.filter(not(sameLine));
  else drawable.shapes.push({
    brush: brush,
    orig: orig,
    dest: dest
  });
  onChange(drawable);
}

function onChange(drawable) {
  drawable.onChange(drawable.shapes);
}

module.exports = {
  start: start,
  move: move,
  end: end,
  cancel: cancel,
  clear: clear,
  processDraw: processDraw
};

},{"./board":23,"./util":35}],30:[function(require,module,exports){
var util = require('./util');

var initial = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR';

var roles = {
  p: "pawn",
  r: "rook",
  n: "knight",
  b: "bishop",
  q: "queen",
  k: "king"
};

var letters = {
  pawn: "p",
  rook: "r",
  knight: "n",
  bishop: "b",
  queen: "q",
  king: "k"
};

function read(fen) {
  if (fen === 'start') fen = initial;
  var pieces = {};
  fen.replace(/ .+$/, '').replace(/~/g, '').split('/').forEach(function(row, y) {
    var x = 0;
    row.split('').forEach(function(v) {
      var nb = parseInt(v);
      if (nb) x += nb;
      else {
        x++;
        pieces[util.pos2key([x, 8 - y])] = {
          role: roles[v.toLowerCase()],
          color: v === v.toLowerCase() ? 'black' : 'white'
        };
      }
    });
  });

  return pieces;
}

function write(pieces) {
  return [8, 7, 6, 5, 4, 3, 2].reduce(
    function(str, nb) {
      return str.replace(new RegExp(Array(nb + 1).join('1'), 'g'), nb);
    },
    util.invRanks.map(function(y) {
      return util.ranks.map(function(x) {
        var piece = pieces[util.pos2key([x, y])];
        if (piece) {
          var letter = letters[piece.role];
          return piece.color === 'white' ? letter.toUpperCase() : letter;
        } else return '1';
      }).join('');
    }).join('/'));
}

module.exports = {
  initial: initial,
  read: read,
  write: write
};

},{"./util":35}],31:[function(require,module,exports){
var startAt;

var start = function() {
  startAt = new Date();
};

var cancel = function() {
  startAt = null;
};

var stop = function() {
  if (!startAt) return 0;
  var time = new Date() - startAt;
  startAt = null;
  return time;
};

module.exports = {
  start: start,
  cancel: cancel,
  stop: stop
};

},{}],32:[function(require,module,exports){
var m = require('mithril');
var ctrl = require('./ctrl');
var view = require('./view');
var api = require('./api');

// for usage outside of mithril
function init(element, config) {

  var controller = new ctrl(config);

  m.render(element, view(controller));

  return api(controller);
}

module.exports = init;
module.exports.controller = ctrl;
module.exports.view = view;
module.exports.fen = require('./fen');
module.exports.util = require('./util');
module.exports.configure = require('./configure');
module.exports.anim = require('./anim');
module.exports.board = require('./board');
module.exports.drag = require('./drag');

},{"./anim":21,"./api":22,"./board":23,"./configure":24,"./ctrl":26,"./drag":28,"./fen":30,"./util":35,"./view":36,"mithril":20}],33:[function(require,module,exports){
var util = require('./util');

function diff(a, b) {
  return Math.abs(a - b);
}

function pawn(color, x1, y1, x2, y2) {
  return diff(x1, x2) < 2 && (
    color === 'white' ? (
      // allow 2 squares from 1 and 8, for horde
      y2 === y1 + 1 || (y1 <= 2 && y2 === (y1 + 2) && x1 === x2)
    ) : (
      y2 === y1 - 1 || (y1 >= 7 && y2 === (y1 - 2) && x1 === x2)
    )
  );
}

function knight(x1, y1, x2, y2) {
  var xd = diff(x1, x2);
  var yd = diff(y1, y2);
  return (xd === 1 && yd === 2) || (xd === 2 && yd === 1);
}

function bishop(x1, y1, x2, y2) {
  return diff(x1, x2) === diff(y1, y2);
}

function rook(x1, y1, x2, y2) {
  return x1 === x2 || y1 === y2;
}

function queen(x1, y1, x2, y2) {
  return bishop(x1, y1, x2, y2) || rook(x1, y1, x2, y2);
}

function king(color, rookFiles, canCastle, x1, y1, x2, y2) {
  return (
    diff(x1, x2) < 2 && diff(y1, y2) < 2
  ) || (
    canCastle && y1 === y2 && y1 === (color === 'white' ? 1 : 8) && (
      (x1 === 5 && (x2 === 3 || x2 === 7)) || util.containsX(rookFiles, x2)
    )
  );
}

function rookFilesOf(pieces, color) {
  return Object.keys(pieces).filter(function(key) {
    var piece = pieces[key];
    return piece && piece.color === color && piece.role === 'rook';
  }).map(function(key) {
    return util.key2pos(key)[0];
  });
}

function compute(pieces, key, canCastle) {
  var piece = pieces[key];
  var pos = util.key2pos(key);
  var mobility;
  switch (piece.role) {
    case 'pawn':
      mobility = pawn.bind(null, piece.color);
      break;
    case 'knight':
      mobility = knight;
      break;
    case 'bishop':
      mobility = bishop;
      break;
    case 'rook':
      mobility = rook;
      break;
    case 'queen':
      mobility = queen;
      break;
    case 'king':
      mobility = king.bind(null, piece.color, rookFilesOf(pieces, piece.color), canCastle);
      break;
  }
  return util.allPos.filter(function(pos2) {
    return (pos[0] !== pos2[0] || pos[1] !== pos2[1]) && mobility(pos[0], pos[1], pos2[0], pos2[1]);
  }).map(util.pos2key);
}

module.exports = compute;

},{"./util":35}],34:[function(require,module,exports){
var m = require('mithril');
var key2pos = require('./util').key2pos;
var isTrident = require('./util').isTrident;

function circleWidth(current, bounds) {
  return (current ? 3 : 4) / 512 * bounds.width;
}

function lineWidth(brush, current, bounds) {
  return (brush.lineWidth || 10) * (current ? 0.85 : 1) / 512 * bounds.width;
}

function opacity(brush, current) {
  return (brush.opacity || 1) * (current ? 0.9 : 1);
}

function arrowMargin(current, bounds) {
  return isTrident() ? 0 : ((current ? 10 : 20) / 512 * bounds.width);
}

function pos2px(pos, bounds) {
  var squareSize = bounds.width / 8;
  return [(pos[0] - 0.5) * squareSize, (8.5 - pos[1]) * squareSize];
}

function circle(brush, pos, current, bounds) {
  var o = pos2px(pos, bounds);
  var width = circleWidth(current, bounds);
  var radius = bounds.width / 16;
  return {
    tag: 'circle',
    attrs: {
      key: current ? 'current' : pos + brush.key,
      stroke: brush.color,
      'stroke-width': width,
      fill: 'none',
      opacity: opacity(brush, current),
      cx: o[0],
      cy: o[1],
      r: radius - width / 2
    }
  };
}

function arrow(brush, orig, dest, current, bounds) {
  var m = arrowMargin(current, bounds);
  var a = pos2px(orig, bounds);
  var b = pos2px(dest, bounds);
  var dx = b[0] - a[0],
    dy = b[1] - a[1],
    angle = Math.atan2(dy, dx);
  var xo = Math.cos(angle) * m,
    yo = Math.sin(angle) * m;
  return {
    tag: 'line',
    attrs: {
      key: current ? 'current' : orig + dest + brush.key,
      stroke: brush.color,
      'stroke-width': lineWidth(brush, current, bounds),
      'stroke-linecap': 'round',
      'marker-end': isTrident() ? null : 'url(#arrowhead-' + brush.key + ')',
      opacity: opacity(brush, current),
      x1: a[0],
      y1: a[1],
      x2: b[0] - xo,
      y2: b[1] - yo
    }
  };
}

function piece(cfg, pos, piece, bounds) {
  var o = pos2px(pos, bounds);
  var size = bounds.width / 8 * (piece.scale || 1);
  var name = piece.color === 'white' ? 'w' : 'b';
  name += (piece.role === 'knight' ? 'n' : piece.role[0]).toUpperCase();
  var href = cfg.baseUrl + name + '.svg';
  return {
    tag: 'image',
    attrs: {
      class: piece.color + ' ' + piece.role,
      x: o[0] - size / 2,
      y: o[1] - size / 2,
      width: size,
      height: size,
      href: href
    }
  };
}

function defs(brushes) {
  return {
    tag: 'defs',
    children: [
      brushes.map(function(brush) {
        return {
          key: brush.key,
          tag: 'marker',
          attrs: {
            id: 'arrowhead-' + brush.key,
            orient: 'auto',
            markerWidth: 4,
            markerHeight: 8,
            refX: 2.05,
            refY: 2.01
          },
          children: [{
            tag: 'path',
            attrs: {
              d: 'M0,0 V4 L3,2 Z',
              fill: brush.color
            }
          }]
        }
      })
    ]
  };
}

function orient(pos, color) {
  return color === 'white' ? pos : [9 - pos[0], 9 - pos[1]];
}

function renderShape(data, current, bounds) {
  return function(shape, i) {
    if (shape.piece) return piece(
      data.drawable.pieces,
      orient(key2pos(shape.orig), data.orientation),
      shape.piece,
      bounds);
    else if (shape.brush) {
      var brush = shape.brushModifiers ?
        makeCustomBrush(data.drawable.brushes[shape.brush], shape.brushModifiers, i) :
        data.drawable.brushes[shape.brush];
      var orig = orient(key2pos(shape.orig), data.orientation);
      if (shape.orig && shape.dest) return arrow(
        brush,
        orig,
        orient(key2pos(shape.dest), data.orientation),
        current, bounds);
      else if (shape.orig) return circle(
        brush,
        orig,
        current, bounds);
    }
  };
}

function makeCustomBrush(base, modifiers, i) {
  return {
    key: 'bm' + i,
    color: modifiers.color || base.color,
    opacity: modifiers.opacity || base.opacity,
    lineWidth: modifiers.lineWidth || base.lineWidth
  };
}

function computeUsedBrushes(d, drawn, current) {
  var brushes = [];
  var keys = [];
  var shapes = (current && current.dest) ? drawn.concat(current) : drawn;
  for (var i in shapes) {
    var shape = shapes[i];
    if (!shape.dest) continue;
    var brushKey = shape.brush;
    if (shape.brushModifiers)
      brushes.push(makeCustomBrush(d.brushes[brushKey], shape.brushModifiers, i));
    else {
      if (keys.indexOf(brushKey) === -1) {
        brushes.push(d.brushes[brushKey]);
        keys.push(brushKey);
      }
    }
  }
  return brushes;
}

module.exports = function(ctrl) {
  if (!ctrl.data.bounds) return;
  var d = ctrl.data.drawable;
  var allShapes = d.shapes.concat(d.autoShapes);
  if (!allShapes.length && !d.current.orig) return;
  var bounds = ctrl.data.bounds();
  if (bounds.width !== bounds.height) return;
  var usedBrushes = computeUsedBrushes(d, allShapes, d.current);
  return {
    tag: 'svg',
    attrs: {
      key: 'svg'
    },
    children: [
      defs(usedBrushes),
      allShapes.map(renderShape(ctrl.data, false, bounds)),
      renderShape(ctrl.data, true, bounds)(d.current, 9999)
    ]
  };
}

},{"./util":35,"mithril":20}],35:[function(require,module,exports){
var files = "abcdefgh".split('');
var ranks = [1, 2, 3, 4, 5, 6, 7, 8];
var invRanks = [8, 7, 6, 5, 4, 3, 2, 1];
var fileNumbers = {
  a: 1,
  b: 2,
  c: 3,
  d: 4,
  e: 5,
  f: 6,
  g: 7,
  h: 8
};

function pos2key(pos) {
  return files[pos[0] - 1] + pos[1];
}

function key2pos(pos) {
  return [fileNumbers[pos[0]], parseInt(pos[1])];
}

function invertKey(key) {
  return files[8 - fileNumbers[key[0]]] + (9 - parseInt(key[1]));
}

var allPos = (function() {
  var ps = [];
  invRanks.forEach(function(y) {
    ranks.forEach(function(x) {
      ps.push([x, y]);
    });
  });
  return ps;
})();
var allKeys = allPos.map(pos2key);
var invKeys = allKeys.slice(0).reverse();

function classSet(classes) {
  var arr = [];
  for (var i in classes) {
    if (classes[i]) arr.push(i);
  }
  return arr.join(' ');
}

function opposite(color) {
  return color === 'white' ? 'black' : 'white';
}

function containsX(xs, x) {
  return xs && xs.indexOf(x) !== -1;
}

function distance(pos1, pos2) {
  return Math.sqrt(Math.pow(pos1[0] - pos2[0], 2) + Math.pow(pos1[1] - pos2[1], 2));
}

// this must be cached because of the access to document.body.style
var cachedTransformProp;

function computeTransformProp() {
  return 'transform' in document.body.style ?
    'transform' : 'webkitTransform' in document.body.style ?
    'webkitTransform' : 'mozTransform' in document.body.style ?
    'mozTransform' : 'oTransform' in document.body.style ?
    'oTransform' : 'msTransform';
}

function transformProp() {
  if (!cachedTransformProp) cachedTransformProp = computeTransformProp();
  return cachedTransformProp;
}

var cachedIsTrident = null;

function isTrident() {
  if (cachedIsTrident === null)
    cachedIsTrident = window.navigator.userAgent.indexOf('Trident/') > -1;
  return cachedIsTrident;
}

function translate(pos) {
  return 'translate(' + pos[0] + 'px,' + pos[1] + 'px)';
}

function eventPosition(e) {
  if (e.clientX || e.clientX === 0) return [e.clientX, e.clientY];
  if (e.touches && e.targetTouches[0]) return [e.targetTouches[0].clientX, e.targetTouches[0].clientY];
}

function partialApply(fn, args) {
  return fn.bind.apply(fn, [null].concat(args));
}

function partial() {
  return partialApply(arguments[0], Array.prototype.slice.call(arguments, 1));
}

function isRightButton(e) {
  return e.buttons === 2 || e.button === 2;
}

function memo(f) {
  var v, ret = function() {
    if (v === undefined) v = f();
    return v;
  };
  ret.clear = function() {
    v = undefined;
  }
  return ret;
}

module.exports = {
  files: files,
  ranks: ranks,
  invRanks: invRanks,
  allPos: allPos,
  allKeys: allKeys,
  invKeys: invKeys,
  pos2key: pos2key,
  key2pos: key2pos,
  invertKey: invertKey,
  classSet: classSet,
  opposite: opposite,
  translate: translate,
  containsX: containsX,
  distance: distance,
  eventPosition: eventPosition,
  partialApply: partialApply,
  partial: partial,
  transformProp: transformProp,
  isTrident: isTrident,
  requestAnimationFrame: (window.requestAnimationFrame || window.setTimeout).bind(window),
  isRightButton: isRightButton,
  memo: memo
};

},{}],36:[function(require,module,exports){
var drag = require('./drag');
var draw = require('./draw');
var util = require('./util');
var svg = require('./svg');
var makeCoords = require('./coords');
var m = require('mithril');

var pieceTag = 'piece';
var squareTag = 'square';

function pieceClass(p) {
  return p.role + ' ' + p.color;
}

function renderPiece(d, key, ctx) {
  var attrs = {
    key: 'p' + key,
    style: {},
    class: pieceClass(d.pieces[key])
  };
  var translate = posToTranslate(util.key2pos(key), ctx);
  var draggable = d.draggable.current;
  if (draggable.orig === key && draggable.started) {
    translate[0] += draggable.pos[0] + draggable.dec[0];
    translate[1] += draggable.pos[1] + draggable.dec[1];
    attrs.class += ' dragging';
  } else if (d.animation.current.anims) {
    var animation = d.animation.current.anims[key];
    if (animation) {
      translate[0] += animation[1][0];
      translate[1] += animation[1][1];
    }
  }
  attrs.style[ctx.transformProp] = util.translate(translate);
  if (d.pieceKey) attrs['data-key'] = key;
  return {
    tag: pieceTag,
    attrs: attrs
  };
}

function renderSquare(key, classes, ctx) {
  var attrs = {
    key: 's' + key,
    class: classes,
    style: {}
  };
  attrs.style[ctx.transformProp] = util.translate(posToTranslate(util.key2pos(key), ctx));
  return {
    tag: squareTag,
    attrs: attrs
  };
}

function posToTranslate(pos, ctx) {
  return [
    (ctx.asWhite ? pos[0] - 1 : 8 - pos[0]) * ctx.bounds.width / 8, (ctx.asWhite ? 8 - pos[1] : pos[1] - 1) * ctx.bounds.height / 8
  ];
}

function renderGhost(key, piece, ctx) {
  if (!piece) return;
  var attrs = {
    key: 'g' + key,
    style: {},
    class: pieceClass(piece) + ' ghost'
  };
  attrs.style[ctx.transformProp] = util.translate(posToTranslate(util.key2pos(key), ctx));
  return {
    tag: pieceTag,
    attrs: attrs
  };
}

function renderFading(cfg, ctx) {
  var attrs = {
    key: 'f' + cfg.piece.key,
    class: 'fading ' + pieceClass(cfg.piece),
    style: {
      opacity: cfg.opacity
    }
  };
  attrs.style[ctx.transformProp] = util.translate(posToTranslate(cfg.piece.pos, ctx));
  return {
    tag: pieceTag,
    attrs: attrs
  };
}

function addSquare(squares, key, klass) {
  if (squares[key]) squares[key].push(klass);
  else squares[key] = [klass];
}

function renderSquares(ctrl, ctx) {
  var d = ctrl.data;
  var squares = {};
  if (d.lastMove && d.highlight.lastMove) d.lastMove.forEach(function(k) {
    addSquare(squares, k, 'last-move');
  });
  if (d.check && d.highlight.check) addSquare(squares, d.check, 'check');
  if (d.selected) {
    addSquare(squares, d.selected, 'selected');
    var over = d.draggable.current.over;
    var dests = d.movable.dests[d.selected];
    if (dests) dests.forEach(function(k) {
      if (k === over) addSquare(squares, k, 'move-dest drag-over');
      else if (d.movable.showDests) addSquare(squares, k, 'move-dest' + (d.pieces[k] ? ' oc' : ''));
    });
    var pDests = d.premovable.dests;
    if (pDests) pDests.forEach(function(k) {
      if (k === over) addSquare(squares, k, 'premove-dest drag-over');
      else if (d.movable.showDests) addSquare(squares, k, 'premove-dest' + (d.pieces[k] ? ' oc' : ''));
    });
  }
  var premove = d.premovable.current;
  if (premove) premove.forEach(function(k) {
    addSquare(squares, k, 'current-premove');
  });
  else if (d.predroppable.current.key)
    addSquare(squares, d.predroppable.current.key, 'current-premove');

  if (ctrl.vm.exploding) ctrl.vm.exploding.keys.forEach(function(k) {
    addSquare(squares, k, 'exploding' + ctrl.vm.exploding.stage);
  });

  var dom = [];
  if (d.items) {
    for (var i = 0; i < 64; i++) {
      var key = util.allKeys[i];
      var square = squares[key];
      var item = d.items.render(util.key2pos(key), key);
      if (square || item) {
        var sq = renderSquare(key, square ? square.join(' ') + (item ? ' has-item' : '') : 'has-item', ctx);
        if (item) sq.children = [item];
        dom.push(sq);
      }
    }
  } else {
    for (var key in squares)
      dom.push(renderSquare(key, squares[key].join(' '), ctx));
  }
  return dom;
}

function renderContent(ctrl) {
  var d = ctrl.data;
  if (!d.bounds) return;
  var ctx = {
    asWhite: d.orientation === 'white',
    bounds: d.bounds(),
    transformProp: util.transformProp()
  };
  var children = renderSquares(ctrl, ctx);
  if (d.animation.current.fadings)
    d.animation.current.fadings.forEach(function(p) {
      children.push(renderFading(p, ctx));
    });

  // must insert pieces in the right order
  // for 3D to display correctly
  var keys = ctx.asWhite ? util.allKeys : util.invKeys;
  if (d.items)
    for (var i = 0; i < 64; i++) {
      if (d.pieces[keys[i]] && !d.items.render(util.key2pos(keys[i]), keys[i]))
        children.push(renderPiece(d, keys[i], ctx));
    } else
      for (var i = 0; i < 64; i++) {
        if (d.pieces[keys[i]]) children.push(renderPiece(d, keys[i], ctx));
      }

  if (d.draggable.showGhost) {
    var dragOrig = d.draggable.current.orig;
    if (dragOrig && !d.draggable.current.newPiece)
      children.push(renderGhost(dragOrig, d.pieces[dragOrig], ctx));
  }
  if (d.drawable.enabled) children.push(svg(ctrl));
  return children;
}

function startDragOrDraw(d) {
  return function(e) {
    if (util.isRightButton(e) && d.draggable.current.orig) {
      if (d.draggable.current.newPiece) delete d.pieces[d.draggable.current.orig];
      d.draggable.current = {}
      d.selected = null;
    } else if ((e.shiftKey || util.isRightButton(e)) && d.drawable.enabled) draw.start(d, e);
    else drag.start(d, e);
  };
}

function dragOrDraw(d, withDrag, withDraw) {
  return function(e) {
    if ((e.shiftKey || util.isRightButton(e)) && d.drawable.enabled) withDraw(d, e);
    else if (!d.viewOnly) withDrag(d, e);
  };
}

function bindEvents(ctrl, el, context) {
  var d = ctrl.data;
  var onstart = startDragOrDraw(d);
  var onmove = dragOrDraw(d, drag.move, draw.move);
  var onend = dragOrDraw(d, drag.end, draw.end);
  var startEvents = ['touchstart', 'mousedown'];
  var moveEvents = ['touchmove', 'mousemove'];
  var endEvents = ['touchend', 'mouseup'];
  startEvents.forEach(function(ev) {
    el.addEventListener(ev, onstart);
  });
  moveEvents.forEach(function(ev) {
    document.addEventListener(ev, onmove);
  });
  endEvents.forEach(function(ev) {
    document.addEventListener(ev, onend);
  });
  context.onunload = function() {
    startEvents.forEach(function(ev) {
      el.removeEventListener(ev, onstart);
    });
    moveEvents.forEach(function(ev) {
      document.removeEventListener(ev, onmove);
    });
    endEvents.forEach(function(ev) {
      document.removeEventListener(ev, onend);
    });
  };
}

function renderBoard(ctrl) {
  var d = ctrl.data;
  return {
    tag: 'div',
    attrs: {
      class: 'cg-board orientation-' + d.orientation,
      config: function(el, isUpdate, context) {
        if (isUpdate) return;
        if (!d.viewOnly || d.drawable.enabled)
          bindEvents(ctrl, el, context);
        // this function only repaints the board itself.
        // it's called when dragging or animating pieces,
        // to prevent the full application embedding chessground
        // rendering on every animation frame
        d.render = function() {
          m.render(el, renderContent(ctrl));
        };
        d.renderRAF = function() {
          util.requestAnimationFrame(d.render);
        };
        d.bounds = util.memo(el.getBoundingClientRect.bind(el));
        d.element = el;
        d.render();
      }
    },
    children: []
  };
}

module.exports = function(ctrl) {
  var d = ctrl.data;
  return {
    tag: 'div',
    attrs: {
      config: function(el, isUpdate) {
        if (isUpdate) {
          if (d.redrawCoords) d.redrawCoords(d.orientation);
          return;
        }
        if (d.coordinates) d.redrawCoords = makeCoords(d.orientation, el);
        el.addEventListener('contextmenu', function(e) {
          if (d.disableContextMenu || d.drawable.enabled) {
            e.preventDefault();
            return false;
          }
        });
        if (d.resizable)
          document.body.addEventListener('chessground.resize', function(e) {
            d.bounds.clear();
            d.render();
          }, false);
        ['onscroll', 'onresize'].forEach(function(n) {
          var prev = window[n];
          window[n] = function() {
            prev && prev();
            d.bounds.clear();
          };
        });
      },
      class: [
        'cg-board-wrap',
        d.viewOnly ? 'view-only' : 'manipulable'
      ].join(' ')
    },
    children: [renderBoard(ctrl)]
  };
};

},{"./coords":25,"./drag":28,"./draw":29,"./svg":34,"./util":35,"mithril":20}],37:[function(require,module,exports){
/*!
 * @name JavaScript/NodeJS Merge v1.2.0
 * @author yeikos
 * @repository https://github.com/yeikos/js.merge

 * Copyright 2014 yeikos - MIT license
 * https://raw.github.com/yeikos/js.merge/master/LICENSE
 */

;(function(isNode) {

	/**
	 * Merge one or more objects 
	 * @param bool? clone
	 * @param mixed,... arguments
	 * @return object
	 */

	var Public = function(clone) {

		return merge(clone === true, false, arguments);

	}, publicName = 'merge';

	/**
	 * Merge two or more objects recursively 
	 * @param bool? clone
	 * @param mixed,... arguments
	 * @return object
	 */

	Public.recursive = function(clone) {

		return merge(clone === true, true, arguments);

	};

	/**
	 * Clone the input removing any reference
	 * @param mixed input
	 * @return mixed
	 */

	Public.clone = function(input) {

		var output = input,
			type = typeOf(input),
			index, size;

		if (type === 'array') {

			output = [];
			size = input.length;

			for (index=0;index<size;++index)

				output[index] = Public.clone(input[index]);

		} else if (type === 'object') {

			output = {};

			for (index in input)

				output[index] = Public.clone(input[index]);

		}

		return output;

	};

	/**
	 * Merge two objects recursively
	 * @param mixed input
	 * @param mixed extend
	 * @return mixed
	 */

	function merge_recursive(base, extend) {

		if (typeOf(base) !== 'object')

			return extend;

		for (var key in extend) {

			if (typeOf(base[key]) === 'object' && typeOf(extend[key]) === 'object') {

				base[key] = merge_recursive(base[key], extend[key]);

			} else {

				base[key] = extend[key];

			}

		}

		return base;

	}

	/**
	 * Merge two or more objects
	 * @param bool clone
	 * @param bool recursive
	 * @param array argv
	 * @return object
	 */

	function merge(clone, recursive, argv) {

		var result = argv[0],
			size = argv.length;

		if (clone || typeOf(result) !== 'object')

			result = {};

		for (var index=0;index<size;++index) {

			var item = argv[index],

				type = typeOf(item);

			if (type !== 'object') continue;

			for (var key in item) {

				var sitem = clone ? Public.clone(item[key]) : item[key];

				if (recursive) {

					result[key] = merge_recursive(result[key], sitem);

				} else {

					result[key] = sitem;

				}

			}

		}

		return result;

	}

	/**
	 * Get type of variable
	 * @param mixed input
	 * @return string
	 *
	 * @see http://jsperf.com/typeofvar
	 */

	function typeOf(input) {

		return ({}).toString.call(input).slice(8, -1).toLowerCase();

	}

	if (isNode) {

		module.exports = Public;

	} else {

		window[publicName] = Public;

	}

})(typeof module === 'object' && module && typeof module.exports === 'object' && module.exports);
},{}],38:[function(require,module,exports){
arguments[4][20][0].apply(exports,arguments)
},{"dup":20}],39:[function(require,module,exports){
var m = require('mithril');
var groundBuild = require('./ground');
var generate = require('../../generate/src/generate');
var diagram = require('../../generate/src/diagram');


module.exports = function(opts, i18n) {

  var betweenFens = false;
  var gameTotal = 40;
  var selection = m.prop(opts.mode);
  var fen = m.prop(opts.fen ? opts.fen : generate.randomFenForFeature(selection()));
  var fenForBoard = fen();
  var features = m.prop(generate.extractSingleFeature(selection(), fen()));

  var randomFeature;
  var ground;
  var score = m.prop();
  var displayscore = m.prop();
  var breaklevel = m.prop();
  var correct = m.prop([]);
  var incorrect = m.prop([]);
  var timerId;

  function showGround() {
    if (!ground) ground = groundBuild(fenForBoard, onSquareSelect);
  }


  function newGame() {
    score(0);
    displayscore(0);

    correct([]);
    incorrect([]);
    nextFen();
    if (!timerId) {
      timerId = setInterval(onTick, 25);
    }
  }

  function onTick() {

    var t = new Date().getTime() / 1000;
    var radians = t * 2 * Math.PI;
    var bpm = 30;
    var bps = bpm / 60;
    var beat = Math.sin(radians * bps);
    breaklevel(50 + beat * 50);

    m.redraw();
  }

  function onSquareSelect(target) {
    if (betweenFens) {
      return;
    }
    if (correct().includes(target) || incorrect().includes(target)) {
      target = 'none';
    }
    else {
      var found = generate.featureFound(features(), target);
      if (found > 0) {
        correct().push(target);
      }
      else {
        incorrect().push(target);
        score(score() - 1);
      }
    }
    ground.set({
      fen: fenForBoard,
    });
    var clickedDiagram = diagram.clickedSquares(features(), correct(), incorrect(), target);
    ground.setShapes(clickedDiagram);
    m.redraw();
    if (generate.allFeaturesFound(features())) {

    }
  }

  function gameOver() {
    m.redraw();
  }

  function updateFen(value) {
    diagram.clearDiagrams(features());
    fen(value);
    fenForBoard = fen();
    ground.set({
      fen: fenForBoard,
    });
    ground.setShapes([]);
    correct([]);
    incorrect([]);

    var feature = selection() === 'Mixed' ? randomFeature : selection();

    features(generate.extractSingleFeature(feature, fen()));
    if (generate.allFeaturesFound(features())) {
      return nextFen();
    }
    m.redraw();
  }

  function nextFen() {
    randomFeature = generate.randomFeature();
    var feature = selection() === 'Mixed' ? randomFeature : selection();
    updateFen(generate.randomFenForFeature(feature));
  }

  function blindfold() {
    if (fenForBoard === '8/8/8/8/8/8/8/8') {
      fenForBoard = fen();
    }
    else {
      fenForBoard = '8/8/8/8/8/8/8/8';
    }
    ground.set({
      fen: fenForBoard,
    });
    m.redraw();
  }

  showGround();
  newGame();
  m.redraw();

  return {
    fen: fen,
    ground: ground,
    features: features,
    updateFen: updateFen,
    onSquareSelect: onSquareSelect,
    nextFen: nextFen,
    score: score,
    displayscore: displayscore,
    breaklevel: breaklevel,
    selection: selection,
    newGame: newGame,
    blindfold: blindfold,
    descriptions: generate.featureMap.map(f => f.description)
  };
};

},{"../../generate/src/diagram":5,"../../generate/src/generate":13,"./ground":40,"mithril":38}],40:[function(require,module,exports){
var chessground = require('chessground');

module.exports = function(fen, onSelect) {
  return new chessground.controller({
    fen: fen,
    viewOnly: false,
    turnColor: 'white',
    animation: {
      duration: 200
    },
    highlight: {
      lastMove: false
    },
    movable: {
      free: false,
      color: 'white',
      premove: true,
      dests: [],
      showDests: false,
      events: {
        after: function() {}
      }
    },
    drawable: {
      enabled: true
    },
    events: {
      move: function(orig, dest, capturedPiece) {
        onSelect(dest);
      },
      select: function(key) {
        onSelect(key);
      }
    }
  });
};

},{"chessground":32}],41:[function(require,module,exports){
var m = require('mithril');
var ctrl = require('./ctrl');
var view = require('./view/main');
var queryparam = require('../../explorer/src/util/queryparam');

function main(opts) {
    var controller = new ctrl(opts);
    m.mount(opts.element, {
        controller: function() {
            return controller;
        },
        view: view
    });
}


var mode = queryparam.getParameterByName('mode');
if (!mode) {
    mode = "Knight forks";
}

main({
    element: document.getElementById("wrapper"),
    mode: mode
});

},{"../../explorer/src/util/queryparam":1,"./ctrl":39,"./view/main":43,"mithril":38}],42:[function(require,module,exports){
var m = require('mithril');

module.exports = function(controller) {
  return [
    m('div.breakbar', [
      m('div.rhythm', {
        style: {
          width: controller.breaklevel() + "%"
        }
      }),
      m('div.breakarea', 'break'),
    ])

  ];
};

},{"mithril":38}],43:[function(require,module,exports){
var m = require('mithril');
var chessground = require('chessground');
var score = require('./score');
var breakbar = require('./breakbar');
var generate = require('../../../generate/src/generate');

function visualBoard(ctrl) {
  return m('div.lichess_board', m('div.lichess_board_wrap', m('div.lichess_board', [
    chessground.view(ctrl.ground)
  ])));
}

function info(ctrl) {
  return [m('div.explanation', [
      m('br'),
      m('br'),
      m('p.center', {
        style: {
          textAlign: 'center'
        }
      }, 'Training mode'),
      m('br'),
      m('br'),
      generate.featureMap.map(f => {
        return m('div.button.newgame', {
          title: f.fullDescription,
          onclick: function() {
            ctrl.selection(f.description);
            ctrl.newGame();
          }
        }, f.description);
      }),
    ]),
    m('br'),
    m('br'),
    m('p.center', {
        style: {
          textAlign: 'center'
        }
      }, 'Post your high scores on ',
      m("a.hiscore.external[href='https://en.lichess.org/forum/game-analysis/forking-hell-challenge']", {
        style: {
          color: "#55a"
        }
      }, 'lichess.')),
    m('br'),
    m('br'),
    m('p.center',m('div.button.newgame', {
      onclick: function() {
        ctrl.blindfold();
      }
    }, 'Blindfold bonus'))

  ];
}

module.exports = function(ctrl) {
  return [
    m("div.#site_header",
      m('div.board_left', [
        m('h2.center',
          m('a#site_title', {
              onclick: function() {
                window.open("./index.html?fen=" + encodeURI(ctrl.fen()));
              }
            }, 'feature',
            m('span.extension', 'tron'))),
        m('br')
        
      ])
    ),
    m('div.#lichess',
      m('div.analyse.cg-512', [
        m('div',
          m('div.lichess_game', [
            visualBoard(ctrl),
            m('div.lichess_ground', info(ctrl))
          ])
        ),
        m('div.underboard', [
          m('div.center', [
            breakbar(ctrl),
            m('br'),
            score(ctrl),
            m('br'),
            m('br'),
            m('small', 'Data autogenerated from games on ', m("a.external[href='http://lichess.org']", 'lichess.org.')),
            m('small', [
              'Uses libraries ', m("a.external[href='https://github.com/ornicar/chessground']", 'chessground'),
              ' and ', m("a.external[href='https://github.com/jhlywa/chess.js']", 'chessjs.'),
              ' Source code on ', m("a.external[href='https://github.com/tailuge/chess-o-tron']", 'GitHub.')
            ])
          ])
        ])
      ])
    )
  ];
};

},{"../../../generate/src/generate":13,"./breakbar":42,"./score":44,"chessground":32,"mithril":38}],44:[function(require,module,exports){
var m = require('mithril');

function convertToPieces(i) {
  return i.toString(6)
    .replace(/0/g, "♙")
    .replace(/1/g, "♘")
    .replace(/2/g, "♗")
    .replace(/3/g, "♖")
    .replace(/4/g, "♕")
    .replace(/5/g, "♔");
}

module.exports = function(controller) {
  return [
    m('div.score' , "score: " + (controller.displayscore()))
  ];
};

},{"mithril":38}]},{},[41])(41)
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIuLi9leHBsb3Jlci9zcmMvdXRpbC9xdWVyeXBhcmFtLmpzIiwiLi4vZ2VuZXJhdGUvbm9kZV9tb2R1bGVzL2NoZXNzLmpzL2NoZXNzLmpzIiwiLi4vZ2VuZXJhdGUvc3JjL2NoZWNrcy5qcyIsIi4uL2dlbmVyYXRlL3NyYy9jaGVzc3V0aWxzLmpzIiwiLi4vZ2VuZXJhdGUvc3JjL2RpYWdyYW0uanMiLCIuLi9nZW5lcmF0ZS9zcmMvZmVucy9iaXNob3Bmb3Jrcy5qcyIsIi4uL2dlbmVyYXRlL3NyYy9mZW5zL2tuaWdodGZvcmtzLmpzIiwiLi4vZ2VuZXJhdGUvc3JjL2ZlbnMvcGF3bmZvcmtzLmpzIiwiLi4vZ2VuZXJhdGUvc3JjL2ZlbnMvcGlucy5qcyIsIi4uL2dlbmVyYXRlL3NyYy9mZW5zL3F1ZWVuZm9ya3MuanMiLCIuLi9nZW5lcmF0ZS9zcmMvZmVucy9yb29rZm9ya3MuanMiLCIuLi9nZW5lcmF0ZS9zcmMvZm9ya3MuanMiLCIuLi9nZW5lcmF0ZS9zcmMvZ2VuZXJhdGUuanMiLCIuLi9nZW5lcmF0ZS9zcmMvaGlkZGVuLmpzIiwiLi4vZ2VuZXJhdGUvc3JjL2ltbW9iaWxlLmpzIiwiLi4vZ2VuZXJhdGUvc3JjL2xvb3NlLmpzIiwiLi4vZ2VuZXJhdGUvc3JjL21hdGV0aHJlYXQuanMiLCIuLi9nZW5lcmF0ZS9zcmMvcGlucy5qcyIsIi4uL2dlbmVyYXRlL3NyYy91dGlsL3VuaXEuanMiLCJub2RlX21vZHVsZXMvY2hlc3Nncm91bmQvbm9kZV9tb2R1bGVzL21pdGhyaWwvbWl0aHJpbC5qcyIsIm5vZGVfbW9kdWxlcy9jaGVzc2dyb3VuZC9zcmMvYW5pbS5qcyIsIm5vZGVfbW9kdWxlcy9jaGVzc2dyb3VuZC9zcmMvYXBpLmpzIiwibm9kZV9tb2R1bGVzL2NoZXNzZ3JvdW5kL3NyYy9ib2FyZC5qcyIsIm5vZGVfbW9kdWxlcy9jaGVzc2dyb3VuZC9zcmMvY29uZmlndXJlLmpzIiwibm9kZV9tb2R1bGVzL2NoZXNzZ3JvdW5kL3NyYy9jb29yZHMuanMiLCJub2RlX21vZHVsZXMvY2hlc3Nncm91bmQvc3JjL2N0cmwuanMiLCJub2RlX21vZHVsZXMvY2hlc3Nncm91bmQvc3JjL2RhdGEuanMiLCJub2RlX21vZHVsZXMvY2hlc3Nncm91bmQvc3JjL2RyYWcuanMiLCJub2RlX21vZHVsZXMvY2hlc3Nncm91bmQvc3JjL2RyYXcuanMiLCJub2RlX21vZHVsZXMvY2hlc3Nncm91bmQvc3JjL2Zlbi5qcyIsIm5vZGVfbW9kdWxlcy9jaGVzc2dyb3VuZC9zcmMvaG9sZC5qcyIsIm5vZGVfbW9kdWxlcy9jaGVzc2dyb3VuZC9zcmMvbWFpbi5qcyIsIm5vZGVfbW9kdWxlcy9jaGVzc2dyb3VuZC9zcmMvcHJlbW92ZS5qcyIsIm5vZGVfbW9kdWxlcy9jaGVzc2dyb3VuZC9zcmMvc3ZnLmpzIiwibm9kZV9tb2R1bGVzL2NoZXNzZ3JvdW5kL3NyYy91dGlsLmpzIiwibm9kZV9tb2R1bGVzL2NoZXNzZ3JvdW5kL3NyYy92aWV3LmpzIiwibm9kZV9tb2R1bGVzL21lcmdlL21lcmdlLmpzIiwic3JjL2N0cmwuanMiLCJzcmMvZ3JvdW5kLmpzIiwic3JjL21haW4uanMiLCJzcmMvdmlldy9icmVha2Jhci5qcyIsInNyYy92aWV3L21haW4uanMiLCJzcmMvdmlldy9zY29yZS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFtREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkxBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEtBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeFVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2S0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hSQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeklBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5M0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyWkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeE1BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1SUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcE1BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZTQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQzlLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIi8qIGdsb2JhbCBoaXN0b3J5ICovXG5cbid1c2Ugc3RyaWN0JztcblxubW9kdWxlLmV4cG9ydHMgPSB7XG5cbiAgICBnZXRQYXJhbWV0ZXJCeU5hbWU6IGZ1bmN0aW9uKG5hbWUsIHVybCkge1xuICAgICAgICBpZiAoIXVybCkge1xuICAgICAgICAgICAgdXJsID0gd2luZG93LmxvY2F0aW9uLmhyZWY7XG4gICAgICAgIH1cbiAgICAgICAgbmFtZSA9IG5hbWUucmVwbGFjZSgvW1xcW1xcXV0vZywgXCJcXFxcJCZcIik7XG4gICAgICAgIHZhciByZWdleCA9IG5ldyBSZWdFeHAoXCJbPyZdXCIgKyBuYW1lICsgXCIoPShbXiYjXSopfCZ8I3wkKVwiKSxcbiAgICAgICAgICAgIHJlc3VsdHMgPSByZWdleC5leGVjKHVybCk7XG4gICAgICAgIGlmICghcmVzdWx0cykgcmV0dXJuIG51bGw7XG4gICAgICAgIGlmICghcmVzdWx0c1syXSkgcmV0dXJuICcnO1xuICAgICAgICByZXR1cm4gZGVjb2RlVVJJQ29tcG9uZW50KHJlc3VsdHNbMl0ucmVwbGFjZSgvXFwrL2csIFwiIFwiKSk7XG4gICAgfSxcblxuICAgIHVwZGF0ZVVybFdpdGhTdGF0ZTogZnVuY3Rpb24oZmVuLCBzaWRlLCBkZXNjcmlwdGlvbiwgdGFyZ2V0KSB7XG4gICAgICAgIGlmIChoaXN0b3J5LnB1c2hTdGF0ZSkge1xuICAgICAgICAgICAgdmFyIG5ld3VybCA9IHdpbmRvdy5sb2NhdGlvbi5wcm90b2NvbCArIFwiLy9cIiArXG4gICAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uLmhvc3QgK1xuICAgICAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbi5wYXRobmFtZSArXG4gICAgICAgICAgICAgICAgJz9mZW49JyArIGVuY29kZVVSSUNvbXBvbmVudChmZW4pICtcbiAgICAgICAgICAgICAgICAoc2lkZSA/IFwiJnNpZGU9XCIgKyBlbmNvZGVVUklDb21wb25lbnQoc2lkZSkgOiBcIlwiKSArXG4gICAgICAgICAgICAgICAgKGRlc2NyaXB0aW9uID8gXCImZGVzY3JpcHRpb249XCIgKyBlbmNvZGVVUklDb21wb25lbnQoZGVzY3JpcHRpb24pIDogXCJcIikgK1xuICAgICAgICAgICAgICAgICh0YXJnZXQgPyBcIiZ0YXJnZXQ9XCIgKyBlbmNvZGVVUklDb21wb25lbnQodGFyZ2V0KSA6IFwiXCIpO1xuICAgICAgICAgICAgd2luZG93Lmhpc3RvcnkucHVzaFN0YXRlKHtcbiAgICAgICAgICAgICAgICBwYXRoOiBuZXd1cmxcbiAgICAgICAgICAgIH0sICcnLCBuZXd1cmwpO1xuICAgICAgICB9XG4gICAgfVxufTtcbiIsIi8qXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTYsIEplZmYgSGx5d2EgKGpobHl3YUBnbWFpbC5jb20pXG4gKiBBbGwgcmlnaHRzIHJlc2VydmVkLlxuICpcbiAqIFJlZGlzdHJpYnV0aW9uIGFuZCB1c2UgaW4gc291cmNlIGFuZCBiaW5hcnkgZm9ybXMsIHdpdGggb3Igd2l0aG91dFxuICogbW9kaWZpY2F0aW9uLCBhcmUgcGVybWl0dGVkIHByb3ZpZGVkIHRoYXQgdGhlIGZvbGxvd2luZyBjb25kaXRpb25zIGFyZSBtZXQ6XG4gKlxuICogMS4gUmVkaXN0cmlidXRpb25zIG9mIHNvdXJjZSBjb2RlIG11c3QgcmV0YWluIHRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlLFxuICogICAgdGhpcyBsaXN0IG9mIGNvbmRpdGlvbnMgYW5kIHRoZSBmb2xsb3dpbmcgZGlzY2xhaW1lci5cbiAqIDIuIFJlZGlzdHJpYnV0aW9ucyBpbiBiaW5hcnkgZm9ybSBtdXN0IHJlcHJvZHVjZSB0aGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSxcbiAqICAgIHRoaXMgbGlzdCBvZiBjb25kaXRpb25zIGFuZCB0aGUgZm9sbG93aW5nIGRpc2NsYWltZXIgaW4gdGhlIGRvY3VtZW50YXRpb25cbiAqICAgIGFuZC9vciBvdGhlciBtYXRlcmlhbHMgcHJvdmlkZWQgd2l0aCB0aGUgZGlzdHJpYnV0aW9uLlxuICpcbiAqIFRISVMgU09GVFdBUkUgSVMgUFJPVklERUQgQlkgVEhFIENPUFlSSUdIVCBIT0xERVJTIEFORCBDT05UUklCVVRPUlMgXCJBUyBJU1wiXG4gKiBBTkQgQU5ZIEVYUFJFU1MgT1IgSU1QTElFRCBXQVJSQU5USUVTLCBJTkNMVURJTkcsIEJVVCBOT1QgTElNSVRFRCBUTywgVEhFXG4gKiBJTVBMSUVEIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZIEFORCBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRVxuICogQVJFIERJU0NMQUlNRUQuIElOIE5PIEVWRU5UIFNIQUxMIFRIRSBDT1BZUklHSFQgT1dORVIgT1IgQ09OVFJJQlVUT1JTIEJFXG4gKiBMSUFCTEUgRk9SIEFOWSBESVJFQ1QsIElORElSRUNULCBJTkNJREVOVEFMLCBTUEVDSUFMLCBFWEVNUExBUlksIE9SXG4gKiBDT05TRVFVRU5USUFMIERBTUFHRVMgKElOQ0xVRElORywgQlVUIE5PVCBMSU1JVEVEIFRPLCBQUk9DVVJFTUVOVCBPRlxuICogU1VCU1RJVFVURSBHT09EUyBPUiBTRVJWSUNFUzsgTE9TUyBPRiBVU0UsIERBVEEsIE9SIFBST0ZJVFM7IE9SIEJVU0lORVNTXG4gKiBJTlRFUlJVUFRJT04pIEhPV0VWRVIgQ0FVU0VEIEFORCBPTiBBTlkgVEhFT1JZIE9GIExJQUJJTElUWSwgV0hFVEhFUiBJTlxuICogQ09OVFJBQ1QsIFNUUklDVCBMSUFCSUxJVFksIE9SIFRPUlQgKElOQ0xVRElORyBORUdMSUdFTkNFIE9SIE9USEVSV0lTRSlcbiAqIEFSSVNJTkcgSU4gQU5ZIFdBWSBPVVQgT0YgVEhFIFVTRSBPRiBUSElTIFNPRlRXQVJFLCBFVkVOIElGIEFEVklTRUQgT0YgVEhFXG4gKiBQT1NTSUJJTElUWSBPRiBTVUNIIERBTUFHRS5cbiAqXG4gKi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0qL1xuXG4vKiBtaW5pZmllZCBsaWNlbnNlIGJlbG93ICAqL1xuXG4vKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IChjKSAyMDE2LCBKZWZmIEhseXdhIChqaGx5d2FAZ21haWwuY29tKVxuICogUmVsZWFzZWQgdW5kZXIgdGhlIEJTRCBsaWNlbnNlXG4gKiBodHRwczovL2dpdGh1Yi5jb20vamhseXdhL2NoZXNzLmpzL2Jsb2IvbWFzdGVyL0xJQ0VOU0VcbiAqL1xuXG52YXIgQ2hlc3MgPSBmdW5jdGlvbihmZW4pIHtcblxuICAvKiBqc2hpbnQgaW5kZW50OiBmYWxzZSAqL1xuXG4gIHZhciBCTEFDSyA9ICdiJztcbiAgdmFyIFdISVRFID0gJ3cnO1xuXG4gIHZhciBFTVBUWSA9IC0xO1xuXG4gIHZhciBQQVdOID0gJ3AnO1xuICB2YXIgS05JR0hUID0gJ24nO1xuICB2YXIgQklTSE9QID0gJ2InO1xuICB2YXIgUk9PSyA9ICdyJztcbiAgdmFyIFFVRUVOID0gJ3EnO1xuICB2YXIgS0lORyA9ICdrJztcblxuICB2YXIgU1lNQk9MUyA9ICdwbmJycWtQTkJSUUsnO1xuXG4gIHZhciBERUZBVUxUX1BPU0lUSU9OID0gJ3JuYnFrYm5yL3BwcHBwcHBwLzgvOC84LzgvUFBQUFBQUFAvUk5CUUtCTlIgdyBLUWtxIC0gMCAxJztcblxuICB2YXIgUE9TU0lCTEVfUkVTVUxUUyA9IFsnMS0wJywgJzAtMScsICcxLzItMS8yJywgJyonXTtcblxuICB2YXIgUEFXTl9PRkZTRVRTID0ge1xuICAgIGI6IFsxNiwgMzIsIDE3LCAxNV0sXG4gICAgdzogWy0xNiwgLTMyLCAtMTcsIC0xNV1cbiAgfTtcblxuICB2YXIgUElFQ0VfT0ZGU0VUUyA9IHtcbiAgICBuOiBbLTE4LCAtMzMsIC0zMSwgLTE0LCAgMTgsIDMzLCAzMSwgIDE0XSxcbiAgICBiOiBbLTE3LCAtMTUsICAxNywgIDE1XSxcbiAgICByOiBbLTE2LCAgIDEsICAxNiwgIC0xXSxcbiAgICBxOiBbLTE3LCAtMTYsIC0xNSwgICAxLCAgMTcsIDE2LCAxNSwgIC0xXSxcbiAgICBrOiBbLTE3LCAtMTYsIC0xNSwgICAxLCAgMTcsIDE2LCAxNSwgIC0xXVxuICB9O1xuXG4gIHZhciBBVFRBQ0tTID0gW1xuICAgIDIwLCAwLCAwLCAwLCAwLCAwLCAwLCAyNCwgIDAsIDAsIDAsIDAsIDAsIDAsMjAsIDAsXG4gICAgIDAsMjAsIDAsIDAsIDAsIDAsIDAsIDI0LCAgMCwgMCwgMCwgMCwgMCwyMCwgMCwgMCxcbiAgICAgMCwgMCwyMCwgMCwgMCwgMCwgMCwgMjQsICAwLCAwLCAwLCAwLDIwLCAwLCAwLCAwLFxuICAgICAwLCAwLCAwLDIwLCAwLCAwLCAwLCAyNCwgIDAsIDAsIDAsMjAsIDAsIDAsIDAsIDAsXG4gICAgIDAsIDAsIDAsIDAsMjAsIDAsIDAsIDI0LCAgMCwgMCwyMCwgMCwgMCwgMCwgMCwgMCxcbiAgICAgMCwgMCwgMCwgMCwgMCwyMCwgMiwgMjQsICAyLDIwLCAwLCAwLCAwLCAwLCAwLCAwLFxuICAgICAwLCAwLCAwLCAwLCAwLCAyLDUzLCA1NiwgNTMsIDIsIDAsIDAsIDAsIDAsIDAsIDAsXG4gICAgMjQsMjQsMjQsMjQsMjQsMjQsNTYsICAwLCA1NiwyNCwyNCwyNCwyNCwyNCwyNCwgMCxcbiAgICAgMCwgMCwgMCwgMCwgMCwgMiw1MywgNTYsIDUzLCAyLCAwLCAwLCAwLCAwLCAwLCAwLFxuICAgICAwLCAwLCAwLCAwLCAwLDIwLCAyLCAyNCwgIDIsMjAsIDAsIDAsIDAsIDAsIDAsIDAsXG4gICAgIDAsIDAsIDAsIDAsMjAsIDAsIDAsIDI0LCAgMCwgMCwyMCwgMCwgMCwgMCwgMCwgMCxcbiAgICAgMCwgMCwgMCwyMCwgMCwgMCwgMCwgMjQsICAwLCAwLCAwLDIwLCAwLCAwLCAwLCAwLFxuICAgICAwLCAwLDIwLCAwLCAwLCAwLCAwLCAyNCwgIDAsIDAsIDAsIDAsMjAsIDAsIDAsIDAsXG4gICAgIDAsMjAsIDAsIDAsIDAsIDAsIDAsIDI0LCAgMCwgMCwgMCwgMCwgMCwyMCwgMCwgMCxcbiAgICAyMCwgMCwgMCwgMCwgMCwgMCwgMCwgMjQsICAwLCAwLCAwLCAwLCAwLCAwLDIwXG4gIF07XG5cbiAgdmFyIFJBWVMgPSBbXG4gICAgIDE3LCAgMCwgIDAsICAwLCAgMCwgIDAsICAwLCAxNiwgIDAsICAwLCAgMCwgIDAsICAwLCAgMCwgMTUsIDAsXG4gICAgICAwLCAxNywgIDAsICAwLCAgMCwgIDAsICAwLCAxNiwgIDAsICAwLCAgMCwgIDAsICAwLCAxNSwgIDAsIDAsXG4gICAgICAwLCAgMCwgMTcsICAwLCAgMCwgIDAsICAwLCAxNiwgIDAsICAwLCAgMCwgIDAsIDE1LCAgMCwgIDAsIDAsXG4gICAgICAwLCAgMCwgIDAsIDE3LCAgMCwgIDAsICAwLCAxNiwgIDAsICAwLCAgMCwgMTUsICAwLCAgMCwgIDAsIDAsXG4gICAgICAwLCAgMCwgIDAsICAwLCAxNywgIDAsICAwLCAxNiwgIDAsICAwLCAxNSwgIDAsICAwLCAgMCwgIDAsIDAsXG4gICAgICAwLCAgMCwgIDAsICAwLCAgMCwgMTcsICAwLCAxNiwgIDAsIDE1LCAgMCwgIDAsICAwLCAgMCwgIDAsIDAsXG4gICAgICAwLCAgMCwgIDAsICAwLCAgMCwgIDAsIDE3LCAxNiwgMTUsICAwLCAgMCwgIDAsICAwLCAgMCwgIDAsIDAsXG4gICAgICAxLCAgMSwgIDEsICAxLCAgMSwgIDEsICAxLCAgMCwgLTEsIC0xLCAgLTEsLTEsIC0xLCAtMSwgLTEsIDAsXG4gICAgICAwLCAgMCwgIDAsICAwLCAgMCwgIDAsLTE1LC0xNiwtMTcsICAwLCAgMCwgIDAsICAwLCAgMCwgIDAsIDAsXG4gICAgICAwLCAgMCwgIDAsICAwLCAgMCwtMTUsICAwLC0xNiwgIDAsLTE3LCAgMCwgIDAsICAwLCAgMCwgIDAsIDAsXG4gICAgICAwLCAgMCwgIDAsICAwLC0xNSwgIDAsICAwLC0xNiwgIDAsICAwLC0xNywgIDAsICAwLCAgMCwgIDAsIDAsXG4gICAgICAwLCAgMCwgIDAsLTE1LCAgMCwgIDAsICAwLC0xNiwgIDAsICAwLCAgMCwtMTcsICAwLCAgMCwgIDAsIDAsXG4gICAgICAwLCAgMCwtMTUsICAwLCAgMCwgIDAsICAwLC0xNiwgIDAsICAwLCAgMCwgIDAsLTE3LCAgMCwgIDAsIDAsXG4gICAgICAwLC0xNSwgIDAsICAwLCAgMCwgIDAsICAwLC0xNiwgIDAsICAwLCAgMCwgIDAsICAwLC0xNywgIDAsIDAsXG4gICAgLTE1LCAgMCwgIDAsICAwLCAgMCwgIDAsICAwLC0xNiwgIDAsICAwLCAgMCwgIDAsICAwLCAgMCwtMTdcbiAgXTtcblxuICB2YXIgU0hJRlRTID0geyBwOiAwLCBuOiAxLCBiOiAyLCByOiAzLCBxOiA0LCBrOiA1IH07XG5cbiAgdmFyIEZMQUdTID0ge1xuICAgIE5PUk1BTDogJ24nLFxuICAgIENBUFRVUkU6ICdjJyxcbiAgICBCSUdfUEFXTjogJ2InLFxuICAgIEVQX0NBUFRVUkU6ICdlJyxcbiAgICBQUk9NT1RJT046ICdwJyxcbiAgICBLU0lERV9DQVNUTEU6ICdrJyxcbiAgICBRU0lERV9DQVNUTEU6ICdxJ1xuICB9O1xuXG4gIHZhciBCSVRTID0ge1xuICAgIE5PUk1BTDogMSxcbiAgICBDQVBUVVJFOiAyLFxuICAgIEJJR19QQVdOOiA0LFxuICAgIEVQX0NBUFRVUkU6IDgsXG4gICAgUFJPTU9USU9OOiAxNixcbiAgICBLU0lERV9DQVNUTEU6IDMyLFxuICAgIFFTSURFX0NBU1RMRTogNjRcbiAgfTtcblxuICB2YXIgUkFOS18xID0gNztcbiAgdmFyIFJBTktfMiA9IDY7XG4gIHZhciBSQU5LXzMgPSA1O1xuICB2YXIgUkFOS180ID0gNDtcbiAgdmFyIFJBTktfNSA9IDM7XG4gIHZhciBSQU5LXzYgPSAyO1xuICB2YXIgUkFOS183ID0gMTtcbiAgdmFyIFJBTktfOCA9IDA7XG5cbiAgdmFyIFNRVUFSRVMgPSB7XG4gICAgYTg6ICAgMCwgYjg6ICAgMSwgYzg6ICAgMiwgZDg6ICAgMywgZTg6ICAgNCwgZjg6ICAgNSwgZzg6ICAgNiwgaDg6ICAgNyxcbiAgICBhNzogIDE2LCBiNzogIDE3LCBjNzogIDE4LCBkNzogIDE5LCBlNzogIDIwLCBmNzogIDIxLCBnNzogIDIyLCBoNzogIDIzLFxuICAgIGE2OiAgMzIsIGI2OiAgMzMsIGM2OiAgMzQsIGQ2OiAgMzUsIGU2OiAgMzYsIGY2OiAgMzcsIGc2OiAgMzgsIGg2OiAgMzksXG4gICAgYTU6ICA0OCwgYjU6ICA0OSwgYzU6ICA1MCwgZDU6ICA1MSwgZTU6ICA1MiwgZjU6ICA1MywgZzU6ICA1NCwgaDU6ICA1NSxcbiAgICBhNDogIDY0LCBiNDogIDY1LCBjNDogIDY2LCBkNDogIDY3LCBlNDogIDY4LCBmNDogIDY5LCBnNDogIDcwLCBoNDogIDcxLFxuICAgIGEzOiAgODAsIGIzOiAgODEsIGMzOiAgODIsIGQzOiAgODMsIGUzOiAgODQsIGYzOiAgODUsIGczOiAgODYsIGgzOiAgODcsXG4gICAgYTI6ICA5NiwgYjI6ICA5NywgYzI6ICA5OCwgZDI6ICA5OSwgZTI6IDEwMCwgZjI6IDEwMSwgZzI6IDEwMiwgaDI6IDEwMyxcbiAgICBhMTogMTEyLCBiMTogMTEzLCBjMTogMTE0LCBkMTogMTE1LCBlMTogMTE2LCBmMTogMTE3LCBnMTogMTE4LCBoMTogMTE5XG4gIH07XG5cbiAgdmFyIFJPT0tTID0ge1xuICAgIHc6IFt7c3F1YXJlOiBTUVVBUkVTLmExLCBmbGFnOiBCSVRTLlFTSURFX0NBU1RMRX0sXG4gICAgICAgIHtzcXVhcmU6IFNRVUFSRVMuaDEsIGZsYWc6IEJJVFMuS1NJREVfQ0FTVExFfV0sXG4gICAgYjogW3tzcXVhcmU6IFNRVUFSRVMuYTgsIGZsYWc6IEJJVFMuUVNJREVfQ0FTVExFfSxcbiAgICAgICAge3NxdWFyZTogU1FVQVJFUy5oOCwgZmxhZzogQklUUy5LU0lERV9DQVNUTEV9XVxuICB9O1xuXG4gIHZhciBib2FyZCA9IG5ldyBBcnJheSgxMjgpO1xuICB2YXIga2luZ3MgPSB7dzogRU1QVFksIGI6IEVNUFRZfTtcbiAgdmFyIHR1cm4gPSBXSElURTtcbiAgdmFyIGNhc3RsaW5nID0ge3c6IDAsIGI6IDB9O1xuICB2YXIgZXBfc3F1YXJlID0gRU1QVFk7XG4gIHZhciBoYWxmX21vdmVzID0gMDtcbiAgdmFyIG1vdmVfbnVtYmVyID0gMTtcbiAgdmFyIGhpc3RvcnkgPSBbXTtcbiAgdmFyIGhlYWRlciA9IHt9O1xuXG4gIC8qIGlmIHRoZSB1c2VyIHBhc3NlcyBpbiBhIGZlbiBzdHJpbmcsIGxvYWQgaXQsIGVsc2UgZGVmYXVsdCB0b1xuICAgKiBzdGFydGluZyBwb3NpdGlvblxuICAgKi9cbiAgaWYgKHR5cGVvZiBmZW4gPT09ICd1bmRlZmluZWQnKSB7XG4gICAgbG9hZChERUZBVUxUX1BPU0lUSU9OKTtcbiAgfSBlbHNlIHtcbiAgICBsb2FkKGZlbik7XG4gIH1cblxuICBmdW5jdGlvbiBjbGVhcigpIHtcbiAgICBib2FyZCA9IG5ldyBBcnJheSgxMjgpO1xuICAgIGtpbmdzID0ge3c6IEVNUFRZLCBiOiBFTVBUWX07XG4gICAgdHVybiA9IFdISVRFO1xuICAgIGNhc3RsaW5nID0ge3c6IDAsIGI6IDB9O1xuICAgIGVwX3NxdWFyZSA9IEVNUFRZO1xuICAgIGhhbGZfbW92ZXMgPSAwO1xuICAgIG1vdmVfbnVtYmVyID0gMTtcbiAgICBoaXN0b3J5ID0gW107XG4gICAgaGVhZGVyID0ge307XG4gICAgdXBkYXRlX3NldHVwKGdlbmVyYXRlX2ZlbigpKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHJlc2V0KCkge1xuICAgIGxvYWQoREVGQVVMVF9QT1NJVElPTik7XG4gIH1cblxuICBmdW5jdGlvbiBsb2FkKGZlbikge1xuICAgIHZhciB0b2tlbnMgPSBmZW4uc3BsaXQoL1xccysvKTtcbiAgICB2YXIgcG9zaXRpb24gPSB0b2tlbnNbMF07XG4gICAgdmFyIHNxdWFyZSA9IDA7XG5cbiAgICBpZiAoIXZhbGlkYXRlX2ZlbihmZW4pLnZhbGlkKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgY2xlYXIoKTtcblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcG9zaXRpb24ubGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhciBwaWVjZSA9IHBvc2l0aW9uLmNoYXJBdChpKTtcblxuICAgICAgaWYgKHBpZWNlID09PSAnLycpIHtcbiAgICAgICAgc3F1YXJlICs9IDg7XG4gICAgICB9IGVsc2UgaWYgKGlzX2RpZ2l0KHBpZWNlKSkge1xuICAgICAgICBzcXVhcmUgKz0gcGFyc2VJbnQocGllY2UsIDEwKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciBjb2xvciA9IChwaWVjZSA8ICdhJykgPyBXSElURSA6IEJMQUNLO1xuICAgICAgICBwdXQoe3R5cGU6IHBpZWNlLnRvTG93ZXJDYXNlKCksIGNvbG9yOiBjb2xvcn0sIGFsZ2VicmFpYyhzcXVhcmUpKTtcbiAgICAgICAgc3F1YXJlKys7XG4gICAgICB9XG4gICAgfVxuXG4gICAgdHVybiA9IHRva2Vuc1sxXTtcblxuICAgIGlmICh0b2tlbnNbMl0uaW5kZXhPZignSycpID4gLTEpIHtcbiAgICAgIGNhc3RsaW5nLncgfD0gQklUUy5LU0lERV9DQVNUTEU7XG4gICAgfVxuICAgIGlmICh0b2tlbnNbMl0uaW5kZXhPZignUScpID4gLTEpIHtcbiAgICAgIGNhc3RsaW5nLncgfD0gQklUUy5RU0lERV9DQVNUTEU7XG4gICAgfVxuICAgIGlmICh0b2tlbnNbMl0uaW5kZXhPZignaycpID4gLTEpIHtcbiAgICAgIGNhc3RsaW5nLmIgfD0gQklUUy5LU0lERV9DQVNUTEU7XG4gICAgfVxuICAgIGlmICh0b2tlbnNbMl0uaW5kZXhPZigncScpID4gLTEpIHtcbiAgICAgIGNhc3RsaW5nLmIgfD0gQklUUy5RU0lERV9DQVNUTEU7XG4gICAgfVxuXG4gICAgZXBfc3F1YXJlID0gKHRva2Vuc1szXSA9PT0gJy0nKSA/IEVNUFRZIDogU1FVQVJFU1t0b2tlbnNbM11dO1xuICAgIGhhbGZfbW92ZXMgPSBwYXJzZUludCh0b2tlbnNbNF0sIDEwKTtcbiAgICBtb3ZlX251bWJlciA9IHBhcnNlSW50KHRva2Vuc1s1XSwgMTApO1xuXG4gICAgdXBkYXRlX3NldHVwKGdlbmVyYXRlX2ZlbigpKTtcblxuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgLyogVE9ETzogdGhpcyBmdW5jdGlvbiBpcyBwcmV0dHkgbXVjaCBjcmFwIC0gaXQgdmFsaWRhdGVzIHN0cnVjdHVyZSBidXRcbiAgICogY29tcGxldGVseSBpZ25vcmVzIGNvbnRlbnQgKGUuZy4gZG9lc24ndCB2ZXJpZnkgdGhhdCBlYWNoIHNpZGUgaGFzIGEga2luZylcbiAgICogLi4uIHdlIHNob3VsZCByZXdyaXRlIHRoaXMsIGFuZCBkaXRjaCB0aGUgc2lsbHkgZXJyb3JfbnVtYmVyIGZpZWxkIHdoaWxlXG4gICAqIHdlJ3JlIGF0IGl0XG4gICAqL1xuICBmdW5jdGlvbiB2YWxpZGF0ZV9mZW4oZmVuKSB7XG4gICAgdmFyIGVycm9ycyA9IHtcbiAgICAgICAwOiAnTm8gZXJyb3JzLicsXG4gICAgICAgMTogJ0ZFTiBzdHJpbmcgbXVzdCBjb250YWluIHNpeCBzcGFjZS1kZWxpbWl0ZWQgZmllbGRzLicsXG4gICAgICAgMjogJzZ0aCBmaWVsZCAobW92ZSBudW1iZXIpIG11c3QgYmUgYSBwb3NpdGl2ZSBpbnRlZ2VyLicsXG4gICAgICAgMzogJzV0aCBmaWVsZCAoaGFsZiBtb3ZlIGNvdW50ZXIpIG11c3QgYmUgYSBub24tbmVnYXRpdmUgaW50ZWdlci4nLFxuICAgICAgIDQ6ICc0dGggZmllbGQgKGVuLXBhc3NhbnQgc3F1YXJlKSBpcyBpbnZhbGlkLicsXG4gICAgICAgNTogJzNyZCBmaWVsZCAoY2FzdGxpbmcgYXZhaWxhYmlsaXR5KSBpcyBpbnZhbGlkLicsXG4gICAgICAgNjogJzJuZCBmaWVsZCAoc2lkZSB0byBtb3ZlKSBpcyBpbnZhbGlkLicsXG4gICAgICAgNzogJzFzdCBmaWVsZCAocGllY2UgcG9zaXRpb25zKSBkb2VzIG5vdCBjb250YWluIDggXFwnL1xcJy1kZWxpbWl0ZWQgcm93cy4nLFxuICAgICAgIDg6ICcxc3QgZmllbGQgKHBpZWNlIHBvc2l0aW9ucykgaXMgaW52YWxpZCBbY29uc2VjdXRpdmUgbnVtYmVyc10uJyxcbiAgICAgICA5OiAnMXN0IGZpZWxkIChwaWVjZSBwb3NpdGlvbnMpIGlzIGludmFsaWQgW2ludmFsaWQgcGllY2VdLicsXG4gICAgICAxMDogJzFzdCBmaWVsZCAocGllY2UgcG9zaXRpb25zKSBpcyBpbnZhbGlkIFtyb3cgdG9vIGxhcmdlXS4nLFxuICAgICAgMTE6ICdJbGxlZ2FsIGVuLXBhc3NhbnQgc3F1YXJlJyxcbiAgICB9O1xuXG4gICAgLyogMXN0IGNyaXRlcmlvbjogNiBzcGFjZS1zZXBlcmF0ZWQgZmllbGRzPyAqL1xuICAgIHZhciB0b2tlbnMgPSBmZW4uc3BsaXQoL1xccysvKTtcbiAgICBpZiAodG9rZW5zLmxlbmd0aCAhPT0gNikge1xuICAgICAgcmV0dXJuIHt2YWxpZDogZmFsc2UsIGVycm9yX251bWJlcjogMSwgZXJyb3I6IGVycm9yc1sxXX07XG4gICAgfVxuXG4gICAgLyogMm5kIGNyaXRlcmlvbjogbW92ZSBudW1iZXIgZmllbGQgaXMgYSBpbnRlZ2VyIHZhbHVlID4gMD8gKi9cbiAgICBpZiAoaXNOYU4odG9rZW5zWzVdKSB8fCAocGFyc2VJbnQodG9rZW5zWzVdLCAxMCkgPD0gMCkpIHtcbiAgICAgIHJldHVybiB7dmFsaWQ6IGZhbHNlLCBlcnJvcl9udW1iZXI6IDIsIGVycm9yOiBlcnJvcnNbMl19O1xuICAgIH1cblxuICAgIC8qIDNyZCBjcml0ZXJpb246IGhhbGYgbW92ZSBjb3VudGVyIGlzIGFuIGludGVnZXIgPj0gMD8gKi9cbiAgICBpZiAoaXNOYU4odG9rZW5zWzRdKSB8fCAocGFyc2VJbnQodG9rZW5zWzRdLCAxMCkgPCAwKSkge1xuICAgICAgcmV0dXJuIHt2YWxpZDogZmFsc2UsIGVycm9yX251bWJlcjogMywgZXJyb3I6IGVycm9yc1szXX07XG4gICAgfVxuXG4gICAgLyogNHRoIGNyaXRlcmlvbjogNHRoIGZpZWxkIGlzIGEgdmFsaWQgZS5wLi1zdHJpbmc/ICovXG4gICAgaWYgKCEvXigtfFthYmNkZWZnaF1bMzZdKSQvLnRlc3QodG9rZW5zWzNdKSkge1xuICAgICAgcmV0dXJuIHt2YWxpZDogZmFsc2UsIGVycm9yX251bWJlcjogNCwgZXJyb3I6IGVycm9yc1s0XX07XG4gICAgfVxuXG4gICAgLyogNXRoIGNyaXRlcmlvbjogM3RoIGZpZWxkIGlzIGEgdmFsaWQgY2FzdGxlLXN0cmluZz8gKi9cbiAgICBpZiggIS9eKEtRP2s/cT98UWs/cT98a3E/fHF8LSkkLy50ZXN0KHRva2Vuc1syXSkpIHtcbiAgICAgIHJldHVybiB7dmFsaWQ6IGZhbHNlLCBlcnJvcl9udW1iZXI6IDUsIGVycm9yOiBlcnJvcnNbNV19O1xuICAgIH1cblxuICAgIC8qIDZ0aCBjcml0ZXJpb246IDJuZCBmaWVsZCBpcyBcIndcIiAod2hpdGUpIG9yIFwiYlwiIChibGFjayk/ICovXG4gICAgaWYgKCEvXih3fGIpJC8udGVzdCh0b2tlbnNbMV0pKSB7XG4gICAgICByZXR1cm4ge3ZhbGlkOiBmYWxzZSwgZXJyb3JfbnVtYmVyOiA2LCBlcnJvcjogZXJyb3JzWzZdfTtcbiAgICB9XG5cbiAgICAvKiA3dGggY3JpdGVyaW9uOiAxc3QgZmllbGQgY29udGFpbnMgOCByb3dzPyAqL1xuICAgIHZhciByb3dzID0gdG9rZW5zWzBdLnNwbGl0KCcvJyk7XG4gICAgaWYgKHJvd3MubGVuZ3RoICE9PSA4KSB7XG4gICAgICByZXR1cm4ge3ZhbGlkOiBmYWxzZSwgZXJyb3JfbnVtYmVyOiA3LCBlcnJvcjogZXJyb3JzWzddfTtcbiAgICB9XG5cbiAgICAvKiA4dGggY3JpdGVyaW9uOiBldmVyeSByb3cgaXMgdmFsaWQ/ICovXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCByb3dzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAvKiBjaGVjayBmb3IgcmlnaHQgc3VtIG9mIGZpZWxkcyBBTkQgbm90IHR3byBudW1iZXJzIGluIHN1Y2Nlc3Npb24gKi9cbiAgICAgIHZhciBzdW1fZmllbGRzID0gMDtcbiAgICAgIHZhciBwcmV2aW91c193YXNfbnVtYmVyID0gZmFsc2U7XG5cbiAgICAgIGZvciAodmFyIGsgPSAwOyBrIDwgcm93c1tpXS5sZW5ndGg7IGsrKykge1xuICAgICAgICBpZiAoIWlzTmFOKHJvd3NbaV1ba10pKSB7XG4gICAgICAgICAgaWYgKHByZXZpb3VzX3dhc19udW1iZXIpIHtcbiAgICAgICAgICAgIHJldHVybiB7dmFsaWQ6IGZhbHNlLCBlcnJvcl9udW1iZXI6IDgsIGVycm9yOiBlcnJvcnNbOF19O1xuICAgICAgICAgIH1cbiAgICAgICAgICBzdW1fZmllbGRzICs9IHBhcnNlSW50KHJvd3NbaV1ba10sIDEwKTtcbiAgICAgICAgICBwcmV2aW91c193YXNfbnVtYmVyID0gdHJ1ZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBpZiAoIS9eW3BybmJxa1BSTkJRS10kLy50ZXN0KHJvd3NbaV1ba10pKSB7XG4gICAgICAgICAgICByZXR1cm4ge3ZhbGlkOiBmYWxzZSwgZXJyb3JfbnVtYmVyOiA5LCBlcnJvcjogZXJyb3JzWzldfTtcbiAgICAgICAgICB9XG4gICAgICAgICAgc3VtX2ZpZWxkcyArPSAxO1xuICAgICAgICAgIHByZXZpb3VzX3dhc19udW1iZXIgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKHN1bV9maWVsZHMgIT09IDgpIHtcbiAgICAgICAgcmV0dXJuIHt2YWxpZDogZmFsc2UsIGVycm9yX251bWJlcjogMTAsIGVycm9yOiBlcnJvcnNbMTBdfTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoKHRva2Vuc1szXVsxXSA9PSAnMycgJiYgdG9rZW5zWzFdID09ICd3JykgfHxcbiAgICAgICAgKHRva2Vuc1szXVsxXSA9PSAnNicgJiYgdG9rZW5zWzFdID09ICdiJykpIHtcbiAgICAgICAgICByZXR1cm4ge3ZhbGlkOiBmYWxzZSwgZXJyb3JfbnVtYmVyOiAxMSwgZXJyb3I6IGVycm9yc1sxMV19O1xuICAgIH1cblxuICAgIC8qIGV2ZXJ5dGhpbmcncyBva2F5ISAqL1xuICAgIHJldHVybiB7dmFsaWQ6IHRydWUsIGVycm9yX251bWJlcjogMCwgZXJyb3I6IGVycm9yc1swXX07XG4gIH1cblxuICBmdW5jdGlvbiBnZW5lcmF0ZV9mZW4oKSB7XG4gICAgdmFyIGVtcHR5ID0gMDtcbiAgICB2YXIgZmVuID0gJyc7XG5cbiAgICBmb3IgKHZhciBpID0gU1FVQVJFUy5hODsgaSA8PSBTUVVBUkVTLmgxOyBpKyspIHtcbiAgICAgIGlmIChib2FyZFtpXSA9PSBudWxsKSB7XG4gICAgICAgIGVtcHR5Kys7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpZiAoZW1wdHkgPiAwKSB7XG4gICAgICAgICAgZmVuICs9IGVtcHR5O1xuICAgICAgICAgIGVtcHR5ID0gMDtcbiAgICAgICAgfVxuICAgICAgICB2YXIgY29sb3IgPSBib2FyZFtpXS5jb2xvcjtcbiAgICAgICAgdmFyIHBpZWNlID0gYm9hcmRbaV0udHlwZTtcblxuICAgICAgICBmZW4gKz0gKGNvbG9yID09PSBXSElURSkgP1xuICAgICAgICAgICAgICAgICBwaWVjZS50b1VwcGVyQ2FzZSgpIDogcGllY2UudG9Mb3dlckNhc2UoKTtcbiAgICAgIH1cblxuICAgICAgaWYgKChpICsgMSkgJiAweDg4KSB7XG4gICAgICAgIGlmIChlbXB0eSA+IDApIHtcbiAgICAgICAgICBmZW4gKz0gZW1wdHk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoaSAhPT0gU1FVQVJFUy5oMSkge1xuICAgICAgICAgIGZlbiArPSAnLyc7XG4gICAgICAgIH1cblxuICAgICAgICBlbXB0eSA9IDA7XG4gICAgICAgIGkgKz0gODtcbiAgICAgIH1cbiAgICB9XG5cbiAgICB2YXIgY2ZsYWdzID0gJyc7XG4gICAgaWYgKGNhc3RsaW5nW1dISVRFXSAmIEJJVFMuS1NJREVfQ0FTVExFKSB7IGNmbGFncyArPSAnSyc7IH1cbiAgICBpZiAoY2FzdGxpbmdbV0hJVEVdICYgQklUUy5RU0lERV9DQVNUTEUpIHsgY2ZsYWdzICs9ICdRJzsgfVxuICAgIGlmIChjYXN0bGluZ1tCTEFDS10gJiBCSVRTLktTSURFX0NBU1RMRSkgeyBjZmxhZ3MgKz0gJ2snOyB9XG4gICAgaWYgKGNhc3RsaW5nW0JMQUNLXSAmIEJJVFMuUVNJREVfQ0FTVExFKSB7IGNmbGFncyArPSAncSc7IH1cblxuICAgIC8qIGRvIHdlIGhhdmUgYW4gZW1wdHkgY2FzdGxpbmcgZmxhZz8gKi9cbiAgICBjZmxhZ3MgPSBjZmxhZ3MgfHwgJy0nO1xuICAgIHZhciBlcGZsYWdzID0gKGVwX3NxdWFyZSA9PT0gRU1QVFkpID8gJy0nIDogYWxnZWJyYWljKGVwX3NxdWFyZSk7XG5cbiAgICByZXR1cm4gW2ZlbiwgdHVybiwgY2ZsYWdzLCBlcGZsYWdzLCBoYWxmX21vdmVzLCBtb3ZlX251bWJlcl0uam9pbignICcpO1xuICB9XG5cbiAgZnVuY3Rpb24gc2V0X2hlYWRlcihhcmdzKSB7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcmdzLmxlbmd0aDsgaSArPSAyKSB7XG4gICAgICBpZiAodHlwZW9mIGFyZ3NbaV0gPT09ICdzdHJpbmcnICYmXG4gICAgICAgICAgdHlwZW9mIGFyZ3NbaSArIDFdID09PSAnc3RyaW5nJykge1xuICAgICAgICBoZWFkZXJbYXJnc1tpXV0gPSBhcmdzW2kgKyAxXTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGhlYWRlcjtcbiAgfVxuXG4gIC8qIGNhbGxlZCB3aGVuIHRoZSBpbml0aWFsIGJvYXJkIHNldHVwIGlzIGNoYW5nZWQgd2l0aCBwdXQoKSBvciByZW1vdmUoKS5cbiAgICogbW9kaWZpZXMgdGhlIFNldFVwIGFuZCBGRU4gcHJvcGVydGllcyBvZiB0aGUgaGVhZGVyIG9iamVjdC4gIGlmIHRoZSBGRU4gaXNcbiAgICogZXF1YWwgdG8gdGhlIGRlZmF1bHQgcG9zaXRpb24sIHRoZSBTZXRVcCBhbmQgRkVOIGFyZSBkZWxldGVkXG4gICAqIHRoZSBzZXR1cCBpcyBvbmx5IHVwZGF0ZWQgaWYgaGlzdG9yeS5sZW5ndGggaXMgemVybywgaWUgbW92ZXMgaGF2ZW4ndCBiZWVuXG4gICAqIG1hZGUuXG4gICAqL1xuICBmdW5jdGlvbiB1cGRhdGVfc2V0dXAoZmVuKSB7XG4gICAgaWYgKGhpc3RvcnkubGVuZ3RoID4gMCkgcmV0dXJuO1xuXG4gICAgaWYgKGZlbiAhPT0gREVGQVVMVF9QT1NJVElPTikge1xuICAgICAgaGVhZGVyWydTZXRVcCddID0gJzEnO1xuICAgICAgaGVhZGVyWydGRU4nXSA9IGZlbjtcbiAgICB9IGVsc2Uge1xuICAgICAgZGVsZXRlIGhlYWRlclsnU2V0VXAnXTtcbiAgICAgIGRlbGV0ZSBoZWFkZXJbJ0ZFTiddO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGdldChzcXVhcmUpIHtcbiAgICB2YXIgcGllY2UgPSBib2FyZFtTUVVBUkVTW3NxdWFyZV1dO1xuICAgIHJldHVybiAocGllY2UpID8ge3R5cGU6IHBpZWNlLnR5cGUsIGNvbG9yOiBwaWVjZS5jb2xvcn0gOiBudWxsO1xuICB9XG5cbiAgZnVuY3Rpb24gcHV0KHBpZWNlLCBzcXVhcmUpIHtcbiAgICAvKiBjaGVjayBmb3IgdmFsaWQgcGllY2Ugb2JqZWN0ICovXG4gICAgaWYgKCEoJ3R5cGUnIGluIHBpZWNlICYmICdjb2xvcicgaW4gcGllY2UpKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgLyogY2hlY2sgZm9yIHBpZWNlICovXG4gICAgaWYgKFNZTUJPTFMuaW5kZXhPZihwaWVjZS50eXBlLnRvTG93ZXJDYXNlKCkpID09PSAtMSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIC8qIGNoZWNrIGZvciB2YWxpZCBzcXVhcmUgKi9cbiAgICBpZiAoIShzcXVhcmUgaW4gU1FVQVJFUykpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICB2YXIgc3EgPSBTUVVBUkVTW3NxdWFyZV07XG5cbiAgICAvKiBkb24ndCBsZXQgdGhlIHVzZXIgcGxhY2UgbW9yZSB0aGFuIG9uZSBraW5nICovXG4gICAgaWYgKHBpZWNlLnR5cGUgPT0gS0lORyAmJlxuICAgICAgICAhKGtpbmdzW3BpZWNlLmNvbG9yXSA9PSBFTVBUWSB8fCBraW5nc1twaWVjZS5jb2xvcl0gPT0gc3EpKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgYm9hcmRbc3FdID0ge3R5cGU6IHBpZWNlLnR5cGUsIGNvbG9yOiBwaWVjZS5jb2xvcn07XG4gICAgaWYgKHBpZWNlLnR5cGUgPT09IEtJTkcpIHtcbiAgICAgIGtpbmdzW3BpZWNlLmNvbG9yXSA9IHNxO1xuICAgIH1cblxuICAgIHVwZGF0ZV9zZXR1cChnZW5lcmF0ZV9mZW4oKSk7XG5cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHJlbW92ZShzcXVhcmUpIHtcbiAgICB2YXIgcGllY2UgPSBnZXQoc3F1YXJlKTtcbiAgICBib2FyZFtTUVVBUkVTW3NxdWFyZV1dID0gbnVsbDtcbiAgICBpZiAocGllY2UgJiYgcGllY2UudHlwZSA9PT0gS0lORykge1xuICAgICAga2luZ3NbcGllY2UuY29sb3JdID0gRU1QVFk7XG4gICAgfVxuXG4gICAgdXBkYXRlX3NldHVwKGdlbmVyYXRlX2ZlbigpKTtcblxuICAgIHJldHVybiBwaWVjZTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGJ1aWxkX21vdmUoYm9hcmQsIGZyb20sIHRvLCBmbGFncywgcHJvbW90aW9uKSB7XG4gICAgdmFyIG1vdmUgPSB7XG4gICAgICBjb2xvcjogdHVybixcbiAgICAgIGZyb206IGZyb20sXG4gICAgICB0bzogdG8sXG4gICAgICBmbGFnczogZmxhZ3MsXG4gICAgICBwaWVjZTogYm9hcmRbZnJvbV0udHlwZVxuICAgIH07XG5cbiAgICBpZiAocHJvbW90aW9uKSB7XG4gICAgICBtb3ZlLmZsYWdzIHw9IEJJVFMuUFJPTU9USU9OO1xuICAgICAgbW92ZS5wcm9tb3Rpb24gPSBwcm9tb3Rpb247XG4gICAgfVxuXG4gICAgaWYgKGJvYXJkW3RvXSkge1xuICAgICAgbW92ZS5jYXB0dXJlZCA9IGJvYXJkW3RvXS50eXBlO1xuICAgIH0gZWxzZSBpZiAoZmxhZ3MgJiBCSVRTLkVQX0NBUFRVUkUpIHtcbiAgICAgICAgbW92ZS5jYXB0dXJlZCA9IFBBV047XG4gICAgfVxuICAgIHJldHVybiBtb3ZlO1xuICB9XG5cbiAgZnVuY3Rpb24gZ2VuZXJhdGVfbW92ZXMob3B0aW9ucykge1xuICAgIGZ1bmN0aW9uIGFkZF9tb3ZlKGJvYXJkLCBtb3ZlcywgZnJvbSwgdG8sIGZsYWdzKSB7XG4gICAgICAvKiBpZiBwYXduIHByb21vdGlvbiAqL1xuICAgICAgaWYgKGJvYXJkW2Zyb21dLnR5cGUgPT09IFBBV04gJiZcbiAgICAgICAgIChyYW5rKHRvKSA9PT0gUkFOS184IHx8IHJhbmsodG8pID09PSBSQU5LXzEpKSB7XG4gICAgICAgICAgdmFyIHBpZWNlcyA9IFtRVUVFTiwgUk9PSywgQklTSE9QLCBLTklHSFRdO1xuICAgICAgICAgIGZvciAodmFyIGkgPSAwLCBsZW4gPSBwaWVjZXMubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgICAgIG1vdmVzLnB1c2goYnVpbGRfbW92ZShib2FyZCwgZnJvbSwgdG8sIGZsYWdzLCBwaWVjZXNbaV0pKTtcbiAgICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgIG1vdmVzLnB1c2goYnVpbGRfbW92ZShib2FyZCwgZnJvbSwgdG8sIGZsYWdzKSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgdmFyIG1vdmVzID0gW107XG4gICAgdmFyIHVzID0gdHVybjtcbiAgICB2YXIgdGhlbSA9IHN3YXBfY29sb3IodXMpO1xuICAgIHZhciBzZWNvbmRfcmFuayA9IHtiOiBSQU5LXzcsIHc6IFJBTktfMn07XG5cbiAgICB2YXIgZmlyc3Rfc3EgPSBTUVVBUkVTLmE4O1xuICAgIHZhciBsYXN0X3NxID0gU1FVQVJFUy5oMTtcbiAgICB2YXIgc2luZ2xlX3NxdWFyZSA9IGZhbHNlO1xuXG4gICAgLyogZG8gd2Ugd2FudCBsZWdhbCBtb3Zlcz8gKi9cbiAgICB2YXIgbGVnYWwgPSAodHlwZW9mIG9wdGlvbnMgIT09ICd1bmRlZmluZWQnICYmICdsZWdhbCcgaW4gb3B0aW9ucykgP1xuICAgICAgICAgICAgICAgIG9wdGlvbnMubGVnYWwgOiB0cnVlO1xuXG4gICAgLyogYXJlIHdlIGdlbmVyYXRpbmcgbW92ZXMgZm9yIGEgc2luZ2xlIHNxdWFyZT8gKi9cbiAgICBpZiAodHlwZW9mIG9wdGlvbnMgIT09ICd1bmRlZmluZWQnICYmICdzcXVhcmUnIGluIG9wdGlvbnMpIHtcbiAgICAgIGlmIChvcHRpb25zLnNxdWFyZSBpbiBTUVVBUkVTKSB7XG4gICAgICAgIGZpcnN0X3NxID0gbGFzdF9zcSA9IFNRVUFSRVNbb3B0aW9ucy5zcXVhcmVdO1xuICAgICAgICBzaW5nbGVfc3F1YXJlID0gdHJ1ZTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8qIGludmFsaWQgc3F1YXJlICovXG4gICAgICAgIHJldHVybiBbXTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBmb3IgKHZhciBpID0gZmlyc3Rfc3E7IGkgPD0gbGFzdF9zcTsgaSsrKSB7XG4gICAgICAvKiBkaWQgd2UgcnVuIG9mZiB0aGUgZW5kIG9mIHRoZSBib2FyZCAqL1xuICAgICAgaWYgKGkgJiAweDg4KSB7IGkgKz0gNzsgY29udGludWU7IH1cblxuICAgICAgdmFyIHBpZWNlID0gYm9hcmRbaV07XG4gICAgICBpZiAocGllY2UgPT0gbnVsbCB8fCBwaWVjZS5jb2xvciAhPT0gdXMpIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIGlmIChwaWVjZS50eXBlID09PSBQQVdOKSB7XG4gICAgICAgIC8qIHNpbmdsZSBzcXVhcmUsIG5vbi1jYXB0dXJpbmcgKi9cbiAgICAgICAgdmFyIHNxdWFyZSA9IGkgKyBQQVdOX09GRlNFVFNbdXNdWzBdO1xuICAgICAgICBpZiAoYm9hcmRbc3F1YXJlXSA9PSBudWxsKSB7XG4gICAgICAgICAgICBhZGRfbW92ZShib2FyZCwgbW92ZXMsIGksIHNxdWFyZSwgQklUUy5OT1JNQUwpO1xuXG4gICAgICAgICAgLyogZG91YmxlIHNxdWFyZSAqL1xuICAgICAgICAgIHZhciBzcXVhcmUgPSBpICsgUEFXTl9PRkZTRVRTW3VzXVsxXTtcbiAgICAgICAgICBpZiAoc2Vjb25kX3JhbmtbdXNdID09PSByYW5rKGkpICYmIGJvYXJkW3NxdWFyZV0gPT0gbnVsbCkge1xuICAgICAgICAgICAgYWRkX21vdmUoYm9hcmQsIG1vdmVzLCBpLCBzcXVhcmUsIEJJVFMuQklHX1BBV04pO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8qIHBhd24gY2FwdHVyZXMgKi9cbiAgICAgICAgZm9yIChqID0gMjsgaiA8IDQ7IGorKykge1xuICAgICAgICAgIHZhciBzcXVhcmUgPSBpICsgUEFXTl9PRkZTRVRTW3VzXVtqXTtcbiAgICAgICAgICBpZiAoc3F1YXJlICYgMHg4OCkgY29udGludWU7XG5cbiAgICAgICAgICBpZiAoYm9hcmRbc3F1YXJlXSAhPSBudWxsICYmXG4gICAgICAgICAgICAgIGJvYXJkW3NxdWFyZV0uY29sb3IgPT09IHRoZW0pIHtcbiAgICAgICAgICAgICAgYWRkX21vdmUoYm9hcmQsIG1vdmVzLCBpLCBzcXVhcmUsIEJJVFMuQ0FQVFVSRSk7XG4gICAgICAgICAgfSBlbHNlIGlmIChzcXVhcmUgPT09IGVwX3NxdWFyZSkge1xuICAgICAgICAgICAgICBhZGRfbW92ZShib2FyZCwgbW92ZXMsIGksIGVwX3NxdWFyZSwgQklUUy5FUF9DQVBUVVJFKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGZvciAodmFyIGogPSAwLCBsZW4gPSBQSUVDRV9PRkZTRVRTW3BpZWNlLnR5cGVdLmxlbmd0aDsgaiA8IGxlbjsgaisrKSB7XG4gICAgICAgICAgdmFyIG9mZnNldCA9IFBJRUNFX09GRlNFVFNbcGllY2UudHlwZV1bal07XG4gICAgICAgICAgdmFyIHNxdWFyZSA9IGk7XG5cbiAgICAgICAgICB3aGlsZSAodHJ1ZSkge1xuICAgICAgICAgICAgc3F1YXJlICs9IG9mZnNldDtcbiAgICAgICAgICAgIGlmIChzcXVhcmUgJiAweDg4KSBicmVhaztcblxuICAgICAgICAgICAgaWYgKGJvYXJkW3NxdWFyZV0gPT0gbnVsbCkge1xuICAgICAgICAgICAgICBhZGRfbW92ZShib2FyZCwgbW92ZXMsIGksIHNxdWFyZSwgQklUUy5OT1JNQUwpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgaWYgKGJvYXJkW3NxdWFyZV0uY29sb3IgPT09IHVzKSBicmVhaztcbiAgICAgICAgICAgICAgYWRkX21vdmUoYm9hcmQsIG1vdmVzLCBpLCBzcXVhcmUsIEJJVFMuQ0FQVFVSRSk7XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvKiBicmVhaywgaWYga25pZ2h0IG9yIGtpbmcgKi9cbiAgICAgICAgICAgIGlmIChwaWVjZS50eXBlID09PSAnbicgfHwgcGllY2UudHlwZSA9PT0gJ2snKSBicmVhaztcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICAvKiBjaGVjayBmb3IgY2FzdGxpbmcgaWY6IGEpIHdlJ3JlIGdlbmVyYXRpbmcgYWxsIG1vdmVzLCBvciBiKSB3ZSdyZSBkb2luZ1xuICAgICAqIHNpbmdsZSBzcXVhcmUgbW92ZSBnZW5lcmF0aW9uIG9uIHRoZSBraW5nJ3Mgc3F1YXJlXG4gICAgICovXG4gICAgaWYgKCghc2luZ2xlX3NxdWFyZSkgfHwgbGFzdF9zcSA9PT0ga2luZ3NbdXNdKSB7XG4gICAgICAvKiBraW5nLXNpZGUgY2FzdGxpbmcgKi9cbiAgICAgIGlmIChjYXN0bGluZ1t1c10gJiBCSVRTLktTSURFX0NBU1RMRSkge1xuICAgICAgICB2YXIgY2FzdGxpbmdfZnJvbSA9IGtpbmdzW3VzXTtcbiAgICAgICAgdmFyIGNhc3RsaW5nX3RvID0gY2FzdGxpbmdfZnJvbSArIDI7XG5cbiAgICAgICAgaWYgKGJvYXJkW2Nhc3RsaW5nX2Zyb20gKyAxXSA9PSBudWxsICYmXG4gICAgICAgICAgICBib2FyZFtjYXN0bGluZ190b10gICAgICAgPT0gbnVsbCAmJlxuICAgICAgICAgICAgIWF0dGFja2VkKHRoZW0sIGtpbmdzW3VzXSkgJiZcbiAgICAgICAgICAgICFhdHRhY2tlZCh0aGVtLCBjYXN0bGluZ19mcm9tICsgMSkgJiZcbiAgICAgICAgICAgICFhdHRhY2tlZCh0aGVtLCBjYXN0bGluZ190bykpIHtcbiAgICAgICAgICBhZGRfbW92ZShib2FyZCwgbW92ZXMsIGtpbmdzW3VzXSAsIGNhc3RsaW5nX3RvLFxuICAgICAgICAgICAgICAgICAgIEJJVFMuS1NJREVfQ0FTVExFKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAvKiBxdWVlbi1zaWRlIGNhc3RsaW5nICovXG4gICAgICBpZiAoY2FzdGxpbmdbdXNdICYgQklUUy5RU0lERV9DQVNUTEUpIHtcbiAgICAgICAgdmFyIGNhc3RsaW5nX2Zyb20gPSBraW5nc1t1c107XG4gICAgICAgIHZhciBjYXN0bGluZ190byA9IGNhc3RsaW5nX2Zyb20gLSAyO1xuXG4gICAgICAgIGlmIChib2FyZFtjYXN0bGluZ19mcm9tIC0gMV0gPT0gbnVsbCAmJlxuICAgICAgICAgICAgYm9hcmRbY2FzdGxpbmdfZnJvbSAtIDJdID09IG51bGwgJiZcbiAgICAgICAgICAgIGJvYXJkW2Nhc3RsaW5nX2Zyb20gLSAzXSA9PSBudWxsICYmXG4gICAgICAgICAgICAhYXR0YWNrZWQodGhlbSwga2luZ3NbdXNdKSAmJlxuICAgICAgICAgICAgIWF0dGFja2VkKHRoZW0sIGNhc3RsaW5nX2Zyb20gLSAxKSAmJlxuICAgICAgICAgICAgIWF0dGFja2VkKHRoZW0sIGNhc3RsaW5nX3RvKSkge1xuICAgICAgICAgIGFkZF9tb3ZlKGJvYXJkLCBtb3Zlcywga2luZ3NbdXNdLCBjYXN0bGluZ190byxcbiAgICAgICAgICAgICAgICAgICBCSVRTLlFTSURFX0NBU1RMRSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICAvKiByZXR1cm4gYWxsIHBzZXVkby1sZWdhbCBtb3ZlcyAodGhpcyBpbmNsdWRlcyBtb3ZlcyB0aGF0IGFsbG93IHRoZSBraW5nXG4gICAgICogdG8gYmUgY2FwdHVyZWQpXG4gICAgICovXG4gICAgaWYgKCFsZWdhbCkge1xuICAgICAgcmV0dXJuIG1vdmVzO1xuICAgIH1cblxuICAgIC8qIGZpbHRlciBvdXQgaWxsZWdhbCBtb3ZlcyAqL1xuICAgIHZhciBsZWdhbF9tb3ZlcyA9IFtdO1xuICAgIGZvciAodmFyIGkgPSAwLCBsZW4gPSBtb3Zlcy5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgICAgbWFrZV9tb3ZlKG1vdmVzW2ldKTtcbiAgICAgIGlmICgha2luZ19hdHRhY2tlZCh1cykpIHtcbiAgICAgICAgbGVnYWxfbW92ZXMucHVzaChtb3Zlc1tpXSk7XG4gICAgICB9XG4gICAgICB1bmRvX21vdmUoKTtcbiAgICB9XG5cbiAgICByZXR1cm4gbGVnYWxfbW92ZXM7XG4gIH1cblxuICAvKiBjb252ZXJ0IGEgbW92ZSBmcm9tIDB4ODggY29vcmRpbmF0ZXMgdG8gU3RhbmRhcmQgQWxnZWJyYWljIE5vdGF0aW9uXG4gICAqIChTQU4pXG4gICAqXG4gICAqIEBwYXJhbSB7Ym9vbGVhbn0gc2xvcHB5IFVzZSB0aGUgc2xvcHB5IFNBTiBnZW5lcmF0b3IgdG8gd29yayBhcm91bmQgb3ZlclxuICAgKiBkaXNhbWJpZ3VhdGlvbiBidWdzIGluIEZyaXR6IGFuZCBDaGVzc2Jhc2UuICBTZWUgYmVsb3c6XG4gICAqXG4gICAqIHIxYnFrYm5yL3BwcDJwcHAvMm41LzFCMXBQMy80UDMvOC9QUFBQMlBQL1JOQlFLMU5SIGIgS1FrcSAtIDIgNFxuICAgKiA0LiAuLi4gTmdlNyBpcyBvdmVybHkgZGlzYW1iaWd1YXRlZCBiZWNhdXNlIHRoZSBrbmlnaHQgb24gYzYgaXMgcGlubmVkXG4gICAqIDQuIC4uLiBOZTcgaXMgdGVjaG5pY2FsbHkgdGhlIHZhbGlkIFNBTlxuICAgKi9cbiAgZnVuY3Rpb24gbW92ZV90b19zYW4obW92ZSwgc2xvcHB5KSB7XG5cbiAgICB2YXIgb3V0cHV0ID0gJyc7XG5cbiAgICBpZiAobW92ZS5mbGFncyAmIEJJVFMuS1NJREVfQ0FTVExFKSB7XG4gICAgICBvdXRwdXQgPSAnTy1PJztcbiAgICB9IGVsc2UgaWYgKG1vdmUuZmxhZ3MgJiBCSVRTLlFTSURFX0NBU1RMRSkge1xuICAgICAgb3V0cHV0ID0gJ08tTy1PJztcbiAgICB9IGVsc2Uge1xuICAgICAgdmFyIGRpc2FtYmlndWF0b3IgPSBnZXRfZGlzYW1iaWd1YXRvcihtb3ZlLCBzbG9wcHkpO1xuXG4gICAgICBpZiAobW92ZS5waWVjZSAhPT0gUEFXTikge1xuICAgICAgICBvdXRwdXQgKz0gbW92ZS5waWVjZS50b1VwcGVyQ2FzZSgpICsgZGlzYW1iaWd1YXRvcjtcbiAgICAgIH1cblxuICAgICAgaWYgKG1vdmUuZmxhZ3MgJiAoQklUUy5DQVBUVVJFIHwgQklUUy5FUF9DQVBUVVJFKSkge1xuICAgICAgICBpZiAobW92ZS5waWVjZSA9PT0gUEFXTikge1xuICAgICAgICAgIG91dHB1dCArPSBhbGdlYnJhaWMobW92ZS5mcm9tKVswXTtcbiAgICAgICAgfVxuICAgICAgICBvdXRwdXQgKz0gJ3gnO1xuICAgICAgfVxuXG4gICAgICBvdXRwdXQgKz0gYWxnZWJyYWljKG1vdmUudG8pO1xuXG4gICAgICBpZiAobW92ZS5mbGFncyAmIEJJVFMuUFJPTU9USU9OKSB7XG4gICAgICAgIG91dHB1dCArPSAnPScgKyBtb3ZlLnByb21vdGlvbi50b1VwcGVyQ2FzZSgpO1xuICAgICAgfVxuICAgIH1cblxuICAgIG1ha2VfbW92ZShtb3ZlKTtcbiAgICBpZiAoaW5fY2hlY2soKSkge1xuICAgICAgaWYgKGluX2NoZWNrbWF0ZSgpKSB7XG4gICAgICAgIG91dHB1dCArPSAnIyc7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBvdXRwdXQgKz0gJysnO1xuICAgICAgfVxuICAgIH1cbiAgICB1bmRvX21vdmUoKTtcblxuICAgIHJldHVybiBvdXRwdXQ7XG4gIH1cblxuICAvLyBwYXJzZXMgYWxsIG9mIHRoZSBkZWNvcmF0b3JzIG91dCBvZiBhIFNBTiBzdHJpbmdcbiAgZnVuY3Rpb24gc3RyaXBwZWRfc2FuKG1vdmUpIHtcbiAgICByZXR1cm4gbW92ZS5yZXBsYWNlKC89LywnJykucmVwbGFjZSgvWysjXT9bPyFdKiQvLCcnKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGF0dGFja2VkKGNvbG9yLCBzcXVhcmUpIHtcbiAgICBpZiAoc3F1YXJlIDwgMCkgcmV0dXJuIGZhbHNlO1xuICAgIGZvciAodmFyIGkgPSBTUVVBUkVTLmE4OyBpIDw9IFNRVUFSRVMuaDE7IGkrKykge1xuICAgICAgLyogZGlkIHdlIHJ1biBvZmYgdGhlIGVuZCBvZiB0aGUgYm9hcmQgKi9cbiAgICAgIGlmIChpICYgMHg4OCkgeyBpICs9IDc7IGNvbnRpbnVlOyB9XG5cbiAgICAgIC8qIGlmIGVtcHR5IHNxdWFyZSBvciB3cm9uZyBjb2xvciAqL1xuICAgICAgaWYgKGJvYXJkW2ldID09IG51bGwgfHwgYm9hcmRbaV0uY29sb3IgIT09IGNvbG9yKSBjb250aW51ZTtcblxuICAgICAgdmFyIHBpZWNlID0gYm9hcmRbaV07XG4gICAgICB2YXIgZGlmZmVyZW5jZSA9IGkgLSBzcXVhcmU7XG4gICAgICB2YXIgaW5kZXggPSBkaWZmZXJlbmNlICsgMTE5O1xuXG4gICAgICBpZiAoQVRUQUNLU1tpbmRleF0gJiAoMSA8PCBTSElGVFNbcGllY2UudHlwZV0pKSB7XG4gICAgICAgIGlmIChwaWVjZS50eXBlID09PSBQQVdOKSB7XG4gICAgICAgICAgaWYgKGRpZmZlcmVuY2UgPiAwKSB7XG4gICAgICAgICAgICBpZiAocGllY2UuY29sb3IgPT09IFdISVRFKSByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaWYgKHBpZWNlLmNvbG9yID09PSBCTEFDSykgcmV0dXJuIHRydWU7XG4gICAgICAgICAgfVxuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgLyogaWYgdGhlIHBpZWNlIGlzIGEga25pZ2h0IG9yIGEga2luZyAqL1xuICAgICAgICBpZiAocGllY2UudHlwZSA9PT0gJ24nIHx8IHBpZWNlLnR5cGUgPT09ICdrJykgcmV0dXJuIHRydWU7XG5cbiAgICAgICAgdmFyIG9mZnNldCA9IFJBWVNbaW5kZXhdO1xuICAgICAgICB2YXIgaiA9IGkgKyBvZmZzZXQ7XG5cbiAgICAgICAgdmFyIGJsb2NrZWQgPSBmYWxzZTtcbiAgICAgICAgd2hpbGUgKGogIT09IHNxdWFyZSkge1xuICAgICAgICAgIGlmIChib2FyZFtqXSAhPSBudWxsKSB7IGJsb2NrZWQgPSB0cnVlOyBicmVhazsgfVxuICAgICAgICAgIGogKz0gb2Zmc2V0O1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCFibG9ja2VkKSByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBmdW5jdGlvbiBraW5nX2F0dGFja2VkKGNvbG9yKSB7XG4gICAgcmV0dXJuIGF0dGFja2VkKHN3YXBfY29sb3IoY29sb3IpLCBraW5nc1tjb2xvcl0pO1xuICB9XG5cbiAgZnVuY3Rpb24gaW5fY2hlY2soKSB7XG4gICAgcmV0dXJuIGtpbmdfYXR0YWNrZWQodHVybik7XG4gIH1cblxuICBmdW5jdGlvbiBpbl9jaGVja21hdGUoKSB7XG4gICAgcmV0dXJuIGluX2NoZWNrKCkgJiYgZ2VuZXJhdGVfbW92ZXMoKS5sZW5ndGggPT09IDA7XG4gIH1cblxuICBmdW5jdGlvbiBpbl9zdGFsZW1hdGUoKSB7XG4gICAgcmV0dXJuICFpbl9jaGVjaygpICYmIGdlbmVyYXRlX21vdmVzKCkubGVuZ3RoID09PSAwO1xuICB9XG5cbiAgZnVuY3Rpb24gaW5zdWZmaWNpZW50X21hdGVyaWFsKCkge1xuICAgIHZhciBwaWVjZXMgPSB7fTtcbiAgICB2YXIgYmlzaG9wcyA9IFtdO1xuICAgIHZhciBudW1fcGllY2VzID0gMDtcbiAgICB2YXIgc3FfY29sb3IgPSAwO1xuXG4gICAgZm9yICh2YXIgaSA9IFNRVUFSRVMuYTg7IGk8PSBTUVVBUkVTLmgxOyBpKyspIHtcbiAgICAgIHNxX2NvbG9yID0gKHNxX2NvbG9yICsgMSkgJSAyO1xuICAgICAgaWYgKGkgJiAweDg4KSB7IGkgKz0gNzsgY29udGludWU7IH1cblxuICAgICAgdmFyIHBpZWNlID0gYm9hcmRbaV07XG4gICAgICBpZiAocGllY2UpIHtcbiAgICAgICAgcGllY2VzW3BpZWNlLnR5cGVdID0gKHBpZWNlLnR5cGUgaW4gcGllY2VzKSA/XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwaWVjZXNbcGllY2UudHlwZV0gKyAxIDogMTtcbiAgICAgICAgaWYgKHBpZWNlLnR5cGUgPT09IEJJU0hPUCkge1xuICAgICAgICAgIGJpc2hvcHMucHVzaChzcV9jb2xvcik7XG4gICAgICAgIH1cbiAgICAgICAgbnVtX3BpZWNlcysrO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8qIGsgdnMuIGsgKi9cbiAgICBpZiAobnVtX3BpZWNlcyA9PT0gMikgeyByZXR1cm4gdHJ1ZTsgfVxuXG4gICAgLyogayB2cy4ga24gLi4uLiBvciAuLi4uIGsgdnMuIGtiICovXG4gICAgZWxzZSBpZiAobnVtX3BpZWNlcyA9PT0gMyAmJiAocGllY2VzW0JJU0hPUF0gPT09IDEgfHxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBpZWNlc1tLTklHSFRdID09PSAxKSkgeyByZXR1cm4gdHJ1ZTsgfVxuXG4gICAgLyoga2IgdnMuIGtiIHdoZXJlIGFueSBudW1iZXIgb2YgYmlzaG9wcyBhcmUgYWxsIG9uIHRoZSBzYW1lIGNvbG9yICovXG4gICAgZWxzZSBpZiAobnVtX3BpZWNlcyA9PT0gcGllY2VzW0JJU0hPUF0gKyAyKSB7XG4gICAgICB2YXIgc3VtID0gMDtcbiAgICAgIHZhciBsZW4gPSBiaXNob3BzLmxlbmd0aDtcbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgc3VtICs9IGJpc2hvcHNbaV07XG4gICAgICB9XG4gICAgICBpZiAoc3VtID09PSAwIHx8IHN1bSA9PT0gbGVuKSB7IHJldHVybiB0cnVlOyB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgZnVuY3Rpb24gaW5fdGhyZWVmb2xkX3JlcGV0aXRpb24oKSB7XG4gICAgLyogVE9ETzogd2hpbGUgdGhpcyBmdW5jdGlvbiBpcyBmaW5lIGZvciBjYXN1YWwgdXNlLCBhIGJldHRlclxuICAgICAqIGltcGxlbWVudGF0aW9uIHdvdWxkIHVzZSBhIFpvYnJpc3Qga2V5IChpbnN0ZWFkIG9mIEZFTikuIHRoZVxuICAgICAqIFpvYnJpc3Qga2V5IHdvdWxkIGJlIG1haW50YWluZWQgaW4gdGhlIG1ha2VfbW92ZS91bmRvX21vdmUgZnVuY3Rpb25zLFxuICAgICAqIGF2b2lkaW5nIHRoZSBjb3N0bHkgdGhhdCB3ZSBkbyBiZWxvdy5cbiAgICAgKi9cbiAgICB2YXIgbW92ZXMgPSBbXTtcbiAgICB2YXIgcG9zaXRpb25zID0ge307XG4gICAgdmFyIHJlcGV0aXRpb24gPSBmYWxzZTtcblxuICAgIHdoaWxlICh0cnVlKSB7XG4gICAgICB2YXIgbW92ZSA9IHVuZG9fbW92ZSgpO1xuICAgICAgaWYgKCFtb3ZlKSBicmVhaztcbiAgICAgIG1vdmVzLnB1c2gobW92ZSk7XG4gICAgfVxuXG4gICAgd2hpbGUgKHRydWUpIHtcbiAgICAgIC8qIHJlbW92ZSB0aGUgbGFzdCB0d28gZmllbGRzIGluIHRoZSBGRU4gc3RyaW5nLCB0aGV5J3JlIG5vdCBuZWVkZWRcbiAgICAgICAqIHdoZW4gY2hlY2tpbmcgZm9yIGRyYXcgYnkgcmVwICovXG4gICAgICB2YXIgZmVuID0gZ2VuZXJhdGVfZmVuKCkuc3BsaXQoJyAnKS5zbGljZSgwLDQpLmpvaW4oJyAnKTtcblxuICAgICAgLyogaGFzIHRoZSBwb3NpdGlvbiBvY2N1cnJlZCB0aHJlZSBvciBtb3ZlIHRpbWVzICovXG4gICAgICBwb3NpdGlvbnNbZmVuXSA9IChmZW4gaW4gcG9zaXRpb25zKSA/IHBvc2l0aW9uc1tmZW5dICsgMSA6IDE7XG4gICAgICBpZiAocG9zaXRpb25zW2Zlbl0gPj0gMykge1xuICAgICAgICByZXBldGl0aW9uID0gdHJ1ZTtcbiAgICAgIH1cblxuICAgICAgaWYgKCFtb3Zlcy5sZW5ndGgpIHtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgICBtYWtlX21vdmUobW92ZXMucG9wKCkpO1xuICAgIH1cblxuICAgIHJldHVybiByZXBldGl0aW9uO1xuICB9XG5cbiAgZnVuY3Rpb24gcHVzaChtb3ZlKSB7XG4gICAgaGlzdG9yeS5wdXNoKHtcbiAgICAgIG1vdmU6IG1vdmUsXG4gICAgICBraW5nczoge2I6IGtpbmdzLmIsIHc6IGtpbmdzLnd9LFxuICAgICAgdHVybjogdHVybixcbiAgICAgIGNhc3RsaW5nOiB7YjogY2FzdGxpbmcuYiwgdzogY2FzdGxpbmcud30sXG4gICAgICBlcF9zcXVhcmU6IGVwX3NxdWFyZSxcbiAgICAgIGhhbGZfbW92ZXM6IGhhbGZfbW92ZXMsXG4gICAgICBtb3ZlX251bWJlcjogbW92ZV9udW1iZXJcbiAgICB9KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIG1ha2VfbW92ZShtb3ZlKSB7XG4gICAgdmFyIHVzID0gdHVybjtcbiAgICB2YXIgdGhlbSA9IHN3YXBfY29sb3IodXMpO1xuICAgIHB1c2gobW92ZSk7XG5cbiAgICBib2FyZFttb3ZlLnRvXSA9IGJvYXJkW21vdmUuZnJvbV07XG4gICAgYm9hcmRbbW92ZS5mcm9tXSA9IG51bGw7XG5cbiAgICAvKiBpZiBlcCBjYXB0dXJlLCByZW1vdmUgdGhlIGNhcHR1cmVkIHBhd24gKi9cbiAgICBpZiAobW92ZS5mbGFncyAmIEJJVFMuRVBfQ0FQVFVSRSkge1xuICAgICAgaWYgKHR1cm4gPT09IEJMQUNLKSB7XG4gICAgICAgIGJvYXJkW21vdmUudG8gLSAxNl0gPSBudWxsO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgYm9hcmRbbW92ZS50byArIDE2XSA9IG51bGw7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLyogaWYgcGF3biBwcm9tb3Rpb24sIHJlcGxhY2Ugd2l0aCBuZXcgcGllY2UgKi9cbiAgICBpZiAobW92ZS5mbGFncyAmIEJJVFMuUFJPTU9USU9OKSB7XG4gICAgICBib2FyZFttb3ZlLnRvXSA9IHt0eXBlOiBtb3ZlLnByb21vdGlvbiwgY29sb3I6IHVzfTtcbiAgICB9XG5cbiAgICAvKiBpZiB3ZSBtb3ZlZCB0aGUga2luZyAqL1xuICAgIGlmIChib2FyZFttb3ZlLnRvXS50eXBlID09PSBLSU5HKSB7XG4gICAgICBraW5nc1tib2FyZFttb3ZlLnRvXS5jb2xvcl0gPSBtb3ZlLnRvO1xuXG4gICAgICAvKiBpZiB3ZSBjYXN0bGVkLCBtb3ZlIHRoZSByb29rIG5leHQgdG8gdGhlIGtpbmcgKi9cbiAgICAgIGlmIChtb3ZlLmZsYWdzICYgQklUUy5LU0lERV9DQVNUTEUpIHtcbiAgICAgICAgdmFyIGNhc3RsaW5nX3RvID0gbW92ZS50byAtIDE7XG4gICAgICAgIHZhciBjYXN0bGluZ19mcm9tID0gbW92ZS50byArIDE7XG4gICAgICAgIGJvYXJkW2Nhc3RsaW5nX3RvXSA9IGJvYXJkW2Nhc3RsaW5nX2Zyb21dO1xuICAgICAgICBib2FyZFtjYXN0bGluZ19mcm9tXSA9IG51bGw7XG4gICAgICB9IGVsc2UgaWYgKG1vdmUuZmxhZ3MgJiBCSVRTLlFTSURFX0NBU1RMRSkge1xuICAgICAgICB2YXIgY2FzdGxpbmdfdG8gPSBtb3ZlLnRvICsgMTtcbiAgICAgICAgdmFyIGNhc3RsaW5nX2Zyb20gPSBtb3ZlLnRvIC0gMjtcbiAgICAgICAgYm9hcmRbY2FzdGxpbmdfdG9dID0gYm9hcmRbY2FzdGxpbmdfZnJvbV07XG4gICAgICAgIGJvYXJkW2Nhc3RsaW5nX2Zyb21dID0gbnVsbDtcbiAgICAgIH1cblxuICAgICAgLyogdHVybiBvZmYgY2FzdGxpbmcgKi9cbiAgICAgIGNhc3RsaW5nW3VzXSA9ICcnO1xuICAgIH1cblxuICAgIC8qIHR1cm4gb2ZmIGNhc3RsaW5nIGlmIHdlIG1vdmUgYSByb29rICovXG4gICAgaWYgKGNhc3RsaW5nW3VzXSkge1xuICAgICAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IFJPT0tTW3VzXS5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgICAgICBpZiAobW92ZS5mcm9tID09PSBST09LU1t1c11baV0uc3F1YXJlICYmXG4gICAgICAgICAgICBjYXN0bGluZ1t1c10gJiBST09LU1t1c11baV0uZmxhZykge1xuICAgICAgICAgIGNhc3RsaW5nW3VzXSBePSBST09LU1t1c11baV0uZmxhZztcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIC8qIHR1cm4gb2ZmIGNhc3RsaW5nIGlmIHdlIGNhcHR1cmUgYSByb29rICovXG4gICAgaWYgKGNhc3RsaW5nW3RoZW1dKSB7XG4gICAgICBmb3IgKHZhciBpID0gMCwgbGVuID0gUk9PS1NbdGhlbV0ubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgaWYgKG1vdmUudG8gPT09IFJPT0tTW3RoZW1dW2ldLnNxdWFyZSAmJlxuICAgICAgICAgICAgY2FzdGxpbmdbdGhlbV0gJiBST09LU1t0aGVtXVtpXS5mbGFnKSB7XG4gICAgICAgICAgY2FzdGxpbmdbdGhlbV0gXj0gUk9PS1NbdGhlbV1baV0uZmxhZztcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIC8qIGlmIGJpZyBwYXduIG1vdmUsIHVwZGF0ZSB0aGUgZW4gcGFzc2FudCBzcXVhcmUgKi9cbiAgICBpZiAobW92ZS5mbGFncyAmIEJJVFMuQklHX1BBV04pIHtcbiAgICAgIGlmICh0dXJuID09PSAnYicpIHtcbiAgICAgICAgZXBfc3F1YXJlID0gbW92ZS50byAtIDE2O1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZXBfc3F1YXJlID0gbW92ZS50byArIDE2O1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBlcF9zcXVhcmUgPSBFTVBUWTtcbiAgICB9XG5cbiAgICAvKiByZXNldCB0aGUgNTAgbW92ZSBjb3VudGVyIGlmIGEgcGF3biBpcyBtb3ZlZCBvciBhIHBpZWNlIGlzIGNhcHR1cmVkICovXG4gICAgaWYgKG1vdmUucGllY2UgPT09IFBBV04pIHtcbiAgICAgIGhhbGZfbW92ZXMgPSAwO1xuICAgIH0gZWxzZSBpZiAobW92ZS5mbGFncyAmIChCSVRTLkNBUFRVUkUgfCBCSVRTLkVQX0NBUFRVUkUpKSB7XG4gICAgICBoYWxmX21vdmVzID0gMDtcbiAgICB9IGVsc2Uge1xuICAgICAgaGFsZl9tb3ZlcysrO1xuICAgIH1cblxuICAgIGlmICh0dXJuID09PSBCTEFDSykge1xuICAgICAgbW92ZV9udW1iZXIrKztcbiAgICB9XG4gICAgdHVybiA9IHN3YXBfY29sb3IodHVybik7XG4gIH1cblxuICBmdW5jdGlvbiB1bmRvX21vdmUoKSB7XG4gICAgdmFyIG9sZCA9IGhpc3RvcnkucG9wKCk7XG4gICAgaWYgKG9sZCA9PSBudWxsKSB7IHJldHVybiBudWxsOyB9XG5cbiAgICB2YXIgbW92ZSA9IG9sZC5tb3ZlO1xuICAgIGtpbmdzID0gb2xkLmtpbmdzO1xuICAgIHR1cm4gPSBvbGQudHVybjtcbiAgICBjYXN0bGluZyA9IG9sZC5jYXN0bGluZztcbiAgICBlcF9zcXVhcmUgPSBvbGQuZXBfc3F1YXJlO1xuICAgIGhhbGZfbW92ZXMgPSBvbGQuaGFsZl9tb3ZlcztcbiAgICBtb3ZlX251bWJlciA9IG9sZC5tb3ZlX251bWJlcjtcblxuICAgIHZhciB1cyA9IHR1cm47XG4gICAgdmFyIHRoZW0gPSBzd2FwX2NvbG9yKHR1cm4pO1xuXG4gICAgYm9hcmRbbW92ZS5mcm9tXSA9IGJvYXJkW21vdmUudG9dO1xuICAgIGJvYXJkW21vdmUuZnJvbV0udHlwZSA9IG1vdmUucGllY2U7ICAvLyB0byB1bmRvIGFueSBwcm9tb3Rpb25zXG4gICAgYm9hcmRbbW92ZS50b10gPSBudWxsO1xuXG4gICAgaWYgKG1vdmUuZmxhZ3MgJiBCSVRTLkNBUFRVUkUpIHtcbiAgICAgIGJvYXJkW21vdmUudG9dID0ge3R5cGU6IG1vdmUuY2FwdHVyZWQsIGNvbG9yOiB0aGVtfTtcbiAgICB9IGVsc2UgaWYgKG1vdmUuZmxhZ3MgJiBCSVRTLkVQX0NBUFRVUkUpIHtcbiAgICAgIHZhciBpbmRleDtcbiAgICAgIGlmICh1cyA9PT0gQkxBQ0spIHtcbiAgICAgICAgaW5kZXggPSBtb3ZlLnRvIC0gMTY7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpbmRleCA9IG1vdmUudG8gKyAxNjtcbiAgICAgIH1cbiAgICAgIGJvYXJkW2luZGV4XSA9IHt0eXBlOiBQQVdOLCBjb2xvcjogdGhlbX07XG4gICAgfVxuXG5cbiAgICBpZiAobW92ZS5mbGFncyAmIChCSVRTLktTSURFX0NBU1RMRSB8IEJJVFMuUVNJREVfQ0FTVExFKSkge1xuICAgICAgdmFyIGNhc3RsaW5nX3RvLCBjYXN0bGluZ19mcm9tO1xuICAgICAgaWYgKG1vdmUuZmxhZ3MgJiBCSVRTLktTSURFX0NBU1RMRSkge1xuICAgICAgICBjYXN0bGluZ190byA9IG1vdmUudG8gKyAxO1xuICAgICAgICBjYXN0bGluZ19mcm9tID0gbW92ZS50byAtIDE7XG4gICAgICB9IGVsc2UgaWYgKG1vdmUuZmxhZ3MgJiBCSVRTLlFTSURFX0NBU1RMRSkge1xuICAgICAgICBjYXN0bGluZ190byA9IG1vdmUudG8gLSAyO1xuICAgICAgICBjYXN0bGluZ19mcm9tID0gbW92ZS50byArIDE7XG4gICAgICB9XG5cbiAgICAgIGJvYXJkW2Nhc3RsaW5nX3RvXSA9IGJvYXJkW2Nhc3RsaW5nX2Zyb21dO1xuICAgICAgYm9hcmRbY2FzdGxpbmdfZnJvbV0gPSBudWxsO1xuICAgIH1cblxuICAgIHJldHVybiBtb3ZlO1xuICB9XG5cbiAgLyogdGhpcyBmdW5jdGlvbiBpcyB1c2VkIHRvIHVuaXF1ZWx5IGlkZW50aWZ5IGFtYmlndW91cyBtb3ZlcyAqL1xuICBmdW5jdGlvbiBnZXRfZGlzYW1iaWd1YXRvcihtb3ZlLCBzbG9wcHkpIHtcbiAgICB2YXIgbW92ZXMgPSBnZW5lcmF0ZV9tb3Zlcyh7bGVnYWw6ICFzbG9wcHl9KTtcblxuICAgIHZhciBmcm9tID0gbW92ZS5mcm9tO1xuICAgIHZhciB0byA9IG1vdmUudG87XG4gICAgdmFyIHBpZWNlID0gbW92ZS5waWVjZTtcblxuICAgIHZhciBhbWJpZ3VpdGllcyA9IDA7XG4gICAgdmFyIHNhbWVfcmFuayA9IDA7XG4gICAgdmFyIHNhbWVfZmlsZSA9IDA7XG5cbiAgICBmb3IgKHZhciBpID0gMCwgbGVuID0gbW92ZXMubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgIHZhciBhbWJpZ19mcm9tID0gbW92ZXNbaV0uZnJvbTtcbiAgICAgIHZhciBhbWJpZ190byA9IG1vdmVzW2ldLnRvO1xuICAgICAgdmFyIGFtYmlnX3BpZWNlID0gbW92ZXNbaV0ucGllY2U7XG5cbiAgICAgIC8qIGlmIGEgbW92ZSBvZiB0aGUgc2FtZSBwaWVjZSB0eXBlIGVuZHMgb24gdGhlIHNhbWUgdG8gc3F1YXJlLCB3ZSdsbFxuICAgICAgICogbmVlZCB0byBhZGQgYSBkaXNhbWJpZ3VhdG9yIHRvIHRoZSBhbGdlYnJhaWMgbm90YXRpb25cbiAgICAgICAqL1xuICAgICAgaWYgKHBpZWNlID09PSBhbWJpZ19waWVjZSAmJiBmcm9tICE9PSBhbWJpZ19mcm9tICYmIHRvID09PSBhbWJpZ190bykge1xuICAgICAgICBhbWJpZ3VpdGllcysrO1xuXG4gICAgICAgIGlmIChyYW5rKGZyb20pID09PSByYW5rKGFtYmlnX2Zyb20pKSB7XG4gICAgICAgICAgc2FtZV9yYW5rKys7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoZmlsZShmcm9tKSA9PT0gZmlsZShhbWJpZ19mcm9tKSkge1xuICAgICAgICAgIHNhbWVfZmlsZSsrO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKGFtYmlndWl0aWVzID4gMCkge1xuICAgICAgLyogaWYgdGhlcmUgZXhpc3RzIGEgc2ltaWxhciBtb3ZpbmcgcGllY2Ugb24gdGhlIHNhbWUgcmFuayBhbmQgZmlsZSBhc1xuICAgICAgICogdGhlIG1vdmUgaW4gcXVlc3Rpb24sIHVzZSB0aGUgc3F1YXJlIGFzIHRoZSBkaXNhbWJpZ3VhdG9yXG4gICAgICAgKi9cbiAgICAgIGlmIChzYW1lX3JhbmsgPiAwICYmIHNhbWVfZmlsZSA+IDApIHtcbiAgICAgICAgcmV0dXJuIGFsZ2VicmFpYyhmcm9tKTtcbiAgICAgIH1cbiAgICAgIC8qIGlmIHRoZSBtb3ZpbmcgcGllY2UgcmVzdHMgb24gdGhlIHNhbWUgZmlsZSwgdXNlIHRoZSByYW5rIHN5bWJvbCBhcyB0aGVcbiAgICAgICAqIGRpc2FtYmlndWF0b3JcbiAgICAgICAqL1xuICAgICAgZWxzZSBpZiAoc2FtZV9maWxlID4gMCkge1xuICAgICAgICByZXR1cm4gYWxnZWJyYWljKGZyb20pLmNoYXJBdCgxKTtcbiAgICAgIH1cbiAgICAgIC8qIGVsc2UgdXNlIHRoZSBmaWxlIHN5bWJvbCAqL1xuICAgICAgZWxzZSB7XG4gICAgICAgIHJldHVybiBhbGdlYnJhaWMoZnJvbSkuY2hhckF0KDApO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiAnJztcbiAgfVxuXG4gIGZ1bmN0aW9uIGFzY2lpKCkge1xuICAgIHZhciBzID0gJyAgICstLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0rXFxuJztcbiAgICBmb3IgKHZhciBpID0gU1FVQVJFUy5hODsgaSA8PSBTUVVBUkVTLmgxOyBpKyspIHtcbiAgICAgIC8qIGRpc3BsYXkgdGhlIHJhbmsgKi9cbiAgICAgIGlmIChmaWxlKGkpID09PSAwKSB7XG4gICAgICAgIHMgKz0gJyAnICsgJzg3NjU0MzIxJ1tyYW5rKGkpXSArICcgfCc7XG4gICAgICB9XG5cbiAgICAgIC8qIGVtcHR5IHBpZWNlICovXG4gICAgICBpZiAoYm9hcmRbaV0gPT0gbnVsbCkge1xuICAgICAgICBzICs9ICcgLiAnO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIHBpZWNlID0gYm9hcmRbaV0udHlwZTtcbiAgICAgICAgdmFyIGNvbG9yID0gYm9hcmRbaV0uY29sb3I7XG4gICAgICAgIHZhciBzeW1ib2wgPSAoY29sb3IgPT09IFdISVRFKSA/XG4gICAgICAgICAgICAgICAgICAgICBwaWVjZS50b1VwcGVyQ2FzZSgpIDogcGllY2UudG9Mb3dlckNhc2UoKTtcbiAgICAgICAgcyArPSAnICcgKyBzeW1ib2wgKyAnICc7XG4gICAgICB9XG5cbiAgICAgIGlmICgoaSArIDEpICYgMHg4OCkge1xuICAgICAgICBzICs9ICd8XFxuJztcbiAgICAgICAgaSArPSA4O1xuICAgICAgfVxuICAgIH1cbiAgICBzICs9ICcgICArLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tK1xcbic7XG4gICAgcyArPSAnICAgICBhICBiICBjICBkICBlICBmICBnICBoXFxuJztcblxuICAgIHJldHVybiBzO1xuICB9XG5cbiAgLy8gY29udmVydCBhIG1vdmUgZnJvbSBTdGFuZGFyZCBBbGdlYnJhaWMgTm90YXRpb24gKFNBTikgdG8gMHg4OCBjb29yZGluYXRlc1xuICBmdW5jdGlvbiBtb3ZlX2Zyb21fc2FuKG1vdmUsIHNsb3BweSkge1xuICAgIC8vIHN0cmlwIG9mZiBhbnkgbW92ZSBkZWNvcmF0aW9uczogZS5nIE5mMys/IVxuICAgIHZhciBjbGVhbl9tb3ZlID0gc3RyaXBwZWRfc2FuKG1vdmUpO1xuXG4gICAgLy8gaWYgd2UncmUgdXNpbmcgdGhlIHNsb3BweSBwYXJzZXIgcnVuIGEgcmVnZXggdG8gZ3JhYiBwaWVjZSwgdG8sIGFuZCBmcm9tXG4gICAgLy8gdGhpcyBzaG91bGQgcGFyc2UgaW52YWxpZCBTQU4gbGlrZTogUGUyLWU0LCBSYzFjNCwgUWYzeGY3XG4gICAgaWYgKHNsb3BweSkge1xuICAgICAgdmFyIG1hdGNoZXMgPSBjbGVhbl9tb3ZlLm1hdGNoKC8oW3BuYnJxa1BOQlJRS10pPyhbYS1oXVsxLThdKXg/LT8oW2EtaF1bMS04XSkoW3FyYm5RUkJOXSk/Lyk7XG4gICAgICBpZiAobWF0Y2hlcykge1xuICAgICAgICB2YXIgcGllY2UgPSBtYXRjaGVzWzFdO1xuICAgICAgICB2YXIgZnJvbSA9IG1hdGNoZXNbMl07XG4gICAgICAgIHZhciB0byA9IG1hdGNoZXNbM107XG4gICAgICAgIHZhciBwcm9tb3Rpb24gPSBtYXRjaGVzWzRdO1xuICAgICAgfVxuICAgIH1cblxuICAgIHZhciBtb3ZlcyA9IGdlbmVyYXRlX21vdmVzKCk7XG4gICAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IG1vdmVzLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAvLyB0cnkgdGhlIHN0cmljdCBwYXJzZXIgZmlyc3QsIHRoZW4gdGhlIHNsb3BweSBwYXJzZXIgaWYgcmVxdWVzdGVkXG4gICAgICAvLyBieSB0aGUgdXNlclxuICAgICAgaWYgKChjbGVhbl9tb3ZlID09PSBzdHJpcHBlZF9zYW4obW92ZV90b19zYW4obW92ZXNbaV0pKSkgfHxcbiAgICAgICAgICAoc2xvcHB5ICYmIGNsZWFuX21vdmUgPT09IHN0cmlwcGVkX3Nhbihtb3ZlX3RvX3Nhbihtb3Zlc1tpXSwgdHJ1ZSkpKSkge1xuICAgICAgICByZXR1cm4gbW92ZXNbaV07XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpZiAobWF0Y2hlcyAmJlxuICAgICAgICAgICAgKCFwaWVjZSB8fCBwaWVjZS50b0xvd2VyQ2FzZSgpID09IG1vdmVzW2ldLnBpZWNlKSAmJlxuICAgICAgICAgICAgU1FVQVJFU1tmcm9tXSA9PSBtb3Zlc1tpXS5mcm9tICYmXG4gICAgICAgICAgICBTUVVBUkVTW3RvXSA9PSBtb3Zlc1tpXS50byAmJlxuICAgICAgICAgICAgKCFwcm9tb3Rpb24gfHwgcHJvbW90aW9uLnRvTG93ZXJDYXNlKCkgPT0gbW92ZXNbaV0ucHJvbW90aW9uKSkge1xuICAgICAgICAgIHJldHVybiBtb3Zlc1tpXTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBudWxsO1xuICB9XG5cblxuICAvKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbiAgICogVVRJTElUWSBGVU5DVElPTlNcbiAgICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG4gIGZ1bmN0aW9uIHJhbmsoaSkge1xuICAgIHJldHVybiBpID4+IDQ7XG4gIH1cblxuICBmdW5jdGlvbiBmaWxlKGkpIHtcbiAgICByZXR1cm4gaSAmIDE1O1xuICB9XG5cbiAgZnVuY3Rpb24gYWxnZWJyYWljKGkpe1xuICAgIHZhciBmID0gZmlsZShpKSwgciA9IHJhbmsoaSk7XG4gICAgcmV0dXJuICdhYmNkZWZnaCcuc3Vic3RyaW5nKGYsZisxKSArICc4NzY1NDMyMScuc3Vic3RyaW5nKHIscisxKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHN3YXBfY29sb3IoYykge1xuICAgIHJldHVybiBjID09PSBXSElURSA/IEJMQUNLIDogV0hJVEU7XG4gIH1cblxuICBmdW5jdGlvbiBpc19kaWdpdChjKSB7XG4gICAgcmV0dXJuICcwMTIzNDU2Nzg5Jy5pbmRleE9mKGMpICE9PSAtMTtcbiAgfVxuXG4gIC8qIHByZXR0eSA9IGV4dGVybmFsIG1vdmUgb2JqZWN0ICovXG4gIGZ1bmN0aW9uIG1ha2VfcHJldHR5KHVnbHlfbW92ZSkge1xuICAgIHZhciBtb3ZlID0gY2xvbmUodWdseV9tb3ZlKTtcbiAgICBtb3ZlLnNhbiA9IG1vdmVfdG9fc2FuKG1vdmUsIGZhbHNlKTtcbiAgICBtb3ZlLnRvID0gYWxnZWJyYWljKG1vdmUudG8pO1xuICAgIG1vdmUuZnJvbSA9IGFsZ2VicmFpYyhtb3ZlLmZyb20pO1xuXG4gICAgdmFyIGZsYWdzID0gJyc7XG5cbiAgICBmb3IgKHZhciBmbGFnIGluIEJJVFMpIHtcbiAgICAgIGlmIChCSVRTW2ZsYWddICYgbW92ZS5mbGFncykge1xuICAgICAgICBmbGFncyArPSBGTEFHU1tmbGFnXTtcbiAgICAgIH1cbiAgICB9XG4gICAgbW92ZS5mbGFncyA9IGZsYWdzO1xuXG4gICAgcmV0dXJuIG1vdmU7XG4gIH1cblxuICBmdW5jdGlvbiBjbG9uZShvYmopIHtcbiAgICB2YXIgZHVwZSA9IChvYmogaW5zdGFuY2VvZiBBcnJheSkgPyBbXSA6IHt9O1xuXG4gICAgZm9yICh2YXIgcHJvcGVydHkgaW4gb2JqKSB7XG4gICAgICBpZiAodHlwZW9mIHByb3BlcnR5ID09PSAnb2JqZWN0Jykge1xuICAgICAgICBkdXBlW3Byb3BlcnR5XSA9IGNsb25lKG9ialtwcm9wZXJ0eV0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZHVwZVtwcm9wZXJ0eV0gPSBvYmpbcHJvcGVydHldO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBkdXBlO1xuICB9XG5cbiAgZnVuY3Rpb24gdHJpbShzdHIpIHtcbiAgICByZXR1cm4gc3RyLnJlcGxhY2UoL15cXHMrfFxccyskL2csICcnKTtcbiAgfVxuXG4gIC8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuICAgKiBERUJVR0dJTkcgVVRJTElUSUVTXG4gICAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuICBmdW5jdGlvbiBwZXJmdChkZXB0aCkge1xuICAgIHZhciBtb3ZlcyA9IGdlbmVyYXRlX21vdmVzKHtsZWdhbDogZmFsc2V9KTtcbiAgICB2YXIgbm9kZXMgPSAwO1xuICAgIHZhciBjb2xvciA9IHR1cm47XG5cbiAgICBmb3IgKHZhciBpID0gMCwgbGVuID0gbW92ZXMubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgIG1ha2VfbW92ZShtb3Zlc1tpXSk7XG4gICAgICBpZiAoIWtpbmdfYXR0YWNrZWQoY29sb3IpKSB7XG4gICAgICAgIGlmIChkZXB0aCAtIDEgPiAwKSB7XG4gICAgICAgICAgdmFyIGNoaWxkX25vZGVzID0gcGVyZnQoZGVwdGggLSAxKTtcbiAgICAgICAgICBub2RlcyArPSBjaGlsZF9ub2RlcztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBub2RlcysrO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICB1bmRvX21vdmUoKTtcbiAgICB9XG5cbiAgICByZXR1cm4gbm9kZXM7XG4gIH1cblxuICByZXR1cm4ge1xuICAgIC8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbiAgICAgKiBQVUJMSUMgQ09OU1RBTlRTIChpcyB0aGVyZSBhIGJldHRlciB3YXkgdG8gZG8gdGhpcz8pXG4gICAgICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuICAgIFdISVRFOiBXSElURSxcbiAgICBCTEFDSzogQkxBQ0ssXG4gICAgUEFXTjogUEFXTixcbiAgICBLTklHSFQ6IEtOSUdIVCxcbiAgICBCSVNIT1A6IEJJU0hPUCxcbiAgICBST09LOiBST09LLFxuICAgIFFVRUVOOiBRVUVFTixcbiAgICBLSU5HOiBLSU5HLFxuICAgIFNRVUFSRVM6IChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAvKiBmcm9tIHRoZSBFQ01BLTI2MiBzcGVjIChzZWN0aW9uIDEyLjYuNCk6XG4gICAgICAgICAgICAgICAgICogXCJUaGUgbWVjaGFuaWNzIG9mIGVudW1lcmF0aW5nIHRoZSBwcm9wZXJ0aWVzIC4uLiBpc1xuICAgICAgICAgICAgICAgICAqIGltcGxlbWVudGF0aW9uIGRlcGVuZGVudFwiXG4gICAgICAgICAgICAgICAgICogc286IGZvciAodmFyIHNxIGluIFNRVUFSRVMpIHsga2V5cy5wdXNoKHNxKTsgfSBtaWdodCBub3QgYmVcbiAgICAgICAgICAgICAgICAgKiBvcmRlcmVkIGNvcnJlY3RseVxuICAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgIHZhciBrZXlzID0gW107XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IFNRVUFSRVMuYTg7IGkgPD0gU1FVQVJFUy5oMTsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICBpZiAoaSAmIDB4ODgpIHsgaSArPSA3OyBjb250aW51ZTsgfVxuICAgICAgICAgICAgICAgICAga2V5cy5wdXNoKGFsZ2VicmFpYyhpKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBrZXlzO1xuICAgICAgICAgICAgICB9KSgpLFxuICAgIEZMQUdTOiBGTEFHUyxcblxuICAgIC8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbiAgICAgKiBQVUJMSUMgQVBJXG4gICAgICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuICAgIGxvYWQ6IGZ1bmN0aW9uKGZlbikge1xuICAgICAgcmV0dXJuIGxvYWQoZmVuKTtcbiAgICB9LFxuXG4gICAgcmVzZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHJlc2V0KCk7XG4gICAgfSxcblxuICAgIG1vdmVzOiBmdW5jdGlvbihvcHRpb25zKSB7XG4gICAgICAvKiBUaGUgaW50ZXJuYWwgcmVwcmVzZW50YXRpb24gb2YgYSBjaGVzcyBtb3ZlIGlzIGluIDB4ODggZm9ybWF0LCBhbmRcbiAgICAgICAqIG5vdCBtZWFudCB0byBiZSBodW1hbi1yZWFkYWJsZS4gIFRoZSBjb2RlIGJlbG93IGNvbnZlcnRzIHRoZSAweDg4XG4gICAgICAgKiBzcXVhcmUgY29vcmRpbmF0ZXMgdG8gYWxnZWJyYWljIGNvb3JkaW5hdGVzLiAgSXQgYWxzbyBwcnVuZXMgYW5cbiAgICAgICAqIHVubmVjZXNzYXJ5IG1vdmUga2V5cyByZXN1bHRpbmcgZnJvbSBhIHZlcmJvc2UgY2FsbC5cbiAgICAgICAqL1xuXG4gICAgICB2YXIgdWdseV9tb3ZlcyA9IGdlbmVyYXRlX21vdmVzKG9wdGlvbnMpO1xuICAgICAgdmFyIG1vdmVzID0gW107XG5cbiAgICAgIGZvciAodmFyIGkgPSAwLCBsZW4gPSB1Z2x5X21vdmVzLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG5cbiAgICAgICAgLyogZG9lcyB0aGUgdXNlciB3YW50IGEgZnVsbCBtb3ZlIG9iamVjdCAobW9zdCBsaWtlbHkgbm90KSwgb3IganVzdFxuICAgICAgICAgKiBTQU5cbiAgICAgICAgICovXG4gICAgICAgIGlmICh0eXBlb2Ygb3B0aW9ucyAhPT0gJ3VuZGVmaW5lZCcgJiYgJ3ZlcmJvc2UnIGluIG9wdGlvbnMgJiZcbiAgICAgICAgICAgIG9wdGlvbnMudmVyYm9zZSkge1xuICAgICAgICAgIG1vdmVzLnB1c2gobWFrZV9wcmV0dHkodWdseV9tb3Zlc1tpXSkpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIG1vdmVzLnB1c2gobW92ZV90b19zYW4odWdseV9tb3Zlc1tpXSwgZmFsc2UpKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICByZXR1cm4gbW92ZXM7XG4gICAgfSxcblxuICAgIGluX2NoZWNrOiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBpbl9jaGVjaygpO1xuICAgIH0sXG5cbiAgICBpbl9jaGVja21hdGU6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIGluX2NoZWNrbWF0ZSgpO1xuICAgIH0sXG5cbiAgICBpbl9zdGFsZW1hdGU6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIGluX3N0YWxlbWF0ZSgpO1xuICAgIH0sXG5cbiAgICBpbl9kcmF3OiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBoYWxmX21vdmVzID49IDEwMCB8fFxuICAgICAgICAgICAgIGluX3N0YWxlbWF0ZSgpIHx8XG4gICAgICAgICAgICAgaW5zdWZmaWNpZW50X21hdGVyaWFsKCkgfHxcbiAgICAgICAgICAgICBpbl90aHJlZWZvbGRfcmVwZXRpdGlvbigpO1xuICAgIH0sXG5cbiAgICBpbnN1ZmZpY2llbnRfbWF0ZXJpYWw6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIGluc3VmZmljaWVudF9tYXRlcmlhbCgpO1xuICAgIH0sXG5cbiAgICBpbl90aHJlZWZvbGRfcmVwZXRpdGlvbjogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gaW5fdGhyZWVmb2xkX3JlcGV0aXRpb24oKTtcbiAgICB9LFxuXG4gICAgZ2FtZV9vdmVyOiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBoYWxmX21vdmVzID49IDEwMCB8fFxuICAgICAgICAgICAgIGluX2NoZWNrbWF0ZSgpIHx8XG4gICAgICAgICAgICAgaW5fc3RhbGVtYXRlKCkgfHxcbiAgICAgICAgICAgICBpbnN1ZmZpY2llbnRfbWF0ZXJpYWwoKSB8fFxuICAgICAgICAgICAgIGluX3RocmVlZm9sZF9yZXBldGl0aW9uKCk7XG4gICAgfSxcblxuICAgIHZhbGlkYXRlX2ZlbjogZnVuY3Rpb24oZmVuKSB7XG4gICAgICByZXR1cm4gdmFsaWRhdGVfZmVuKGZlbik7XG4gICAgfSxcblxuICAgIGZlbjogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gZ2VuZXJhdGVfZmVuKCk7XG4gICAgfSxcblxuICAgIHBnbjogZnVuY3Rpb24ob3B0aW9ucykge1xuICAgICAgLyogdXNpbmcgdGhlIHNwZWNpZmljYXRpb24gZnJvbSBodHRwOi8vd3d3LmNoZXNzY2x1Yi5jb20vaGVscC9QR04tc3BlY1xuICAgICAgICogZXhhbXBsZSBmb3IgaHRtbCB1c2FnZTogLnBnbih7IG1heF93aWR0aDogNzIsIG5ld2xpbmVfY2hhcjogXCI8YnIgLz5cIiB9KVxuICAgICAgICovXG4gICAgICB2YXIgbmV3bGluZSA9ICh0eXBlb2Ygb3B0aW9ucyA9PT0gJ29iamVjdCcgJiZcbiAgICAgICAgICAgICAgICAgICAgIHR5cGVvZiBvcHRpb25zLm5ld2xpbmVfY2hhciA9PT0gJ3N0cmluZycpID9cbiAgICAgICAgICAgICAgICAgICAgIG9wdGlvbnMubmV3bGluZV9jaGFyIDogJ1xcbic7XG4gICAgICB2YXIgbWF4X3dpZHRoID0gKHR5cGVvZiBvcHRpb25zID09PSAnb2JqZWN0JyAmJlxuICAgICAgICAgICAgICAgICAgICAgICB0eXBlb2Ygb3B0aW9ucy5tYXhfd2lkdGggPT09ICdudW1iZXInKSA/XG4gICAgICAgICAgICAgICAgICAgICAgIG9wdGlvbnMubWF4X3dpZHRoIDogMDtcbiAgICAgIHZhciByZXN1bHQgPSBbXTtcbiAgICAgIHZhciBoZWFkZXJfZXhpc3RzID0gZmFsc2U7XG5cbiAgICAgIC8qIGFkZCB0aGUgUEdOIGhlYWRlciBoZWFkZXJybWF0aW9uICovXG4gICAgICBmb3IgKHZhciBpIGluIGhlYWRlcikge1xuICAgICAgICAvKiBUT0RPOiBvcmRlciBvZiBlbnVtZXJhdGVkIHByb3BlcnRpZXMgaW4gaGVhZGVyIG9iamVjdCBpcyBub3RcbiAgICAgICAgICogZ3VhcmFudGVlZCwgc2VlIEVDTUEtMjYyIHNwZWMgKHNlY3Rpb24gMTIuNi40KVxuICAgICAgICAgKi9cbiAgICAgICAgcmVzdWx0LnB1c2goJ1snICsgaSArICcgXFxcIicgKyBoZWFkZXJbaV0gKyAnXFxcIl0nICsgbmV3bGluZSk7XG4gICAgICAgIGhlYWRlcl9leGlzdHMgPSB0cnVlO1xuICAgICAgfVxuXG4gICAgICBpZiAoaGVhZGVyX2V4aXN0cyAmJiBoaXN0b3J5Lmxlbmd0aCkge1xuICAgICAgICByZXN1bHQucHVzaChuZXdsaW5lKTtcbiAgICAgIH1cblxuICAgICAgLyogcG9wIGFsbCBvZiBoaXN0b3J5IG9udG8gcmV2ZXJzZWRfaGlzdG9yeSAqL1xuICAgICAgdmFyIHJldmVyc2VkX2hpc3RvcnkgPSBbXTtcbiAgICAgIHdoaWxlIChoaXN0b3J5Lmxlbmd0aCA+IDApIHtcbiAgICAgICAgcmV2ZXJzZWRfaGlzdG9yeS5wdXNoKHVuZG9fbW92ZSgpKTtcbiAgICAgIH1cblxuICAgICAgdmFyIG1vdmVzID0gW107XG4gICAgICB2YXIgbW92ZV9zdHJpbmcgPSAnJztcblxuICAgICAgLyogYnVpbGQgdGhlIGxpc3Qgb2YgbW92ZXMuICBhIG1vdmVfc3RyaW5nIGxvb2tzIGxpa2U6IFwiMy4gZTMgZTZcIiAqL1xuICAgICAgd2hpbGUgKHJldmVyc2VkX2hpc3RvcnkubGVuZ3RoID4gMCkge1xuICAgICAgICB2YXIgbW92ZSA9IHJldmVyc2VkX2hpc3RvcnkucG9wKCk7XG5cbiAgICAgICAgLyogaWYgdGhlIHBvc2l0aW9uIHN0YXJ0ZWQgd2l0aCBibGFjayB0byBtb3ZlLCBzdGFydCBQR04gd2l0aCAxLiAuLi4gKi9cbiAgICAgICAgaWYgKCFoaXN0b3J5Lmxlbmd0aCAmJiBtb3ZlLmNvbG9yID09PSAnYicpIHtcbiAgICAgICAgICBtb3ZlX3N0cmluZyA9IG1vdmVfbnVtYmVyICsgJy4gLi4uJztcbiAgICAgICAgfSBlbHNlIGlmIChtb3ZlLmNvbG9yID09PSAndycpIHtcbiAgICAgICAgICAvKiBzdG9yZSB0aGUgcHJldmlvdXMgZ2VuZXJhdGVkIG1vdmVfc3RyaW5nIGlmIHdlIGhhdmUgb25lICovXG4gICAgICAgICAgaWYgKG1vdmVfc3RyaW5nLmxlbmd0aCkge1xuICAgICAgICAgICAgbW92ZXMucHVzaChtb3ZlX3N0cmluZyk7XG4gICAgICAgICAgfVxuICAgICAgICAgIG1vdmVfc3RyaW5nID0gbW92ZV9udW1iZXIgKyAnLic7XG4gICAgICAgIH1cblxuICAgICAgICBtb3ZlX3N0cmluZyA9IG1vdmVfc3RyaW5nICsgJyAnICsgbW92ZV90b19zYW4obW92ZSwgZmFsc2UpO1xuICAgICAgICBtYWtlX21vdmUobW92ZSk7XG4gICAgICB9XG5cbiAgICAgIC8qIGFyZSB0aGVyZSBhbnkgb3RoZXIgbGVmdG92ZXIgbW92ZXM/ICovXG4gICAgICBpZiAobW92ZV9zdHJpbmcubGVuZ3RoKSB7XG4gICAgICAgIG1vdmVzLnB1c2gobW92ZV9zdHJpbmcpO1xuICAgICAgfVxuXG4gICAgICAvKiBpcyB0aGVyZSBhIHJlc3VsdD8gKi9cbiAgICAgIGlmICh0eXBlb2YgaGVhZGVyLlJlc3VsdCAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgbW92ZXMucHVzaChoZWFkZXIuUmVzdWx0KTtcbiAgICAgIH1cblxuICAgICAgLyogaGlzdG9yeSBzaG91bGQgYmUgYmFjayB0byB3aGF0IGlzIHdhcyBiZWZvcmUgd2Ugc3RhcnRlZCBnZW5lcmF0aW5nIFBHTixcbiAgICAgICAqIHNvIGpvaW4gdG9nZXRoZXIgbW92ZXNcbiAgICAgICAqL1xuICAgICAgaWYgKG1heF93aWR0aCA9PT0gMCkge1xuICAgICAgICByZXR1cm4gcmVzdWx0LmpvaW4oJycpICsgbW92ZXMuam9pbignICcpO1xuICAgICAgfVxuXG4gICAgICAvKiB3cmFwIHRoZSBQR04gb3V0cHV0IGF0IG1heF93aWR0aCAqL1xuICAgICAgdmFyIGN1cnJlbnRfd2lkdGggPSAwO1xuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBtb3Zlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAvKiBpZiB0aGUgY3VycmVudCBtb3ZlIHdpbGwgcHVzaCBwYXN0IG1heF93aWR0aCAqL1xuICAgICAgICBpZiAoY3VycmVudF93aWR0aCArIG1vdmVzW2ldLmxlbmd0aCA+IG1heF93aWR0aCAmJiBpICE9PSAwKSB7XG5cbiAgICAgICAgICAvKiBkb24ndCBlbmQgdGhlIGxpbmUgd2l0aCB3aGl0ZXNwYWNlICovXG4gICAgICAgICAgaWYgKHJlc3VsdFtyZXN1bHQubGVuZ3RoIC0gMV0gPT09ICcgJykge1xuICAgICAgICAgICAgcmVzdWx0LnBvcCgpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHJlc3VsdC5wdXNoKG5ld2xpbmUpO1xuICAgICAgICAgIGN1cnJlbnRfd2lkdGggPSAwO1xuICAgICAgICB9IGVsc2UgaWYgKGkgIT09IDApIHtcbiAgICAgICAgICByZXN1bHQucHVzaCgnICcpO1xuICAgICAgICAgIGN1cnJlbnRfd2lkdGgrKztcbiAgICAgICAgfVxuICAgICAgICByZXN1bHQucHVzaChtb3Zlc1tpXSk7XG4gICAgICAgIGN1cnJlbnRfd2lkdGggKz0gbW92ZXNbaV0ubGVuZ3RoO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gcmVzdWx0LmpvaW4oJycpO1xuICAgIH0sXG5cbiAgICBsb2FkX3BnbjogZnVuY3Rpb24ocGduLCBvcHRpb25zKSB7XG4gICAgICAvLyBhbGxvdyB0aGUgdXNlciB0byBzcGVjaWZ5IHRoZSBzbG9wcHkgbW92ZSBwYXJzZXIgdG8gd29yayBhcm91bmQgb3ZlclxuICAgICAgLy8gZGlzYW1iaWd1YXRpb24gYnVncyBpbiBGcml0eiBhbmQgQ2hlc3NiYXNlXG4gICAgICB2YXIgc2xvcHB5ID0gKHR5cGVvZiBvcHRpb25zICE9PSAndW5kZWZpbmVkJyAmJiAnc2xvcHB5JyBpbiBvcHRpb25zKSA/XG4gICAgICAgICAgICAgICAgICAgIG9wdGlvbnMuc2xvcHB5IDogZmFsc2U7XG5cbiAgICAgIGZ1bmN0aW9uIG1hc2soc3RyKSB7XG4gICAgICAgIHJldHVybiBzdHIucmVwbGFjZSgvXFxcXC9nLCAnXFxcXCcpO1xuICAgICAgfVxuXG4gICAgICBmdW5jdGlvbiBoYXNfa2V5cyhvYmplY3QpIHtcbiAgICAgICAgZm9yICh2YXIga2V5IGluIG9iamVjdCkge1xuICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cblxuICAgICAgZnVuY3Rpb24gcGFyc2VfcGduX2hlYWRlcihoZWFkZXIsIG9wdGlvbnMpIHtcbiAgICAgICAgdmFyIG5ld2xpbmVfY2hhciA9ICh0eXBlb2Ygb3B0aW9ucyA9PT0gJ29iamVjdCcgJiZcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlb2Ygb3B0aW9ucy5uZXdsaW5lX2NoYXIgPT09ICdzdHJpbmcnKSA/XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb3B0aW9ucy5uZXdsaW5lX2NoYXIgOiAnXFxyP1xcbic7XG4gICAgICAgIHZhciBoZWFkZXJfb2JqID0ge307XG4gICAgICAgIHZhciBoZWFkZXJzID0gaGVhZGVyLnNwbGl0KG5ldyBSZWdFeHAobWFzayhuZXdsaW5lX2NoYXIpKSk7XG4gICAgICAgIHZhciBrZXkgPSAnJztcbiAgICAgICAgdmFyIHZhbHVlID0gJyc7XG5cbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBoZWFkZXJzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAga2V5ID0gaGVhZGVyc1tpXS5yZXBsYWNlKC9eXFxbKFtBLVpdW0EtWmEtel0qKVxccy4qXFxdJC8sICckMScpO1xuICAgICAgICAgIHZhbHVlID0gaGVhZGVyc1tpXS5yZXBsYWNlKC9eXFxbW0EtWmEtel0rXFxzXCIoLiopXCJcXF0kLywgJyQxJyk7XG4gICAgICAgICAgaWYgKHRyaW0oa2V5KS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBoZWFkZXJfb2JqW2tleV0gPSB2YWx1ZTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gaGVhZGVyX29iajtcbiAgICAgIH1cblxuICAgICAgdmFyIG5ld2xpbmVfY2hhciA9ICh0eXBlb2Ygb3B0aW9ucyA9PT0gJ29iamVjdCcgJiZcbiAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZW9mIG9wdGlvbnMubmV3bGluZV9jaGFyID09PSAnc3RyaW5nJykgP1xuICAgICAgICAgICAgICAgICAgICAgICAgICBvcHRpb25zLm5ld2xpbmVfY2hhciA6ICdcXHI/XFxuJztcbiAgICAgIHZhciByZWdleCA9IG5ldyBSZWdFeHAoJ14oXFxcXFsoLnwnICsgbWFzayhuZXdsaW5lX2NoYXIpICsgJykqXFxcXF0pJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICcoJyArIG1hc2sobmV3bGluZV9jaGFyKSArICcpKicgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnMS4oJyArIG1hc2sobmV3bGluZV9jaGFyKSArICd8LikqJCcsICdnJyk7XG5cbiAgICAgIC8qIGdldCBoZWFkZXIgcGFydCBvZiB0aGUgUEdOIGZpbGUgKi9cbiAgICAgIHZhciBoZWFkZXJfc3RyaW5nID0gcGduLnJlcGxhY2UocmVnZXgsICckMScpO1xuXG4gICAgICAvKiBubyBpbmZvIHBhcnQgZ2l2ZW4sIGJlZ2lucyB3aXRoIG1vdmVzICovXG4gICAgICBpZiAoaGVhZGVyX3N0cmluZ1swXSAhPT0gJ1snKSB7XG4gICAgICAgIGhlYWRlcl9zdHJpbmcgPSAnJztcbiAgICAgIH1cblxuICAgICAgcmVzZXQoKTtcblxuICAgICAgLyogcGFyc2UgUEdOIGhlYWRlciAqL1xuICAgICAgdmFyIGhlYWRlcnMgPSBwYXJzZV9wZ25faGVhZGVyKGhlYWRlcl9zdHJpbmcsIG9wdGlvbnMpO1xuICAgICAgZm9yICh2YXIga2V5IGluIGhlYWRlcnMpIHtcbiAgICAgICAgc2V0X2hlYWRlcihba2V5LCBoZWFkZXJzW2tleV1dKTtcbiAgICAgIH1cblxuICAgICAgLyogbG9hZCB0aGUgc3RhcnRpbmcgcG9zaXRpb24gaW5kaWNhdGVkIGJ5IFtTZXR1cCAnMSddIGFuZFxuICAgICAgKiBbRkVOIHBvc2l0aW9uXSAqL1xuICAgICAgaWYgKGhlYWRlcnNbJ1NldFVwJ10gPT09ICcxJykge1xuICAgICAgICAgIGlmICghKCgnRkVOJyBpbiBoZWFkZXJzKSAmJiBsb2FkKGhlYWRlcnNbJ0ZFTiddKSkpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIC8qIGRlbGV0ZSBoZWFkZXIgdG8gZ2V0IHRoZSBtb3ZlcyAqL1xuICAgICAgdmFyIG1zID0gcGduLnJlcGxhY2UoaGVhZGVyX3N0cmluZywgJycpLnJlcGxhY2UobmV3IFJlZ0V4cChtYXNrKG5ld2xpbmVfY2hhciksICdnJyksICcgJyk7XG5cbiAgICAgIC8qIGRlbGV0ZSBjb21tZW50cyAqL1xuICAgICAgbXMgPSBtcy5yZXBsYWNlKC8oXFx7W159XStcXH0pKz8vZywgJycpO1xuXG4gICAgICAvKiBkZWxldGUgcmVjdXJzaXZlIGFubm90YXRpb24gdmFyaWF0aW9ucyAqL1xuICAgICAgdmFyIHJhdl9yZWdleCA9IC8oXFwoW15cXChcXCldK1xcKSkrPy9nXG4gICAgICB3aGlsZSAocmF2X3JlZ2V4LnRlc3QobXMpKSB7XG4gICAgICAgIG1zID0gbXMucmVwbGFjZShyYXZfcmVnZXgsICcnKTtcbiAgICAgIH1cblxuICAgICAgLyogZGVsZXRlIG1vdmUgbnVtYmVycyAqL1xuICAgICAgbXMgPSBtcy5yZXBsYWNlKC9cXGQrXFwuKFxcLlxcLik/L2csICcnKTtcblxuICAgICAgLyogZGVsZXRlIC4uLiBpbmRpY2F0aW5nIGJsYWNrIHRvIG1vdmUgKi9cbiAgICAgIG1zID0gbXMucmVwbGFjZSgvXFwuXFwuXFwuL2csICcnKTtcblxuICAgICAgLyogZGVsZXRlIG51bWVyaWMgYW5ub3RhdGlvbiBnbHlwaHMgKi9cbiAgICAgIG1zID0gbXMucmVwbGFjZSgvXFwkXFxkKy9nLCAnJyk7XG5cbiAgICAgIC8qIHRyaW0gYW5kIGdldCBhcnJheSBvZiBtb3ZlcyAqL1xuICAgICAgdmFyIG1vdmVzID0gdHJpbShtcykuc3BsaXQobmV3IFJlZ0V4cCgvXFxzKy8pKTtcblxuICAgICAgLyogZGVsZXRlIGVtcHR5IGVudHJpZXMgKi9cbiAgICAgIG1vdmVzID0gbW92ZXMuam9pbignLCcpLnJlcGxhY2UoLywsKy9nLCAnLCcpLnNwbGl0KCcsJyk7XG4gICAgICB2YXIgbW92ZSA9ICcnO1xuXG4gICAgICBmb3IgKHZhciBoYWxmX21vdmUgPSAwOyBoYWxmX21vdmUgPCBtb3Zlcy5sZW5ndGggLSAxOyBoYWxmX21vdmUrKykge1xuICAgICAgICBtb3ZlID0gbW92ZV9mcm9tX3Nhbihtb3Zlc1toYWxmX21vdmVdLCBzbG9wcHkpO1xuXG4gICAgICAgIC8qIG1vdmUgbm90IHBvc3NpYmxlISAoZG9uJ3QgY2xlYXIgdGhlIGJvYXJkIHRvIGV4YW1pbmUgdG8gc2hvdyB0aGVcbiAgICAgICAgICogbGF0ZXN0IHZhbGlkIHBvc2l0aW9uKVxuICAgICAgICAgKi9cbiAgICAgICAgaWYgKG1vdmUgPT0gbnVsbCkge1xuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBtYWtlX21vdmUobW92ZSk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgLyogZXhhbWluZSBsYXN0IG1vdmUgKi9cbiAgICAgIG1vdmUgPSBtb3Zlc1ttb3Zlcy5sZW5ndGggLSAxXTtcbiAgICAgIGlmIChQT1NTSUJMRV9SRVNVTFRTLmluZGV4T2YobW92ZSkgPiAtMSkge1xuICAgICAgICBpZiAoaGFzX2tleXMoaGVhZGVyKSAmJiB0eXBlb2YgaGVhZGVyLlJlc3VsdCA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICBzZXRfaGVhZGVyKFsnUmVzdWx0JywgbW92ZV0pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBlbHNlIHtcbiAgICAgICAgbW92ZSA9IG1vdmVfZnJvbV9zYW4obW92ZSwgc2xvcHB5KTtcbiAgICAgICAgaWYgKG1vdmUgPT0gbnVsbCkge1xuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBtYWtlX21vdmUobW92ZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH0sXG5cbiAgICBoZWFkZXI6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHNldF9oZWFkZXIoYXJndW1lbnRzKTtcbiAgICB9LFxuXG4gICAgYXNjaWk6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIGFzY2lpKCk7XG4gICAgfSxcblxuICAgIHR1cm46IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHR1cm47XG4gICAgfSxcblxuICAgIG1vdmU6IGZ1bmN0aW9uKG1vdmUsIG9wdGlvbnMpIHtcbiAgICAgIC8qIFRoZSBtb3ZlIGZ1bmN0aW9uIGNhbiBiZSBjYWxsZWQgd2l0aCBpbiB0aGUgZm9sbG93aW5nIHBhcmFtZXRlcnM6XG4gICAgICAgKlxuICAgICAgICogLm1vdmUoJ054YjcnKSAgICAgIDwtIHdoZXJlICdtb3ZlJyBpcyBhIGNhc2Utc2Vuc2l0aXZlIFNBTiBzdHJpbmdcbiAgICAgICAqXG4gICAgICAgKiAubW92ZSh7IGZyb206ICdoNycsIDwtIHdoZXJlIHRoZSAnbW92ZScgaXMgYSBtb3ZlIG9iamVjdCAoYWRkaXRpb25hbFxuICAgICAgICogICAgICAgICB0byA6J2g4JywgICAgICBmaWVsZHMgYXJlIGlnbm9yZWQpXG4gICAgICAgKiAgICAgICAgIHByb21vdGlvbjogJ3EnLFxuICAgICAgICogICAgICB9KVxuICAgICAgICovXG5cbiAgICAgIC8vIGFsbG93IHRoZSB1c2VyIHRvIHNwZWNpZnkgdGhlIHNsb3BweSBtb3ZlIHBhcnNlciB0byB3b3JrIGFyb3VuZCBvdmVyXG4gICAgICAvLyBkaXNhbWJpZ3VhdGlvbiBidWdzIGluIEZyaXR6IGFuZCBDaGVzc2Jhc2VcbiAgICAgIHZhciBzbG9wcHkgPSAodHlwZW9mIG9wdGlvbnMgIT09ICd1bmRlZmluZWQnICYmICdzbG9wcHknIGluIG9wdGlvbnMpID9cbiAgICAgICAgICAgICAgICAgICAgb3B0aW9ucy5zbG9wcHkgOiBmYWxzZTtcblxuICAgICAgdmFyIG1vdmVfb2JqID0gbnVsbDtcblxuICAgICAgaWYgKHR5cGVvZiBtb3ZlID09PSAnc3RyaW5nJykge1xuICAgICAgICBtb3ZlX29iaiA9IG1vdmVfZnJvbV9zYW4obW92ZSwgc2xvcHB5KTtcbiAgICAgIH0gZWxzZSBpZiAodHlwZW9mIG1vdmUgPT09ICdvYmplY3QnKSB7XG4gICAgICAgIHZhciBtb3ZlcyA9IGdlbmVyYXRlX21vdmVzKCk7XG5cbiAgICAgICAgLyogY29udmVydCB0aGUgcHJldHR5IG1vdmUgb2JqZWN0IHRvIGFuIHVnbHkgbW92ZSBvYmplY3QgKi9cbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IG1vdmVzLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgICAgaWYgKG1vdmUuZnJvbSA9PT0gYWxnZWJyYWljKG1vdmVzW2ldLmZyb20pICYmXG4gICAgICAgICAgICAgIG1vdmUudG8gPT09IGFsZ2VicmFpYyhtb3Zlc1tpXS50bykgJiZcbiAgICAgICAgICAgICAgKCEoJ3Byb21vdGlvbicgaW4gbW92ZXNbaV0pIHx8XG4gICAgICAgICAgICAgIG1vdmUucHJvbW90aW9uID09PSBtb3Zlc1tpXS5wcm9tb3Rpb24pKSB7XG4gICAgICAgICAgICBtb3ZlX29iaiA9IG1vdmVzW2ldO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIC8qIGZhaWxlZCB0byBmaW5kIG1vdmUgKi9cbiAgICAgIGlmICghbW92ZV9vYmopIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9XG5cbiAgICAgIC8qIG5lZWQgdG8gbWFrZSBhIGNvcHkgb2YgbW92ZSBiZWNhdXNlIHdlIGNhbid0IGdlbmVyYXRlIFNBTiBhZnRlciB0aGVcbiAgICAgICAqIG1vdmUgaXMgbWFkZVxuICAgICAgICovXG4gICAgICB2YXIgcHJldHR5X21vdmUgPSBtYWtlX3ByZXR0eShtb3ZlX29iaik7XG5cbiAgICAgIG1ha2VfbW92ZShtb3ZlX29iaik7XG5cbiAgICAgIHJldHVybiBwcmV0dHlfbW92ZTtcbiAgICB9LFxuXG4gICAgdW5kbzogZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgbW92ZSA9IHVuZG9fbW92ZSgpO1xuICAgICAgcmV0dXJuIChtb3ZlKSA/IG1ha2VfcHJldHR5KG1vdmUpIDogbnVsbDtcbiAgICB9LFxuXG4gICAgY2xlYXI6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIGNsZWFyKCk7XG4gICAgfSxcblxuICAgIHB1dDogZnVuY3Rpb24ocGllY2UsIHNxdWFyZSkge1xuICAgICAgcmV0dXJuIHB1dChwaWVjZSwgc3F1YXJlKTtcbiAgICB9LFxuXG4gICAgZ2V0OiBmdW5jdGlvbihzcXVhcmUpIHtcbiAgICAgIHJldHVybiBnZXQoc3F1YXJlKTtcbiAgICB9LFxuXG4gICAgcmVtb3ZlOiBmdW5jdGlvbihzcXVhcmUpIHtcbiAgICAgIHJldHVybiByZW1vdmUoc3F1YXJlKTtcbiAgICB9LFxuXG4gICAgcGVyZnQ6IGZ1bmN0aW9uKGRlcHRoKSB7XG4gICAgICByZXR1cm4gcGVyZnQoZGVwdGgpO1xuICAgIH0sXG5cbiAgICBzcXVhcmVfY29sb3I6IGZ1bmN0aW9uKHNxdWFyZSkge1xuICAgICAgaWYgKHNxdWFyZSBpbiBTUVVBUkVTKSB7XG4gICAgICAgIHZhciBzcV8weDg4ID0gU1FVQVJFU1tzcXVhcmVdO1xuICAgICAgICByZXR1cm4gKChyYW5rKHNxXzB4ODgpICsgZmlsZShzcV8weDg4KSkgJSAyID09PSAwKSA/ICdsaWdodCcgOiAnZGFyayc7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBudWxsO1xuICAgIH0sXG5cbiAgICBoaXN0b3J5OiBmdW5jdGlvbihvcHRpb25zKSB7XG4gICAgICB2YXIgcmV2ZXJzZWRfaGlzdG9yeSA9IFtdO1xuICAgICAgdmFyIG1vdmVfaGlzdG9yeSA9IFtdO1xuICAgICAgdmFyIHZlcmJvc2UgPSAodHlwZW9mIG9wdGlvbnMgIT09ICd1bmRlZmluZWQnICYmICd2ZXJib3NlJyBpbiBvcHRpb25zICYmXG4gICAgICAgICAgICAgICAgICAgICBvcHRpb25zLnZlcmJvc2UpO1xuXG4gICAgICB3aGlsZSAoaGlzdG9yeS5sZW5ndGggPiAwKSB7XG4gICAgICAgIHJldmVyc2VkX2hpc3RvcnkucHVzaCh1bmRvX21vdmUoKSk7XG4gICAgICB9XG5cbiAgICAgIHdoaWxlIChyZXZlcnNlZF9oaXN0b3J5Lmxlbmd0aCA+IDApIHtcbiAgICAgICAgdmFyIG1vdmUgPSByZXZlcnNlZF9oaXN0b3J5LnBvcCgpO1xuICAgICAgICBpZiAodmVyYm9zZSkge1xuICAgICAgICAgIG1vdmVfaGlzdG9yeS5wdXNoKG1ha2VfcHJldHR5KG1vdmUpKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBtb3ZlX2hpc3RvcnkucHVzaChtb3ZlX3RvX3Nhbihtb3ZlKSk7XG4gICAgICAgIH1cbiAgICAgICAgbWFrZV9tb3ZlKG1vdmUpO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gbW92ZV9oaXN0b3J5O1xuICAgIH1cblxuICB9O1xufTtcblxuLyogZXhwb3J0IENoZXNzIG9iamVjdCBpZiB1c2luZyBub2RlIG9yIGFueSBvdGhlciBDb21tb25KUyBjb21wYXRpYmxlXG4gKiBlbnZpcm9ubWVudCAqL1xuaWYgKHR5cGVvZiBleHBvcnRzICE9PSAndW5kZWZpbmVkJykgZXhwb3J0cy5DaGVzcyA9IENoZXNzO1xuLyogZXhwb3J0IENoZXNzIG9iamVjdCBmb3IgYW55IFJlcXVpcmVKUyBjb21wYXRpYmxlIGVudmlyb25tZW50ICovXG5pZiAodHlwZW9mIGRlZmluZSAhPT0gJ3VuZGVmaW5lZCcpIGRlZmluZSggZnVuY3Rpb24gKCkgeyByZXR1cm4gQ2hlc3M7ICB9KTtcbiIsInZhciBDaGVzcyA9IHJlcXVpcmUoJ2NoZXNzLmpzJykuQ2hlc3M7XG52YXIgYyA9IHJlcXVpcmUoJy4vY2hlc3N1dGlscycpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKHB1enpsZSkge1xuICAgIHZhciBjaGVzcyA9IG5ldyBDaGVzcygpO1xuICAgIGNoZXNzLmxvYWQocHV6emxlLmZlbik7XG4gICAgYWRkQ2hlY2tpbmdTcXVhcmVzKHB1enpsZS5mZW4sIHB1enpsZS5mZWF0dXJlcyk7XG4gICAgYWRkQ2hlY2tpbmdTcXVhcmVzKGMuZmVuRm9yT3RoZXJTaWRlKHB1enpsZS5mZW4pLCBwdXp6bGUuZmVhdHVyZXMpO1xuICAgIHJldHVybiBwdXp6bGU7XG59O1xuXG5mdW5jdGlvbiBhZGRDaGVja2luZ1NxdWFyZXMoZmVuLCBmZWF0dXJlcykge1xuICAgIHZhciBjaGVzcyA9IG5ldyBDaGVzcygpO1xuICAgIGNoZXNzLmxvYWQoZmVuKTtcbiAgICB2YXIgbW92ZXMgPSBjaGVzcy5tb3Zlcyh7XG4gICAgICAgIHZlcmJvc2U6IHRydWVcbiAgICB9KTtcblxuICAgIHZhciBtYXRlcyA9IG1vdmVzLmZpbHRlcihtb3ZlID0+IC9cXCMvLnRlc3QobW92ZS5zYW4pKTtcbiAgICB2YXIgY2hlY2tzID0gbW92ZXMuZmlsdGVyKG1vdmUgPT4gL1xcKy8udGVzdChtb3ZlLnNhbikpO1xuICAgIGZlYXR1cmVzLnB1c2goe1xuICAgICAgICBkZXNjcmlwdGlvbjogXCJDaGVja2luZyBzcXVhcmVzXCIsXG4gICAgICAgIHNpZGU6IGNoZXNzLnR1cm4oKSxcbiAgICAgICAgdGFyZ2V0czogY2hlY2tzLm1hcChtID0+IHRhcmdldEFuZERpYWdyYW0obS5mcm9tLCBtLnRvLCBjaGVja2luZ01vdmVzKGZlbiwgbSksICfimZQrJykpXG4gICAgfSk7XG5cbiAgICBmZWF0dXJlcy5wdXNoKHtcbiAgICAgICAgZGVzY3JpcHRpb246IFwiTWF0aW5nIHNxdWFyZXNcIixcbiAgICAgICAgc2lkZTogY2hlc3MudHVybigpLFxuICAgICAgICB0YXJnZXRzOiBtYXRlcy5tYXAobSA9PiB0YXJnZXRBbmREaWFncmFtKG0uZnJvbSwgbS50bywgY2hlY2tpbmdNb3ZlcyhmZW4sIG0pLCAn4pmUIycpKVxuICAgIH0pO1xuXG4gICAgaWYgKG1hdGVzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgZmVhdHVyZXMuZm9yRWFjaChmID0+IHtcbiAgICAgICAgICAgIGlmIChmLmRlc2NyaXB0aW9uID09PSBcIk1hdGUtaW4tMSB0aHJlYXRzXCIpIHtcbiAgICAgICAgICAgICAgICBmLnRhcmdldHMgPSBbXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBjaGVja2luZ01vdmVzKGZlbiwgbW92ZSkge1xuICAgIHZhciBjaGVzcyA9IG5ldyBDaGVzcygpO1xuICAgIGNoZXNzLmxvYWQoZmVuKTtcbiAgICBjaGVzcy5tb3ZlKG1vdmUpO1xuICAgIGNoZXNzLmxvYWQoYy5mZW5Gb3JPdGhlclNpZGUoY2hlc3MuZmVuKCkpKTtcbiAgICB2YXIgbW92ZXMgPSBjaGVzcy5tb3Zlcyh7XG4gICAgICAgIHZlcmJvc2U6IHRydWVcbiAgICB9KTtcbiAgICByZXR1cm4gbW92ZXMuZmlsdGVyKG0gPT4gbS5jYXB0dXJlZCAmJiBtLmNhcHR1cmVkLnRvTG93ZXJDYXNlKCkgPT09ICdrJyk7XG59XG5cblxuZnVuY3Rpb24gdGFyZ2V0QW5kRGlhZ3JhbShmcm9tLCB0bywgY2hlY2tzLCBtYXJrZXIpIHtcbiAgICByZXR1cm4ge1xuICAgICAgICB0YXJnZXQ6IHRvLFxuICAgICAgICBtYXJrZXI6IG1hcmtlcixcbiAgICAgICAgZGlhZ3JhbTogW3tcbiAgICAgICAgICAgIG9yaWc6IGZyb20sXG4gICAgICAgICAgICBkZXN0OiB0byxcbiAgICAgICAgICAgIGJydXNoOiAncGFsZUJsdWUnXG4gICAgICAgIH1dLmNvbmNhdChjaGVja3MubWFwKG0gPT4ge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBvcmlnOiBtLmZyb20sXG4gICAgICAgICAgICAgICAgZGVzdDogbS50byxcbiAgICAgICAgICAgICAgICBicnVzaDogJ3JlZCdcbiAgICAgICAgICAgIH07XG4gICAgICAgIH0pKVxuICAgIH07XG59XG4iLCIvKipcbiAqIENoZXNzIGV4dGVuc2lvbnNcbiAqL1xuXG52YXIgQ2hlc3MgPSByZXF1aXJlKCdjaGVzcy5qcycpLkNoZXNzO1xuXG52YXIgYWxsU3F1YXJlcyA9IFsnYTEnLCAnYTInLCAnYTMnLCAnYTQnLCAnYTUnLCAnYTYnLCAnYTcnLCAnYTgnLCAnYjEnLCAnYjInLCAnYjMnLCAnYjQnLCAnYjUnLCAnYjYnLCAnYjcnLCAnYjgnLCAnYzEnLCAnYzInLCAnYzMnLCAnYzQnLCAnYzUnLCAnYzYnLCAnYzcnLCAnYzgnLCAnZDEnLCAnZDInLCAnZDMnLCAnZDQnLCAnZDUnLCAnZDYnLCAnZDcnLCAnZDgnLCAnZTEnLCAnZTInLCAnZTMnLCAnZTQnLCAnZTUnLCAnZTYnLCAnZTcnLCAnZTgnLCAnZjEnLCAnZjInLCAnZjMnLCAnZjQnLCAnZjUnLCAnZjYnLCAnZjcnLCAnZjgnLCAnZzEnLCAnZzInLCAnZzMnLCAnZzQnLCAnZzUnLCAnZzYnLCAnZzcnLCAnZzgnLCAnaDEnLCAnaDInLCAnaDMnLCAnaDQnLCAnaDUnLCAnaDYnLCAnaDcnLCAnaDgnXTtcblxuLyoqXG4gKiBQbGFjZSBraW5nIGF0IHNxdWFyZSBhbmQgZmluZCBvdXQgaWYgaXQgaXMgaW4gY2hlY2suXG4gKi9cbmZ1bmN0aW9uIGlzQ2hlY2tBZnRlclBsYWNpbmdLaW5nQXRTcXVhcmUoZmVuLCBraW5nLCBzcXVhcmUpIHtcbiAgICB2YXIgY2hlc3MgPSBuZXcgQ2hlc3MoZmVuKTtcbiAgICBjaGVzcy5yZW1vdmUoc3F1YXJlKTtcbiAgICBjaGVzcy5yZW1vdmUoa2luZyk7XG4gICAgY2hlc3MucHV0KHtcbiAgICAgICAgdHlwZTogJ2snLFxuICAgICAgICBjb2xvcjogY2hlc3MudHVybigpXG4gICAgfSwgc3F1YXJlKTtcbiAgICByZXR1cm4gY2hlc3MuaW5fY2hlY2soKTtcbn1cblxuXG5mdW5jdGlvbiBtb3Zlc1RoYXRSZXN1bHRJbkNhcHR1cmVUaHJlYXQoZmVuLCBmcm9tLCB0bywgc2FtZVNpZGUpIHtcbiAgICB2YXIgY2hlc3MgPSBuZXcgQ2hlc3MoZmVuKTtcblxuICAgIGlmICghc2FtZVNpZGUpIHtcbiAgICAgICAgLy9udWxsIG1vdmUgZm9yIHBsYXllciB0byBhbGxvdyBvcHBvbmVudCBhIG1vdmVcbiAgICAgICAgY2hlc3MubG9hZChmZW5Gb3JPdGhlclNpZGUoY2hlc3MuZmVuKCkpKTtcbiAgICAgICAgZmVuID0gY2hlc3MuZmVuKCk7XG5cbiAgICB9XG4gICAgdmFyIG1vdmVzID0gY2hlc3MubW92ZXMoe1xuICAgICAgICB2ZXJib3NlOiB0cnVlXG4gICAgfSk7XG4gICAgdmFyIHNxdWFyZXNCZXR3ZWVuID0gYmV0d2Vlbihmcm9tLCB0byk7XG5cbiAgICAvLyBkbyBhbnkgb2YgdGhlIG1vdmVzIHJldmVhbCB0aGUgZGVzaXJlZCBjYXB0dXJlIFxuICAgIHJldHVybiBtb3Zlcy5maWx0ZXIobW92ZSA9PiBzcXVhcmVzQmV0d2Vlbi5pbmRleE9mKG1vdmUuZnJvbSkgIT09IC0xKVxuICAgICAgICAuZmlsdGVyKG0gPT4gZG9lc01vdmVSZXN1bHRJbkNhcHR1cmVUaHJlYXQobSwgZmVuLCBmcm9tLCB0bywgc2FtZVNpZGUpKTtcbn1cblxuZnVuY3Rpb24gZG9lc01vdmVSZXN1bHRJbkNhcHR1cmVUaHJlYXQobW92ZSwgZmVuLCBmcm9tLCB0bywgc2FtZVNpZGUpIHtcbiAgICB2YXIgY2hlc3MgPSBuZXcgQ2hlc3MoZmVuKTtcblxuICAgIC8vYXBwbHkgbW92ZSBvZiBpbnRlcm1lZGlhcnkgcGllY2UgKHN0YXRlIGJlY29tZXMgb3RoZXIgc2lkZXMgdHVybilcbiAgICBjaGVzcy5tb3ZlKG1vdmUpO1xuXG4gICAgLy9jb25zb2xlLmxvZyhjaGVzcy5hc2NpaSgpKTtcbiAgICAvL2NvbnNvbGUubG9nKGNoZXNzLnR1cm4oKSk7XG5cbiAgICBpZiAoc2FtZVNpZGUpIHtcbiAgICAgICAgLy9udWxsIG1vdmUgZm9yIG9wcG9uZW50IHRvIHJlZ2FpbiB0aGUgbW92ZSBmb3Igb3JpZ2luYWwgc2lkZVxuICAgICAgICBjaGVzcy5sb2FkKGZlbkZvck90aGVyU2lkZShjaGVzcy5mZW4oKSkpO1xuICAgIH1cblxuICAgIC8vZ2V0IGxlZ2FsIG1vdmVzXG4gICAgdmFyIG1vdmVzID0gY2hlc3MubW92ZXMoe1xuICAgICAgICB2ZXJib3NlOiB0cnVlXG4gICAgfSk7XG5cbiAgICAvLyBkbyBhbnkgb2YgdGhlIG1vdmVzIG1hdGNoIGZyb20sdG8gXG4gICAgcmV0dXJuIG1vdmVzLmZpbHRlcihtID0+IG0uZnJvbSA9PT0gZnJvbSAmJiBtLnRvID09PSB0bykubGVuZ3RoID4gMDtcbn1cblxuLyoqXG4gKiBTd2l0Y2ggc2lkZSB0byBwbGF5IChhbmQgcmVtb3ZlIGVuLXBhc3NlbnQgaW5mb3JtYXRpb24pXG4gKi9cbmZ1bmN0aW9uIGZlbkZvck90aGVyU2lkZShmZW4pIHtcbiAgICBpZiAoZmVuLnNlYXJjaChcIiB3IFwiKSA+IDApIHtcbiAgICAgICAgcmV0dXJuIGZlbi5yZXBsYWNlKC8gdyAuKi8sIFwiIGIgLSAtIDAgMVwiKTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIHJldHVybiBmZW4ucmVwbGFjZSgvIGIgLiovLCBcIiB3IC0gLSAwIDJcIik7XG4gICAgfVxufVxuXG4vKipcbiAqIFdoZXJlIGlzIHRoZSBraW5nLlxuICovXG5mdW5jdGlvbiBraW5nc1NxdWFyZShmZW4sIGNvbG91cikge1xuICAgIHJldHVybiBzcXVhcmVzT2ZQaWVjZShmZW4sIGNvbG91ciwgJ2snKTtcbn1cblxuZnVuY3Rpb24gc3F1YXJlc09mUGllY2UoZmVuLCBjb2xvdXIsIHBpZWNlVHlwZSkge1xuICAgIHZhciBjaGVzcyA9IG5ldyBDaGVzcyhmZW4pO1xuICAgIHJldHVybiBhbGxTcXVhcmVzLmZpbmQoc3F1YXJlID0+IHtcbiAgICAgICAgdmFyIHIgPSBjaGVzcy5nZXQoc3F1YXJlKTtcbiAgICAgICAgcmV0dXJuIHIgPT09IG51bGwgPyBmYWxzZSA6IChyLmNvbG9yID09IGNvbG91ciAmJiByLnR5cGUudG9Mb3dlckNhc2UoKSA9PT0gcGllY2VUeXBlKTtcbiAgICB9KTtcbn1cblxuZnVuY3Rpb24gbW92ZXNPZlBpZWNlT24oZmVuLCBzcXVhcmUpIHtcbiAgICB2YXIgY2hlc3MgPSBuZXcgQ2hlc3MoZmVuKTtcbiAgICByZXR1cm4gY2hlc3MubW92ZXMoe1xuICAgICAgICB2ZXJib3NlOiB0cnVlLFxuICAgICAgICBzcXVhcmU6IHNxdWFyZVxuICAgIH0pO1xufVxuXG4vKipcbiAqIEZpbmQgcG9zaXRpb24gb2YgYWxsIG9mIG9uZSBjb2xvdXJzIHBpZWNlcyBleGNsdWRpbmcgdGhlIGtpbmcuXG4gKi9cbmZ1bmN0aW9uIHBpZWNlc0ZvckNvbG91cihmZW4sIGNvbG91cikge1xuICAgIHZhciBjaGVzcyA9IG5ldyBDaGVzcyhmZW4pO1xuICAgIHJldHVybiBhbGxTcXVhcmVzLmZpbHRlcihzcXVhcmUgPT4ge1xuICAgICAgICB2YXIgciA9IGNoZXNzLmdldChzcXVhcmUpO1xuICAgICAgICBpZiAoKHIgPT09IG51bGwpIHx8IChyLnR5cGUgPT09ICdrJykpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gci5jb2xvciA9PSBjb2xvdXI7XG4gICAgfSk7XG59XG5cbmZ1bmN0aW9uIGFsbFBpZWNlc0ZvckNvbG91cihmZW4sIGNvbG91cikge1xuICAgIHZhciBjaGVzcyA9IG5ldyBDaGVzcyhmZW4pO1xuICAgIHJldHVybiBhbGxTcXVhcmVzLmZpbHRlcihzcXVhcmUgPT4ge1xuICAgICAgICB2YXIgciA9IGNoZXNzLmdldChzcXVhcmUpO1xuICAgICAgICByZXR1cm4gciAmJiByLmNvbG9yID09IGNvbG91cjtcbiAgICB9KTtcbn1cblxuZnVuY3Rpb24gbWFqb3JQaWVjZXNGb3JDb2xvdXIoZmVuLCBjb2xvdXIpIHtcbiAgICB2YXIgY2hlc3MgPSBuZXcgQ2hlc3MoZmVuKTtcbiAgICByZXR1cm4gYWxsU3F1YXJlcy5maWx0ZXIoc3F1YXJlID0+IHtcbiAgICAgICAgdmFyIHIgPSBjaGVzcy5nZXQoc3F1YXJlKTtcbiAgICAgICAgaWYgKChyID09PSBudWxsKSB8fCAoci50eXBlID09PSAncCcpKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHIuY29sb3IgPT0gY29sb3VyO1xuICAgIH0pO1xufVxuXG5mdW5jdGlvbiBjYW5DYXB0dXJlKGZyb20sIGZyb21QaWVjZSwgdG8sIHRvUGllY2UpIHtcbiAgICB2YXIgY2hlc3MgPSBuZXcgQ2hlc3MoKTtcbiAgICBjaGVzcy5jbGVhcigpO1xuICAgIGNoZXNzLnB1dCh7XG4gICAgICAgIHR5cGU6IGZyb21QaWVjZS50eXBlLFxuICAgICAgICBjb2xvcjogJ3cnXG4gICAgfSwgZnJvbSk7XG4gICAgY2hlc3MucHV0KHtcbiAgICAgICAgdHlwZTogdG9QaWVjZS50eXBlLFxuICAgICAgICBjb2xvcjogJ2InXG4gICAgfSwgdG8pO1xuICAgIHZhciBtb3ZlcyA9IGNoZXNzLm1vdmVzKHtcbiAgICAgICAgc3F1YXJlOiBmcm9tLFxuICAgICAgICB2ZXJib3NlOiB0cnVlXG4gICAgfSkuZmlsdGVyKG0gPT4gKC8uKnguKi8udGVzdChtLnNhbikpKTtcbiAgICByZXR1cm4gbW92ZXMubGVuZ3RoID4gMDtcbn1cblxuZnVuY3Rpb24gYmV0d2Vlbihmcm9tLCB0bykge1xuICAgIHZhciByZXN1bHQgPSBbXTtcbiAgICB2YXIgbiA9IGZyb207XG4gICAgd2hpbGUgKG4gIT09IHRvKSB7XG4gICAgICAgIG4gPSBTdHJpbmcuZnJvbUNoYXJDb2RlKG4uY2hhckNvZGVBdCgpICsgTWF0aC5zaWduKHRvLmNoYXJDb2RlQXQoKSAtIG4uY2hhckNvZGVBdCgpKSkgK1xuICAgICAgICAgICAgU3RyaW5nLmZyb21DaGFyQ29kZShuLmNoYXJDb2RlQXQoMSkgKyBNYXRoLnNpZ24odG8uY2hhckNvZGVBdCgxKSAtIG4uY2hhckNvZGVBdCgxKSkpO1xuICAgICAgICByZXN1bHQucHVzaChuKTtcbiAgICB9XG4gICAgcmVzdWx0LnBvcCgpO1xuICAgIHJldHVybiByZXN1bHQ7XG59XG5cbmZ1bmN0aW9uIHJlcGFpckZlbihmZW4pIHtcbiAgICBpZiAoL15bXiBdKiQvLnRlc3QoZmVuKSkge1xuICAgICAgICByZXR1cm4gZmVuICsgXCIgdyAtIC0gMCAxXCI7XG4gICAgfVxuICAgIHJldHVybiBmZW4ucmVwbGFjZSgvIHcgLiovLCAnIHcgLSAtIDAgMScpLnJlcGxhY2UoLyBiIC4qLywgJyBiIC0gLSAwIDEnKTtcbn1cblxubW9kdWxlLmV4cG9ydHMuYWxsU3F1YXJlcyA9IGFsbFNxdWFyZXM7XG5tb2R1bGUuZXhwb3J0cy5raW5nc1NxdWFyZSA9IGtpbmdzU3F1YXJlO1xubW9kdWxlLmV4cG9ydHMucGllY2VzRm9yQ29sb3VyID0gcGllY2VzRm9yQ29sb3VyO1xubW9kdWxlLmV4cG9ydHMuYWxsUGllY2VzRm9yQ29sb3VyID0gYWxsUGllY2VzRm9yQ29sb3VyO1xubW9kdWxlLmV4cG9ydHMuaXNDaGVja0FmdGVyUGxhY2luZ0tpbmdBdFNxdWFyZSA9IGlzQ2hlY2tBZnRlclBsYWNpbmdLaW5nQXRTcXVhcmU7XG5tb2R1bGUuZXhwb3J0cy5mZW5Gb3JPdGhlclNpZGUgPSBmZW5Gb3JPdGhlclNpZGU7XG5cbm1vZHVsZS5leHBvcnRzLm1vdmVzVGhhdFJlc3VsdEluQ2FwdHVyZVRocmVhdCA9IG1vdmVzVGhhdFJlc3VsdEluQ2FwdHVyZVRocmVhdDtcbm1vZHVsZS5leHBvcnRzLm1vdmVzT2ZQaWVjZU9uID0gbW92ZXNPZlBpZWNlT247XG5tb2R1bGUuZXhwb3J0cy5tYWpvclBpZWNlc0ZvckNvbG91ciA9IG1ham9yUGllY2VzRm9yQ29sb3VyO1xubW9kdWxlLmV4cG9ydHMuY2FuQ2FwdHVyZSA9IGNhbkNhcHR1cmU7XG5tb2R1bGUuZXhwb3J0cy5iZXR3ZWVuID0gYmV0d2Vlbjtcbm1vZHVsZS5leHBvcnRzLnJlcGFpckZlbiA9IHJlcGFpckZlbjtcbiIsInZhciB1bmlxID0gcmVxdWlyZSgnLi91dGlsL3VuaXEnKTtcblxuLyoqXG4gKiBGaW5kIGFsbCBkaWFncmFtcyBhc3NvY2lhdGVkIHdpdGggdGFyZ2V0IHNxdWFyZSBpbiB0aGUgbGlzdCBvZiBmZWF0dXJlcy5cbiAqL1xuZnVuY3Rpb24gZGlhZ3JhbUZvclRhcmdldChzaWRlLCBkZXNjcmlwdGlvbiwgdGFyZ2V0LCBmZWF0dXJlcykge1xuICB2YXIgZGlhZ3JhbSA9IFtdO1xuICBmZWF0dXJlc1xuICAgIC5maWx0ZXIoZiA9PiBzaWRlID8gc2lkZSA9PT0gZi5zaWRlIDogdHJ1ZSlcbiAgICAuZmlsdGVyKGYgPT4gZGVzY3JpcHRpb24gPyBkZXNjcmlwdGlvbiA9PT0gZi5kZXNjcmlwdGlvbiA6IHRydWUpXG4gICAgLmZvckVhY2goZiA9PiBmLnRhcmdldHMuZm9yRWFjaCh0ID0+IHtcbiAgICAgIGlmICghdGFyZ2V0IHx8IHQudGFyZ2V0ID09PSB0YXJnZXQpIHtcbiAgICAgICAgZGlhZ3JhbSA9IGRpYWdyYW0uY29uY2F0KHQuZGlhZ3JhbSk7XG4gICAgICAgIHQuc2VsZWN0ZWQgPSB0cnVlO1xuICAgICAgfVxuICAgIH0pKTtcbiAgcmV0dXJuIHVuaXEoZGlhZ3JhbSk7XG59XG5cbmZ1bmN0aW9uIGFsbERpYWdyYW1zKGZlYXR1cmVzKSB7XG4gIHZhciBkaWFncmFtID0gW107XG4gIGZlYXR1cmVzLmZvckVhY2goZiA9PiBmLnRhcmdldHMuZm9yRWFjaCh0ID0+IHtcbiAgICBkaWFncmFtID0gZGlhZ3JhbS5jb25jYXQodC5kaWFncmFtKTtcbiAgICB0LnNlbGVjdGVkID0gdHJ1ZTtcbiAgfSkpO1xuICByZXR1cm4gdW5pcShkaWFncmFtKTtcbn1cblxuZnVuY3Rpb24gY2xlYXJEaWFncmFtcyhmZWF0dXJlcykge1xuICBmZWF0dXJlcy5mb3JFYWNoKGYgPT4gZi50YXJnZXRzLmZvckVhY2godCA9PiB7XG4gICAgdC5zZWxlY3RlZCA9IGZhbHNlO1xuICB9KSk7XG59XG5cbmZ1bmN0aW9uIGNsaWNrZWRTcXVhcmVzKGZlYXR1cmVzLCBjb3JyZWN0LCBpbmNvcnJlY3QsIHRhcmdldCkge1xuICB2YXIgZGlhZ3JhbSA9IGRpYWdyYW1Gb3JUYXJnZXQobnVsbCwgbnVsbCwgdGFyZ2V0LCBmZWF0dXJlcyk7XG4gIGNvcnJlY3QuZm9yRWFjaCh0YXJnZXQgPT4ge1xuICAgIGRpYWdyYW0ucHVzaCh7XG4gICAgICBvcmlnOiB0YXJnZXQsXG4gICAgICBicnVzaDogJ2dyZWVuJ1xuICAgIH0pO1xuICB9KTtcbiAgaW5jb3JyZWN0LmZvckVhY2godGFyZ2V0ID0+IHtcbiAgICBkaWFncmFtLnB1c2goe1xuICAgICAgb3JpZzogdGFyZ2V0LFxuICAgICAgYnJ1c2g6ICdyZWQnXG4gICAgfSk7XG4gIH0pO1xuICByZXR1cm4gZGlhZ3JhbTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIGRpYWdyYW1Gb3JUYXJnZXQ6IGRpYWdyYW1Gb3JUYXJnZXQsXG4gIGFsbERpYWdyYW1zOiBhbGxEaWFncmFtcyxcbiAgY2xlYXJEaWFncmFtczogY2xlYXJEaWFncmFtcyxcbiAgY2xpY2tlZFNxdWFyZXM6IGNsaWNrZWRTcXVhcmVzXG59O1xuIiwibW9kdWxlLmV4cG9ydHMgPSBbXG5cInIxYmszci9wcHBxMXBwcC81bjIvNE4xTjEvMkJwNC9CbjYvUDRQUFAvNFIxSzEgdyAtIC0gMCAxXCIsXG5cIjNyMXJrMS9wcHFuM3AvMW5wYjFQMi81QjIvMlA1LzJOM0IxL1BQMlExUFAvUjVLMSB3IC0gLSAwIDFcIixcblwicjNyazIvNmIxL3EycFFCcDEvMU5wUDQvMW4yUFAyL25QNi9QM04xSzEvUjZSIHcgLSAtIDAgMVwiLFxuXCJyNG4xay9wcEJuTjFwMS8ycDFwMy82TnAvcTJiUDFiMS8zQjQvUFBQM1BQL1I0UTFLIHcgLSAtIDAgMVwiLFxuXCJyM1FuUjEvMWJrNS9wcDVxLzJiNS8ycDFQMy9QNy8xQkI0UC8zUjNLIHcgLSAtIDAgMVwiLFxuXCJxMXIyYjFrL3JiNG5wLzFwMnAyTi9wQjFuNC82UTEvMVAyUDMvUEIzUFBQLzJSUjJLMSB3IC0gLSAwIDFcIixcblwiazJuMXExci9wMXBCMnAxL1A0cFAxLzFRcDFwMy84LzJQMUJiTjEvUDcvMktSNCB3IC0gLSAwIDFcIixcblwicjJxazJyL3BiNHBwLzFuMlBiMi8yQjJRMi9wMXA1LzJQNS8yQjJQUFAvUk4yUjFLMSB3IC0gLSAwIDFcIixcblwiMVExUjQvNWsyLzZwcC8yTjFicDIvMUJuNS8yUDJQMVAvMXIzUEsxLzggYiAtIC0gMCAxXCIsXG5cInJuUjUvcDNwMWtwLzRwMXBuL2JwUDUvNUJQMS81TjFQLzJQMlAyLzJLNSB3IC0gLSAwIDFcIixcblwicjZyLzFwMnBwMWsvcDFiMnExcC80cFAyLzZRUi8zQjJQMS9QMVAySzIvN1IgdyAtIC0gMCAxXCIsXG5cIjJrNHIvcHBwMnAyLzJiMkIyLzdwLzZwUC8yUDFxMWJQL1BQM04yL1I0UUsxIGIgLSAtIDAgMVwiLFxuXCIxcjJrMXIxL3BicHBucDFwLzFiM1AyLzgvUTcvQjFQQjFxMi9QNFBQUC8zUjJLMSB3IC0gLSAwIDFcIixcblwicjRyMWsvMWJwcTFwMW4vcDFucDQvMXAxQmIxQlEvUDcvNlIxLzFQM1BQUC8xTjJSMUsxIHcgLSAtIDAgMVwiLFxuXCJyNHJrMS9wNHBwcC9QcDRuMS80Qk4yLzFicTUvN1EvMlAyUFBQLzNSUjFLMSB3IC0gLSAwIDFcIixcblwicjNya25RLzFwMVIxcGIxL3AzcHFCQi8ycDUvOC82UDEvUFBQMlAxUC80UjFLMSB3IC0gLSAwIDFcIixcblwiM2sxcjFyL3BiM3AyLzFwNHAxLzFCMkIzLzNxbjMvNlFQL1A0UlAxLzJSM0sxIHcgLSAtIDAgMVwiLFxuXCIxYjRyay80UjFwcC9wMWI0ci8yUEI0L1BwMVE0LzZQcS8xUDNQMVAvNFJOSzEgdyAtIC0gMCAxXCIsXG5cInIxYjFyMWsxL3BwcDFucDFwLzJucDJwUS81cU4xLzFiUDUvNlAxL1BQMlBQQlAvUjFCMlJLMSB3IC0gLSAwIDFcIixcblwiNXFyay9wM2IxcnAvNFAyUS81UDIvMXBwNS81UFIxL1A2UC9CNksgdyAtIC0gMCAxXCIsXG5cInIycTJuci81cDFwL3AxQnAzYi8xcDFOa1AyLzNwUDFwMS8yUFAyUDEvUFA1UC9SMUJiMVJLMSB3IC0gLSAwIDFcIixcblwiMnIzazEvMXAxcjFwMXAvcG5iMXBCMi81cDIvMWJQNS8xUDJRUDIvUDFCM1BQLzRSSzIgdyAtIC0gMCAxXCIsXG5cIjJyNS8ycDJrMXAvcHFwMVJCMi8ycjUvUGJRMk4yLzFQM1BQMS8yUDNQMS80UjJLIHcgLSAtIDAgMVwiLFxuXCI3ci9wUnBrNC8ybnAycDEvNWIyLzJQNHEvMmIxQkJOMS9QNFBQMS8zUTFLMiBiIC0gLSAwIDFcIixcblwiUjRyazEvNHIxcDEvMXEycDFRcC8xcGI1LzFuNVIvNU5CMS8xUDNQUFAvNksxIHcgLSAtIDAgMVwiLFxuXCIycjRrL3BwcWJwUTFwLzNwMWJwQi84LzgvMU5yMlAyL1BQUDNQMS8yS1IzUiB3IC0gLSAwIDFcIixcblwiMnIxazJyLzFwMnBwMXAvMXAyYjFwUS80QjMvM240LzJxQjQvUDFQMlBQUC8yS1JSMyBiIC0gLSAwIDFcIixcblwicjFiMnJrMS9wM1JwMXAvM3EycFEvMnBwMkIxLzNiNC8zQjQvUFBQMlBQUC80UjFLMSB3IC0gLSAwIDFcIixcblwiN2svMWIxbjFxMXAvMXAxcDQvcFAycFAxTi9QNmIvM3BCMlAvOC8xUjFRMksxIGIgLSAtIDAgMVwiLFxuXCIxcjFrcjMvTmJwcG4xcHAvMWI2LzgvNlExLzNCMVAyL1BxM1AxUC8zUlIxSzEgdyAtIC0gMCAxXCIsXG5cInIxYnFyMy9wcHAxQjFrcC8xYjRwMS9uMkI0LzNQUTFQMS8yUDUvUDRQMi9STjRLMSB3IC0gLSAwIDFcIixcblwicjFuazNyLzJiMnBwcC9wM2JxMi8zcE4zL1EyUDQvQjFOQjQvUDRQUFAvNFIxSzEgdyAtIC0gMCAxXCIsXG5cIjJyMXIxazEvcDJuMXAxcC81cHAxL3FRMVAxYjIvTjcvNU4yL1BQM1JQUC8zSzFCMVIgYiAtIC0gMCAxXCIsXG5cInIxbmszci8yYjJwcHAvcDNiMy8zTk4zL1EyUDNxL0IyQjQvUDRQUFAvNFIxSzEgdyAtIC0gMCAxXCIsXG5cInIxYjFubjFrL3AzcDFiMS8xcXAxQjFwMS8xcDFwNC8zUDNOLzJOMUIzL1BQUDNQUC9SMlExSzIgdyAtIC0gMCAxXCIsXG5cInIxYm5rMnIvcHBwcDFwcHAvMWI0cTEvNFAzLzJCMU4zL1ExUHAxTjIvUDRQUFAvUjNSMUsxIHcgLSAtIDAgMVwiLFxuXCI2azEvQjJOMXBwMS9wNnAvUDNOMXIxLzRuYjIvOC8yUjNCMS82SzEgdyAtIC0gMCAxXCIsXG5cInIxYjNuci9wcHAxa0IxcC8zcDQvOC8zUFBCbmIvMVEzcDIvUFBQMnEyL1JONFJLIGIgLSAtIDAgMVwiLFxuXCJyMmIyUTEvMWJxNS9wcDFrMnAxLzJwMW4xQjEvUDNQMy8yTjUvMVBQM1BQLzVSMUsgdyAtIC0gMCAxXCIsXG5cIjFSNFExLzNucjFwcC8zcDFrMi81QmIxLzRQMy8ycTFCMVAxLzVQMVAvNksxIHcgLSAtIDAgMVwiLFxuXCIxcjRrci9RMWJSQnBwcC8yYjUvOC8yQjFxMy82UDEvUDRQMVAvNVJLMSB3IC0gLSAwIDFcIixcblwiNmsxLzFwNXAvM1Azci80cDMvMk4xUEJwYi9QUHI1LzNSMVAxSy81YjFSIGIgLSAtIDAgMVwiLFxuXCI1cmsxLzFwMXIycHAvcDJwM3EvM1AyYjEvUFAxcFAzLzVQcDEvNEIxUDEvMlJSUU5LMSBiIC0gLSAwIDFcIixcblwiMms0ci9wcHA1LzRicXAxLzNwMlExLzZuMS8yTkIzUC9QUFAyYlAxL1IxQjJSMUsgYiAtIC0gMCAxXCIsXG5cIjVyMWsvM3EzcC9wMkIxbnBiL1AybnAzLzROMy8yTjJiMi81UFBQL1IzUVJLMSBiIC0gLSAwIDFcIixcblwiNHIzL3A0cGtwL3E3LzNCYmIyL1AyUDFwcFAvMk4zbjEvMVBQMktQUi9SMUJRNCBiIC0gLSAwIDFcIixcblwiM3IxcTFrLzZicC9wMXA1LzFwMkIxUTEvUDFCNS8zUDQvNVBQUC80UjFLMSB3IC0gLSAwIDFcIixcblwicjRrcjEvcGJObjFxMXAvMXA2LzJwMkJQUS81QjIvOC9QNlAvYjRSSzEgdyAtIC0gMCAxXCIsXG5cInIzcjJrLzRiMkIvcG4zcDIvcTFwNFIvNmIxLzRQMy9QUFExTlBQUC81UksxIHcgLSAtIDAgMVwiLFxuXCJybmJrMWIxci9wcHFwblExcC80cDFwMS8ycDFOMUIxLzROMy84L1BQUDJQUFAvUjNLQjFSIHcgLSAtIDAgMVwiLFxuXCI2cmsvcDFwYjFwMXAvMnBwMVAyLzJiMW4yUS80UFIyLzNCNC9QUFAxSzJQL1JOQjNxMSB3IC0gLSAwIDFcIixcblwicm4zcmsxLzJxcDJwcC9wM1AzLzFwMWI0LzNiNC8zQjQvUFBQMVExUFAvUjFCMlIxSyB3IC0gLSAwIDFcIixcblwicjJCMWJrMS8xcDVwLzJwMnAyL3AxbjUvNFAxQlAvUDFOYjQvS1BuM1BOLzNSM1IgYiAtIC0gMCAxXCIsXG5cIjZrMS8yYjNyMS84LzZwUi8ycDNOMS8yUGJQMVBQLzFQQjJSMUsvMnI1IHcgLSAtIDAgMVwiLFxuXCJyNWsxL3AxcDNicC8xcDFwNC8yUFAycXAvMVA2LzFRMWJQMy9QQjNyUFAvUjJOMlJLIGIgLSAtIDAgMVwiLFxuXCIzcnIyay9wcDFiMmIxLzRxMXBwLzJQcDFwMi8zQjQvMVAyUU5QMS9QNlAvUjRSSzEgdyAtIC0gMCAxXCIsXG5cIjJicXIyay8xcjFuMmJwL3BwMXBCcDIvMnBQMVBRMS9QM1BOMi8xUDRQMS8xQjVQL1IzUjFLMSB3IC0gLSAwIDFcIixcblwicTJicjFrMS8xYjRwcC8zQnAzL3A2bi8xcDNSMi8zQjFOMi9QUDJRUFBQLzZLMSB3IC0gLSAwIDFcIixcbl07XG4iLCJtb2R1bGUuZXhwb3J0cyA9IFtcblwicjFiazNyL3BwcHExcHBwLzVuMi80TjFOMS8yQnA0L0JuNi9QNFBQUC80UjFLMSB3IC0gLSAwIDFcIixcblwiMnIyYmsxL3BiM3BwcC8xcDYvbjcvcTJQNC9QMVAxUjJRL0IyQjFQUFAvUjVLMSB3IC0gLSAwIDFcIixcblwiazFuM3JyL1BwM3AyLzNxNC8zTjQvM1BwMnAvMVEyUDFwMS8zQjFQUDEvUjRSSzEgdyAtIC0gMCAxXCIsXG5cIjNyMXJrMS9wcHFuM3AvMW5wYjFQMi81QjIvMlA1LzJOM0IxL1BQMlExUFAvUjVLMSB3IC0gLSAwIDFcIixcblwiTjFiazQvcHAxcDFRcHAvOC8yYjUvM24zcS84L1BQUDJSUFAvUk5CMXJCSzEgYiAtIC0gMCAxXCIsXG5cInIzYnIxay9wcDVwLzRCMXAxLzROcFAxL1AyUG4zL3ExUFEzUi83UC8zUjJLMSB3IC0gLSAwIDFcIixcblwiOC80UjFway9wNXAxLzgvMXBCMW4xYjEvMVAyYjFQMS9QNHIxUC81UjFLIGIgLSAtIDAgMVwiLFxuXCJyMWJrMXIyL3BwMW4ycHAvM05RMy8xUDYvOC8ybjJQQjEvcTFCM1BQLzNSMVJLMSB3IC0gLSAwIDFcIixcblwicm4zcmsxL3BwM3AyLzJiMXBucDEvNE4zLzNxNC9QMU5CM1IvMVAxUTFQUFAvUjVLMSB3IC0gLSAwIDFcIixcblwiM3FyazIvcDFyMnBwMS8xcDJwYjIvblAxYk4yUS8zUE4zL1A2Ui81UFBQL1I1SzEgdyAtIC0gMCAxXCIsXG5cInI0bjFrL3BwQm5OMXAxLzJwMXAzLzZOcC9xMmJQMWIxLzNCNC9QUFAzUFAvUjRRMUsgdyAtIC0gMCAxXCIsXG5cIjVrMXIvNG5wcDEvcDNwMnAvM25QMlAvM1AzUS8zTjQvcUIyS1BQMS8yUjUgdyAtIC0gMCAxXCIsXG5cInIzcjFrMS8xYjYvcDFucDFwcFEvNG4zLzRQMy9QTkI0Ui8yUDFCSzFQLzFxNiB3IC0gLSAwIDFcIixcblwicjNxMWsxLzVwMi8zUDJwUS9QcHA1LzFwbmJOMlIvOC8xUDRQUC81UjFLIHcgLSAtIDAgMVwiLFxuXCIycjJiMWsvcDJRM3AvYjFuMlBwUC8ycDUvM3IxQk4xLzNxMlAxL1A0UEIxL1IzUjFLMSB3IC0gLSAwIDFcIixcblwicTFyMmIxay9yYjRucC8xcDJwMk4vcEIxbjQvNlExLzFQMlAzL1BCM1BQUC8yUlIySzEgdyAtIC0gMCAxXCIsXG5cIjJyMWsyci9wUjJwMWJwLzJuMVAxcDEvOC8yUVA0L3EyYjFOMi9QMkIxUFBQLzRLMlIgdyAtIC0gMCAxXCIsXG5cIjNicjMvcHAycjMvMnA0ay80TjFwcC8zUFAzL1AxTjUvMVAySzMvNlJSIHcgLSAtIDAgMVwiLFxuXCIycnIxazIvcGI0cDEvMXAxcXBwMi80UjJRLzNuNC9QMU41LzFQM1BQUC8xQjJSMUsxIHcgLSAtIDAgMVwiLFxuXCI0cTFyay9wYjJicG5wLzJyNFEvMXAxcDFwUDEvNE5QMi8xUDNSMi9QQm40UC9SQjRLMSB3IC0gLSAwIDFcIixcblwicm5iMmIxci9wM2tCcDEvM3BObjFwLzJwUU4zLzFwMlBQMi80QjMvUHE1UC80SzMgdyAtIC0gMCAxXCIsXG5cInI1bnIvNlJwL3AxTk5rcDIvMXAzYjIvMnA1LzVLMi9QUDJQMy8zUjQgdyAtIC0gMCAxXCIsXG5cInIxYjFrYjFyL3BwMW4xcHAxLzFxcDFwMnAvNkIxLzJQUFEzLzNCMU4yL1A0UFBQL1I0UksxIHcgLSAtIDAgMVwiLFxuXCJybjNrMXIvcGJwcDFCYnAvMXA0cE4vNFAxQjEvM240LzJxM1ExL1BQUDJQUFAvMktSM1IgdyAtIC0gMCAxXCIsXG5cInIxYnFrYjIvNnAxL3AxcDRwLzFwMU40LzgvMUIzUTIvUFAzUFBQLzNSMksxIHcgLSAtIDAgMVwiLFxuXCJybmJxMWJuci9wcDFwMXAxcC8zcGszLzNOUDFwMS81cDIvNU4yL1BQUDFRMVBQL1IxQjFLQjFSIHcgLSAtIDAgMVwiLFxuXCJyM3JrMi81cG4xL3BiMW5xMXBSLzFwMnAxUDEvMnAxUDMvMlAyUU4xL1BQQkIxUDIvMks0UiB3IC0gLSAwIDFcIixcblwicjFicTNyL3BwcDFuUTIvMmtwMU4yLzZOMS8zYlAzLzgvUDJuMVBQUC8xUjNSSzEgdyAtIC0gMCAxXCIsXG5cIjRyMy9wYnBuMm4xLzFwMXBycDFrLzgvMlBQMlBCL1A1TjEvMkIyUjFQL1I1SzEgdyAtIC0gMCAxXCIsXG5cInJxM3JrMS8zbjFwcDEvcGI0bjEvM04yUDEvMXBCMVFQMi80QjMvUFA2LzJLUjNSIHcgLSAtIDAgMVwiLFxuXCI0YjMvazFyMXEycC9wM3AzLzNwUTMvMnBONC8xUjYvUDRQUFAvMVI0SzEgdyAtIC0gMCAxXCIsXG5cIjJiMnIxay8xcDJSMy8ybjJyMXAvcDFQMU4xcDEvMkIzUDEvUDZQLzFQM1IyLzZLMSB3IC0gLSAwIDFcIixcblwiMXFyMmJrMS9wYjNwcDEvMXBuM25wLzNOMk5RLzgvUDcvQlAzUFBQLzJCMVIxSzEgdyAtIC0gMCAxXCIsXG5cIjFrNXIvcFAzcHBwLzNwMmIxLzFCTjFuMy8xUTJQMy9QMUI1L0tQM1AxUC83cSB3IC0gLSAwIDFcIixcblwiNWtxUS8xYjFyMnAxL3BwbjFwMUJwLzJiNS8yUDJyUDEvUDROMi8xQjVQLzRSUjFLIHcgLSAtIDAgMVwiLFxuXCIzcm5yMWsvcDFxMWIxcEIvMXBiMXAycC8ycDFQMy8yUDJOMi9QUDRQMS8xQlE0UC80UlJLMSB3IC0gLSAwIDFcIixcblwicjJxcjJrL3BwMWIzcC8yblE0LzJwQjFwMVAvM24xUHBSLzJOUDJQMS9QUFA1LzJLMVIxTjEgdyAtIC0gMCAxXCIsXG5cInIycTFyMWsvcHBwYjJwcC8ybnA0LzVwMi81TjIvMUIxUTQvUFBQMVJQUFAvUjVLMSB3IC0gLSAwIDFcIixcblwicjFiMXFyMi9wcDJuMWsxLzNwcDFwUi8ycDJwUTEvNFBOMi8yTlAyUDEvUFAxSzFQQjEvbjcgdyAtIC0gMCAxXCIsXG5cIjNyMXIxay8xcDNwMXAvcDJwNC80bjFOTi82YlEvMUJQcTQvUDNwMVBQLzFSNUsgdyAtIC0gMCAxXCIsXG5cIjFyM3Ixay82cDEvcDZwLzJicE5CUDEvMXAybjMvMVA1US9QQlAxcTJQLzFLNVIgdyAtIC0gMCAxXCIsXG5cInI0cmsxLzRicDIvMUJwcHExcDEvNHAxbjEvMlAxUG4yLzNQMk4xL1AyUTFQQksvMVI1UiBiIC0gLSAwIDFcIixcblwicjJxM3IvcHBwNS8ybjRwLzRQYmsxLzJCUDFOcGIvUDJRQjMvMVBQM1AxL1I1SzEgdyAtIC0gMCAxXCIsXG5cIjJyMmJrMS8ycW4xcHBwL3BuMXA0LzVOMi9OM3IzLzFRNi81UFBQL0JSM0JLMSB3IC0gLSAwIDFcIixcblwicjVrci9wcHBOMXBwMS8xYm4xUjMvMXExTjJCcC8zcDJRMS84L1BQUDJQUFAvUjVLMSB3IC0gLSAwIDFcIixcblwicjNuMWsxL3BiNXAvNE4xcDEvMnByNC9xNy8zQjNQLzFQMVExUFAxLzJCMVIxSzEgdyAtIC0gMCAxXCIsXG5cIjFrMXIycjEvcHBxNHAvNFEzLzFCMm5wMi8yUDFwMy9QNy8yUDFSUFBSLzJCMUszIGIgLSAtIDAgMVwiLFxuXCJybjRuci9wcHBxMmJrLzdwLzViMVAvNE5CUTEvM0I0L1BQUDNQMS9SM0syUiB3IC0gLSAwIDFcIixcblwicjFicjQvMXAyYnBrMS9wMW5wcG4xcC81UDIvNFAyQi9xTk5CM1IvUDFQUTJQUC83SyB3IC0gLSAwIDFcIixcblwiMnI1LzJwMmsxcC9wcXAxUkIyLzJyNS9QYlEyTjIvMVAzUFAxLzJQM1AxLzRSMksgdyAtIC0gMCAxXCIsXG5cIjZrMS81cDIvUjVwMS9QNm4vOC81UFBwLzJyM3JQL1I0TjFLIGIgLSAtIDAgMVwiLFxuXCJyM2tyMi82UXAvMVBiMnAyL3BCM1IyLzNwcTJCLzRuMy8xUDRQUC80UjFLMSB3IC0gLSAwIDFcIixcblwicjFyM2sxLzFicTJwYlIvcDVwMS8xcG5wcDFCMS8zTlAzLzNCMVAyL1BQUFE0LzFLNVIgdyAtIC0gMCAxXCIsXG5cIjVRMi8xcDNwMU4vMnAzcDEvNWIxay8yUDNuMS9QNFJQMS8zcTJyUC81UjFLIHcgLSAtIDAgMVwiLFxuXCJybmIxazJyL3BwcHBiTjFwLzVuMi83US80UDMvMk41L1BQUFAzUC9SMUIxS0IxcSB3IC0gLSAwIDFcIixcblwicjFiMnJrMS8xcDRxcC9wNXBRLzJuTjFwMi8yQjJQMi84L1BQUDNQUC8ySzFSMyB3IC0gLSAwIDFcIixcblwiNHIxazEvcGI0cHAvMXAycDMvNFBwMi8xUDNOMi9QMlFuMlAvM24xcVBLL1JCQjFSMyBiIC0gLSAwIDFcIixcblwiM3ExcjIvMnJibnAyL3AzcHAxay8xcDFwMk4xLzNQMlExL1AzUDMvMVAzUFBQLzVSSzEgdyAtIC0gMCAxXCIsXG5cInE1azEvNXJiMS9yNnAvMU5wMW4xcDEvM3AxUG4xLzFONFAxL1BQNVAvUjFCUVJLMiBiIC0gLSAwIDFcIixcblwicm4xcTNyL3BwMmtwcHAvM05wMy8yYjFuMy8zTjJRMS8zQjQvUFA0UFAvUjFCMlJLMSB3IC0gLSAwIDFcIixcblwicm5iMWtiMXIvcHAzcHBwLzJwNS80cTMvNG4zLzNRNC9QUFBCMVBQUC8yS1IxQk5SIHcgLSAtIDAgMVwiLFxuXCI0cjFrMS8zcjFwMXAvYnFwMW4zL3AycDFOUDEvUG4xUTFiMi83UC8xUFAzQjEvUjJOUjJLIHcgLSAtIDAgMVwiLFxuXCI3ci82a3IvcDVwMS8xcE5iMXBxMS9QUHBQcDMvNFAxYjEvUjNSMVExLzJCMkJLMSBiIC0gLSAwIDFcIixcblwicm5ia24yci9wcHBwMVFwcC81YjIvM05OMy8zUHAzLzgvUFBQMUtQMVAvUjFCNHEgdyAtIC0gMCAxXCIsXG5cInI3LzZSMS9wcGtxcm4xQi8ycHAzcC9QNm4vMk41LzgvMVExUjFLMiB3IC0gLSAwIDFcIixcblwicjFiMnJrMS8xcDNwcHAvcDJwNC8zTm5RMi8yQjFSMy84L1BxUDNQUC81UksxIHcgLSAtIDAgMVwiLFxuXCJyNHIxay8ycWIzcC9wMnAxcDIvMXBuUE4zLzJwMVBuMi8yUDFOMy9QUEIxUVBSMS82UksgdyAtIC0gMCAxXCIsXG5cInJuYnExYjFyL3BwNGtwLzVucDEvNHAyUS8yQk4xUjIvNEIzL1BQUE4yUFAvUjVLMSB3IC0gLSAwIDFcIixcblwiMW5iazFiMXIvMXI2L3AyUDJwcC8xQjJQcE4xLzJwMlAyLzJQMUIzLzdQL1IzSzJSIHcgLSAtIDAgMVwiLFxuXCIxcjFrcjMvTmJwcG4xcHAvMWI2LzgvNlExLzNCMVAyL1BxM1AxUC8zUlIxSzEgdyAtIC0gMCAxXCIsXG5cIjRrMXIxLzVwMi9wMXE1LzFwMnAycC82bjEvUDRiUTEvMVA0UlAvM05SMUJLIGIgLSAtIDAgMVwiLFxuXCI1bmsxLzJOMnAyLzJiMlFwMS9wM1BwTnAvMnFQM1AvNlAxLzVQMUsvOCB3IC0gLSAwIDFcIixcblwiMWs1ci9wcDFRMXBwMS8ycDRyL2I0UG4xLzNOUHAyLzJQMlAyLzFxNEIxLzFSMlIxSzEgYiAtIC0gMCAxXCIsXG5cIjZyay81cDIvMnAxcDJwLzJQcFAxcTEvM1BuUW4xLzgvNFAyUC8xTjJCUjFLIGIgLSAtIDAgMVwiLFxuXCI0cmsxci9wMmIxcHAxLzFxNXAvM3BSMW4xLzNOMXAyLzFQMVExUDIvUEJQM1BLLzRSMyB3IC0gLSAwIDFcIixcblwicjFicTFyazEvcHAxbmIxcHAvNXAyLzZCMS8zcFEzLzNCUE4yL1BQM1BQUC9SNFJLMSB3IC0gLSAwIDFcIixcblwicm4xcjQvcHAycDFiMS81a3BwL3ExUFExYjIvNm4xLzJOMk4yL1BQUDNQUC9SMUIyUksxIHcgLSAtIDAgMVwiLFxuXCJrNy9wMVFucjJwL2IxcEIxcDIvM3AzcS9OMXA1LzNQM1AvUFBQM1AxLzZLMSB3IC0gLSAwIDFcIixcblwiM3I0LzRSUnBrLzVuMU4vOC9wMXAycVBQL1AxUXAxUDIvMVA0SzEvM2I0IHcgLSAtIDAgMVwiLFxuXCJxcjYvMWIxcDFrclEvcDJQcDFwMS80UFAyLzFwMUIxbjIvM0I0L1BQM0sxUC8yUjJSMiB3IC0gLSAwIDFcIixcblwicjFuazNyLzJiMnBwcC9wM2JxMi8zcE4zL1EyUDQvQjFOQjQvUDRQUFAvNFIxSzEgdyAtIC0gMCAxXCIsXG5cIjRyMmsvNFExYnAvNEIxcDEvMXEybjMvNHBOMi9QMUIzUDEvNHBQMVAvNFIxSzEgdyAtIC0gMCAxXCIsXG5cIjRyMWsxLzVwcHAvcDJwNC80cjMvMXBObjQvMVA2LzFQUEsyUFAvUjNSMyBiIC0gLSAwIDFcIixcblwicjFuazNyLzJiMnBwcC9wM2IzLzNOTjMvUTJQM3EvQjJCNC9QNFBQUC80UjFLMSB3IC0gLSAwIDFcIixcblwicjFiMWsxbnIvcDJwMXBwcC9uMkI0LzFwMU5QTjFQLzZQMS8zUDFRMi9QMVAxSzMvcTViMSB3IC0gLSAwIDFcIixcblwiMnIxcmsyLzFiMmIxcDEvcDFxMm5QMS8xcDJRMy80UDMvUDFOMUIzLzFQUDFCMlIvMks0UiB3IC0gLSAwIDFcIixcblwiNHIxazEvcFIzcHAxLzdwLzNuMWIxTi8ycFA0LzJQMlBRMS8zQjFLUFAvcTcgYiAtIC0gMCAxXCIsXG5cIjJSMVIxbmsvMXA0cnAvcDFuNS8zTjJwMS8xUDYvMlA1L1A2UC8ySzUgdyAtIC0gMCAxXCIsXG5cInIxYjFyMWtxL3BwcG5wcDFwLzFuNHBCLzgvNE4yUC8xQlA1L1BQMlFQUDEvUjNLMlIgdyAtIC0gMCAxXCIsXG5cInJuYjJyazEvcHBwMnFiMS82cFEvMnBOMXAyLzgvMVAzQlAxL1BCMlBQMVAvUjRSSzEgdyAtIC0gMCAxXCIsXG5cInIycWtiMXIvMnAxbnBwcC9wMnA0L25wMU5OMy80UDMvMUJQNS9QUDFQMVBQUC9SMUIxSzJSIHcgLSAtIDAgMVwiLFxuXCJyNnIvMXExbmJrcDEvcG4ycDJwLzFwMXBQMVAxLzNQMU4xUC8xUDFRMVAyL1AyQjFLMi9SNlIgdyAtIC0gMCAxXCIsXG5cIjNrNC8xcHAzYjEvNGIycC8xcDNxcDEvM1BuMy8yUDFSTjIvcjVQMS8xUTJSMUsxIGIgLSAtIDAgMVwiLFxuXCJybjNrMi9wUjJiMy80cDFRMS8ycTFOMlAvM1IyUDEvM0s0L1AzQnIyLzggdyAtIC0gMCAxXCIsXG5cIjJyMXIzL3BwMW5iTjIvNHAzL3E3L1AxcFAybmsvMlAyUDIvMVBRNS9SM1IxSzEgdyAtIC0gMCAxXCIsXG5cIjZrMS81cDIvcDVuMS84LzFwMXAyUDEvMVBiMkIxci9QM0tQTjEvMlJRM3EgYiAtIC0gMCAxXCIsXG5cInIxYnFyMWsxL3BwcDJwcDEvM3A0LzRuMU5RLzJCMVBOMi84L1A0UFBQL2I0UksxIHcgLSAtIDAgMVwiLFxuXCIxcjJxMmsvNE4ycC8zcDFQcDEvMnAxbjFQMS8yUDUvcDJQMktRL1AzUjMvOCB3IC0gLSAwIDFcIixcblwicjVyay9wcDJxYjFwLzJwMnBuMS8yYnA0LzNwUDFRMS8xQjFQMU4xUi9QUFAzUFAvUjFCM0sxIHcgLSAtIDAgMVwiLFxuXCJybmJxMWJrci9wcDNwMXAvMnAzcFEvM04yTjEvMkIycDIvOC9QUFBQMlBQL1IxQjFSMUsxIHcgLSAtIDAgMVwiLFxuXCIycjJuMWsvMnEzcHAvcDJwMWIyLzJuQjFQMi8xcDFONC84L1BQUDRRLzJLM1JSIHcgLSAtIDAgMVwiLFxuXCJyMXE1LzJwMmsyL3A0QnAxLzJOYjFOMi9wNlEvN1Avbm4zUFAxL1I1SzEgdyAtIC0gMCAxXCIsXG5cInJuMmtiMXIvMXBRYnBwcHAvMXA2L3FwMU40LzZuMS84L1BQUDNQUC8yS1IyTlIgdyAtIC0gMCAxXCIsXG5cIjJyMWszLzNuMXAyLzZwMS8xcDFRYjMvMUIyTjFxMS8yUDFwMy9QNFBQMS8yS1I0IHcgLSAtIDAgMVwiLFxuXCJyMWIxcjMvcXAxbjFwazEvMnBwMnAxL3AzbjMvTjFQTlAxUDEvMVAzUDIvUDZRLzFLMVIxQjFSIHcgLSAtIDAgMVwiLFxuXCI1cmsxLzJwYjFwcHAvcDJyNC8xcDFQcDMvNFBuMXEvMUIxUE5QMi9QUDFRMVAxUC9SNVJLIGIgLSAtIDAgMVwiLFxuXCIzbmJyMi80cTJwL3IzcFJway9wMnBRUk4xLzFwcFAycDEvMlA1L1BQQjRQLzZLMSB3IC0gLSAwIDFcIixcblwicjFibnJuMi9wcHAxazJwLzRwMy8zUE5wMVAvNVEyLzNCMlIxL1BQUDJQUDEvMksxUjMgdyAtIC0gMCAxXCIsXG5cIjdrL3A1YjEvMXA0QnAvMnExcDFwMS8xUDFuMXIyL1AyUTJOMS82UDEvM1IySzEgYiAtIC0gMCAxXCIsXG5cInIxYnExazFyL3BwMlIxcHAvMnBwMXAyLzFuMU40LzgvM1AxUTIvUFBQMlBQUC9SMUIzSzEgdyAtIC0gMCAxXCIsXG5cInIxYm4xYjIvcHBrMW4yci8ycDNwcC81cDIvTjFQTnBQUDEvMkIxUDMvUFAyQjJQLzJLUjJSMSB3IC0gLSAwIDFcIixcblwiMnJxMmsxLzNiYjJwL24ycDJwUS9wMlBwMy8yUDFOMVAxLzFQNVAvNkIxLzJCMlIxSyB3IC0gLSAwIDFcIixcblwicjZrL3BwNHBwLzFiMVA0LzgvMW40UTEvMk4xUlAyL1BQcTNwMS8xUkIxSzMgYiAtIC0gMCAxXCIsXG5cInJuYjJiMXIvcHBwMW4xa3AvM3AxcTIvN1EvNFBCMi8yTjUvUFBQM1BQL1I0UksxIHcgLSAtIDAgMVwiLFxuXCJyMmsybnIvcHAxYjFRMXAvMm40Yi8zTjQvM3E0LzNQNC9QUFAzUFAvNFJSMUsgdyAtIC0gMCAxXCIsXG5cIjVyMWsvM3EzcC9wMkIxbnBiL1AybnAzLzROMy8yTjJiMi81UFBQL1IzUVJLMSBiIC0gLSAwIDFcIixcblwiNHIzL3A0cGtwL3E3LzNCYmIyL1AyUDFwcFAvMk4zbjEvMVBQMktQUi9SMUJRNCBiIC0gLSAwIDFcIixcblwiNmsxLzZwMS8zcjFuMXAvcDRwMW4vUDFONFAvMk41L1EyUkszLzdxIGIgLSAtIDAgMVwiLFxuXCI4LzgvMksyYjIvMk4yazIvMXA0UjEvMUIzbjFQLzNyMVAyLzggdyAtIC0gMCAxXCIsXG5cIjJxMnIyLzVyazEvNHBOcHAvcDJwUG4yL1AxcFAyUVAvMlAyUjIvMkIzUDEvNksxIHcgLSAtIDAgMVwiLFxuXCI1a3IxL3BwNHAxLzNiMXJiMS8yQnAyTlEvMXE2LzgvUFAzUFBQL1IzUjFLMSB3IC0gLSAwIDFcIixcblwicjFiMnIyL3BwM05way82bnAvOC8ycTFOMy80UTMvUFBQMlJQUC82SzEgdyAtIC0gMCAxXCIsXG5cInIycTFyazEvcDRwMXAvM3AxUTIvMm4zQjEvQjJSNC84L1BQM1BQUC81YksxIHcgLSAtIDAgMVwiLFxuXCIzcTJyMS9wMmIxazIvMXBuQnAxTjEvM3AxcFFQLzZQMS81UjIvMnIyUDIvNFJLMiB3IC0gLSAwIDFcIixcblwiM3JubjIvcDFyMnBrcC8xcDJwTjIvMnAxUDMvNVExTi8yUDNQMS9QUDJxUEsxL1I2UiB3IC0gLSAwIDFcIixcblwicjFiMnJrMS9wcDJiMXBwL3EzcG4yLzNuTjFOMS8zcDQvUDJRNC8xUDNQUFAvUkJCMVIxSzEgdyAtIC0gMCAxXCIsXG5cInFyM2Ixci9RNXBwLzNwNC8xa3A1LzJObjFCMi9QcDYvMVAzUFBQLzJSMVIxSzEgdyAtIC0gMCAxXCIsXG5cInIycXIxazEvMXAzcFAxL3AycDFucDEvMnBQcDFCMS8yUG5QMWIxLzJOMnAyL1BQMVE0LzJLUjFCTlIgdyAtIC0gMCAxXCIsXG5cIjZyay9wM3AycC8xcDJQcDIvMnAyUDIvMlAxbkJyMS8xUDYvUDZQLzNSMVIxSyBiIC0gLSAwIDFcIixcblwicmszcTFyL3BicDRwLzFwM1AyLzJwMU4zLzNwMlExLzNQNC9QUFAzUFAvUjNSMUsxIHcgLSAtIDAgMVwiLFxuXCIzcTFyMi9wYjNwcDEvMXA2LzNwUDFOay8ycjJRMi84L1BuM1BQMS8zUlIxSzEgdyAtIC0gMCAxXCIsXG5cInI3LzNiYjFrcC9xNHAxTi8xcG5QcDFucC8ycDRRLzJQNS8xUEIzUDEvMkIyUksxIHcgLSAtIDAgMVwiLFxuXCIxcjFxcmJrMS8zYjNwL3AycDFwcDEvM05uUDIvM040LzFRNEJQL1BQNFAxLzFSMlIySyB3IC0gLSAwIDFcIixcblwicjJyMmsxLzFxNHAxL3BwYjNwMS8yYk5wMy9QMVE1LzFONVIvMVA0QlAvbjZLIHcgLSAtIDAgMVwiLFxuXCIxYjJyMWsxLzNuMnAxL3AzcDJwLzFwM3IyLzNQTnAxcS8zQm5QMVAvUFAxQlFQMUsvUjZSIGIgLSAtIDAgMVwiLFxuXCI2cmsvMXBxYmJwMXAvcDNwMlEvNlIxLzROMW5QLzNCNC9QUFA1LzJLUjQgdyAtIC0gMCAxXCIsXG5cInIzcjFuMS9wcDNwazEvMnEycDFwL1AyTlAzLzJwMVFQMi84LzFQNVAvMUIxUjNLIHcgLSAtIDAgMVwiLFxuXCJybmJrMWIxci9wcHFwblExcC80cDFwMS8ycDFOMUIxLzROMy84L1BQUDJQUFAvUjNLQjFSIHcgLSAtIDAgMVwiLFxuXCIyYnIzay9wcDNQcDEvMW4ycDMvMVAyTjFwci8yUDJxUDEvOC8xQlEyUDFQLzRSMUsxIHcgLSAtIDAgMVwiLFxuXCI1cmsxL3BwMnAycC8zcDJwYi8ycFBuMlAvMlAycTIvMk40UC9QUDNCUjEvUjJCSzFOMSBiIC0gLSAwIDFcIixcblwicjNxMXIxLzFwMmJOa3AvcDNuMy8yUE4xQjFRL1BQMVAxcDIvN1AvNVBQMS82SzEgdyAtIC0gMCAxXCIsXG5cInI1cmsvcHBxMnAyLzJwYjFQMUIvM240LzNQNC8yUEIzUC9QUDFRTlAyLzFLNiB3IC0gLSAwIDFcIixcblwiMmIxcnFrMS9yMXAycHAxL3BwNG4xLzNOcDFRMS80UDJQLzFCUDUvUFAzUDIvMktSMlIxIHcgLSAtIDAgMVwiLFxuXCJyMWI0ci8xazJicHBwL3AxcDFwMy84L05wMm5CMi8zUjQvUFBQMUJQUFAvMktSNCB3IC0gLSAwIDFcIixcblwicjJxcjFrMS8xcDFuMnBwLzJiMXAzL3AycFAxYjEvUDJQMU5wMS8zQlBSMi8xUFFCM1AvNVJLMSB3IC0gLSAwIDFcIixcblwiMnJiM3IvM04xcGsxL3AycHAycC9xcDJQQjFRL24yTjFQMi82UDEvUDFQNFAvMUsxUlIzIHcgLSAtIDAgMVwiLFxuXCJyMWIyazFyLzJxMWIzL3AzcHBCcC8ybjNCMS8xcDYvMk40US9QUFAzUFAvMktSUjMgdyAtIC0gMCAxXCIsXG5cInIxYjFyazIvcHAxbmJOcEIvMnAxcDJwL3EybkIzLzNQM1AvMk4xUDMvUFBRMlBQMS8yS1IzUiB3IC0gLSAwIDFcIixcblwicjFicTFyMWsvcHA0cHAvMnBwNC8yYjJwMi80UE4yLzFCUFAxUTIvUFAzUFBQL1I0UksxIHcgLSAtIDAgMVwiLFxuXCJyMnE0L3AyblIxYmsvMXAxUGIycC80cDJwLzNuTjMvQjJCM1AvUFAxUTJQMS82SzEgdyAtIC0gMCAxXCIsXG5cIjVyMWsvcHAxbjFwMXAvNW4xUS8zcDFwTjEvM1A0LzFQNFJQL1AxcjFxUFAxL1I1SzEgdyAtIC0gMCAxXCIsXG5cIjRucmsxL3JSNXAvNHBucFEvNHAxTjEvMnAxTjMvNlAxL3E0UDFQLzRSMUsxIHcgLSAtIDAgMVwiLFxuXCI3Ui9yMXAxcTFwcC8zazQvMXAxbjFRMi8zTjQvOC8xUFAyUFBQLzJCM0sxIHcgLSAtIDAgMVwiLFxuXCJyMXFicjJrLzFwMm4xcHAvM0IxbjIvMlAxTnAyL3A0TjIvUFE0UDEvMVAzUDFQLzNSUjFLMSB3IC0gLSAwIDFcIixcblwiMXIxcmIzL3AxcTJwa3AvUG5wMm5wMS80cDMvNFAzL1ExTjFCMVBQLzJQUkJQMi8zUjJLMSB3IC0gLSAwIDFcIixcblwiNHIzLzJxMXJwazEvcDNiTjFwLzJwM3AxLzRRUDIvMk40UC9QUDRQMS81UksxIHcgLSAtIDAgMVwiLFxuXCJycTNyazEvMXAxYnBwMXAvM3AycFEvcDJOM24vMkJuUDFQMS81UDIvUFBQNS8yS1IzUiB3IC0gLSAwIDFcIixcblwiNHIxazEvUTRicHAvcDcvNU4yLzFQM3FuMS8yUDUvUDFCM1BQL1I1SzEgYiAtIC0gMCAxXCIsXG5cIjRyMy8ycDUvMnAxcTFrcC9wMXIxcDFwTi9QNVAxLzFQM1AyLzRRMy8zUkIxSzEgdyAtIC0gMCAxXCIsXG5cIjNyM2svMWIyYjFwcC8zcHAzL3AzbjFQMS8xcFBxUDJQLzFQMk4yUi9QMVFCMXIyLzJLUjNCIGIgLSAtIDAgMVwiLFxuXTtcbiIsIm1vZHVsZS5leHBvcnRzID0gW1xuXCJyMnExcmsxL3BwcDFuMXAxLzFiMXAxcDIvMUIxTjJCUS8zcFAzLzJQM1AxL1BQM1AyL1I1SzEgdyAtIC0gMCAxXCIsXG5cIjNyMXJrMS9wcHFuM3AvMW5wYjFQMi81QjIvMlA1LzJOM0IxL1BQMlExUFAvUjVLMSB3IC0gLSAwIDFcIixcblwiMmJxMWsxci9yNXBwL3AyYjFQbjEvMXAxUTQvM1A0LzFCNi9QUDNQUFAvMlIxUjFLMSB3IC0gLSAwIDFcIixcblwiMnIxazMvMlAzUjEvM1AySzEvNk4xLzgvOC84LzNyNCB3IC0gLSAwIDFcIixcblwiMXIxYjFuMi8xcGszcDEvNFAycC8zcFAzLzNONC8xcDJCMy82UFAvUjVLMSB3IC0gLSAwIDFcIixcblwicjFiMmsxci9wcHAxYnBwcC84LzFCMVE0LzVxMi8yUDUvUFBQMlBQUC9SM1IxSzEgdyAtIC0gMCAxXCIsXG5cIjVxcmsvcDNiMXJwLzRQMlEvNVAyLzFwcDUvNVBSMS9QNlAvQjZLIHcgLSAtIDAgMVwiLFxuXCIycm5rMy9wcTNwMi8zUDFRMVIvMXA2LzNQNC81UDIvUDFiMU4xUDEvNUsyIHcgLSAtIDAgMVwiLFxuXCIycnJrMy9RUjNwcDEvMm4xYjJwLzFCQjFxMy8zUDQvOC9QNFBQUC82SzEgdyAtIC0gMCAxXCIsXG5cInIxYjJrMXIvMXAxcDFwcDEvcDJQNC80TjFCcC8zcDQvOC9QUEIyUDIvMksxUjMgdyAtIC0gMCAxXCIsXG5cIjdSLzVycDEvMnAxcjFrMS8ycTUvNHBQMVEvNFAzLzVQSzEvN1IgdyAtIC0gMCAxXCIsXG5cInIxYjJrMXIvcHBwcDQvMWJQMnFwMS81cHAxLzRwUDIvMUJQNS9QQlAzUFAvUjJRMVIxSyBiIC0gLSAwIDFcIixcblwicjFibmsyci9wcHBwMXBwcC8xYjRxMS80UDMvMkIxTjMvUTFQcDFOMi9QNFBQUC9SM1IxSzEgdyAtIC0gMCAxXCIsXG5cIjJrcjNyLzFwM3BwcC9wM3BuMi8yYjFCMnEvUTFONS8yUDUvUFAzUFBQL1IyUjJLMSB3IC0gLSAwIDFcIixcblwiNmsxLzFwM3BwMS9wMWIxcDJwL3EzcjFiMS9QNy8xUDVQLzFOUTFSUFAxLzFCNEsxIGIgLSAtIDAgMVwiLFxuXCI1cjIvMXFwMnBwMS9ibnBrM3AvNE5RMi8yUDUvMVA1UC81UFAxLzRSMUsxIHcgLSAtIDAgMVwiLFxuXCIxcjJyMmsvMXExbjFwMXAvcDFiMXBwMi8zcFAzLzFiNVIvMk4xQkJRMS8xUFAzUFAvM1IzSyB3IC0gLSAwIDFcIixcblwiNFIzL3AycjFxMWsvNUIxUC82UDEvMnA0Sy8zYjQvNFEzLzggdyAtIC0gMCAxXCIsXG5cIjRrMy9wNXAxLzJwNHIvMk5QYjMvNHAxcHIvMVA0cTEvUDFRUjFSMVAvN0sgYiAtIC0gMCAxXCIsXG5cIjZyMS9yNVBSLzJwM1IxLzJQazFuMi8zcDQvMVAxTlAzLzRLMy84IHcgLSAtIDAgMVwiLFxuXCI2azEvNXAxcC8yUTFwMXAxLzVuMXIvTjcvMUIzUDFQLzFQUDNQSy80cTMgYiAtIC0gMCAxXCIsXG5cIjgvM24ycHAvMnFCa3AyL3BwUHBwMVAxLzFQMlAzLzFRNi9QNFBQMS82SzEgdyAtIC0gMCAxXCIsXG5cInIycWtiMXIvMXBwMXBwcHAvcDFubjQvM04xYjIvUTFCUDFCMi80UDMvUFAzUFBQL1IzSzFOUiB3IC0gLSAwIDFcIixcblwiM2JyMWsxLzNOMXBwcC8xcDFRUDMvM1A0LzZQMS81cTIvNVAxUC81UksxIGIgLSAtIDAgMVwiLFxuXCI4LzVwMi80YjFrcC8zcFBwMU4vM1BuMVAxL0I2UC83Sy84IGIgLSAtIDAgMVwiLFxuXCJyMnFrYjFyL24yYm5wcDEvMnAxcDJwL1JQNi9RMUJQUDJCLzJOMk4yLzFQM1BQUC80SzJSIGIgLSAtIDAgMVwiLFxuXCJyMWJxMXJrMS9wcDFwMXBwMS8xYjNuMXAvbjJwNC8xUDJQMy8zQjFOMi9QNFBQUC9STkJRMVJLMSB3IC0gLSAwIDFcIixcblwicjFicTFyazEvcHBwMnBwMS8ybnAxbjFwLzJiMXAzL04xQjFQMy8zUDFOMVAvUFBQMlBQMS9SMUJRMVJLMSBiIC0gLSAwIDFcIixcblwiNWsxci9wMXAxcTFwcC8xcEIycDFuLzNwMWIyLzFQNi9QM3AyUC8yUE4xUFAxL1IxQlExUksxIHcgLSAtIDAgMVwiLFxuXCJybmJxMXJrMS9wcHAycHBwLzNiMW4yLzgvNFAzLzNQQk4yL1BQUDNQUC9STjFRS0IxUiBiIC0gLSAwIDFcIixcblwicjFicTFyazEvcHBwMWJwcG4vM1AzcC84LzJCUTQvMk4xQjMvUFBQMlBQUC9SNFJLMSBiIC0gLSAwIDFcIixcblwicjJxMXIxay8xcDNwcHAvcDJwYmIxbi8ycDUvUDFCcFBQUFAvTlAxUDQvMlAzUTEvMksxUjJSIGIgLSAtIDAgMVwiLFxuXCJybmJxa2Ixci9wNXBwLzJwcDNuLzFwMnBwMi80UDMvMVBOQjFOMVAvUDFQUFFQUDEvUjFCMlJLMSB3IC0gLSAwIDFcIixcblwicm5icTFyazEvcHBwMWIxcHAvM3AxbjIvNHAzLzVwMi8xUDJQMVAxL1BCUFBOUEJQL1JOMVExUksxIHcgLSAtIDAgMVwiLFxuXCJyMWJxMXJrMS9wcDJicHBwLzJuMm4yLzJwMXAzLzRwMy8yUFAxTjIvUFBCMVFQUFAvUk5CMlJLMSB3IC0gLSAwIDFcIixcblwicjFiMnIxay8xcHAzcDEvcDFxMXBQQnAvNXAxUS8zUDQvUDVOMS8xUDNQUFAvM1IxUksxIGIgLSAtIDAgMVwiLFxuXCJybmJxa2Ixci9wcHAzcHAvM3AxUDIvNkIxLzgvM0IxTjIvUFBQMlBQUC9STjFRSzJSIGIgLSAtIDAgMVwiLFxuXCJybjNyazEvcHAybjFwcC8xcTFwNC8ycFAxcDFiLzJQMVBQMi8zQkJOMi9QMVEzUFAvUjRSSzEgdyAtIC0gMCAxXCIsXG5cInJucTJyazEvcHAxYjFwcHAvMnBiMW4yLzNwNC8zTlAzLzFCTjFQMlAvUFBQMlBQMS9SMUJRMVJLMSBiIC0gLSAwIDFcIixcblwiMmtyNC9wcHA0US82cDEvMmIycHExLzgvMlAxcDFQMS9QUDFQTjJQL1IxQjFLMlIgdyAtIC0gMCAxXCIsXG5cInIxYnFrYm5yL3BwMXAxcHBwLzgvMnA1LzNuUDMvMVBOUTJwMS9QMVBQTjJQL1IxQjFLQjFSIHcgLSAtIDAgMVwiLFxuXCJybmJxazJyL3BwcHAxcHAxLzdwLzJiMU4zLzJCMU4zLzgvUFBQUDFQUFAvUjFCUUsyUiBiIC0gLSAwIDFcIixcblwicjFiMWsyci9wcHBwcTFwMS83cC8yYjFQMy8yQjFRMy84L1BQUDJQUFAvUjFCMlJLMSBiIC0gLSAwIDFcIixcblwicm5icTFyazEvcHAzcHAxLzJwYnBuMXAvM3A0LzRQMy8xUU40Ti9QUFBQMVBQUC9SMUIxS0IxUiBiIC0gLSAwIDFcIixcblwicm4yazJyL3BwcDJwcDEvM3AxbjFwLzJQMXAzLzJCMU4zLzgvUDFQUDFQMVAvUjFCMUsxUjEgYiAtIC0gMCAxXCIsXG5cIjZrMS82cDEvOC84LzNQMXExci83UC9QUDRQMS8zUjNLIGIgLSAtIDAgMVwiLFxuXCJyMnEyazEvMXBwM3AxL3AxbnBiYjFwLzgvM1BQMy83UC9QUDNQUDEvUjFCUTFSSzEgdyAtIC0gMCAxXCIsXG5cInIxYjJyazEvcHBwcDFwcHAvbjRuMi80cTMvMWI1US8yUDFQcFAxL1BCMVAyQlAvUk4ySzFOUiB3IC0gLSAwIDFcIixcblwiM3IxcmsxL2IxcDNwcC9wMXAxUHAyLzJQMlAyLzFQMk4xbjEvMkI1L1AzSzJQL1I2UiBiIC0gLSAwIDFcIixcblwicjRuazEvNHExcHAvMXIxcDFwMi8ycFBwMy8yUDJCMi8xcDYvUDRQUFAvUjFRMVIxSzEgdyAtIC0gMCAxXCIsXG5cInIxYjNyMS9wcDFwMnBwL2sxUGI0LzJwMXAzLzgvMlFQNC9QUFAyUFBQL1JOMksyUiBiIC0gLSAwIDFcIixcblwiMXI0azEvcDFwMXExcHAvNXAyLzJwUHBQMi9icjRQUC8xUDFSUEIyL1AxUTUvMks0UiBiIC0gLSAwIDFcIixcblwiM3EyazEvcDFwbjJwcC8xcm4xYjFyMS8xcDFwcDMvNFBwTmIvMlBQMUIxUC9QUE4xUVBQMS9SMUIxUjFLMSB3IC0gLSAwIDFcIixcblwicjFicTFyMWsvcHBwcG4xcHAvMWIxUDQvbjRwMi8yQjFQMkIvMk4yTjIvUFAzUFBQL1IyUTFSSzEgYiAtIC0gMCAxXCIsXG5cInI0cmsxL3BwM3BwcC8xcW5iMW4yLzFCMXBwMy8yUDUvM1AxTjFQL1BQM1AxUC9SMUJRMVJLMSBiIC0gLSAwIDFcIixcblwicjFicWsxbnIvcHBwcDNwLzVwcDEvNHAzLzFiQm5QMy81UTFOL1BQUFAxUFBQL1JOQjJSSzEgdyAtIC0gMCAxXCIsXG5cInIzazJyL3BwYjFxMnAvbjFwMUJwcDEvMlBQNC8zUDQvUDROMVAvMVAzUFAxLzFSMVExUksxIGIgLSAtIDAgMVwiLFxuXCJyMWJxMXJrMS9wcDFwYnBwMS81bjFwLzJwNS8yQnBQTjFCLzNQNC9QUFAyUFBQL1IyUTFSSzEgYiAtIC0gMCAxXCIsXG5cInI0cmsxLzFwcDFicHAxLzJwcTFuMXAvcDNwUTIvNFBQMi8zUEIyUC9QUFAxTjFQMS9SNFJLMSBiIC0gLSAwIDFcIixcblwicjFiMWsyYi9wMXBuM3AvMXAyUDFwMS81bjIvNUIyLzJOQjQvUFBQMlBQUC8yS1JSMyBiIC0gLSAwIDFcIixcblwicjFicWtibnIvcHAzcHBwLzJuMXAzLzJwcFAzLzNQNC8yTjFCMy9QUFAyUFBQL1IyUUtCTlIgYiAtIC0gMCAxXCIsXG5cInIxYjJyazEvMXA0cHAvMXBuMnAyLzFOMnFwMi84L1AyQnAyUC8xUFAyUFAxLzFSMVExUksxIHcgLSAtIDAgMVwiLFxuXCJyNy83ay8xQnAzcHAvNHBxMW4vUDNRMy8xUFA0UC8yUDNQMS8zUjJLMSB3IC0gLSAwIDFcIixcblwicjJxcjFrMS8ycDFucHBwL3A3LzFwMXBOMU4xLzNQNC8xQjVQL1BQM1BQMS9SM1ExSzEgYiAtIC0gMCAxXCIsXG5cInJuYjFrcjIvcHBwMW4xcHAvM1AycTEvOC84LzRQTjIvUFBQUDJQUC9STkIyUksxIGIgLSAtIDAgMVwiLFxuXCJyMnE0L3BicHAxa3AxLzFwMWIxbjFwLzgvM3BQMy8zUDQvUFBQMlBQUC9STjFRSzJSIHcgLSAtIDAgMVwiLFxuXCJybmJxazFuci9wcDFwMnBwLzFiMnBQMi8ycDNCMS8zUDQvMlAyTjIvUFAzUFBQL1JOMVFLQjFSIGIgLSAtIDAgMVwiLFxuXCJyMWJxMXJrMS9wcHAxbjFwMS8xYm4xcFAyLzNwMk4xLzNQMVBQMS8yUDJRMi9QUDVQL1JOQjJSSzEgYiAtIC0gMCAxXCIsXG5cInJuMmsyci9wcHAycDFwLzRwMXAxLzRiMXFuLzNQQjMvNFAyUC9QUFAyUDIvUjFCUUsyUiB3IC0gLSAwIDFcIixcblwiMnIzazEvNXBwcC80cDMvMmJuTm5OMS81UDIvOC8xUDRQUC8yQjJSMUsgdyAtIC0gMCAxXCIsXG5cInIza2Juci9wcDRwMS8ybjFwMnAvcTFwcFBiMi8zUDNQL1AxTjFCTjIvMVBQMlBCMS9SMlFLMlIgYiAtIC0gMCAxXCIsXG5cInJuYnFrMnIvcDNicHBwLzFwMnAzLzJwNS8ycFBQMy9QMU4xQlAyLzFQUFFOMVBQLzJLUjNSIHcgLSAtIDAgMVwiLFxuXCI4LzZRUC9wazYvOC81YjFyLzVLMi9QUDRQMS84IGIgLSAtIDAgMVwiLFxuXCJybjFxazFuci9wcDJicHBwLzJwMXAzLzNwNC8zUFAzLzJOUTFOMi9QUFAyUFBQL1IxQjFLMlIgYiAtIC0gMCAxXCIsXG5cInIxYnExcmsxL3BwcDJwcHAvM2IxbjIvM1BuMy8yQjFwUDIvOC9QUFBQUTFQUC9STkIyUksxIHcgLSAtIDAgMVwiLFxuXCI1cmsxL3A0cHBwLzFycDFwMy8zcEIxUTEvM1BuMy8xUDRQUC9QMVAyUDIvUjNSMUsxIGIgLSAtIDAgMVwiLFxuXCJybjFxa2Ixci9wcHAxcHBwcC81bjIvNWJOMS84LzJOcDQvUFBQMlBQUC9SMUJRS0IxUiB3IC0gLSAwIDFcIixcblwiNXJrMS9yYjNwMXAvNXAyLzNwNC80UDMvUFAxQm5OQjEvMVAzUlBQL1I1SzEgdyAtIC0gMCAxXCIsXG5cInIycTFyazEvcHBibjFwcDEvM3AzcC8zcDQvMVBCMVBOYjEvUDJRMU4yLzJQM1BQL1I0UjFLIHcgLSAtIDAgMVwiLFxuXCJyNW5yLzNrMXBwcC9wMlBwMy9uNy8zTjFCMi84L1BQM1BQUC9SM0syUiBiIC0gLSAwIDFcIixcblwicm4xcWtibnIvMXA2L3AxcHAxcDIvNnBwL1ExQlBQcGIxLzJQMk4yL1BQMU4yUFAvUjFCMlJLMSB3IC0gLSAwIDFcIixcblwicjNrMnIvcHAxbjFwcDEvMXFwYnBuMXAvM3A0LzNQUDMvUDFOUTFOMVAvMVBQMlBQMS9SMUIxUjFLMSBiIC0gLSAwIDFcIixcblwiN3IvMnFuMXJrMS8ycDJicHAvcDFwMXBwMi9QMVAyUDIvMVAxUEJSUU4vNlBQLzRSMUsxIHcgLSAtIDAgMVwiLFxuXCJyMnFrMW5yL3BwcDNwcC8ybjJwMi8yYnA0LzNwUFBiMS8zQjFOMi9QUFAzUFAvUk5CUTFSMUsgdyAtIC0gMCAxXCIsXG5cInIxYjJxazEvcHBRNHAvMlAxcHBycC8zcDQvM240L1A1UDEvMVAxTlBQQlAvUjRSSzEgYiAtIC0gMCAxXCIsXG5cInIycWtiMXIvcHAzcDFwLzJiMXAxcDEvMnBwUDJuLzNQMVAyLzJOMUJOMi9QUFAzUFAvUjJRMVJLMSBiIC0gLSAwIDFcIixcblwicm5icWsyci9wcHAycHBwLzVuMi8yYlA0LzVQMi8zcDJOMS9QUFAzUFAvUk5CUUtCMVIgdyAtIC0gMCAxXCIsXG5cInIxYjRyLzFwazNwcC9wMW5wNC8zQm4xYjEvUFAySzMvNVAyLzNQM1AvMlI1IHcgLSAtIDAgMVwiLFxuXCJyMWJxa2Juci9wNXBwLzFwbnAxUDIvMnA1LzJCUDFCMi81TjIvUFBQM1BQL1JOMVFLMlIgYiAtIC0gMCAxXCIsXG5dO1xuIiwibW9kdWxlLmV4cG9ydHMgPSBbXG5cIjFyYjJrMi8xcHEzcFEvcFJwTnAzL1AxUDJuMi8zUDFQMi80UDMvNlBQLzZLMSB3IC0gLSAwIDFcIixcblwiMnIyYmsxL3BiM3BwcC8xcDYvbjcvcTJQNC9QMVAxUjJRL0IyQjFQUFAvUjVLMSB3IC0gLSAwIDFcIixcblwiM3IyazEvcDFwMnAyL2JwMnAxblEvNFBCMVAvMnByM3EvNlIxL1BQM1BQMS8zUjJLMSB3IC0gLSAwIDFcIixcblwicjFicjFiMi80cFBrMS8xcDFxM3AvcDJQUjMvUDFQMk4yLzFQMVEyUDEvNVBCSy80UjMgdyAtIC0gMCAxXCIsXG5cIjdyLzNrYnAxcC8xUTNSMi8zcDNxL3AyUDNCLzFQNUsvUDZQLzggdyAtIC0gMCAxXCIsXG5cIjRSbmsxL3ByM3BwcC8xcDNxMi81TlExLzJwNS84L1A0UFBQLzZLMSB3IC0gLSAwIDFcIixcblwiNHFrMi82cDEvcDcvMXAxUXAzL3IxUDJiMi8xSzVQLzFQNi80UlIyIHcgLSAtIDAgMVwiLFxuXCIzcjFyazEvcHBxbjNwLzFucGIxUDIvNUIyLzJQNS8yTjNCMS9QUDJRMVBQL1I1SzEgdyAtIC0gMCAxXCIsXG5cInIzcmsyLzZiMS9xMnBRQnAxLzFOcFA0LzFuMlBQMi9uUDYvUDNOMUsxL1I2UiB3IC0gLSAwIDFcIixcblwicjVrMS9wcDJwcGIxLzNwNC9xM1AxUVIvNmIxL3IyQjFwMi8xUFA1LzFLNFIxIHcgLSAtIDAgMVwiLFxuXCI2azEvNXBwMS9wM3AycC8zYlAyUC82UU4vOC9ycTRQMS8yUjRLIHcgLSAtIDAgMVwiLFxuXCJOMWJrNC9wcDFwMVFwcC84LzJiNS8zbjNxLzgvUFBQMlJQUC9STkIxckJLMSBiIC0gLSAwIDFcIixcblwicjNicjFrL3BwNXAvNEIxcDEvNE5wUDEvUDJQbjMvcTFQUTNSLzdQLzNSMksxIHcgLSAtIDAgMVwiLFxuXCI2a3IvcHAycjJwL24xcDFQQjFRLzJxNS8yQjRQLzJOM3AxL1BQUDNQMS83SyB3IC0gLSAwIDFcIixcblwiMVI2LzVxcGsvNHAycC8xUHAxQnAxUC9yMW4yUVAxLzVQSzEvNFAzLzggdyAtIC0gMCAxXCIsXG5cIjgvNFIxcGsvcDVwMS84LzFwQjFuMWIxLzFQMmIxUDEvUDRyMVAvNVIxSyBiIC0gLSAwIDFcIixcblwicjFiazFyMi9wcDFuMnBwLzNOUTMvMVA2LzgvMm4yUEIxL3ExQjNQUC8zUjFSSzEgdyAtIC0gMCAxXCIsXG5cInJuM3JrMS9wcDNwMi8yYjFwbnAxLzROMy8zcTQvUDFOQjNSLzFQMVExUFBQL1I1SzEgdyAtIC0gMCAxXCIsXG5cIjJrcjFiMXIvcHAzcHBwLzJwMWIycS80QjMvNFEzLzJQQjJSMS9QUFAyUFBQLzNSMksxIHcgLSAtIDAgMVwiLFxuXCI1cXIxL2twMlIzLzVwMi8xYjFOMXAyLzVRMi9QNVAxLzZCUC82SzEgdyAtIC0gMCAxXCIsXG5cInIycXJrMi9wNWIxLzJiMXAxUTEvMXAxcFAzLzJwMW5CMi8yUDFQMy9QUDNQMi8yS1IzUiB3IC0gLSAwIDFcIixcblwicjVyay9wcDFucDFibi8ycHAycTEvM1AxYk4xLzJQMU4yUS8xUDYvUEIyUFBCUC8zUjFSSzEgdyAtIC0gMCAxXCIsXG5cInI0bjFrL3BwQm5OMXAxLzJwMXAzLzZOcC9xMmJQMWIxLzNCNC9QUFAzUFAvUjRRMUsgdyAtIC0gMCAxXCIsXG5cInIzUW5SMS8xYms1L3BwNXEvMmI1LzJwMVAzL1A3LzFCQjRQLzNSM0sgdyAtIC0gMCAxXCIsXG5cIjFyNGsxLzNiMnBwLzFiMXBQMnIvcHAxUDQvNHEzLzgvUFA0UlAvMlEyUjFLIGIgLSAtIDAgMVwiLFxuXCJyMk5xYjFyL3BRMWJwMXBwLzFwbjFwMy8xazFwNC8ycDJCMi8yUDUvUFBQMlBQUC9SM0tCMVIgdyAtIC0gMCAxXCIsXG5cInI2ay9wYjRicC81UTIvMnAxTnAyLzFxQjUvOC9QNFBQUC80UksyIHcgLSAtIDAgMVwiLFxuXCIycjJiMWsvcDJRM3AvYjFuMlBwUC8ycDUvM3IxQk4xLzNxMlAxL1A0UEIxL1IzUjFLMSB3IC0gLSAwIDFcIixcblwicjNyMmsvcGIxbjNwLzFwMXExcHAxLzRwMUIxLzJCUDNRLzJQMVIzL1A0UFBQLzRSMUsxIHcgLSAtIDAgMVwiLFxuXCJxMXIyYjFrL3JiNG5wLzFwMnAyTi9wQjFuNC82UTEvMVAyUDMvUEIzUFBQLzJSUjJLMSB3IC0gLSAwIDFcIixcblwiMnIxazJyL3BSMnAxYnAvMm4xUDFwMS84LzJRUDQvcTJiMU4yL1AyQjFQUFAvNEsyUiB3IC0gLSAwIDFcIixcblwiNXJrMS9wcDJScHBwL25xcDUvOC81UTIvNlBCL1BQUDJQMVAvNksxIHcgLSAtIDAgMVwiLFxuXCIxUTFSNC81azIvNnBwLzJOMWJwMi8xQm41LzJQMlAxUC8xcjNQSzEvOCBiIC0gLSAwIDFcIixcblwiMXE1ci8xYjFyMXAxay8ycDFwUHBiL3AxUHA0LzNCMVAxUS8xUDRQMS9QNEtCMS8yUlI0IHcgLSAtIDAgMVwiLFxuXCJyMWJxbjFyay8xcDFucDFicC9wMXBwMnAxLzZQMS8yUFBQMy8yTjFCUE4xL1BQMVE0LzJLUjFCMVIgdyAtIC0gMCAxXCIsXG5cInIycTQvcHAxcnBRYmsvM3AycDEvMnBQUDJwLzVQMi8yTjUvUFBQMlAyLzJLUjNSIHcgLSAtIDAgMVwiLFxuXCI0cTFyay9wYjJicG5wLzJyNFEvMXAxcDFwUDEvNE5QMi8xUDNSMi9QQm40UC9SQjRLMSB3IC0gLSAwIDFcIixcblwiNXJrMS9wYnBwcTFiTi8xcG4xcDFRMS82TjEvM1A0LzgvUFBQMlBQMS8ySzRSIHcgLSAtIDAgMVwiLFxuXCJyMnI0LzFwMWJuMnAvcG4ycHBrQi81cDIvNFBRTjEvNlAxL1BQcTJQQlAvUjJSMksxIHcgLSAtIDAgMVwiLFxuXCI1cmsxL3BwcDNwcC84LzNwUTMvM1AyYjEvNXJQcS9QUDFQMVAyL1IxQkIxUksxIGIgLSAtIDAgMVwiLFxuXCJyNnIvMXAycHAxay9wMWIycTFwLzRwUDIvNlFSLzNCMlAxL1AxUDJLMi83UiB3IC0gLSAwIDFcIixcblwicjJRMXExay9wcDVyLzRCMXAxLzVwMi9QNy80UDJSLzdQLzFSNEsxIHcgLSAtIDAgMVwiLFxuXCI1azIvcDJRMXBwMS8xYjVwLzFwMlBCMVAvMnAyUDIvOC9QUDNxUEsvOCB3IC0gLSAwIDFcIixcblwicjNrYjFyL3BiNi8ycDJwMXAvMXAycHEyLzJwUTNwLzJOMkIyL1BQM1BQUC8zUlIxSzEgdyAtIC0gMCAxXCIsXG5cInJuM2sxci9wYnBwMUJicC8xcDRwTi80UDFCMS8zbjQvMnEzUTEvUFBQMlBQUC8yS1IzUiB3IC0gLSAwIDFcIixcblwicjFiM2tyL3BwcDFCcDFwLzFiNi9uMlA0LzJwM3ExLzJRMk4yL1A0UFBQL1JOMlIxSzEgdyAtIC0gMCAxXCIsXG5cIjFSMWJyMWsxL3BSNXAvMnAzcEIvMnAyUDIvUDFxcDJRMS8ybjRQL1A1UDEvNksxIHcgLSAtIDAgMVwiLFxuXCI2cmsvMnAycDFwL3AycTFwMVEvMnAxcFAyLzFuUDFSMy8xUDVQL1A1UDEvMkIzSzEgdyAtIC0gMCAxXCIsXG5cInIzcmsyLzVwbjEvcGIxbnExcFIvMXAycDFQMS8ycDFQMy8yUDJRTjEvUFBCQjFQMi8ySzRSIHcgLSAtIDAgMVwiLFxuXCIzcmtxMXIvMXBRMnAxcC9wM2JQcDEvM3BSMy84LzgvUFBQMlBQMS8xSzFSNCB3IC0gLSAwIDFcIixcblwibjJxMXIxay80YnAxcC80cDMvNFAxcDEvMnBQTlEyLzJwNFIvNVBQUC8yQjNLMSB3IC0gLSAwIDFcIixcblwiMlJyMXFrMS81cHBwL3AyTjQvUDcvNVEyLzgvMXI0UFAvNUJLMSB3IC0gLSAwIDFcIixcblwicjFicTJyay9wcDNwYnAvMnAxcDFwUS83UC8zUDQvMlBCMU4yL1BQM1BQUi8yS1I0IHcgLSAtIDAgMVwiLFxuXCI1cXIxL3ByM3Axay8xbjFwMnAxLzJwUHBQMXAvUDNQMlEvMlAxQlAxUi83UC82UksgdyAtIC0gMCAxXCIsXG5cIjdrL3BiNHJwLzJxcDFRMi8xcDNwUDEvbnAzUDIvM1ByTjFSL1AxUDRQL1IzTjFLMSB3IC0gLSAwIDFcIixcblwiOC9wNHBrMS82cDEvM1I0LzNucU4xUC8yUTNQMS81UDIvM3IxQksxIGIgLSAtIDAgMVwiLFxuXCJyMWIycmsxL3AxcW5icDFwLzJwM3AxLzJwcDNRLzRwUDIvMVAxQlAxUjEvUEJQUDJQUC9STjRLMSB3IC0gLSAwIDFcIixcblwicnFyM2sxLzNicHBCcC8zcDJQMS9wNy8xbjJQMy8xcDNQMi8xUFBRMlAxLzJLUjNSIHcgLSAtIDAgMVwiLFxuXCJyM3ExcmsvMXBwM3BiL3BiNVEvM3BCMy8zUDQvMlAyTjFQL1BQMU4yUDEvN0sgdyAtIC0gMCAxXCIsXG5cIjNRMXJrMS84LzdSL3AxTjFwMUJwL1AxcTUvN2IvM1ExUFBLLzFyNiBiIC0gLSAwIDFcIixcblwiMXIyazFyMS9wYnBwbnAxcC8xYjNQMi84L1E3L0IxUEIxcTIvUDRQUFAvM1IySzEgdyAtIC0gMCAxXCIsXG5cIjJyM2sxLzZwcC9wMnA0LzFwNi8xcDJQMy8xUE5LMWJRMS8xQlAzcVAvUjcgYiAtIC0gMCAxXCIsXG5cIjFyM3JrMS8xbnFiMm4xLzZSMS8xcDFQcDMvMVBwM3AxLzJQNFAvMkIyUVAxLzJCMlJLMSB3IC0gLSAwIDFcIixcblwiM3IxcmsxL3AxcDRwLzgvMVBQMXAxYnEvMlA1LzNOMVBwMS9QQjJRMy8xUjNSSzEgYiAtIC0gMCAxXCIsXG5cIjJiM2sxLzZwMS9wMmJwMnIvMXAxcDQvM05wMUIxLzFQUDFQUnExL1AxUjNQMS8zUTJLMSBiIC0gLSAwIDFcIixcblwiNXEyLzFwcHIxYnIxLzFwMXAxa25SLzFONFIxL1AxUDFQUDIvMVA2LzJQNFEvMks1IHcgLSAtIDAgMVwiLFxuXCJyMnExYjFyLzFwTjFuMXBwL3AxbjNrMS80UGIyLzJCUDQvOC9QUFAzUFAvUjFCUTFSSzEgdyAtIC0gMCAxXCIsXG5cIjRuMy9wYnEycmsxLzFwM3BOMS84LzJwMlEyL1BuNE4xL0I0UFAxLzRSMUsxIHcgLSAtIDAgMVwiLFxuXCI4LzFwMnAxa3AvMnJSQjMvcHEybjFQcC80UDMvOC9QUFAyUTIvMks1IHcgLSAtIDAgMVwiLFxuXCIzcjFyazEvMXEyYjFuMS9wMWIxcFJwUS8xcDJQMy8zQk4zL1AxUEI0LzFQNFBQLzRSMksgdyAtIC0gMCAxXCIsXG5cInI0cjFrLzFicHExcDFuL3AxbnA0LzFwMUJiMUJRL1A3LzZSMS8xUDNQUFAvMU4yUjFLMSB3IC0gLSAwIDFcIixcblwiazFiNHIvMXA2L3BSM3AyL1AxUXAycDEvMnBwNC82UFAvMlAycUJLLzggdyAtIC0gMCAxXCIsXG5cInIzcmtuUS8xcDFSMXBiMS9wM3BxQkIvMnA1LzgvNlAxL1BQUDJQMVAvNFIxSzEgdyAtIC0gMCAxXCIsXG5cImsycjQvcHAzcDIvMnA1L1EzcDJwLzRLcDFQLzVSMi9QUDRxMS83UiBiIC0gLSAwIDFcIixcblwiNXJrMS8xYlIycGJwLzRwMXAxLzgvMXAxUDFQUHEvMUIyUDJyL1AyTlEyUC81UksxIGIgLSAtIDAgMVwiLFxuXCI2cmsvM2IzcC9wMmIxcDIvMnBQcFAyLzJQMUIzLzFQNHExL1AyQlExUFIvNksxIHcgLSAtIDAgMVwiLFxuXCIzazFyMXIvcGIzcDIvMXA0cDEvMUIyQjMvM3FuMy82UVAvUDRSUDEvMlIzSzEgdyAtIC0gMCAxXCIsXG5cIjVrcVEvMWIxcjJwMS9wcG4xcDFCcC8yYjUvMlAyclAxL1A0TjIvMUI1UC80UlIxSyB3IC0gLSAwIDFcIixcblwiM3JucjFrL3AxcTFiMXBCLzFwYjFwMnAvMnAxUDMvMlAyTjIvUFA0UDEvMUJRNFAvNFJSSzEgdyAtIC0gMCAxXCIsXG5cIjZyay81cDFwLzVwMi8xcDJiUDIvMVAyUjJRLzJxMUJCUFAvNVBLMS9yNyB3IC0gLSAwIDFcIixcblwiNXIxay8ycTFyMXAxLzFucGJCcFFCLzFwMXAzUC9wMlAyUjEvUDRQUDEvMVBSMlBLMS84IHcgLSAtIDAgMVwiLFxuXCJyMWIycmsxLzFwM3BiMS8ycDNwMS9wMUI1L1AzTjMvMUIxUTFQbjEvMVBQM3ExLzJLUjNSIHcgLSAtIDAgMVwiLFxuXCI4L1Fya2JSMy8zcDNwLzJwUDQvMVAzTjIvNlAxLzZwSy8ycTUgdyAtIC0gMCAxXCIsXG5cIjgvcHAzcGsxLzJiMmIyLzgvMlEyUDFyLzJQMXEyQi9QUDRQSy81UjIgYiAtIC0gMCAxXCIsXG5cIjFyM3Ixay8yUjRwL3E0cHBQLzNQcFEyLzJSYlAzL3BQNi9QMkIyUDEvMUs2IHcgLSAtIDAgMVwiLFxuXCJyMXEyYjIvcDRwMWsvMXAxcjNwLzNCMVAyLzNCMlExLzRQMy9QNVBQLzVSSzEgdyAtIC0gMCAxXCIsXG5cIjZrMS82cHAvMXE2LzRwcDIvUDVuMS8xUDYvMVAzQlByL1I0UUsxIGIgLSAtIDAgMVwiLFxuXCI1cjIvNmsxL3AycDQvNm4xL1AzcDMvOC81UDIvMnEyUUtSIGIgLSAtIDAgMVwiLFxuXCIxazFyNC8xYjFwMnBwL1BRMnAzL25ONi9QM1AzLzgvNlBQLzJxMkJLMSB3IC0gLSAwIDFcIixcblwiMmIzazEvMXA1cC8ycDFuMXBRLzNxQjMvM1A0LzNCM1AvcjVQMS81UksxIHcgLSAtIDAgMVwiLFxuXCIycjFyazIvNmIxLzFxMnBwUDEvcHAxUHBRQjEvOC9QUFAyQlAxLzZLMS83UiB3IC0gLSAwIDFcIixcblwicnIzazIvcHBwcTFwTjEvMWIxcDFCblEvMWIycDFOMS80UDMvMlBQM1AvUFAzUFAxL1I0UksxIHcgLSAtIDAgMVwiLFxuXCI3Ui8xYnBrcDMvcDJwcDMvM1A0LzRCMXExLzJRNS80TnJQMS8zSzQgdyAtIC0gMCAxXCIsXG5cIjJiMXIyci8ycTFwMWtuL3BOMXBQcDIvUDJQMVJwUS8zcDQvM0I0LzFQNFBQL1I2SyB3IC0gLSAwIDFcIixcblwiM3Ixa2JSLzFwMXIycDEvMnFwMW4yL3AzcFBRMS9QMVAxUDMvQlA2LzJCNS82UksgdyAtIC0gMCAxXCIsXG5cIjVxcmsvcDNiMXJwLzRQMlEvNVAyLzFwcDUvNVBSMS9QNlAvQjZLIHcgLSAtIDAgMVwiLFxuXCIxcjNyMWsvNnAxL3A2cC8yYnBOQlAxLzFwMm4zLzFQNVEvUEJQMXEyUC8xSzVSIHcgLSAtIDAgMVwiLFxuXCI4LzFyNXAva3BRM3AxL3AzcnAyL1A2UC84LzRiUFBLLzFSNiB3IC0gLSAwIDFcIixcblwiM3IxazIvMXByMnBSMS9wMWJxMW4xUS9QM3BQMi8zcFAzLzNQNC8xUDJOMlAvNlJLIHcgLSAtIDAgMVwiLFxuXCIzUnJrMi8xcDFSMXByMS8ycDFwMlEvMnExUDFwMS81UDIvOC8xUFA1LzFLNiB3IC0gLSAwIDFcIixcblwiMVIzbmsxLzVwcDEvM04yYjEvNHAxbjEvMkJxUDFRMS84LzgvN0sgdyAtIC0gMCAxXCIsXG5cIjJyMnJrMS8xYjNwcDEvNHAzL3AzUDFRMS8xcHFQMVIyLzJQNS9QUDFCMUsxUC9SNyB3IC0gLSAwIDFcIixcblwiNmsxL3BwM3IyLzJwNHEvM3AycDEvM1BwMWIxLzRQMVAxL1BQNFJQLzJRMVJyTksgYiAtIC0gMCAxXCIsXG5cIjgvOC9wM3AzLzNiMXBSMS8xQjNQMWsvOC80cjFQSy84IHcgLSAtIDAgMVwiLFxuXCJyMWIybnJrLzFwM3AxcC9wMnAxUDIvNVAyLzJxMVAyUS84L1BwUDUvMUsxUjNSIHcgLSAtIDAgMVwiLFxuXCJyNWtyL3BwcE4xcHAxLzFibjFSMy8xcTFOMkJwLzNwMlExLzgvUFBQMlBQUC9SNUsxIHcgLSAtIDAgMVwiLFxuXCJiM3IxazEvNXBwcC9wMnA0L3A0cU4xL1EyYjQvNlIxLzVQUFAvNVJLMSBiIC0gLSAwIDFcIixcblwicjJSbmsxci8xcDJxMWIxLzdwLzZwUS80UHBiMS8xQlA1L1BQM0JQUC8ySzRSIHcgLSAtIDAgMVwiLFxuXCJyM25yMWsvMWIyTnBwcC9wbjYvcTNwMVAxL1AxcDRRL1I3LzFQMlBQMVAvMkIyUksxIHcgLSAtIDAgMVwiLFxuXCJyNXJSLzNOa3AyLzRwMy8xUTRxMS9ucDFONC84L2JQUFIyUDEvMks1IHcgLSAtIDAgMVwiLFxuXCI1cmsxL3BwM3BwcC83ci82bjEvTkIxUDNxL1BRM1AyLzFQNFAxL1I0UksxIGIgLSAtIDAgMVwiLFxuXCI0UjMvMnAya3BRLzNwM3AvcDJyMnExLzgvMVByMlAyL1AxUDNQUC80UjFLMSB3IC0gLSAwIDFcIixcblwiMnExcjMvNHBSMi8zclExcGsvcDFwbk4ycC9QbjVCLzgvMVA0UFAvM1IzSyB3IC0gLSAwIDFcIixcblwicm40bnIvcHBwcTJiay83cC81YjFQLzROQlExLzNCNC9QUFAzUDEvUjNLMlIgdyAtIC0gMCAxXCIsXG5cIjNybjJyLzNrYjJwL3A0cHBCLzFxMVBwMy84LzNQMU4yLzFQMlExUFAvUjFSNEsgdyAtIC0gMCAxXCIsXG5cIjRrcjIvM3JuMnAvMVA0cDEvMnA1L1ExQjJQMi84L1AycTJQUC80UjFLMSB3IC0gLSAwIDFcIixcblwicjFicjQvMXAyYnBrMS9wMW5wcG4xcC81UDIvNFAyQi9xTk5CM1IvUDFQUTJQUC83SyB3IC0gLSAwIDFcIixcblwiM3Ezci9yNHBrMS9wcDJwTnAxLzNiUDFRMS83Ui84L1BQM1BQUC8zUjJLMSB3IC0gLSAwIDFcIixcblwicjFrcTFiMXIvNXBwcC9wNG4yLzJwUFIxQjEvUTcvMlA1L1A0UFBQLzFSNEsxIHcgLSAtIDAgMVwiLFxuXCJyM2tyMi82UXAvMVBiMnAyL3BCM1IyLzNwcTJCLzRuMy8xUDRQUC80UjFLMSB3IC0gLSAwIDFcIixcblwiMnJyazMvUVIzcHAxLzJuMWIycC8xQkIxcTMvM1A0LzgvUDRQUFAvNksxIHcgLSAtIDAgMVwiLFxuXCIxcWJrMm5yLzFwTnAyQnAvMm4xcHAyLzgvMlAxUDMvOC9QcjNQUFAvUjJRS0IxUiB3IC0gLSAwIDFcIixcblwiMlE1LzZway81YjFwLzVQMi8zcDQvMVJyMnFOSy83UC84IGIgLSAtIDAgMVwiLFxuXCI0QnIxay9wNXBwLzFuNi84LzNQUWJxMS82UDEvUFA1UC9STkIzSzEgYiAtIC0gMCAxXCIsXG5cInJuYjFrMnIvcHBwcGJOMXAvNW4yLzdRLzRQMy8yTjUvUFBQUDNQL1IxQjFLQjFxIHcgLSAtIDAgMVwiLFxuXCI2azEvMlIxUXBiMS8zQnAxcDEvMXAybjJwLzNxNC8xUDVQLzJOMlBQSy9yNyBiIC0gLSAwIDFcIixcblwicjFiMnJrMS9wcDNwcHAvM3A0LzNRMW5xMS8yQjFSMy84L1BQM1BQUC9SNUsxIHcgLSAtIDAgMVwiLFxuXCIxcjNiMi8xYnAycGtwL3AxcTROLzFwMW4xcEJuLzgvMlAzUVAvUFBCMlBQMS80UjFLMSB3IC0gLSAwIDFcIixcblwiN3IvcFJwazQvMm5wMnAxLzViMi8yUDRxLzJiMUJCTjEvUDRQUDEvM1ExSzIgYiAtIC0gMCAxXCIsXG5cIlI0cmsxLzRyMXAxLzFxMnAxUXAvMXBiNS8xbjVSLzVOQjEvMVAzUFBQLzZLMSB3IC0gLSAwIDFcIixcblwicjFiMnJrMS8xcDJucHBwL3AyUjFiMi80cVAxUS80UDMvMUIyQjMvUFBQMlAxUC8ySzNSMSB3IC0gLSAwIDFcIixcblwiN2svcDFwMmJwMS8zcTFOMXAvNHJQMi80cFEyLzJQNFIvUDJyMlBQLzRSMksgdyAtIC0gMCAxXCIsXG5cIjRyMWsxL3BiNHBwLzFwMnAzLzRQcDIvMVAzTjIvUDJRbjJQLzNuMXFQSy9SQkIxUjMgYiAtIC0gMCAxXCIsXG5cInIxYnExcjFrL3BwMm4xcHAvOC8zTjFwMi8yQjRSLzgvUFBQMlFQUC83SyB3IC0gLSAwIDFcIixcblwiNXJrMS8zcDFwMXAvcDRRcTEvMXAxUDJSMS83Ti9uNlAvMnIzUEsvOCB3IC0gLSAwIDFcIixcblwicjJyMmsxL3AzYnBwcC8zcDQvcTJwM24vM1FQMy8xUDRSMS9QQjNQUFAvUjVLMSB3IC0gLSAwIDFcIixcblwicjRyMi8ycW5icGtwL2IzcDMvMnBwUDFOMS9wMlAxUTIvUDFQNS81UFBQL25CQlIySzEgdyAtIC0gMCAxXCIsXG5cIjVyMWsvMXAxYjFwMXAvcDJwcGIyLzVQMUIvMXE2LzFQcjNSMS8yUFEyUFAvNVIxSyB3IC0gLSAwIDFcIixcblwiNXIyL3BwMlIzLzFxMXAzUS8ycFAxYjIvMlBrcnAyLzNCNC9QUEsyUFAxL1I3IHcgLSAtIDAgMVwiLFxuXCJxNWsxLzVyYjEvcjZwLzFOcDFuMXAxLzNwMVBuMS8xTjRQMS9QUDVQL1IxQlFSSzIgYiAtIC0gMCAxXCIsXG5cIjdyLzFwM2JrMS8xUHAycDIvM3AycDEvM1AxbnExLzFRUE5SMVAxLzVQMi81QksxIGIgLSAtIDAgMVwiLFxuXCJybjFxM3IvcHAya3BwcC8zTnAzLzJiMW4zLzNOMlExLzNCNC9QUDRQUC9SMUIyUksxIHcgLSAtIDAgMVwiLFxuXCIycmtyMy8zYjFwMVIvM1IxUDIvMXAyUTFQMS9wUHE1L1AxTjUvMUtQNS84IHcgLSAtIDAgMVwiLFxuXCJyMWJxMXJrMS80bnAxcC8xcDNScEIvcDFRNS8yQnA0LzNQNC9QUFAzUFAvUjVLMSB3IC0gLSAwIDFcIixcblwiMXJiazFyMi9wcDRSMS8zTnAzLzNwMnAxLzZxMS9CUDJQMy9QMlAyQjEvMlIzSzEgdyAtIC0gMCAxXCIsXG5cIjJrNHIvMXIxcTJwcC9RQnAycDIvMXA2LzgvOC9QNFBQUC8yUjNLMSB3IC0gLSAwIDFcIixcblwicjFxcjNrLzNSMnAxL3AzUTMvMXAycDFwMS8zYk4zLzgvUFAzUFBQLzVSSzEgdyAtIC0gMCAxXCIsXG5cIjJycjNrLzFwMWIxcHExLzRwTnAxL1BwMlEycC8zUDQvN1IvNVBQUC80UjFLMSB3IC0gLSAwIDFcIixcblwiNXJrMS9wYjJucHAxLzFwcTRwLzVwMi81QjIvMUI2L1AyUlExUFAvMnIxUjJLIGIgLSAtIDAgMVwiLFxuXCJyM1Jua3IvMWI1cC9wM05wQjEvM3A0LzFwNi84L1BQUDNQMS8ySzJSMiB3IC0gLSAwIDFcIixcblwiNHIxazEvM3IxcDFwL2JxcDFuMy9wMnAxTlAxL1BuMVExYjIvN1AvMVBQM0IxL1IyTlIySyB3IC0gLSAwIDFcIixcblwiN3IvNmtyL3A1cDEvMXBOYjFwcTEvUFBwUHAzLzRQMWIxL1IzUjFRMS8yQjJCSzEgYiAtIC0gMCAxXCIsXG5cIjJyNGsvcHBxYnBRMXAvM3AxYnBCLzgvOC8xTnIyUDIvUFBQM1AxLzJLUjNSIHcgLSAtIDAgMVwiLFxuXCIycjFrMnIvMXAycHAxcC8xcDJiMXBRLzRCMy8zbjQvMnFCNC9QMVAyUFBQLzJLUlIzIGIgLSAtIDAgMVwiLFxuXCIxcjFyNC9ScDJucDIvM2s0LzNQM3AvMlEycDIvMlA0cS8xUDFOMVAxUC82UksgdyAtIC0gMCAxXCIsXG5cInIxYjJyazEvcDNScDFwLzNxMnBRLzJwcDJCMS8zYjQvM0I0L1BQUDJQUFAvNFIxSzEgdyAtIC0gMCAxXCIsXG5cIjZyay82cHAvMnAycDIvMkIyUDFxLzFQMlBiMi8xUTVQLzJQMlAyLzNSM0sgdyAtIC0gMCAxXCIsXG5cInJuYnExYjFyL3BwNGtwLzVucDEvNHAyUS8yQk4xUjIvNEIzL1BQUE4yUFAvUjVLMSB3IC0gLSAwIDFcIixcblwiMXIxa3IzL05icHBuMXBwLzFiNi84LzZRMS8zQjFQMi9QcTNQMVAvM1JSMUsxIHcgLSAtIDAgMVwiLFxuXCIzcjJrMS8xYjJRcDIvcHFucDNiLzFwbjUvM0IzcC8xUFI0UC9QNFBQMS8xQjRLMSB3IC0gLSAwIDFcIixcblwiNGsxcjEvNXAyL3AxcTUvMXAycDJwLzZuMS9QNGJRMS8xUDRSUC8zTlIxQksgYiAtIC0gMCAxXCIsXG5cIjFrNXIvcHAxUTFwcDEvMnA0ci9iNFBuMS8zTlBwMi8yUDJQMi8xcTRCMS8xUjJSMUsxIGIgLSAtIDAgMVwiLFxuXCJrMnIzci9wM1JwcHAvMXA0cTEvMVAxYjQvM1ExQjIvNk4xL1BQM1BQUC82SzEgdyAtIC0gMCAxXCIsXG5cIjRyazFyL3AyYjFwcDEvMXE1cC8zcFIxbjEvM04xcDIvMVAxUTFQMi9QQlAzUEsvNFIzIHcgLSAtIDAgMVwiLFxuXCJyMWJxMXJrMS9wcDFuYjFwcC81cDIvNkIxLzNwUTMvM0JQTjIvUFAzUFBQL1I0UksxIHcgLSAtIDAgMVwiLFxuXCJrYjNSMi8xcDVyLzVwMi8xUDFRNC9wNVAxL3E3LzVQMi80UksyIHcgLSAtIDAgMVwiLFxuXCJybjFyNC9wcDJwMWIxLzVrcHAvcTFQUTFiMi82bjEvMk4yTjIvUFBQM1BQL1IxQjJSSzEgdyAtIC0gMCAxXCIsXG5cInJyMmszLzVwMi9wMWJwcFBwUS8ycDFuMVAxLzFxMlBCMi8yTjRSL1BQNEJQLzZLMSB3IC0gLSAwIDFcIixcblwicjVrMS8yUmIzci9wMnAzYi9QMlBwMy80UDFwcS81cDIvMVBRMkIxUC8yUjJCS04gYiAtIC0gMCAxXCIsXG5cInIxYnFyMy9wcHAxQjFrcC8xYjRwMS9uMkI0LzNQUTFQMS8yUDUvUDRQMi9STjRLMSB3IC0gLSAwIDFcIixcblwiM3I0LzRSUnBrLzVuMU4vOC9wMXAycVBQL1AxUXAxUDIvMVA0SzEvM2I0IHcgLSAtIDAgMVwiLFxuXCIycnIyazEvMWIxcTJwMS9wMlBwMVFwLzFwbjFQMlAvMnA1LzgvUFAzUFAxLzFCUjJSSzEgdyAtIC0gMCAxXCIsXG5cIjFyM3Ixay82UjEvMXAyUXAxcC9wMXA0Ti8zcFAzLzNQMVAyL1BQMnEyUC81UjFLIHcgLSAtIDAgMVwiLFxuXCI0cjMvcDFyMnAxay8xcDJwUHBwLzJxcFAzLzNSMlAxLzFQUFEzUi8xUDVQLzdLIHcgLSAtIDAgMVwiLFxuXCIxUjRuci9wMWsxcHBiMS8ycDRwLzRQcDIvM04xUDFCLzgvcTFQM1BQLzNRMksxIHcgLSAtIDAgMVwiLFxuXCIyUjJiazEvNXJyMS9wM1EyUi8zUHBxMi8xcDNwMi84L1BQMUIyUFAvN0sgdyAtIC0gMCAxXCIsXG5cIjRyMmsvNFExYnAvNEIxcDEvMXEybjMvNHBOMi9QMUIzUDEvNHBQMVAvNFIxSzEgdyAtIC0gMCAxXCIsXG5cIjJycTFyMWsvMWIyYnAxcC9wMW5wcHAxUS8xcDNQMi80UDFQUC8yTjJOMi9QUFA1LzFLMVIxQjFSIHcgLSAtIDAgMVwiLFxuXCIzcjJrMS9wcDVwLzZwMS8yUHBxMy80TnIyLzRCMmIvUFAyUDJLL1IxUTFSMkIgYiAtIC0gMCAxXCIsXG5cInIyQmsyci9wYjFuMXBRMS8zbnAzLzFwMlAzLzJwM0sxLzNwNC9QUDFiMVBQUC9SNEIxUiBiIC0gLSAwIDFcIixcblwiNHIxazEvM24xcHBwLzRyMy8zbjNxL1EyUDQvNVAyL1BQMkJQMVAvUjFCMVIxSzEgYiAtIC0gMCAxXCIsXG5cInIxbmszci8yYjJwcHAvcDNiMy8zTk4zL1EyUDNxL0IyQjQvUDRQUFAvNFIxSzEgdyAtIC0gMCAxXCIsXG5cIjROMW5rL3A1UjEvNGIycC8zcFBwMVEvMnBCMVAxSy8yUDNQUC83ci8ycTUgdyAtIC0gMCAxXCIsXG5cIjdrL3BicDNicC8zcDQvMXA1cS8zbjJwMS81ckIxL1BQMU5yTjFQLzFRMUJSUksxIGIgLSAtIDAgMVwiLFxuXCIzbjJiMS8xcHIxcjJrL3AxcDFwUXBwL1AxUDUvMkJQMVBQMS81SzIvMVA1Ui84IHcgLSAtIDAgMVwiLFxuXCI0cmsyLzFicTJwMVEvM3AxYnAxLzFwMW4yTjEvNFBCMi8yUHAzUC8xUDFONC81UksxIHcgLSAtIDAgMVwiLFxuXCJiNHJrMS9wNHAyLzFwNFBxLzRwMy84L1AxTjJQUTEvQlAzUEsxLzggdyAtIC0gMCAxXCIsXG5cIjNyMXIyL3BwYjFxQnBrLzJwcDFSMXAvN1EvNFAzLzJQUDJQMS9QUDRLUC81UjIgdyAtIC0gMCAxXCIsXG5cIjRyMy81cDFrLzJwMW5CcHAvcTJwNC9QMWJQNC8yUDFSMlEvMkIyUFBQLzZLMSB3IC0gLSAwIDFcIixcblwiNnIxL3BwM04xay8xcTJiUXBwLzNwUDMvOC82UlAvUFAzUFAxLzZLMSB3IC0gLSAwIDFcIixcblwiMnIxcmsyLzFiMmIxcDEvcDFxMm5QMS8xcDJRMy80UDMvUDFOMUIzLzFQUDFCMlIvMks0UiB3IC0gLSAwIDFcIixcblwiYnIxcXIxazEvYjFwbm5wMi9wMnAycDEvUDRQQjEvM05QMlEvMlAzTjEvQjVQUC9SM1IxSzEgdyAtIC0gMCAxXCIsXG5cInIycjQvcHAycHBrcC8yUDNwMS9xMXA1LzRQUTIvMlAyYjIvUDRQUFAvMlIxS0IxUiBiIC0gLSAwIDFcIixcblwiNmsxLzVwcDEvMXBxNHAvcDNQMy9QNFAyLzJQMVExUEsvN1AvUjFCcjNyIGIgLSAtIDAgMVwiLFxuXCJyMWIyazFyL3BwcHA0LzFiUDJxcDEvNXBwMS80cFAyLzFCUDUvUEJQM1BQL1IyUTFSMUsgYiAtIC0gMCAxXCIsXG5cInIxYjFubjFrL3AzcDFiMS8xcXAxQjFwMS8xcDFwNC8zUDNOLzJOMUIzL1BQUDNQUC9SMlExSzIgdyAtIC0gMCAxXCIsXG5cInJuYjJyazEvcHBwMnFiMS82cFEvMnBOMXAyLzgvMVAzQlAxL1BCMlBQMVAvUjRSSzEgdyAtIC0gMCAxXCIsXG5cIjVya3IvcHAyUnAyLzFiMXAxUGIxLzNQMlExLzJuM1AxLzJwNS9QNFAyLzRSMUsxIHcgLSAtIDAgMVwiLFxuXCJybjFrM3IvMWIxcTFwcHAvcDJQNC8yQjJwMi84LzFRTkJSMy9QUDNQUFAvMlIzSzEgdyAtIC0gMCAxXCIsXG5cInJuYjJyMWsvcHAycTJwLzJwMlIyLzgvMkJwM1EvOC9QUFAzUFAvUk40SzEgdyAtIC0gMCAxXCIsXG5cIjNrNC8xcHAzYjEvNGIycC8xcDNxcDEvM1BuMy8yUDFSTjIvcjVQMS8xUTJSMUsxIGIgLSAtIDAgMVwiLFxuXCJyMWJuazJyL3BwcHAxcHBwLzFiNHExLzRQMy8yQjFOMy9RMVBwMU4yL1A0UFBQL1IzUjFLMSB3IC0gLSAwIDFcIixcblwiMnE1L3AzcDJrLzNwUDFwMS8yck4yUG4vMXAxUTQvN1IvUFByNS8xSzVSIHcgLSAtIDAgMVwiLFxuXCIycjFyMy9wcDFuYk4yLzRwMy9xNy9QMXBQMm5rLzJQMlAyLzFQUTUvUjNSMUsxIHcgLSAtIDAgMVwiLFxuXCI2azEvcDFwM3BwLzZxMS8zcHIzLzNObjMvMVFQMUIxUGIvUFAzcjFQL1IzUjFLMSBiIC0gLSAwIDFcIixcblwiNmsxLzVwMi9wNW4xLzgvMXAxcDJQMS8xUGIyQjFyL1AzS1BOMS8yUlEzcSBiIC0gLSAwIDFcIixcblwiNHIxcjEvcGIxUTJicC8xcDFSbmtwMS81cDIvMlAxUDMvNEJQMi9xUDJCMVBQLzJSM0sxIHcgLSAtIDAgMVwiLFxuXCJyMWJxcjFrMS9wcHAycHAxLzNwNC80bjFOUS8yQjFQTjIvOC9QNFBQUC9iNFJLMSB3IC0gLSAwIDFcIixcblwiNmsxL3AyclIxcDEvMXAxcjFwMVIvM1A0LzRRUHExLzFQNi9QNVBLLzggdyAtIC0gMCAxXCIsXG5cInI1cmsvcHAycWIxcC8ycDJwbjEvMmJwNC8zcFAxUTEvMUIxUDFOMVIvUFBQM1BQL1IxQjNLMSB3IC0gLSAwIDFcIixcblwicjJxMWJrMS81bjFwLzJwM3BQL3A3LzNCcjMvMVAzUFFSL1A1UDEvMktSNCB3IC0gLSAwIDFcIixcblwiMnIybjFrLzJxM3BwL3AycDFiMi8ybkIxUDIvMXAxTjQvOC9QUFA0US8ySzNSUiB3IC0gLSAwIDFcIixcblwiMVI0UTEvM25yMXBwLzNwMWsyLzVCYjEvNFAzLzJxMUIxUDEvNVAxUC82SzEgdyAtIC0gMCAxXCIsXG5cIjVrMXIvM2I0LzNwMXAyL3A0UHFwLzFwQjUvMVA0cjEvUDFQNS8xSzFSUjJRIHcgLSAtIDAgMVwiLFxuXCJRNy9wMXAxcTFway8zcDJycC80bjMvM2JQMy83Yi9QUDNQUEsvUjFCMlIyIGIgLSAtIDAgMVwiLFxuXCI3ci9wM3BwazEvM3A0LzJwMVAxS3AvMlBiNC8zUDFRUHEvUFA1UC9SNlIgYiAtIC0gMCAxXCIsXG5cIjZrMS82cHAvcHAxcDNxLzNQNC9QMVEyYjIvMU5OMXIyYi8xUFA0UC82UksgYiAtIC0gMCAxXCIsXG5cIjgvMlEycGsxLzNQcDFwMS8xYjVwLzFwM1AxUC8xUDJQSzIvNlJQLzdxIGIgLSAtIDAgMVwiLFxuXCIxcjJrMy8ycG4xcDIvcDFRYjNwLzdxLzNQUDMvMlAxQk4xYi9QUDFOMVByMS9SUjVLIGIgLSAtIDAgMVwiLFxuXCI4LzVwMWsvM3AycTEvM1BwMy80UG4xci9SNFFiMS8xUDVCLzVCMUsgYiAtIC0gMCAxXCIsXG5cIjJyM2sxL3BwcTNwMS8ybjJwMXAvMnByNC81UDFOLzZRUC9QUDJSMVAxLzRSMksgdyAtIC0gMCAxXCIsXG5cIjVrMi9yM3BwMXAvNnAxL3ExcFAzUi81QjIvMmIzUFAvUFEzUEsxL1I3IHcgLSAtIDAgMVwiLFxuXCJyMWIyazIvMXAxcDFyMUIvbjRwMi9wMXFQcDMvMlA0Ti80UDFSMS9QUFEzUFAvUjVLMSB3IC0gLSAwIDFcIixcblwiMnIxazMvM24xcDIvNnAxLzFwMVFiMy8xQjJOMXExLzJQMXAzL1A0UFAxLzJLUjQgdyAtIC0gMCAxXCIsXG5cIjVyazEvMnBiMXBwcC9wMnI0LzFwMVBwMy80UG4xcS8xQjFQTlAyL1BQMVExUDFQL1I1UksgYiAtIC0gMCAxXCIsXG5cIjNuYnIyLzRxMnAvcjNwUnBrL3AycFFSTjEvMXBwUDJwMS8yUDUvUFBCNFAvNksxIHcgLSAtIDAgMVwiLFxuXCI1cmsxL3BwMXFwUjIvNlBwLzNwcE5iUS8yblA0L0IxUDUvUDVQUC82SzEgdyAtIC0gMCAxXCIsXG5cIjVrMi9wcHFyUkIyLzNyMXAyLzJwMnAyLzdQL1AxUFAyUDEvMVAyUVAyLzZLMSB3IC0gLSAwIDFcIixcblwiOC9rcDFSNC8ycTJwMXAvM1FiMlAvcDcvUDVQMS9LUDYvTjFyNSBiIC0gLSAwIDFcIixcblwiNHJrMi9wcDJOMWJRLzVwMi84LzJxNS9QNy8zcjJQUC80UlIxSyB3IC0gLSAwIDFcIixcblwicjRyMWsvMXAzcDFwL3BwMXAxcDIvNHFOMVIvUFAyUDFuMS82UTEvNVBQUC9SNUsxIHcgLSAtIDAgMVwiLFxuXCJyNGIxci9wcDFuMmsxLzFxcDFwMnAvM3BQMXBRLzFQNi8yQlAyTjEvUDRQUFAvUjRSSzEgdyAtIC0gMCAxXCIsXG5cIjZyay9RMm4ycnAvNXAyLzNQNC80UDMvMnE0UC9QNVAxLzVSUksgYiAtIC0gMCAxXCIsXG5cIjJrNHIvcHBwNS80YnFwMS8zcDJRMS82bjEvMk5CM1AvUFBQMmJQMS9SMUIyUjFLIGIgLSAtIDAgMVwiLFxuXCJybmIyYjFyL3BwcDFuMWtwLzNwMXEyLzdRLzRQQjIvMk41L1BQUDNQUC9SNFJLMSB3IC0gLSAwIDFcIixcblwiMXIycjJrLzFxMW4xcDFwL3AxYjFwcDIvM3BQMy8xYjVSLzJOMUJCUTEvMVBQM1BQLzNSM0sgdyAtIC0gMCAxXCIsXG5cIjNyMXIxay9wNHAxcC8xcHAycDIvMmIyUDFRLzNxMVBSMS8xUE4yUjFQLzFQNFAxLzdLIHcgLSAtIDAgMVwiLFxuXCJyMWIxcjFrMS9wMXEzcDEvMXBwMXBuMXAvOC8zUFEzL0IxUEI0L1A1UFAvUjRSSzEgdyAtIC0gMCAxXCIsXG5cIms3LzRycDFwL3AxcTNwMS9RMXIycDIvMVI2LzgvUDVQUC8xUjVLIHcgLSAtIDAgMVwiLFxuXCJyMWIycjIvcDFxMW5wa0IvMXBuMXAxcDEvMnBwUDFOMS8zUDQvUDFQMlEyLzJQMlBQUC9SMUIyUksxIHcgLSAtIDAgMVwiLFxuXCJybmIza3IvcHBwMnBwcC8xYjYvM3E0LzNwTjMvUTROMi9QUFAyS1BQL1IxQjFSMyB3IC0gLSAwIDFcIixcblwiM3ExcjFrLzJwNHAvMXAxcEJycDEvcDJQcDMvMlBuUDMvNVBQMS9QUDFRMksxLzVSMVIgdyAtIC0gMCAxXCIsXG5cIjVyazEvMVI0YjEvM3A0LzFQMVA0LzRQcDIvM0IxUG5iL1BxUksxUTIvOCBiIC0gLSAwIDFcIixcblwicjRyazEvMXEyYnAxcC81UnAxL3BwMVBwMy80QjJRL1AyUjQvMVBQM1BQLzdLIHcgLSAtIDAgMVwiLFxuXCI0TnIxay8xYnAycDFwLzFyNHAxLzNQNC8xcDFxMVAxUS80UjMvUDVQUC80UjJLIHcgLSAtIDAgMVwiLFxuXCI0a2IxUS81cDIvMXA2LzFLMU40LzJQMlAyLzgvcTcvOCB3IC0gLSAwIDFcIixcblwiNHIzL3A0cGtwL3E3LzNCYmIyL1AyUDFwcFAvMk4zbjEvMVBQMktQUi9SMUJRNCBiIC0gLSAwIDFcIixcblwicjRyazEvM1IzcC8xcTJwUXAxL3A3L1A3LzgvMVA1UC80UksyIHcgLSAtIDAgMVwiLFxuXCJyNmsvMXA1cC8ycDFiMXBCLzdCL3AxUDFxMnIvOC9QNVFQLzNSMlJLIGIgLSAtIDAgMVwiLFxuXCIya3Izci8xcHAycHBwL3BicDRuLzVxMi8xUFA1LzJRNS9QQjNQUFAvUk4zUksxIGIgLSAtIDAgMVwiLFxuXCI4LzRuMmsvYjFQcDJwMS8zUHBwMXAvcDJxUDMvM0IxUDIvUTJOSzFQUC8zUjQgYiAtIC0gMCAxXCIsXG5cIjJxMXJuazEvcDRyMi8xcDNwcDEvM1AzUS8yYlBwMkIvMlA0Ui9QMUIzUFAvNFIxSzEgdyAtIC0gMCAxXCIsXG5cInI1azEvMnAycHBwL3AxUDJuMi84LzFwUDJiYlEvMUIzUFAxL1BQMVBxMlAvUk5CM0sxIGIgLSAtIDAgMVwiLFxuXCJyMWI1LzVwMi81TnBrL3AxcFAycTEvNFAycC8xUFEyUjFQLzZQMS82SzEgdyAtIC0gMCAxXCIsXG5cInIycTFyazEvcDRwMXAvM3AxUTIvMm4zQjEvQjJSNC84L1BQM1BQUC81YksxIHcgLSAtIDAgMVwiLFxuXCJyNHIxay9wcDVwL241cDEvMXEyTnAxbi8xUGI1LzZQMS9QUTJQUEJQLzFSQjNLMSB3IC0gLSAwIDFcIixcblwiMW4xTjJyay8yUTJwYjEvcDNwMnAvUHEyUDMvM1I0LzZCMS8xUDNQMVAvNksxIHcgLSAtIDAgMVwiLFxuXCJibjVrLzdwL3AycDJyMS8xcDJwMy81cDIvMlA0cS9QUDFCMVFQUC80TjFSSyBiIC0gLSAwIDFcIixcblwicm5iM2tiL3BwNXAvNHAxcEIvcTFwMnBOMS8ycjFQUTIvMlA1L1A0UFBQLzJSMlJLMSB3IC0gLSAwIDFcIixcblwiM3JrYjFyL3BwbjJwcDEvMXFwMXAycC80UDMvMlA0UC8zUTJOMS9QUDFCMVBQMS8xSzFSM1IgdyAtIC0gMCAxXCIsXG5cIjgvNXByay9wNXJiL1AzTjJSLzFwMVBRMnAvN1AvMVAzUlBxLzVLMiB3IC0gLSAwIDFcIixcblwiM3EycjEvcDJiMWsyLzFwbkJwMU4xLzNwMXBRUC82UDEvNVIyLzJyMlAyLzRSSzIgdyAtIC0gMCAxXCIsXG5cInIxYjJyazEvcHAyYjFwcC9xM3BuMi8zbk4xTjEvM3A0L1AyUTQvMVAzUFBQL1JCQjFSMUsxIHcgLSAtIDAgMVwiLFxuXCJrNy8xcDFycjFwcC9wUjFwMXAyL1ExcHE0L1A3LzgvMlAzUFAvMVI0SzEgdyAtIC0gMCAxXCIsXG5cInIxYjJyazEvcHBwcGJwcDEvN3AvNFIzLzZRcS8yQkI0L1BQUDJQUFAvUjVLMSB3IC0gLSAwIDFcIixcblwiNGtiMXIvMVI2L3AycnAzLzJRMXAxcTEvNHAzLzNCNC9QNlAvNEtSMiB3IC0gLSAwIDFcIixcblwicXIzYjFyL1E1cHAvM3A0LzFrcDUvMk5uMUIyL1BwNi8xUDNQUFAvMlIxUjFLMSB3IC0gLSAwIDFcIixcblwicjFicTFyazEvcDNiMW5wLzFwcDJwcFEvM25CMy8zUDQvMk5CMU4xUC9QUDNQUDEvM1IxUksxIHcgLSAtIDAgMVwiLFxuXCJyNGtyMS9wYk5uMXExcC8xcDYvMnAyQlBRLzVCMi84L1A2UC9iNFJLMSB3IC0gLSAwIDFcIixcblwiM3IxazIvcjFxMnAxUS9wcDJCMy80UDMvMVAxcDQvMk41L1AxUDNQUC81UjFLIHcgLSAtIDAgMVwiLFxuXCIxUTYvNXBwMS8xQjJwMWsxLzNwUG4xcC8xYjFQNC8ycjNQTi8ycTJQS1AvUjcgYiAtIC0gMCAxXCIsXG5cIjNxNC8xcDNwMWsvMVAxcHJQcDEvUDFyTm4xUXAvOC83Ui82UFAvM1IySzEgdyAtIC0gMCAxXCIsXG5cInIxYjJyMi80bm4xay8xcTJQUTFwLzVwMi9wcDVSLzVOMi81UFBQLzVSSzEgdyAtIC0gMCAxXCIsXG5cIjZyay8xYjYvcDVwQi8xcTJQMlEvNHAyUC82UjEvUFA0UEsvM3I0IHcgLSAtIDAgMVwiLFxuXCI4LzJyNS8xazVwLzFwcDRQLzgvSzJQNC9QUjJRQjIvMnE1IGIgLSAtIDAgMVwiLFxuXCIzcjQvcGszcHExL05iMnAycC8zbjQvMlFQNC82UDEvMVAzUEJQLzVSSzEgdyAtIC0gMCAxXCIsXG5cIjNxMXIyL3BiM3BwMS8xcDYvM3BQMU5rLzJyMlEyLzgvUG4zUFAxLzNSUjFLMSB3IC0gLSAwIDFcIixcblwiNXFyay81cDFuL3BwM3AxUS8ycFBwMy8yUDFQMXJOLzJQNFIvUDVQMS8yQjNLMSB3IC0gLSAwIDFcIixcblwiOC82cGsvcGI1cC84LzFQMnFQMi9QM3AzLzJyMlBOUC8xUVIzSzEgYiAtIC0gMCAxXCIsXG5cInJuM3JrMS8xcDNwQjEvcDRiMi9xNFAxcC82UTEvMUI2L1BQcDJQMVAvUjFLM1IxIHcgLSAtIDAgMVwiLFxuXCJiM24xazEvNXBQMS8yTjUvcHAxUDQvNEJiMi9xUDRRUC81UDFLLzggdyAtIC0gMCAxXCIsXG5cIjRiMWsxLzJyMnAyLzFxMXBuUHBRLzdwL3AzUDJQL3BONUIvUDFQNS8xSzFSMlIxIHcgLSAtIDAgMVwiLFxuXCI0cjJrL3BwMnEyYi8ycDJwMVEvNHJQMi9QNy8xQjVQLzFQMlIxUjEvN0sgdyAtIC0gMCAxXCIsXG5cInIycjJrMS8xcTRwMS9wcGIzcDEvMmJOcDMvUDFRNS8xTjVSLzFQNEJQL242SyB3IC0gLSAwIDFcIixcblwiNnJrLzFwcWJicDFwL3AzcDJRLzZSMS80TjFuUC8zQjQvUFBQNS8yS1I0IHcgLSAtIDAgMVwiLFxuXCJyNWsxLzFiMnExcDEvcDJicDFRcC8xcHA1L1A1UDEvM0I0LzFQUDJQMVAvUjRSSzEgYiAtIC0gMCAxXCIsXG5cInIzcjFuMS9wcDNwazEvMnEycDFwL1AyTlAzLzJwMVFQMi84LzFQNVAvMUIxUjNLIHcgLSAtIDAgMVwiLFxuXCIzcjFyMWsvcTJuM3AvYjFwMnBwUS9wMW4xcDMvUHAyUDMvMUIxUEJSMi8xUFBOMlBQL1I1SzEgdyAtIC0gMCAxXCIsXG5cInIzcjFrMS83cC8ycFJSMXAxL3A3LzJQNS9xblExUDFQMS82QlAvNksxIHcgLSAtIDAgMVwiLFxuXCJyazYvTjRwcHAvUXAycTMvM3A0LzgvOC81UFBQLzJSM0sxIHcgLSAtIDAgMVwiLFxuXCJyNGIxci9wcHBxMnBwLzJuMWIxazEvM240LzJCcDQvNVEyL1BQUDJQUFAvUk5CMVIxSzEgdyAtIC0gMCAxXCIsXG5cInI2ci9wcDNwazEvMnAyUnAxLzJwMVAyQi8zYlEzLzZQSy83UC82cTEgdyAtIC0gMCAxXCIsXG5cIjZyay9wMXBiMXAxcC8ycHAxUDIvMmIxbjJRLzRQUjIvM0I0L1BQUDFLMlAvUk5CM3ExIHcgLSAtIDAgMVwiLFxuXCJybjNyazEvMnFwMnBwL3AzUDMvMXAxYjQvM2I0LzNCNC9QUFAxUTFQUC9SMUIyUjFLIHcgLSAtIDAgMVwiLFxuXCIyUjNuay8zcjJiMS9wMnByMVExLzRwTjIvMVA2L1A2UC9xNy9CNFJLMSB3IC0gLSAwIDFcIixcblwiMXIycXJrMS9wNHAxcC9icDFwMVFwMS9uMXBwUDMvUDFQNS8yUEIxUE4xLzZQUC9SNFJLMSB3IC0gLSAwIDFcIixcblwicjVrMS9wMXAzYnAvMXAxcDQvMlBQMnFwLzFQNi8xUTFiUDMvUEIzclBQL1IyTjJSSyBiIC0gLSAwIDFcIixcblwiNGszL3IyYm5uMXIvMXEycFIxcC9wMnBQcDFCLzJwUDFOMVAvUHBQMUIzLzFQNFExLzVLUjEgdyAtIC0gMCAxXCIsXG5cIjJxMnIxay81UXAxLzRwMVAxLzNwNC9yNmIvN1IvNUJQUC81UksxIHcgLSAtIDAgMVwiLFxuXCI1cjFrLzFxNGJwLzNwQjFwMS8ycFBuMUIxLzFyNi8xcDVSLzFQMlBQUVAvUjVLMSB3IC0gLSAwIDFcIixcblwiNFEzLzFiNXIvMXAxa3AzLzVwMXIvM3AxbnExL1A0TlAxLzFQM1BCMS8yUjNLMSB3IC0gLSAwIDFcIixcblwicjFiMmsxci8ycTFiMy9wM3BwQnAvMm4zQjEvMXA2LzJONFEvUFBQM1BQLzJLUlIzIHcgLSAtIDAgMVwiLFxuXCI2cjEvcjVQUi8ycDNSMS8yUGsxbjIvM3A0LzFQMU5QMy80SzMvOCB3IC0gLSAwIDFcIixcblwicjRxazEvMnA0cC9wMXAxTjMvMmJwUTMvNG5QMi84L1BQUDNQUC81UjFLIGIgLSAtIDAgMVwiLFxuXCJyMm4xcmsxLzFwcGIycHAvMXAxcDQvM1BwcTFuLzJCM1AxLzJQNFAvUFAxTjFQMUsvUjJRMVJOMSBiIC0gLSAwIDFcIixcblwicjFiMnJrMS9wcDFwMXAxcC8ybjNwUS81cUIxLzgvMlA1L1A0UFBQLzRSUksxIHcgLSAtIDAgMVwiLFxuXCJyM3Eyay9wMm4xcjIvMmJQMXBwQi9iM3AyUS9OMVBwNC9QNVIxLzVQUFAvUjVLMSB3IC0gLSAwIDFcIixcblwiNnIxLzNwMnFrLzRQMy8xUjVwLzNiMXByUC8zUDJCMS8yUDFRUDIvNlJLIGIgLSAtIDAgMVwiLFxuXCIzcnIyay9wcDFiMmIxLzRxMXBwLzJQcDFwMi8zQjQvMVAyUU5QMS9QNlAvUjRSSzEgdyAtIC0gMCAxXCIsXG5cInIxYjJyazEvMnAycHBwL3A3LzFwNi8zUDNxLzFCUDNiUC9QUDNRUDEvUk5CMVIxSzEgdyAtIC0gMCAxXCIsXG5cIjFyYjJSUjEvcDFwM3AxLzJwM2sxLzVwMXAvOC8zTjFQUDEvUFA1ci8ySzUgdyAtIC0gMCAxXCIsXG5cIjNxMnIxLzRuMmsvcDFwMXJCcHAvUHBQcFBwMi8xUDNQMVEvMlAzUjEvN1AvMVI1SyB3IC0gLSAwIDFcIixcblwiMmJxcjJrLzFyMW4yYnAvcHAxcEJwMi8ycFAxUFExL1AzUE4yLzFQNFAxLzFCNVAvUjNSMUsxIHcgLSAtIDAgMVwiLFxuXCIycjJrMi9wYjRiUS8xcDFxcjFwUi8zcDFwQjEvM1BwMy8yUDUvUFBCMlBQMS8xSzVSIHcgLSAtIDAgMVwiLFxuXCJyNWsxL3E0cHBwL3JuUjFwYjIvMVExcDQvMVAxUDQvUDROMVAvMUIzUFAxLzJSM0sxIHcgLSAtIDAgMVwiLFxuXCJyMWJybjMvcDFxNHAvcDFwMlAxay8yUHBQUHAxL1A3LzFRMkIyUC8xUDYvMUsxUjFSMiB3IC0gLSAwIDFcIixcblwiN2svMnAzcHAvcDcvMXAxcDQvUFAycHIyL0IxUDNxUC80TjFCMS9SMVFuMksxIGIgLSAtIDAgMVwiLFxuXCI1cmsxLzRScDFwLzFxMXBCUXAxLzVyMi8xcDYvMVA0UDEvMm4yUDIvM1IySzEgdyAtIC0gMCAxXCIsXG5cIjJRNS9wcDJyazFwLzNwMnBxLzJiUDFyMi81UlIxLzFQMlAzL1BCM1AxUC83SyB3IC0gLSAwIDFcIixcblwiNWIyLzFwM3Jway9wMWIzUnAvNEIxUlEvM1AxcDFQLzdxLzVQMi82SzEgdyAtIC0gMCAxXCIsXG5cIjNScjJrL3BwNHBiLzJwNHAvMlAxbjMvMVAxUTNQLzRyMXExL1BCNEIxLzVSSzEgYiAtIC0gMCAxXCIsXG5cIjgvMlExUjFiay8zcjNwL3AyTjFwMVAvUDJQNC8xcDNQcTEvMVA0UDEvMUs2IHcgLSAtIDAgMVwiLFxuXCIzcjNrLzFwM1JwcC9wMm5uMy8zTjQvOC8xUEIxUFExUC9xNFBQMS82SzEgdyAtIC0gMCAxXCIsXG5cIjNyMWtyMS84L3AycTJwMS8xcDJSMy8xUTYvOC9QUFA1LzFLNFIxIHcgLSAtIDAgMVwiLFxuXCIzcjNrLzFiMmIxcHAvM3BwMy9wM24xUDEvMXBQcVAyUC8xUDJOMlIvUDFRQjFyMi8yS1IzQiBiIC0gLSAwIDFcIixcblwiNXJrci8xcDJRcGJwL3BxMVA0LzJuQjQvNXAyLzJONS9QUFA0UC8xSzFSUjMgdyAtIC0gMCAxXCIsXG5dO1xuIiwibW9kdWxlLmV4cG9ydHMgPSBbXG5cIjJSNS80YnBway8xcDFwNC81UjFQLzRQUTIvNVAyL3I0cTFQLzdLIHcgLSAtIDAgMVwiLFxuXCI3ci8xcXIxbk5wMS9wMWs0cC8xcEI1LzRQMVExLzgvUFAzUFBQLzZLMSB3IC0gLSAwIDFcIixcblwicjFiMmsxci9wcHBwcTMvNU4xcC80UDJRLzRQUDIvMUI2L1BQNVAvbjJLMlIxIHcgLSAtIDAgMVwiLFxuXCIya3IxYjFyL3BwcTUvMW5wMXBwMi9QM1BuMi8xUDNQMi8yUDJRcDEvNlAxL1JOQjFSQksxIGIgLSAtIDAgMVwiLFxuXCJyMnFyYjIvcDFwbjFRcDEvMXA0TmsvNFBSMi8zbjQvN04vUDVQUC9SNksgdyAtIC0gMCAxXCIsXG5cInIxYmszci9wcHBxMXBwcC81bjIvNE4xTjEvMkJwNC9CbjYvUDRQUFAvNFIxSzEgdyAtIC0gMCAxXCIsXG5cIjFyYjJrMi8xcHEzcFEvcFJwTnAzL1AxUDJuMi8zUDFQMi80UDMvNlBQLzZLMSB3IC0gLSAwIDFcIixcblwiMXJyNGsvN3AvcDNRcHAxLzNwMVAyLzgvMVAxcTNQL1BLNFAxLzNCM1IgYiAtIC0gMCAxXCIsXG5cIjJyMmJrMS9wYjNwcHAvMXA2L243L3EyUDQvUDFQMVIyUS9CMkIxUFBQL1I1SzEgdyAtIC0gMCAxXCIsXG5cInI0cmsxL3BwNGIxLzZwcC8ycFA0LzVwS24vUDJCMk4xLzFQUVAxUHExLzFSQjJSMiBiIC0gLSAwIDFcIixcblwicjRyMWsvcDJwM3AvYnAxTnAzLzRQMy8yUDJuUjEvM0IxcTIvUDFQUTQvMkszUjEgdyAtIC0gMCAxXCIsXG5cIjNyMmsxL3AxcDJwMi9icDJwMW5RLzRQQjFQLzJwcjNxLzZSMS9QUDNQUDEvM1IySzEgdyAtIC0gMCAxXCIsXG5cInIycTFyazEvcHBwMW4xcDEvMWIxcDFwMi8xQjFOMkJRLzNwUDMvMlAzUDEvUFAzUDIvUjVLMSB3IC0gLSAwIDFcIixcblwiNXJrMS9wUjRwcC80cDJyLzJwMW4ycS8yUDFwMy9QMVExUDFQMS8xUDNQMVAvUjFCMk5LMSBiIC0gLSAwIDFcIixcblwiOC9wMnBRMnAvMnAxcDJrLzRCcXAxLzJQMlAyL1A2UC82UEsvM3I0IHcgLSAtIDAgMVwiLFxuXCI0cjFrMS81cDFwL3A0UHBRLzRxMy9QNlAvNlAxLzNwM0svOCBiIC0gLSAwIDFcIixcblwicjFicjFiMi80cFBrMS8xcDFxM3AvcDJQUjMvUDFQMk4yLzFQMVEyUDEvNVBCSy80UjMgdyAtIC0gMCAxXCIsXG5cIjdyLzNrYnAxcC8xUTNSMi8zcDNxL3AyUDNCLzFQNUsvUDZQLzggdyAtIC0gMCAxXCIsXG5cIjJyNGIvcHAxa3ByTnAvM3BOcDFQL3EyUDJwMS8ybjUvNEIyUS9QUFAzUjEvMUsxUjQgdyAtIC0gMCAxXCIsXG5cInI2ci9wcDFRMnBwLzJwNGsvNFIzLzVQMi8ycTUvUDFQM1BQL1I1SzEgdyAtIC0gMCAxXCIsXG5cIjJycXJiMi9wMm5rMy9icDJwblFwLzRCMXAxLzNQNC9QMU41LzFQM1BQUC8xQjFSUjFLMSB3IC0gLSAwIDFcIixcblwiOC9wcDJRMXAxLzJwM2twLzZxMS81bjIvMUIyUjJQL1BQMXIxUFAxLzZLMSB3IC0gLSAwIDFcIixcblwiazFuM3JyL1BwM3AyLzNxNC8zTjQvM1BwMnAvMVEyUDFwMS8zQjFQUDEvUjRSSzEgdyAtIC0gMCAxXCIsXG5cIjNyNC9wcDVRL0I3L2s3LzNxNC8yYjUvUDRQUFAvMVI0SzEgdyAtIC0gMCAxXCIsXG5cIjRSbmsxL3ByM3BwcC8xcDNxMi81TlExLzJwNS84L1A0UFBQLzZLMSB3IC0gLSAwIDFcIixcblwiNHFrMi82cDEvcDcvMXAxUXAzL3IxUDJiMi8xSzVQLzFQNi80UlIyIHcgLSAtIDAgMVwiLFxuXCIzcjFyazEvcHBxbjNwLzFucGIxUDIvNUIyLzJQNS8yTjNCMS9QUDJRMVBQL1I1SzEgdyAtIC0gMCAxXCIsXG5cInIzcmsyLzZiMS9xMnBRQnAxLzFOcFA0LzFuMlBQMi9uUDYvUDNOMUsxL1I2UiB3IC0gLSAwIDFcIixcblwicjVrMS9wcDJwcGIxLzNwNC9xM1AxUVIvNmIxL3IyQjFwMi8xUFA1LzFLNFIxIHcgLSAtIDAgMVwiLFxuXCIyYjUvM3FyMmsvNVExcC9QM0IzLzFQQjFQUHAxLzRLMVAxLzgvOCB3IC0gLSAwIDFcIixcblwiNmsxLzVwcDEvcDNwMnAvM2JQMlAvNlFOLzgvcnE0UDEvMlI0SyB3IC0gLSAwIDFcIixcblwiTjFiazQvcHAxcDFRcHAvOC8yYjUvM24zcS84L1BQUDJSUFAvUk5CMXJCSzEgYiAtIC0gMCAxXCIsXG5cInIzYnIxay9wcDVwLzRCMXAxLzROcFAxL1AyUG4zL3ExUFEzUi83UC8zUjJLMSB3IC0gLSAwIDFcIixcblwiNmtyL3BwMnIycC9uMXAxUEIxUS8ycTUvMkI0UC8yTjNwMS9QUFAzUDEvN0sgdyAtIC0gMCAxXCIsXG5cIjJyM3IxLzdwL2IzUDJrL3AxYnAxcDFCL1AyTjFQMi8xUDRRMS8yUDRQLzdLIHcgLSAtIDAgMVwiLFxuXCIxUTYvMVIzcGsxLzRwMnAvcDNuMy9QM1AyUC82UEsvcjVCMS8zcTQgYiAtIC0gMCAxXCIsXG5cIjVyazEvMXAxbjJicC9wNy9QMlAycDEvNFIzLzROMVBiLzJRQjFxMVAvNFIySyBiIC0gLSAwIDFcIixcblwiMVI2LzVxcGsvNHAycC8xUHAxQnAxUC9yMW4yUVAxLzVQSzEvNFAzLzggdyAtIC0gMCAxXCIsXG5cIjRrMXIxL3BwMmJwMi8ycDUvM1BQUDIvMXE2LzdyLzFQMlEyUC8yUlIzSyBiIC0gLSAwIDFcIixcblwicjFiazFyMi9wcDFuMnBwLzNOUTMvMVA2LzgvMm4yUEIxL3ExQjNQUC8zUjFSSzEgdyAtIC0gMCAxXCIsXG5cInJuM3JrMS9wcDNwMi8yYjFwbnAxLzROMy8zcTQvUDFOQjNSLzFQMVExUFBQL1I1SzEgdyAtIC0gMCAxXCIsXG5cIjJrcjFiMXIvcHAzcHBwLzJwMWIycS80QjMvNFEzLzJQQjJSMS9QUFAyUFBQLzNSMksxIHcgLSAtIDAgMVwiLFxuXCIzcXJrMi9wMXIycHAxLzFwMnBiMi9uUDFiTjJRLzNQTjMvUDZSLzVQUFAvUjVLMSB3IC0gLSAwIDFcIixcblwiNXIxay8xcDRwcC9wMk40LzNRcDMvUDJuMWJQMS81UDFxLzFQUDJSMVAvNFIySyB3IC0gLSAwIDFcIixcblwiNnIxL3A1YmsvNE4xcHAvMkIxcDMvNFEyTi84LzJQMktQUC9xNyB3IC0gLSAwIDFcIixcblwiNHIxazEvNWJwcC8ycDUvM3ByMy84LzFCM3BQcS9QUFIyUDIvMlIyUUsxIGIgLSAtIDAgMVwiLFxuXCI1cjIvcHE0azEvMXBwMVFuMi8yYnAxUEIxLzNSMVIyLzJQM1AxL1A2UC82SzEgdyAtIC0gMCAxXCIsXG5cInIzazMvM2IzUi8xbjFwMWIxUS8xcDFQcFAxTi8xUDJQMVAxLzZLMS8yQjFxMy84IHcgLSAtIDAgMVwiLFxuXCI1cXIxL2twMlIzLzVwMi8xYjFOMXAyLzVRMi9QNVAxLzZCUC82SzEgdyAtIC0gMCAxXCIsXG5cIjdrLzFwMVAxUXBxL3A2cC81cDFOLzZOMS83UC9QUDFyMVBQSy84IHcgLSAtIDAgMVwiLFxuXCIyYjNyay8xcTNwMXAvcDFwMXBQcFEvNE4zLzJwUDQvMlAxcDFQMS8xUDRQSy81UjIgdyAtIC0gMCAxXCIsXG5cInIycXJrMi9wNWIxLzJiMXAxUTEvMXAxcFAzLzJwMW5CMi8yUDFQMy9QUDNQMi8yS1IzUiB3IC0gLSAwIDFcIixcblwicjRrMi8xcHAzcTEvM3AxTm5RL3AzUDMvMlAzcDEvOC9QUDYvMks0UiB3IC0gLSAwIDFcIixcblwicjVyay9wcDFucDFibi8ycHAycTEvM1AxYk4xLzJQMU4yUS8xUDYvUEIyUFBCUC8zUjFSSzEgdyAtIC0gMCAxXCIsXG5cInI0bjFrL3BwQm5OMXAxLzJwMXAzLzZOcC9xMmJQMWIxLzNCNC9QUFAzUFAvUjRRMUsgdyAtIC0gMCAxXCIsXG5cInIzbnJrcS9wcDNwMXAvMnAzblEvNU5OMS84LzNCUDMvUFBQM1BQLzJLUjQgdyAtIC0gMCAxXCIsXG5cInIzUW5SMS8xYms1L3BwNXEvMmI1LzJwMVAzL1A3LzFCQjRQLzNSM0sgdyAtIC0gMCAxXCIsXG5cIjFyNGsxLzNiMnBwLzFiMXBQMnIvcHAxUDQvNHEzLzgvUFA0UlAvMlEyUjFLIGIgLSAtIDAgMVwiLFxuXCJyMk5xYjFyL3BRMWJwMXBwLzFwbjFwMy8xazFwNC8ycDJCMi8yUDUvUFBQMlBQUC9SM0tCMVIgdyAtIC0gMCAxXCIsXG5cInJxMnIxazEvMWIzcHAxL3AzcDFuMS8xcDRCUS84LzdSL1BQM1BQUC80UjFLMSB3IC0gLSAwIDFcIixcblwiM3ExcjIvNmsxL3AycFFiMi80cFIxcC80QjMvMlAzUDEvUDRQSzEvOCB3IC0gLSAwIDFcIixcblwiM1IxcmsxLzFwcDJwcDEvMXA2LzgvOC9QNy8xcTRCUC8zUTJLMSB3IC0gLSAwIDFcIixcblwicnFiMmJrMS8zbjJwci9wMXBwMlFwLzFwNi8zQlAyTi8yTjRQL1BQUDNQMS8yS1IzUiB3IC0gLSAwIDFcIixcblwiNWsxci80bnBwMS9wM3AycC8zblAyUC8zUDNRLzNONC9xQjJLUFAxLzJSNSB3IC0gLSAwIDFcIixcblwicjNyMWsxLzFiNi9wMW5wMXBwUS80bjMvNFAzL1BOQjRSLzJQMUJLMVAvMXE2IHcgLSAtIDAgMVwiLFxuXCIyUTUvNHBwYmsvM3A0LzNQMU5QcC80UDMvNU5CMS81UFBLL3JxNiB3IC0gLSAwIDFcIixcblwicjZrL3BiNGJwLzVRMi8ycDFOcDIvMXFCNS84L1A0UFBQLzRSSzIgdyAtIC0gMCAxXCIsXG5cIjNRNC82a3AvNHExcDEvMnBuTjJQLzFwM1AyLzFQbjNQMS82QksvOCB3IC0gLSAwIDFcIixcblwicjNxMWsxLzVwMi8zUDJwUS9QcHA1LzFwbmJOMlIvOC8xUDRQUC81UjFLIHcgLSAtIDAgMVwiLFxuXCIycjJiMWsvcDJRM3AvYjFuMlBwUC8ycDUvM3IxQk4xLzNxMlAxL1A0UEIxL1IzUjFLMSB3IC0gLSAwIDFcIixcblwicjJyMmsxLzFxMmJwQjEvcHAxcDFQQnAvOC9QNy83US8xUFAzUFAvUjZLIHcgLSAtIDAgMVwiLFxuXCJyM3Iyay9wYjFuM3AvMXAxcTFwcDEvNHAxQjEvMkJQM1EvMlAxUjMvUDRQUFAvNFIxSzEgdyAtIC0gMCAxXCIsXG5cIjJycjJrMS8xYjNwMXAvMXAxYjJwMS9wMXFQM1EvM1I0LzFQNi9QQjNQUFAvMUIyUjFLMSB3IC0gLSAwIDFcIixcblwiMnI1LzNuYmtwMS8ycTFwMXAxLzFwMW4yUDEvM1A0LzJwMVAxTlEvMVAxQjFQMi8xQjRLUiB3IC0gLSAwIDFcIixcblwicm5icXIxazEvcHBwM3AxLzRwUjFwLzRwMlEvM1A0L0IxUEI0L1AxUDNQUC9SNUsxIHcgLSAtIDAgMVwiLFxuXCJiM3IxazEvcDRSYk4vUDNQMXAxLzFwNi8xcXA0UC80UTFQMS81UDIvNUJLMSB3IC0gLSAwIDFcIixcblwicTFyMmIxay9yYjRucC8xcDJwMk4vcEIxbjQvNlExLzFQMlAzL1BCM1BQUC8yUlIySzEgdyAtIC0gMCAxXCIsXG5cIjVyYmsvMnBxM3AvNVBRUi9wNy8zcDNSLzFQNE4xL1A1UFAvNksxIHcgLSAtIDAgMVwiLFxuXCIycjFrMnIvcFIycDFicC8ybjFQMXAxLzgvMlFQNC9xMmIxTjIvUDJCMVBQUC80SzJSIHcgLSAtIDAgMVwiLFxuXCJrMm4xcTFyL3AxcEIycDEvUDRwUDEvMVFwMXAzLzgvMlAxQmJOMS9QNy8yS1I0IHcgLSAtIDAgMVwiLFxuXCI0cjMvcDJyMXAxay8zcTFCcHAvNFAzLzFQcHBSMy9QNVAxLzVQMVAvMlEzSzEgdyAtIC0gMCAxXCIsXG5cIjJycjFrMi9wYjRwMS8xcDFxcHAyLzRSMlEvM240L1AxTjUvMVAzUFBQLzFCMlIxSzEgdyAtIC0gMCAxXCIsXG5cIjFyMnEzLzFSNi8zcDFrcDEvMXBwQnAxYjEvcDNQcDIvMlBQNC9QUDNQMi81SzFRIHcgLSAtIDAgMVwiLFxuXCI1cmsxL3BwMlJwcHAvbnFwNS84LzVRMi82UEIvUFBQMlAxUC82SzEgdyAtIC0gMCAxXCIsXG5cInIycWsyci9wYjRwcC8xbjJQYjIvMkIyUTIvcDFwNS8yUDUvMkIyUFBQL1JOMlIxSzEgdyAtIC0gMCAxXCIsXG5cInIxYnEzci9wcHAxYjFrcC8ybjNwMS8zQjNRLzNwNC84L1BQUDJQUFAvUk5CMlJLMSB3IC0gLSAwIDFcIixcblwiMnE0ay81cE5QL3AycDFCcFAvNHAzLzFwMmIzLzFQNi9QMXIyUjIvMUs0UTEgdyAtIC0gMCAxXCIsXG5cIjZrMS8yckIxcDIvUkIxcDJwYi8zUHAycC80UDMvM0syTlEvNVBxMS84IGIgLSAtIDAgMVwiLFxuXCIyYms0LzZiMS8ycE5wMy9yMVBwUDFQMS9QMXBQMVEyLzJycTQvN1IvNlJLIHcgLSAtIDAgMVwiLFxuXCI1YmsxLzFRM3AyLzFOcDRwLzZwMS84LzFQMlAxUEsvNHEyUC84IGIgLSAtIDAgMVwiLFxuXCI1cmsxLzFwMXEyYnAvcDJwTjFwMS8ycFAyQm4vMlAzUDEvMVA2L1A0UUtQLzVSMiB3IC0gLSAwIDFcIixcblwiM3Izci9wMXBxcHBicC8xa04zcDEvMnBuUDMvUTViMS8xTlA1L1BQM1BQUC9SMUIyUksxIHcgLSAtIDAgMVwiLFxuXCIxUTFSNC81azIvNnBwLzJOMWJwMi8xQm41LzJQMlAxUC8xcjNQSzEvOCBiIC0gLSAwIDFcIixcblwiMnIxcmsyL3AxcTNwUS80cDMvMXBwcFAxTjEvN3AvNFAyUC9QUDNQMi8xSzRSMSB3IC0gLSAwIDFcIixcblwiNHEzL3BiNXAvMXAycDJrLzROMy9QUDFRUDMvMlAyUFAxLzZLMS84IHcgLSAtIDAgMVwiLFxuXCIyYnExazFyL3I1cHAvcDJiMVBuMS8xcDFRNC8zUDQvMUI2L1BQM1BQUC8yUjFSMUsxIHcgLSAtIDAgMVwiLFxuXCIzcjNrLzZwcC9wM1FuMi9QM04zLzRxMy8yUDRQLzVQUDEvNksxIHcgLSAtIDAgMVwiLFxuXCI2azEvNnAxL3A1cDEvM3BCMy8xcDFiNC8ycjFxMVBQL1A0UjFLLzVRMiB3IC0gLSAwIDFcIixcblwiM3IxYjIvM1AxcDIvcDNycGtwLzJxMk4yLzVRMVIvMlAzQlAvUDVQSy84IHcgLSAtIDAgMVwiLFxuXCIxcTVyLzFiMXIxcDFrLzJwMXBQcGIvcDFQcDQvM0IxUDFRLzFQNFAxL1A0S0IxLzJSUjQgdyAtIC0gMCAxXCIsXG5cIjRyMXJrL3BRMlAycC9QNy8ycHFiMy8zcDFwMi84LzNCMlBQLzRSUksxIGIgLSAtIDAgMVwiLFxuXCIxcjJScjIvM1AxcDFrLzVScHAvcXA2LzJwUTQvN1AvNVBQSy84IHcgLSAtIDAgMVwiLFxuXCJyMWJrMm5yL3BwcDJwcHAvM3A0L2JRM3EyLzNwNC9CMVA1L1AzQlBQUC9STjFLUjMgdyAtIC0gMCAxXCIsXG5cInI0a3IxLzFiMlIxbjEvcHE0cDEvNFEzLzFwNFAxLzVQMi9QUFA0UC8xSzJSMyB3IC0gLSAwIDFcIixcblwiNmsxLzVwMi80blExUC9wNE4yLzFwMWI0LzdLL1BQM3IyLzggdyAtIC0gMCAxXCIsXG5cIjJyMnJrMS9wcDNuYnAvMnAxYnEyLzJQcDQvMVAxUDFQUDEvUDFOQjQvMUJRSzQvN1IgdyAtIC0gMCAxXCIsXG5cIjVrMi82cjEvcDcvMnAxUDMvMXAyUTMvOC8xcTRQUC8zUjJLMSB3IC0gLSAwIDFcIixcblwicjJxNC9wcDFycFFiay8zcDJwMS8ycFBQMnAvNVAyLzJONS9QUFAyUDIvMktSM1IgdyAtIC0gMCAxXCIsXG5cIjRSMy8xcDRyay82cDEvMnBRQnBQMS9wMVAxcFAyL1BxNi8xUDYvSzcgdyAtIC0gMCAxXCIsXG5cIjJiMmsyLzJwMnIxcC9wMnBSMy8xcDNQUTEvM3EzTi8xUDYvMlAzUFAvNUsyIHcgLSAtIDAgMVwiLFxuXCJyMWIxcjMvcHBxMnBrMS8ybjFwMnAvYjcvM1BCMy8yUDJRMi9QMkIxUFBQLzFSM1JLMSB3IC0gLSAwIDFcIixcblwiMnI1LzJrNHAvMXAycHAyLzFQMnFwMi84L1E1UDEvNFBQMVAvUjVLMSB3IC0gLSAwIDFcIixcblwiNHExcmsvcGIyYnBucC8ycjRRLzFwMXAxcFAxLzROUDIvMVAzUjIvUEJuNFAvUkI0SzEgdyAtIC0gMCAxXCIsXG5cIjJyNGsvcDRyUnAvMXAxUjNCLzVwMXEvMlBuNC81cDIvUFA0UVAvMUI1SyB3IC0gLSAwIDFcIixcblwicjFiMWtiMXIvcHAybnBwcC8ycFE0LzgvMnExUDMvOC9QMVBCMVBQUC8zUksyUiB3IC0gLSAwIDFcIixcblwiMnIxYjMvMXBwMXFyazEvcDFuMVAxcDEvN1IvMkIxcDMvNFExUDEvUFAzUFAxLzNSMksxIHcgLSAtIDAgMVwiLFxuXCI1cmsxL3BicHBxMWJOLzFwbjFwMVExLzZOMS8zUDQvOC9QUFAyUFAxLzJLNFIgdyAtIC0gMCAxXCIsXG5cInFuMXIxazIvMnIxYjFucC9wcDFwUTFwMS8zUDJQMS8xUFAyUDIvN1IvUEI0QlAvNFIxSzEgdyAtIC0gMCAxXCIsXG5cInIycjQvMXAxYm4ycC9wbjJwcGtCLzVwMi80UFFOMS82UDEvUFBxMlBCUC9SMlIySzEgdyAtIC0gMCAxXCIsXG5cIjNrMXIyLzJwYjQvMnAzUDEvMk5wMXAyLzFQNi80bk4xUi8yUDFxMy9RNUsxIHcgLSAtIDAgMVwiLFxuXCI1cmsxL3BwcDNwcC84LzNwUTMvM1AyYjEvNXJQcS9QUDFQMVAyL1IxQkIxUksxIGIgLSAtIDAgMVwiLFxuXCJyNnIvMXAycHAxay9wMWIycTFwLzRwUDIvNlFSLzNCMlAxL1AxUDJLMi83UiB3IC0gLSAwIDFcIixcblwiMms0ci9wcHAycDIvMmIyQjIvN3AvNnBQLzJQMXExYlAvUFAzTjIvUjRRSzEgYiAtIC0gMCAxXCIsXG5cIjJRUjQvNmIxLzFwNHBrLzdwLzVuMVAvNHJxMi81UDIvNUJLMSB3IC0gLSAwIDFcIixcblwicm5iMmIxci9wM2tCcDEvM3BObjFwLzJwUU4zLzFwMlBQMi80QjMvUHE1UC80SzMgdyAtIC0gMCAxXCIsXG5cIjJycTFuMVEvcDFyMmsyLzJwMXAxcDEvMXAxcFAzLzNQMnAxLzJONFIvUFBQMlAyLzJLNFIgdyAtIC0gMCAxXCIsXG5cInIyUTFxMWsvcHA1ci80QjFwMS81cDIvUDcvNFAyUi83UC8xUjRLMSB3IC0gLSAwIDFcIixcblwiM2s0LzJwMXExcDEvOC8xUVBQcDJwLzRQcDIvN1AvNlAxLzdLIHcgLSAtIDAgMVwiLFxuXCI4LzFwM1FiMS9wNXBrL1AxcDFwMXAxLzFQMlAxUDEvMlAxTjJuLzVQMVAvNHFCMUsgdyAtIC0gMCAxXCIsXG5cIjFyM2syLzNSbnAyLzZwMS82cTEvcDFCUTFwMi9QMVA1LzFQM1BQMS82SzEgdyAtIC0gMCAxXCIsXG5cIjJybjJrMS8xcTFOMXBicC80cEIxUC9wcDFwUG4yLzNQNC8xUHIyTjIvUDJRMVAxSy82UjEgdyAtIC0gMCAxXCIsXG5cIjVrMi9wMlExcHAxLzFiNXAvMXAyUEIxUC8ycDJQMi84L1BQM3FQSy84IHcgLSAtIDAgMVwiLFxuXCJyM2tiMXIvcGI2LzJwMnAxcC8xcDJwcTIvMnBRM3AvMk4yQjIvUFAzUFBQLzNSUjFLMSB3IC0gLSAwIDFcIixcblwicjFiMWtiMXIvcHAxbjFwcDEvMXFwMXAycC82QjEvMlBQUTMvM0IxTjIvUDRQUFAvUjRSSzEgdyAtIC0gMCAxXCIsXG5cInJuM2sxci9wYnBwMUJicC8xcDRwTi80UDFCMS8zbjQvMnEzUTEvUFBQMlBQUC8yS1IzUiB3IC0gLSAwIDFcIixcblwiM1I0L3AxcjNyay8xcTJQMXAxLzVwMXAvMW42LzFCNVAvUDJRMlAxLzNSM0sgdyAtIC0gMCAxXCIsXG5cIjgvNmJrLzFwNi81cEJwLzFQMmIzLzZRUC9QNVBLLzVxMiBiIC0gLSAwIDFcIixcblwicjFicWtiMi82cDEvcDFwNHAvMXAxTjQvOC8xQjNRMi9QUDNQUFAvM1IySzEgdyAtIC0gMCAxXCIsXG5cIjVycmsvNXBiMS9wMXBOM3AvN1EvMXAyUFAxUi8xcTVQLzZQMS82UksgdyAtIC0gMCAxXCIsXG5cInJuYnExYm5yL3BwMXAxcDFwLzNwazMvM05QMXAxLzVwMi81TjIvUFBQMVExUFAvUjFCMUtCMVIgdyAtIC0gMCAxXCIsXG5cIjFyM3JrMS8xcG5ucTFiUi9wMXBwMkIxL1AyUDFwMi8xUFAxcFAyLzJCM1AxLzVQSzEvMlE0UiB3IC0gLSAwIDFcIixcblwiMlE1LzFwM3AyLzNiMWsxcC8zUHAzLzRCMVIxLzRxMVAxL3I0UEsxLzggdyAtIC0gMCAxXCIsXG5cInIxYjNrci9wcHAxQnAxcC8xYjYvbjJQNC8ycDNxMS8yUTJOMi9QNFBQUC9STjJSMUsxIHcgLSAtIDAgMVwiLFxuXCIxUjFicjFrMS9wUjVwLzJwM3BCLzJwMlAyL1AxcXAyUTEvMm40UC9QNVAxLzZLMSB3IC0gLSAwIDFcIixcblwicjFiMm4yLzJxM3JrL3AzcDJuLzFwM3AxUC80TjMvUE4xQjFQMi8xUFBRNC8ySzNSMSB3IC0gLSAwIDFcIixcblwicjNxMy9wcHAzazEvM3AzUi81YjIvMlBSM1EvMlAxUHJQMS9QNy80SzMgdyAtIC0gMCAxXCIsXG5cIjJyM2sxLzNiMmIxLzVwcDEvM1A0L3BCMlAzLzJObnFOMi8xUDJCMlEvNUsxUiBiIC0gLSAwIDFcIixcblwiNnJrLzJwMnAxcC9wMnExcDFRLzJwMXBQMi8xblAxUjMvMVA1UC9QNVAxLzJCM0sxIHcgLSAtIDAgMVwiLFxuXCIxcjJiazIvMXAzcHBwL3AxbjJxMi8yTjUvMVA2L1AzUjFQMS81UEJQLzRRMUsxIHcgLSAtIDAgMVwiLFxuXCJyM3JrMi81cG4xL3BiMW5xMXBSLzFwMnAxUDEvMnAxUDMvMlAyUU4xL1BQQkIxUDIvMks0UiB3IC0gLSAwIDFcIixcblwiM3JrcTFyLzFwUTJwMXAvcDNiUHAxLzNwUjMvOC84L1BQUDJQUDEvMUsxUjQgdyAtIC0gMCAxXCIsXG5cInIxYnEzci9wcHAxblEyLzJrcDFOMi82TjEvM2JQMy84L1AybjFQUFAvMVIzUksxIHcgLSAtIDAgMVwiLFxuXCJuMnExcjFrLzRicDFwLzRwMy80UDFwMS8ycFBOUTIvMnA0Ui81UFBQLzJCM0sxIHcgLSAtIDAgMVwiLFxuXCIyUnIxcWsxLzVwcHAvcDJONC9QNy81UTIvOC8xcjRQUC81QksxIHcgLSAtIDAgMVwiLFxuXCI4LzZrMS8zcDFycDEvM0JwMXAxLzFwUDFQMUsxLzRiUFIxL1A1UTEvNHEzIGIgLSAtIDAgMVwiLFxuXCJyMWJxMnJrL3BwM3BicC8ycDFwMXBRLzdQLzNQNC8yUEIxTjIvUFAzUFBSLzJLUjQgdyAtIC0gMCAxXCIsXG5cIjVxcjEvcHIzcDFrLzFuMXAycDEvMnBQcFAxcC9QM1AyUS8yUDFCUDFSLzdQLzZSSyB3IC0gLSAwIDFcIixcblwicm4ya2Ixci9wcDJwcDFwLzJwMnAyLzgvOC8zUTFOMi9xUFBCMVBQUC8yS1IzUiB3IC0gLSAwIDFcIixcblwiN2svcGI0cnAvMnFwMVEyLzFwM3BQMS9ucDNQMi8zUHJOMVIvUDFQNFAvUjNOMUsxIHcgLSAtIDAgMVwiLFxuXCI4L3A0cGsxLzZwMS8zUjQvM25xTjFQLzJRM1AxLzVQMi8zcjFCSzEgYiAtIC0gMCAxXCIsXG5cInIzcmsyL3AzYnAyLzJwMXFCMi8xcDFuUDFSUC8zUDQvMlBRNC9QNVAxLzVSSzEgdyAtIC0gMCAxXCIsXG5cIjZrMS9wcDNwcHAvNHAzLzJQM2IxL2JQUDNQMS8zSzQvUDNRMXExLzFSNVIgYiAtIC0gMCAxXCIsXG5cInIxYjJyazEvcDFxbmJwMXAvMnAzcDEvMnBwM1EvNHBQMi8xUDFCUDFSMS9QQlBQMlBQL1JONEsxIHcgLSAtIDAgMVwiLFxuXCIzcjQvcDRRMXAvMXAyUDJrLzJwM3BxLzJQMkIyLzFQMnAyUC9QNVAxLzZLMSB3IC0gLSAwIDFcIixcblwiNmsxLzgvM3ExcDIvcDVwMS9QMWIxUDJwL1IxUTRQLzVLTjEvM3I0IGIgLSAtIDAgMVwiLFxuXTtcbiIsIm1vZHVsZS5leHBvcnRzID0gW1xuXCJyNHIxay9wMnAzcC9icDFOcDMvNFAzLzJQMm5SMS8zQjFxMi9QMVBRNC8ySzNSMSB3IC0gLSAwIDFcIixcblwiM3IyazEvcDFwMnAyL2JwMnAxblEvNFBCMVAvMnByM3EvNlIxL1BQM1BQMS8zUjJLMSB3IC0gLSAwIDFcIixcblwiMnIzazEvcDZSLzFwMnAxcDEvbks0TjEvUDRQMi8zbjQvNHIxUDEvN1IgYiAtIC0gMCAxXCIsXG5cIk4xYms0L3BwMXAxUXBwLzgvMmI1LzNuM3EvOC9QUFAyUlBQL1JOQjFyQksxIGIgLSAtIDAgMVwiLFxuXCI1cmsxLzFwMW4yYnAvcDcvUDJQMnAxLzRSMy80TjFQYi8yUUIxcTFQLzRSMksgYiAtIC0gMCAxXCIsXG5cIjRrMXIxL3BwMmJwMi8ycDUvM1BQUDIvMXE2LzdyLzFQMlEyUC8yUlIzSyBiIC0gLSAwIDFcIixcblwiOC80UjFway9wNXAxLzgvMXBCMW4xYjEvMVAyYjFQMS9QNHIxUC81UjFLIGIgLSAtIDAgMVwiLFxuXCIya3IxYjFyL3BwM3BwcC8ycDFiMnEvNEIzLzRRMy8yUEIyUjEvUFBQMlBQUC8zUjJLMSB3IC0gLSAwIDFcIixcblwicjNrMy8zYjNSLzFuMXAxYjFRLzFwMVBwUDFOLzFQMlAxUDEvNksxLzJCMXEzLzggdyAtIC0gMCAxXCIsXG5cInIzUW5SMS8xYms1L3BwNXEvMmI1LzJwMVAzL1A3LzFCQjRQLzNSM0sgdyAtIC0gMCAxXCIsXG5cIjFyNGsxLzNiMnBwLzFiMXBQMnIvcHAxUDQvNHEzLzgvUFA0UlAvMlEyUjFLIGIgLSAtIDAgMVwiLFxuXCIycjJiMWsvcDJRM3AvYjFuMlBwUC8ycDUvM3IxQk4xLzNxMlAxL1A0UEIxL1IzUjFLMSB3IC0gLSAwIDFcIixcblwicjRSMi8xYjJuMXBwL3AyTnAxazEvMXBuNS80cFAxUC84L1BQUDFCMVAxLzJLNFIgdyAtIC0gMCAxXCIsXG5cImIzcjFrMS9wNFJiTi9QM1AxcDEvMXA2LzFxcDRQLzRRMVAxLzVQMi81QksxIHcgLSAtIDAgMVwiLFxuXCJxMXIyYjFrL3JiNG5wLzFwMnAyTi9wQjFuNC82UTEvMVAyUDMvUEIzUFBQLzJSUjJLMSB3IC0gLSAwIDFcIixcblwiMnIxazJyL3BSMnAxYnAvMm4xUDFwMS84LzJRUDQvcTJiMU4yL1AyQjFQUFAvNEsyUiB3IC0gLSAwIDFcIixcblwiMWs1ci8zUjFwYnAvMUIycDMvMk5wUG4yLzVwMi84LzFQUDNQUC82SzEgdyAtIC0gMCAxXCIsXG5cIjJycjFrMi9wYjRwMS8xcDFxcHAyLzRSMlEvM240L1AxTjUvMVAzUFBQLzFCMlIxSzEgdyAtIC0gMCAxXCIsXG5cIjJxNGsvNXBOUC9wMnAxQnBQLzRwMy8xcDJiMy8xUDYvUDFyMlIyLzFLNFExIHcgLSAtIDAgMVwiLFxuXCI2azEvMnJCMXAyL1JCMXAycGIvM1BwMnAvNFAzLzNLMk5RLzVQcTEvOCBiIC0gLSAwIDFcIixcblwiNXJrMS8xcDFxMmJwL3AycE4xcDEvMnBQMkJuLzJQM1AxLzFQNi9QNFFLUC81UjIgdyAtIC0gMCAxXCIsXG5cIjNyazJiLzVSMVAvNkIxLzgvMVAzcE4xLzdQL1AycGJQMi82SzEgdyAtIC0gMCAxXCIsXG5cIjJicTFrMXIvcjVwcC9wMmIxUG4xLzFwMVE0LzNQNC8xQjYvUFAzUFBQLzJSMVIxSzEgdyAtIC0gMCAxXCIsXG5cIjRCMy82UjEvMXA1ay9wMnIzTi9QbjFwMlAxLzdQLzFQM1AyLzZLMSB3IC0gLSAwIDFcIixcblwiMXIyUnIyLzNQMXAxay81UnBwL3FwNi8ycFE0LzdQLzVQUEsvOCB3IC0gLSAwIDFcIixcblwicjRrcjEvMWIyUjFuMS9wcTRwMS80UTMvMXA0UDEvNVAyL1BQUDRQLzFLMlIzIHcgLSAtIDAgMVwiLFxuXCIyYjJrMi8ycDJyMXAvcDJwUjMvMXAzUFExLzNxM04vMVA2LzJQM1BQLzVLMiB3IC0gLSAwIDFcIixcblwiNHExcmsvcGIyYnBucC8ycjRRLzFwMXAxcFAxLzROUDIvMVAzUjIvUEJuNFAvUkI0SzEgdyAtIC0gMCAxXCIsXG5cIjJyNGsvcDRyUnAvMXAxUjNCLzVwMXEvMlBuNC81cDIvUFA0UVAvMUI1SyB3IC0gLSAwIDFcIixcblwicjJyNC8xcDFibjJwL3BuMnBwa0IvNXAyLzRQUU4xLzZQMS9QUHEyUEJQL1IyUjJLMSB3IC0gLSAwIDFcIixcblwiNXIxay83Yi80QjMvNksxLzNSMU4yLzgvOC84IHcgLSAtIDAgMVwiLFxuXCJyNW5yLzZScC9wMU5Oa3AyLzFwM2IyLzJwNS81SzIvUFAyUDMvM1I0IHcgLSAtIDAgMVwiLFxuXCIxcjNrMi8zUm5wMi82cDEvNnExL3AxQlExcDIvUDFQNS8xUDNQUDEvNksxIHcgLSAtIDAgMVwiLFxuXCIycm4yazEvMXExTjFwYnAvNHBCMVAvcHAxcFBuMi8zUDQvMVByMk4yL1AyUTFQMUsvNlIxIHcgLSAtIDAgMVwiLFxuXCIzUjQvcDFyM3JrLzFxMlAxcDEvNXAxcC8xbjYvMUI1UC9QMlEyUDEvM1IzSyB3IC0gLSAwIDFcIixcblwicjFiMm4yLzJxM3JrL3AzcDJuLzFwM3AxUC80TjMvUE4xQjFQMi8xUFBRNC8ySzNSMSB3IC0gLSAwIDFcIixcblwicjNxMy9wcHAzazEvM3AzUi81YjIvMlBSM1EvMlAxUHJQMS9QNy80SzMgdyAtIC0gMCAxXCIsXG5cIjFyMmJrMi8xcDNwcHAvcDFuMnEyLzJONS8xUDYvUDNSMVAxLzVQQlAvNFExSzEgdyAtIC0gMCAxXCIsXG5cIjJScjFxazEvNXBwcC9wMk40L1A3LzVRMi84LzFyNFBQLzVCSzEgdyAtIC0gMCAxXCIsXG5cIjdrL3BiNHJwLzJxcDFRMi8xcDNwUDEvbnAzUDIvM1ByTjFSL1AxUDRQL1IzTjFLMSB3IC0gLSAwIDFcIixcblwiOC9wNHBrMS82cDEvM1I0LzNucU4xUC8yUTNQMS81UDIvM3IxQksxIGIgLSAtIDAgMVwiLFxuXCI0cjMvcGJwbjJuMS8xcDFwcnAxay84LzJQUDJQQi9QNU4xLzJCMlIxUC9SNUsxIHcgLSAtIDAgMVwiLFxuXCJyNHIxay9wcDFiMnBuLzgvM3BSMy81TjIvM1E0L1BxM1BQUC81UksxIHcgLSAtIDAgMVwiLFxuXCIxcjJyMWsxLzVwMi81UnAxLzRRMnAvUDJCMnFQLzFOUDUvMUtQNS84IHcgLSAtIDAgMVwiLFxuXCIxcjNyazEvMW5xYjJuMS82UjEvMXAxUHAzLzFQcDNwMS8yUDRQLzJCMlFQMS8yQjJSSzEgdyAtIC0gMCAxXCIsXG5cInI3LzFwM1EyLzJrcHIycC9wMXAyUnAxL1AzUHAyLzFQM1AyLzFCMnExUFAvM1IzSyB3IC0gLSAwIDFcIixcblwiMXIzcjIvMXA1Ui9wMW4ycHAxLzFuMUIxUGsxLzgvOC9QMVAyQlBQLzJLMVIzIHcgLSAtIDAgMVwiLFxuXCI0azJyLzFSM1IyL3AzcDFwcC80YjMvMUJuTnIzLzgvUDFQNS81SzIgdyAtIC0gMCAxXCIsXG5cIjVxMi8xcHByMWJyMS8xcDFwMWtuUi8xTjRSMS9QMVAxUFAyLzFQNi8yUDRRLzJLNSB3IC0gLSAwIDFcIixcblwiN2svM3FiUjFuL3I1cDEvM0JwMVAxLzFwMXBQMXIxLzNQMlExLzFQNUsvMlI1IHcgLSAtIDAgMVwiLFxuXCI0bjMvcGJxMnJrMS8xcDNwTjEvOC8ycDJRMi9QbjROMS9CNFBQMS80UjFLMSB3IC0gLSAwIDFcIixcblwiOC8xcDJwMWtwLzJyUkIzL3BxMm4xUHAvNFAzLzgvUFBQMlEyLzJLNSB3IC0gLSAwIDFcIixcblwiM3IxcmsxLzFxMmIxbjEvcDFiMXBScFEvMXAyUDMvM0JOMy9QMVBCNC8xUDRQUC80UjJLIHcgLSAtIDAgMVwiLFxuXCIyYjJyMWsvMXAyUjMvMm4ycjFwL3AxUDFOMXAxLzJCM1AxL1A2UC8xUDNSMi82SzEgdyAtIC0gMCAxXCIsXG5cIjFxcjJiazEvcGIzcHAxLzFwbjNucC8zTjJOUS84L1A3L0JQM1BQUC8yQjFSMUsxIHcgLSAtIDAgMVwiLFxuXCIycms0LzVSMi8zcHAxUTEvcGIycTJOLzFwMlAzLzgvUFByNS8xSzFSNCB3IC0gLSAwIDFcIixcblwicjRyMWsvcHA0UjEvM3BOMXAxLzNQMlFwLzFxMlBwbjEvOC82UFAvNVJLMSB3IC0gLSAwIDFcIixcblwicjJyMWIxay9wUjYvNnBwLzVRMi8zcUIzLzZQMS9QM1BQMVAvNksxIHcgLSAtIDAgMVwiLFxuXCJyM3JrblEvMXAxUjFwYjEvcDNwcUJCLzJwNS84LzZQMS9QUFAyUDFQLzRSMUsxIHcgLSAtIDAgMVwiLFxuXCIzcmIxazEvcHBxM3AxLzJwMXAxcDEvNlAxLzJQcjNSLzFQMVE0L1AxQjRQLzVSSzEgdyAtIC0gMCAxXCIsXG5cIjVyazEvMWJSMnBicC80cDFwMS84LzFwMVAxUFBxLzFCMlAyci9QMk5RMlAvNVJLMSBiIC0gLSAwIDFcIixcblwiM3ExcmsxLzRicDFwLzFuMlAyUS8xcDFwMXAyLzZyMS9QcDJSMk4vMUIxUDJQUC83SyB3IC0gLSAwIDFcIixcblwiM25rMXIxLzFwcTRwL3AzUFFwQi81cDIvMnI1LzgvUDRQUFAvM1JSMUsxIHcgLSAtIDAgMVwiLFxuXCI2cmsvNXAxcC81cDIvMXAyYlAyLzFQMlIyUS8ycTFCQlBQLzVQSzEvcjcgdyAtIC0gMCAxXCIsXG5cIjFiNHJrLzRSMXBwL3AxYjRyLzJQQjQvUHAxUTQvNlBxLzFQM1AxUC80Uk5LMSB3IC0gLSAwIDFcIixcblwiUTRSMi8za3IzLzFxM24xcC8ycDFwMXAxLzFwMWJQMVAxLzFCMVAzUC8yUEJLMy84IHcgLSAtIDAgMVwiLFxuXCIycmsycjEvM2IzUi9uM3BSQjEvcDJwUDFQMS8zTjQvMVBwNS9QMUs0UC84IHcgLSAtIDAgMVwiLFxuXCIycjUvMlI1LzNucGtwcC8zYk4zL3A0UFAxLzRLMy9QMUI0UC84IHcgLSAtIDAgMVwiLFxuXCJyMnFyMmsvcHAxYjNwLzJuUTQvMnBCMXAxUC8zbjFQcFIvMk5QMlAxL1BQUDUvMksxUjFOMSB3IC0gLSAwIDFcIixcblwiMXIzcjFrLzJSNHAvcTRwcFAvM1BwUTIvMlJiUDMvcFA2L1AyQjJQMS8xSzYgdyAtIC0gMCAxXCIsXG5cIjJyM2sxL3BwM3BwcC8xcXIybjIvM3AxUTIvMVA2L1AyQlAyUC81UFAxLzJSMlJLMSB3IC0gLSAwIDFcIixcblwiNWsyL3AzUnIyLzFwNHBwL3E0cDIvMW5iUTFQMi82UDEvNU4xUC8zUjJLMSB3IC0gLSAwIDFcIixcblwicjNyMy8zUjFRcDEvcHFiMXAyay8xcDROMS84LzRQMy9QYjNQUFAvMlIzSzEgdyAtIC0gMCAxXCIsXG5cIjgvNGszLzFwMnAxcDEvcFAxcFBuUDEvUDFyUHEycC8xS1AyUjFOLzgvNVEyIGIgLSAtIDAgMVwiLFxuXCIycTNrMS8xcDRwcC8zUjFyMi9wMmJRMy9QNy8xTjJCMy8xUFAzclAvUjNLMyBiIC0gLSAwIDFcIixcblwiNHJrMi81cDFiLzFwM1IxSy9wNnAvMlAyUDIvMVA2LzJxNFAvUTVSMSB3IC0gLSAwIDFcIixcblwiMnIyYmsxLzJxbjFwcHAvcG4xcDQvNU4yL04zcjMvMVE2LzVQUFAvQlIzQksxIHcgLSAtIDAgMVwiLFxuXCI2azEvcHAzcjIvMnA0cS8zcDJwMS8zUHAxYjEvNFAxUDEvUFA0UlAvMlExUnJOSyBiIC0gLSAwIDFcIixcblwicjVrci9wcHBOMXBwMS8xYm4xUjMvMXExTjJCcC8zcDJRMS84L1BQUDJQUFAvUjVLMSB3IC0gLSAwIDFcIixcblwiMXExcjFrMi8xYjJScHAxL3AxcFEzcC9QcFBwNC8zUDFOUDEvMVAzUDFQLzZLMS84IHcgLSAtIDAgMVwiLFxuXCI0cjMvMlJONC9wMXI1LzFrMXA0LzVCcDEvcDJQNC8xUDRQSy84IHcgLSAtIDAgMVwiLFxuXCJyMlJuazFyLzFwMnExYjEvN3AvNnBRLzRQcGIxLzFCUDUvUFAzQlBQLzJLNFIgdyAtIC0gMCAxXCIsXG5cInIzbjFrMS9wYjVwLzROMXAxLzJwcjQvcTcvM0IzUC8xUDFRMVBQMS8yQjFSMUsxIHcgLSAtIDAgMVwiLFxuXCI2azEvNXAyLzNQMUJwcC8yYjFQMy9iMXAycDIvcDFQNS9SNXJQLzJOMUszIGIgLSAtIDAgMVwiLFxuXCJyNXJSLzNOa3AyLzRwMy8xUTRxMS9ucDFONC84L2JQUFIyUDEvMks1IHcgLSAtIDAgMVwiLFxuXCI2azEvMXAycTJwL3AzUDFwQi84LzFQMnAzLzJRcjJQMS9QNFAxUC8yUjNLMSB3IC0gLSAwIDFcIixcblwiNFIzLzJwMmtwUS8zcDNwL3AycjJxMS84LzFQcjJQMi9QMVAzUFAvNFIxSzEgdyAtIC0gMCAxXCIsXG5cIjgvMmsycjIvcHA2LzJwMVIxTnAvNnBuLzgvUHI0QjEvM1IzSyB3IC0gLSAwIDFcIixcblwiNVIyLzRyMXIxLzFwNGsxL3AxcEIyQnAvUDFQNEsvMlAxcDMvMVA2LzggdyAtIC0gMCAxXCIsXG5cIjZrMS9wcHAycHBwLzgvMm4ySzFQLzJQMlAxUC8yQnByMy9QUDRyMS80UlIyIGIgLSAtIDAgMVwiLFxuXCIycXIyazEvNHJwcE4vcHBucDQvMnBSM1EvMlAyUDIvMVA0UDEvUEI1UC82SzEgdyAtIC0gMCAxXCIsXG5cIjNSNC8zUTFwMi9xMXJuMmtwLzRwMy80UDMvMk4zUDEvNVAxUC82SzEgdyAtIC0gMCAxXCIsXG5cIjRrcjIvM3JuMnAvMVA0cDEvMnA1L1ExQjJQMi84L1AycTJQUC80UjFLMSB3IC0gLSAwIDFcIixcblwiM3Ezci9yNHBrMS9wcDJwTnAxLzNiUDFRMS83Ui84L1BQM1BQUC8zUjJLMSB3IC0gLSAwIDFcIixcblwicm5iM2tyL3BwcDRwLzNiM0IvM1BwMm4vMkJQNC80S1JwMS9QUFAzcTEvUk4xUTQgdyAtIC0gMCAxXCIsXG5cInIxa3ExYjFyLzVwcHAvcDRuMi8ycFBSMUIxL1E3LzJQNS9QNFBQUC8xUjRLMSB3IC0gLSAwIDFcIixcblwiMnI1LzJwMmsxcC9wcXAxUkIyLzJyNS9QYlEyTjIvMVAzUFAxLzJQM1AxLzRSMksgdyAtIC0gMCAxXCIsXG5cIjZrMS81cDIvUjVwMS9QNm4vOC81UFBwLzJyM3JQL1I0TjFLIGIgLSAtIDAgMVwiLFxuXCJyM2tyMi82UXAvMVBiMnAyL3BCM1IyLzNwcTJCLzRuMy8xUDRQUC80UjFLMSB3IC0gLSAwIDFcIixcblwiNXJrMS9uMXAxUjFicC9wMnA0LzFxcFAxUUIxLzdQLzJQM1AxL1BQM1AyLzZLMSB3IC0gLSAwIDFcIixcblwiMnJyazMvUVIzcHAxLzJuMWIycC8xQkIxcTMvM1A0LzgvUDRQUFAvNksxIHcgLSAtIDAgMVwiLFxuXCIycTFiMWsxL3A1cHAvbjJSNC8xcDJQMy8ycDUvQjFQNS81UVBQLzZLMSB3IC0gLSAwIDFcIixcblwiYjRyazEvNnAxLzRwMU4xL3EzUDFRMS8xcDFSNC8xUDVyL1A0UDIvM1IySzEgdyAtIC0gMCAxXCIsXG5cIjZrMS8xcDVwL3AycDFxMi8zUGIzLzFRMlAzLzNiMUJwUC9QUHIzUDEvS1JONSBiIC0gLSAwIDFcIixcblwiNVEyLzFwM3AxTi8ycDNwMS81YjFrLzJQM24xL1A0UlAxLzNxMnJQLzVSMUsgdyAtIC0gMCAxXCIsXG5cIjZrMS8xcjRucC9wcDFwMVIxQi8ycFAycDEvUDFQNS8xbjVQLzZQMS80UjJLIHcgLSAtIDAgMVwiLFxuXCJSNHJrMS80cjFwMS8xcTJwMVFwLzFwYjUvMW41Ui81TkIxLzFQM1BQUC82SzEgdyAtIC0gMCAxXCIsXG5cIjgvcDFwNS8ycDNrMS8yYjFycEIxLzdLLzJQM1BQL1AxUDJyMi8zUjNSIGIgLSAtIDAgMVwiLFxuXCJyMWIycmsxLzFwMm5wcHAvcDJSMWIyLzRxUDFRLzRQMy8xQjJCMy9QUFAyUDFQLzJLM1IxIHcgLSAtIDAgMVwiLFxuXCI3ay9wMXAyYnAxLzNxMU4xcC80clAyLzRwUTIvMlA0Ui9QMnIyUFAvNFIySyB3IC0gLSAwIDFcIixcblwiNmsxLzRSMy9wNXExLzJwUDFRMi8zYm4xcjEvUDcvNlBQLzVSMUsgYiAtIC0gMCAxXCIsXG5cInI1azEvM25wcDFwLzJiM3AxLzFwbjUvMnBSUDMvMlAxQlBQMS9yMVA0UC8xTktSMUIyIGIgLSAtIDAgMVwiLFxuXCI1cmsxLzNwMXAxcC9wNFFxMS8xcDFQMlIxLzdOL242UC8ycjNQSy84IHcgLSAtIDAgMVwiLFxuXCI1cjFrLzFwMWIxcDFwL3AycHBiMi81UDFCLzFxNi8xUHIzUjEvMlBRMlBQLzVSMUsgdyAtIC0gMCAxXCIsXG5cIjVyMi9wcDJSMy8xcTFwM1EvMnBQMWIyLzJQa3JwMi8zQjQvUFBLMlBQMS9SNyB3IC0gLSAwIDFcIixcblwiNWIyL3BwMnIxcGsvMnBwMVIxcC80clAxTi8yUDFQMy8xUDRRMS9QM3ExUFAvNVIxSyB3IC0gLSAwIDFcIixcblwiNW4xay9ycTRycC9wMWJwMWIyLzJwMXBQMVEvUDFCMVAyUi8yTjNSMS8xUDRQUC82SzEgdyAtIC0gMCAxXCIsXG5cIjJya3IzLzNiMXAxUi8zUjFQMi8xcDJRMVAxL3BQcTUvUDFONS8xS1A1LzggdyAtIC0gMCAxXCIsXG5cIjFyYmsxcjIvcHA0UjEvM05wMy8zcDJwMS82cTEvQlAyUDMvUDJQMkIxLzJSM0sxIHcgLSAtIDAgMVwiLFxuXCI2azEvNXAyL3AzYlJwUS80cTMvMnIzUDEvNk5QL1AxcDJSMUsvMXI2IHcgLSAtIDAgMVwiLFxuXCJyMXFyM2svM1IycDEvcDNRMy8xcDJwMXAxLzNiTjMvOC9QUDNQUFAvNVJLMSB3IC0gLSAwIDFcIixcblwiNXJrMS9wYjJucHAxLzFwcTRwLzVwMi81QjIvMUI2L1AyUlExUFAvMnIxUjJLIGIgLSAtIDAgMVwiLFxuXCJyNGJyMS8zYjFrcHAvMXExUDQvMXBwMVJQMU4vcDcvNlExL1BQQjNQUC8yS1I0IHcgLSAtIDAgMVwiLFxuXCJyM1Jua3IvMWI1cC9wM05wQjEvM3A0LzFwNi84L1BQUDNQMS8ySzJSMiB3IC0gLSAwIDFcIixcblwiMnIzazEvcDRwMi8xcDJQMXBRLzNiUjJwLzFxNi8xQjYvUFAyUlByMS81SzIgdyAtIC0gMCAxXCIsXG5cIjJyNS8xTnIxa3BScC9wM2IzL04zcDMvMVAzbjIvUDcvNVBQUC9LNlIgYiAtIC0gMCAxXCIsXG5cIjJyNGsvcHBxYnBRMXAvM3AxYnBCLzgvOC8xTnIyUDIvUFBQM1AxLzJLUjNSIHcgLSAtIDAgMVwiLFxuXCJyMWJyMmsxLzRwMWIxL3BxMnBuMi8xcDROMS83US8zQjQvUFBQM1BQL1I0UjFLIHcgLSAtIDAgMVwiLFxuXCIxcjFrcjMvTmJwcG4xcHAvMWI2LzgvNlExLzNCMVAyL1BxM1AxUC8zUlIxSzEgdyAtIC0gMCAxXCIsXG5cIm43L3BrM3BwMS8xclIzcDEvUVAxcHEzLzRuMy82UEIvNFBQMVAvMlIzSzEgdyAtIC0gMCAxXCIsXG5cIjZrMS9wcDRwMS8ycDUvMmJwNC84L1A1UGIvMVAzcnJQLzJCUlJOMUsgYiAtIC0gMCAxXCIsXG5cIjNiMnIxLzVSbjEvMnFQMnBrL3AxcDFCMy8yUDFOMy8xUDNRMi82SzEvOCB3IC0gLSAwIDFcIixcblwiMnIxcmsyLzFwMnFwMVIvNHAxcDEvMWIxcFAxTjEvcDJQNC9uQlAxUTMvUDRQUFAvUjVLMSB3IC0gLSAwIDFcIixcblwiMnIzazEvMXAzcHBwL3AzcDMvN1AvUDRQMi8xUjJRYlAxLzZxMS8xQjJLMyBiIC0gLSAwIDFcIixcblwiazJyM3IvcDNScHBwLzFwNHExLzFQMWI0LzNRMUIyLzZOMS9QUDNQUFAvNksxIHcgLSAtIDAgMVwiLFxuXCI0cmsxci9wMmIxcHAxLzFxNXAvM3BSMW4xLzNOMXAyLzFQMVExUDIvUEJQM1BLLzRSMyB3IC0gLSAwIDFcIixcblwiUjZSLzJrcjQvMXAzcGIxLzNwck4yLzZQMS8yUDJLMi8xUDYvOCB3IC0gLSAwIDFcIixcblwicjVrMS8yUmIzci9wMnAzYi9QMlBwMy80UDFwcS81cDIvMVBRMkIxUC8yUjJCS04gYiAtIC0gMCAxXCIsXG5cIjFrNi81UTIvMlJyMnBwL3BxUDUvMXA2LzdQLzJQM1BLLzRyMyB3IC0gLSAwIDFcIixcblwiMXEycjMvazRwMi9wclEyYjFwL1I3LzFQUDFCMXAxLzZQMS9QNUsxLzggdyAtIC0gMCAxXCIsXG5cIjJrNHIvcHAzcFExLzJxNS8ybjUvOC9OM3BQUDEvUDNyMy9SMVIzSzEgYiAtIC0gMCAxXCIsXG5cIjRyMWsxLzFwM3ExcC9wMXBRNC8yUDFSMXAxLzVuMi8yQjUvUFA1UC82SzEgYiAtIC0gMCAxXCIsXG5cIjRyMWsxL3BSM3BwMS8xbjNQMXAvcTJwNC81TjFQL1AxclFwUDIvOC8yQjJSSzEgdyAtIC0gMCAxXCIsXG5cIjFSNG5yL3AxazFwcGIxLzJwNHAvNFBwMi8zTjFQMUIvOC9xMVAzUFAvM1EySzEgdyAtIC0gMCAxXCIsXG5cIjJSMmJrMS81cnIxL3AzUTJSLzNQcHEyLzFwM3AyLzgvUFAxQjJQUC83SyB3IC0gLSAwIDFcIixcblwiM3Izay9wcDRwMS8zcVFwMXAvUDFwNS83Ui8zck4xUFAvMUIzUDIvNksxIHcgLSAtIDAgMVwiLFxuXCJrcjYvcFI1Ui8xcTFwcDMvOC8xUTYvMlA1L1BLUDUvNXIyIHcgLSAtIDAgMVwiLFxuXCI0cjFrMS81cHBwL3AycDQvNHIzLzFwTm40LzFQNi8xUFBLMlBQL1IzUjMgYiAtIC0gMCAxXCIsXG5cIjdrL3BicDNicC8zcDQvMXA1cS8zbjJwMS81ckIxL1BQMU5yTjFQLzFRMUJSUksxIGIgLSAtIDAgMVwiLFxuXCJyM3IzL3BwcDRwLzJicTJOay84LzFQUDUvUDFCM1ExLzZQUC80UjFLMSB3IC0gLSAwIDFcIixcblwiNHIxazEvM04xcHBwLzNyNC84LzFuM3AxUC81UDIvUFAzSzFQL1JONVIgYiAtIC0gMCAxXCIsXG5cIjRyazIvMnBRMXAyLzJwMkIyLzJQMVAycS8xYjRSMS8xUDYvcjVQUC8yUjNLMSB3IC0gLSAwIDFcIixcblwiM3IyazEvNnBwLzFuUTFSMy8zcjQvM04ycTEvNk4xL240UFBQLzRSMUsxIHcgLSAtIDAgMVwiLFxuXCJiMXIzazEvcHEyYjFyMS8xcDNSMXAvNVEyLzJQNS9QNE4xUC81UFAxLzFCMlIxSzEgdyAtIC0gMCAxXCIsXG5cIjJSMVIxbmsvMXA0cnAvcDFuNS8zTjJwMS8xUDYvMlA1L1A2UC8ySzUgdyAtIC0gMCAxXCIsXG5cIm4zcjFrMS9RNFIxcC9wNXBiLzFwMnAxTjEvMXEyUDMvMVA0UEIvMlAzS1AvOCB3IC0gLSAwIDFcIixcblwiNHIxazEvNXEyL3A1cFEvM2IxcEIxLzJwUDQvMlAzUDEvMVAyUjFQSy84IHcgLSAtIDAgMVwiLFxuXCI2azEvcHAzcDIvMnAybnAxLzJQMXBicXAvUDNQMy8yTjJuUDEvMlByMVAyLzFSUTFSQjFLIGIgLSAtIDAgMVwiLFxuXCIycjNrMS9wYjNwcHAvOC9xUDJiMy84LzFQNi8xUDFSUVBQUC8xSzNCMVIgYiAtIC0gMCAxXCIsXG5cInIzcm4xay80YjFScC9wcDFwMnBCLzNQcDMvUDJxQjFRMS84LzJQM1BQLzVSMUsgdyAtIC0gMCAxXCIsXG5cInJuYjJyMWsvcHAycTJwLzJwMlIyLzgvMkJwM1EvOC9QUFAzUFAvUk40SzEgdyAtIC0gMCAxXCIsXG5cIjNrNC8xcHAzYjEvNGIycC8xcDNxcDEvM1BuMy8yUDFSTjIvcjVQMS8xUTJSMUsxIGIgLSAtIDAgMVwiLFxuXCIya3Izci8xcDNwcHAvcDNwbjIvMmIxQjJxL1ExTjUvMlA1L1BQM1BQUC9SMlIySzEgdyAtIC0gMCAxXCIsXG5cIjVxMWsvcDNSMXJwLzJwcjJwMS8xcE4yYlAxLzNRMVAyLzFCNi9QUDVQLzJLNSB3IC0gLSAwIDFcIixcblwiOC83cC81cGsxLzNuMnBxLzNOMW5SMS8xUDNQMi9QNlAvNFFLMiB3IC0gLSAwIDFcIixcblwiNHIyUi8zcTFrYlIvMXA0cDEvcDFwUDFwUDEvUDFQMlAyL0s1UTEvMVAycDMvOCB3IC0gLSAwIDFcIixcblwicm4zazIvcFIyYjMvNHAxUTEvMnExTjJQLzNSMlAxLzNLNC9QM0JyMi84IHcgLSAtIDAgMVwiLFxuXCIycTUvcDNwMmsvM3BQMXAxLzJyTjJQbi8xcDFRNC83Ui9QUHI1LzFLNVIgdyAtIC0gMCAxXCIsXG5cImI1cjEvMnI1LzJwazQvMk4xUjFwMS8xUDRQMS80SzJwLzRQMlAvUjcgdyAtIC0gMCAxXCIsXG5cIjZrMS9wMXAzcHAvNnExLzNwcjMvM05uMy8xUVAxQjFQYi9QUDNyMVAvUjNSMUsxIGIgLSAtIDAgMVwiLFxuXCI0cjFyMS9wYjFRMmJwLzFwMVJua3AxLzVwMi8yUDFQMy80QlAyL3FQMkIxUFAvMlIzSzEgdyAtIC0gMCAxXCIsXG5cIjFrM3IyLzRSMVExL3AycTFyMi84LzJwMUJiMi81UjIvcFA1UC9LNyB3IC0gLSAwIDFcIixcblwiM3I0LzFwNi8ycDRwLzVrMi9wMVAxbjJQLzNOSzFuTi9QMXI1LzFSMlIzIGIgLSAtIDAgMVwiLFxuXCJyMWIzbnIvcHBwMWtCMXAvM3A0LzgvM1BQQm5iLzFRM3AyL1BQUDJxMi9STjRSSyBiIC0gLSAwIDFcIixcblwiNmsxL3AyclIxcDEvMXAxcjFwMVIvM1A0LzRRUHExLzFQNi9QNVBLLzggdyAtIC0gMCAxXCIsXG5cIjNyMWIxay8xcDNSMi83cC8ycDROL3A0UDIvMkszUjEvUFA2LzNyNCB3IC0gLSAwIDFcIixcblwiOC82UjEvcDJrcDJyL3FiNVAvM3AxTjFRLzFwMVByMy9QUDYvMUs1UiB3IC0gLSAwIDFcIixcblwiOC80azMvUDRSUjEvMmIxcjMvM24yUHAvOC81S1AxLzggYiAtIC0gMCAxXCIsXG5cInIycTFiazEvNW4xcC8ycDNwUC9wNy8zQnIzLzFQM1BRUi9QNVAxLzJLUjQgdyAtIC0gMCAxXCIsXG5cIjFRNi9yM1IycC9rMnAycFAvcDFxNS9QcDRQMS81UDIvMVBQM0sxLzggdyAtIC0gMCAxXCIsXG5cIjZrMS82cHAvcHAxcDNxLzNQNC9QMVEyYjIvMU5OMXIyYi8xUFA0UC82UksgYiAtIC0gMCAxXCIsXG5cIjNyMmsxLzZwMS8zTnAycC8yUDFQMy8xcDJRMVBiLzFQM1IxUC8xcXI1LzVSSzEgdyAtIC0gMCAxXCIsXG5cIjFyMmszLzJwbjFwMi9wMVFiM3AvN3EvM1BQMy8yUDFCTjFiL1BQMU4xUHIxL1JSNUsgYiAtIC0gMCAxXCIsXG5cIjNyMWsxci9wMXEycDIvMXBwMk4xcC9uM1JRMi8zUDQvMnAxUFIyL1BQNFBQLzZLMSB3IC0gLSAwIDFcIixcblwicjNuMlIvcHAybjMvM3Axa3AxLzFxMVBwMU4xLzZQMS8yUDFCUDIvUFA2LzJLUjQgdyAtIC0gMCAxXCIsXG5cIjJSMmJrMS9yNHBwcC8zcHAzLzFCMm4xUDEvM1FQMlAvNVAyLzFQSzUvN3EgdyAtIC0gMCAxXCIsXG5cIjNuYnIyLzRxMnAvcjNwUnBrL3AycFFSTjEvMXBwUDJwMS8yUDUvUFBCNFAvNksxIHcgLSAtIDAgMVwiLFxuXCI3ay9wNWIxLzFwNEJwLzJxMXAxcDEvMVAxbjFyMi9QMlEyTjEvNlAxLzNSMksxIGIgLSAtIDAgMVwiLFxuXCI1azIvcHBxclJCMi8zcjFwMi8ycDJwMi83UC9QMVBQMlAxLzFQMlFQMi82SzEgdyAtIC0gMCAxXCIsXG5cIjRyMy81a3AxLzFOMXA0LzJwUjFxMXAvOC9wUDNQUDEvNksxLzNRcjMgYiAtIC0gMCAxXCIsXG5cIjFrMnIzL3BwNi8zYjQvM1AyUTEvOC82UDEvUFAzcTFQLzJSNEsgYiAtIC0gMCAxXCIsXG5cIjJrcjNyL1I0UTIvMXBxMW4zLzdwLzNSMUIxUC8ycDNQMS8yUDJQMi82SzEgdyAtIC0gMCAxXCIsXG5cIjJycTJrMS8zYmIycC9uMnAycFEvcDJQcDMvMlAxTjFQMS8xUDVQLzZCMS8yQjJSMUsgdyAtIC0gMCAxXCIsXG5cInIycTNrL3BwYjNwcC8ycDFCMy8yUDFSUTIvOC82UDEvUFAxcjNQLzVSSzEgdyAtIC0gMCAxXCIsXG5cIjNrNC8xcDNCcDEvcDVyMS8yYjUvUDNQMU4xLzVQcDEvMVAxcjQvMlI0SyBiIC0gLSAwIDFcIixcblwiazcvNHJwMXAvcDFxM3AxL1ExcjJwMi8xUjYvOC9QNVBQLzFSNUsgdyAtIC0gMCAxXCIsXG5cIjVyazEvMVI0YjEvM3A0LzFQMVA0LzRQcDIvM0IxUG5iL1BxUksxUTIvOCBiIC0gLSAwIDFcIixcblwiN2svMXA0cDEvcDRiMXAvM04zUC8ycDUvMnJiNC9QUDJyMy9LMlIyUjEgYiAtIC0gMCAxXCIsXG5cInIxcWIxcmsxLzNSMXBwMS9wMW5SMnAxLzFwMnAyTi82UTEvMlAxQjMvUFAzUFBQLzZLMSB3IC0gLSAwIDFcIixcblwiM3IxcmsxLzJxUDFwMi9wMlIycHAvNmIxLzZQMS8ycFFSMlAvUDFCMlAyLzZLMSB3IC0gLSAwIDFcIixcblwiMVIyUjMvcDFyMnBrMS8zYjFwcDEvOC8yUHI0LzROMVAxL1A0UEsxLzggdyAtIC0gMCAxXCIsXG5cInIyazJuci9wcDFiMVExcC8ybjRiLzNONC8zcTQvM1A0L1BQUDNQUC80UlIxSyB3IC0gLSAwIDFcIixcblwicjRyazEvM1IzcC8xcTJwUXAxL3A3L1A3LzgvMVA1UC80UksyIHcgLSAtIDAgMVwiLFxuXCJyNmsvMXA1cC8ycDFiMXBCLzdCL3AxUDFxMnIvOC9QNVFQLzNSMlJLIGIgLSAtIDAgMVwiLFxuXCI0cjFrMS8xUjRicC9wQjJwMXAxL1A0cDIvMnIxcFAxUS8yUDRQLzFxNFAxLzNSM0sgdyAtIC0gMCAxXCIsXG5cIjZrMS82cDEvM3IxbjFwL3A0cDFuL1AxTjRQLzJONS9RMlJLMy83cSBiIC0gLSAwIDFcIixcblwiOC8xUjRwcC9rMnJRcDIvMnAyUDIvcDJxMVAyLzFuMXIyUDEvNkJQLzRSMksgdyAtIC0gMCAxXCIsXG5cIjRSMy9wMnIxcTFrLzVCMVAvNlAxLzJwNEsvM2I0LzRRMy84IHcgLSAtIDAgMVwiLFxuXCI0bjMvcDNOMXJrLzVRMi8ycTRwLzJwNS8xUDNQMVAvUDFQMlAyLzZSSyB3IC0gLSAwIDFcIixcblwicnI0UmIvMnBucWIxay9ucDFwMXAxQi8zUHBQMi9wMVAxUDJQLzJOM1IxL1BQMkJQMi8xS1E1IHcgLSAtIDAgMVwiLFxuXCJyMWJxMnJrL3BwMW4xcDFwLzVQMVEvMUIzcDIvM0IzYi9QNVIxLzJQM1BQLzNLM1IgdyAtIC0gMCAxXCIsXG5cInE1azEvMWIyUjFwcC8xcDNuMi80QlEyLzgvN1AvNVBQSy80cjMgdyAtIC0gMCAxXCIsXG5cIjNyNC8xbmIxa3AyL3AxcDJOMi8xcDJwUHIxLzgvMUJQMlAyL1BQMVI0LzJLUjQgdyAtIC0gMCAxXCIsXG5cIjdSLzNRMnAxLzJwMm5rMS9wcDRQMS8zUDJyMS8yUDUvNHEzLzVSMUsgdyAtIC0gMCAxXCIsXG5cIjNxMnIxL3AyYjFrMi8xcG5CcDFOMS8zcDFwUVAvNlAxLzVSMi8ycjJQMi80UksyIHcgLSAtIDAgMVwiLFxuXCJrNy8xcDFycjFwcC9wUjFwMXAyL1ExcHE0L1A3LzgvMlAzUFAvMVI0SzEgdyAtIC0gMCAxXCIsXG5cIjRrYjFyLzFSNi9wMnJwMy8yUTFwMXExLzRwMy8zQjQvUDZQLzRLUjIgdyAtIC0gMCAxXCIsXG5cIjFyM3Ixay9xcDVwLzNONC8zcDJRMS9wNlAvUDcvMWI2LzFLUjNSMSB3IC0gLSAwIDFcIixcblwicjRrcjEvcGJObjFxMXAvMXA2LzJwMkJQUS81QjIvOC9QNlAvYjRSSzEgdyAtIC0gMCAxXCIsXG5cIjNyM2svN3AvcHAyQjFwMS8zTjJQMS9QMnFQUTIvOC8xUHI0UC81UjFLIHcgLSAtIDAgMVwiLFxuXCIzcTFyMi9wYjNwcDEvMXA2LzNwUDFOay8ycjJRMi84L1BuM1BQMS8zUlIxSzEgdyAtIC0gMCAxXCIsXG5cIjFrMXI0L3BwNVIvMnA1L1A1cDEvN2IvNFBxMi8xUFEyUDIvM05LMyBiIC0gLSAwIDFcIixcblwiNlIxLzJrMlAyLzFuNXIvM3AxcDIvM1AzYi8xUVAycDFxLzNSNC82SzEgYiAtIC0gMCAxXCIsXG5cIjFrMXI0LzFwNXAvMVAzcHAxL2I3L1AzSzMvMUIzclAxLzJOMWJQMVAvUlI2IGIgLSAtIDAgMVwiLFxuXCIzcjJrMS8zcTJwMS8xYjNwMXAvNHAzL3AxUjFQMk4vUHI1UC8xUFEzUDEvNVIxSyBiIC0gLSAwIDFcIixcblwiMmIzazEvcjNxMnAvNHAxcEIvcDRyMi80TjMvUDFRNS8xUDRQUC8yUjJSMUsgdyAtIC0gMCAxXCIsXG5cInI1cjEvcDFxMnAxay8xcDFSMnBCLzNwUDMvNmJRLzJwNS9QMVAxTlBQUC82SzEgdyAtIC0gMCAxXCIsXG5cIjFyMXFyYmsxLzNiM3AvcDJwMXBwMS8zTm5QMi8zTjQvMVE0QlAvUFA0UDEvMVIyUjJLIHcgLSAtIDAgMVwiLFxuXCI0YjFrMS8ycjJwMi8xcTFwblBwUS83cC9wM1AyUC9wTjVCL1AxUDUvMUsxUjJSMSB3IC0gLSAwIDFcIixcblwiNHIyay9wcDJxMmIvMnAycDFRLzRyUDIvUDcvMUI1UC8xUDJSMVIxLzdLIHcgLSAtIDAgMVwiLFxuXCIyazUvMWIxcjFSYnAvcDNwMy9CcDRQMS8zcDFRMVAvUDcvMVBQMXEzLzFLNiB3IC0gLSAwIDFcIixcblwiNnJrLzFwcWJicDFwL3AzcDJRLzZSMS80TjFuUC8zQjQvUFBQNS8yS1I0IHcgLSAtIDAgMVwiLFxuXCJyNHJrMS81UmJwL3AxcU4ycDEvUDFuMVAzLzgvMVEzTjFQLzVQUDEvNVJLMSB3IC0gLSAwIDFcIixcblwicjNyMWsxLzdwLzJwUlIxcDEvcDcvMlA1L3FuUTFQMVAxLzZCUC82SzEgdyAtIC0gMCAxXCIsXG5cInI0YjFyL3BwcHEycHAvMm4xYjFrMS8zbjQvMkJwNC81UTIvUFBQMlBQUC9STkIxUjFLMSB3IC0gLSAwIDFcIixcblwiNlIxLzVyMWsvcDZiLzFwQjFwMnEvMVA2LzVyUVAvNVAxSy82UjEgdyAtIC0gMCAxXCIsXG5cInJuM3JrMS8ycXAycHAvcDNQMy8xcDFiNC8zYjQvM0I0L1BQUDFRMVBQL1IxQjJSMUsgdyAtIC0gMCAxXCIsXG5cIjJSM25rLzNyMmIxL3AycHIxUTEvNHBOMi8xUDYvUDZQL3E3L0I0UksxIHcgLSAtIDAgMVwiLFxuXCJyNWsxL3AxcDNicC8xcDFwNC8yUFAycXAvMVA2LzFRMWJQMy9QQjNyUFAvUjJOMlJLIGIgLSAtIDAgMVwiLFxuXCI0azMvcjJibm4xci8xcTJwUjFwL3AycFBwMUIvMnBQMU4xUC9QcFAxQjMvMVA0UTEvNUtSMSB3IC0gLSAwIDFcIixcblwicjFiMmsyLzFwNHBwL3A0TjFyLzRQcDIvUDNwUDFxLzRQMlAvMVAyUTJLLzNSMlIxIHcgLSAtIDAgMVwiLFxuXCIzcjQvcFIyTjMvMnBrYjMvNXAyLzgvMkI1L3FQM1BQUC80UjFLMSB3IC0gLSAwIDFcIixcblwicjFiNHIvMWsyYnBwcC9wMXAxcDMvOC9OcDJuQjIvM1I0L1BQUDFCUFBQLzJLUjQgdyAtIC0gMCAxXCIsXG5cIjJxMnIxay81UXAxLzRwMVAxLzNwNC9yNmIvN1IvNUJQUC81UksxIHcgLSAtIDAgMVwiLFxuXCJRNy8ycjJycGsvMnA0cC83Ti8zUHBOMi8xcDJQMy8xSzRSMS81cTIgdyAtIC0gMCAxXCIsXG5cIjVyMWsvMXE0YnAvM3BCMXAxLzJwUG4xQjEvMXI2LzFwNVIvMVAyUFBRUC9SNUsxIHcgLSAtIDAgMVwiLFxuXCJyMWIyazFyLzJxMWIzL3AzcHBCcC8ybjNCMS8xcDYvMk40US9QUFAzUFAvMktSUjMgdyAtIC0gMCAxXCIsXG5cIjVyMWsvN3AvOC80TlAyLzgvM3AyUjEvMnIzUFAvMm4xUksyIHcgLSAtIDAgMVwiLFxuXCI2cjEvcjVQUi8ycDNSMS8yUGsxbjIvM3A0LzFQMU5QMy80SzMvOCB3IC0gLSAwIDFcIixcblwicjJxNC9wMm5SMWJrLzFwMVBiMnAvNHAycC8zbk4zL0IyQjNQL1BQMVEyUDEvNksxIHcgLSAtIDAgMVwiLFxuXCI1cmsxL3BSNGJwLzZwMS82QjEvNVEyLzRQMy9xMnIxUFBQLzVSSzEgdyAtIC0gMCAxXCIsXG5cIjRucmsxL3JSNXAvNHBucFEvNHAxTjEvMnAxTjMvNlAxL3E0UDFQLzRSMUsxIHcgLSAtIDAgMVwiLFxuXCIxUjFuM2svNnBwLzJOcjQvUDRwMi9yNy84LzRQUEJQLzZLMSBiIC0gLSAwIDFcIixcblwiNnIxLzNwMnFrLzRQMy8xUjVwLzNiMXByUC8zUDJCMS8yUDFRUDIvNlJLIGIgLSAtIDAgMVwiLFxuXCJyNXExL3BwMWIxa3IxLzJwMnAyLzJRNS8yUHBCMy8xUDROUC9QNFAyLzRSSzIgdyAtIC0gMCAxXCIsXG5cInIycjJrMS9wcDJicHBwLzJwMXAzLzRxYjFQLzgvMUJQMUJRMi9QUDNQUDEvMktSM1IgYiAtIC0gMCAxXCIsXG5cIjFyMXJiMy9wMXEycGtwL1BucDJucDEvNHAzLzRQMy9RMU4xQjFQUC8yUFJCUDIvM1IySzEgdyAtIC0gMCAxXCIsXG5cInIyazFyMi8zYjJwcC9wNXAxLzJRMVIzLzFwQjFQcTIvMVA2L1BLUDRQLzdSIHcgLSAtIDAgMVwiLFxuXCJyNWsxL3E0cHBwL3JuUjFwYjIvMVExcDQvMVAxUDQvUDROMVAvMUIzUFAxLzJSM0sxIHcgLSAtIDAgMVwiLFxuXCI1cjFrLzdwL3AyYjQvMXBOcDFwMXEvM1ByMy8yUDJiUDEvUFAxQjNRL1IzUjFLMSBiIC0gLSAwIDFcIixcblwiNWIyLzFwM3Jway9wMWIzUnAvNEIxUlEvM1AxcDFQLzdxLzVQMi82SzEgdyAtIC0gMCAxXCIsXG5cIjNScjJrL3BwNHBiLzJwNHAvMlAxbjMvMVAxUTNQLzRyMXExL1BCNEIxLzVSSzEgYiAtIC0gMCAxXCIsXG5cIlI3LzVwa3AvM04ycDEvMnIzUG4vNXIyLzFQNi9QMVA1LzJLUjQgdyAtIC0gMCAxXCIsXG5cIjFyM2syLzVwMXAvMXFiUnAzLzJyMVBwMi9wcEI0US8xUDYvUDFQNFAvMUsxUjQgdyAtIC0gMCAxXCIsXG5cIjgvMlExUjFiay8zcjNwL3AyTjFwMVAvUDJQNC8xcDNQcTEvMVA0UDEvMUs2IHcgLSAtIDAgMVwiLFxuXCI1cjFrL3IyYjFwMXAvcDRQcDEvMXAyUjMvM3FCUTIvUDcvNlBQLzJSNEsgdyAtIC0gMCAxXCIsXG5cIjNyM2svMXAzUnBwL3Aybm4zLzNONC84LzFQQjFQUTFQL3E0UFAxLzZLMSB3IC0gLSAwIDFcIixcblwiM3Ixa3IxLzgvcDJxMnAxLzFwMlIzLzFRNi84L1BQUDUvMUs0UjEgdyAtIC0gMCAxXCIsXG5cIjRyMmsvMnBiMVIyLzJwNFAvM3ByMU4xLzFwNi83UC9QMVA1LzJLNFIgdyAtIC0gMCAxXCIsXG5cIjNyM2svMWIyYjFwcC8zcHAzL3AzbjFQMS8xcFBxUDJQLzFQMk4yUi9QMVFCMXIyLzJLUjNCIGIgLSAtIDAgMVwiLFxuXTtcbiIsInZhciBDaGVzcyA9IHJlcXVpcmUoJ2NoZXNzLmpzJykuQ2hlc3M7XG52YXIgYyA9IHJlcXVpcmUoJy4vY2hlc3N1dGlscycpO1xuXG52YXIgZm9ya01hcCA9IFtdO1xuZm9ya01hcFsnbiddID0ge1xuICAgIHBpZWNlRW5nbGlzaDogJ0tuaWdodCcsXG4gICAgbWFya2VyOiAn4pmY4pmGJ1xufTtcbmZvcmtNYXBbJ3EnXSA9IHtcbiAgICBwaWVjZUVuZ2xpc2g6ICdRdWVlbicsXG4gICAgbWFya2VyOiAn4pmV4pmGJ1xufTtcbmZvcmtNYXBbJ3AnXSA9IHtcbiAgICBwaWVjZUVuZ2xpc2g6ICdQYXduJyxcbiAgICBtYXJrZXI6ICfimZnimYYnXG59O1xuZm9ya01hcFsnYiddID0ge1xuICAgIHBpZWNlRW5nbGlzaDogJ0Jpc2hvcCcsXG4gICAgbWFya2VyOiAn4pmX4pmGJ1xufTtcbmZvcmtNYXBbJ3InXSA9IHtcbiAgICBwaWVjZUVuZ2xpc2g6ICdSb29rJyxcbiAgICBtYXJrZXI6ICfimZbimYYnXG59O1xuXG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24ocHV6emxlLCBmb3JrVHlwZSkge1xuICAgIHZhciBjaGVzcyA9IG5ldyBDaGVzcygpO1xuICAgIGNoZXNzLmxvYWQocHV6emxlLmZlbik7XG4gICAgYWRkRm9ya3MocHV6emxlLmZlbiwgcHV6emxlLmZlYXR1cmVzLCBmb3JrVHlwZSk7XG4gICAgYWRkRm9ya3MoYy5mZW5Gb3JPdGhlclNpZGUocHV6emxlLmZlbiksIHB1enpsZS5mZWF0dXJlcywgZm9ya1R5cGUpO1xuICAgIHJldHVybiBwdXp6bGU7XG59O1xuXG5mdW5jdGlvbiBhZGRGb3JrcyhmZW4sIGZlYXR1cmVzLCBmb3JrVHlwZSkge1xuXG4gICAgdmFyIGNoZXNzID0gbmV3IENoZXNzKCk7XG4gICAgY2hlc3MubG9hZChmZW4pO1xuXG4gICAgdmFyIG1vdmVzID0gY2hlc3MubW92ZXMoe1xuICAgICAgICB2ZXJib3NlOiB0cnVlXG4gICAgfSk7XG5cbiAgICBtb3ZlcyA9IG1vdmVzLm1hcChtID0+IGVucmljaE1vdmVXaXRoRm9ya0NhcHR1cmVzKGZlbiwgbSkpO1xuICAgIG1vdmVzID0gbW92ZXMuZmlsdGVyKG0gPT4gbS5jYXB0dXJlcy5sZW5ndGggPj0gMik7XG5cbiAgICBpZiAoIWZvcmtUeXBlIHx8IGZvcmtUeXBlID09ICdxJykge1xuICAgICAgICBhZGRGb3Jrc0J5KG1vdmVzLCAncScsIGNoZXNzLnR1cm4oKSwgZmVhdHVyZXMpO1xuICAgIH1cbiAgICBpZiAoIWZvcmtUeXBlIHx8IGZvcmtUeXBlID09ICdwJykge1xuICAgICAgICBhZGRGb3Jrc0J5KG1vdmVzLCAncCcsIGNoZXNzLnR1cm4oKSwgZmVhdHVyZXMpO1xuICAgIH1cbiAgICBpZiAoIWZvcmtUeXBlIHx8IGZvcmtUeXBlID09ICdyJykge1xuICAgICAgICBhZGRGb3Jrc0J5KG1vdmVzLCAncicsIGNoZXNzLnR1cm4oKSwgZmVhdHVyZXMpO1xuICAgIH1cbiAgICBpZiAoIWZvcmtUeXBlIHx8IGZvcmtUeXBlID09ICdiJykge1xuICAgICAgICBhZGRGb3Jrc0J5KG1vdmVzLCAnYicsIGNoZXNzLnR1cm4oKSwgZmVhdHVyZXMpO1xuICAgIH1cbiAgICBpZiAoIWZvcmtUeXBlIHx8IGZvcmtUeXBlID09ICduJykge1xuICAgICAgICBhZGRGb3Jrc0J5KG1vdmVzLCAnbicsIGNoZXNzLnR1cm4oKSwgZmVhdHVyZXMpO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gZW5yaWNoTW92ZVdpdGhGb3JrQ2FwdHVyZXMoZmVuLCBtb3ZlKSB7XG4gICAgdmFyIGNoZXNzID0gbmV3IENoZXNzKCk7XG4gICAgY2hlc3MubG9hZChmZW4pO1xuXG4gICAgdmFyIGtpbmdzU2lkZSA9IGNoZXNzLnR1cm4oKTtcbiAgICB2YXIga2luZyA9IGMua2luZ3NTcXVhcmUoZmVuLCBraW5nc1NpZGUpO1xuXG4gICAgY2hlc3MubW92ZShtb3ZlKTtcblxuICAgIC8vIHJlcGxhY2UgbW92aW5nIHNpZGVzIGtpbmcgd2l0aCBhIHBhd24gdG8gYXZvaWQgcGlubmVkIHN0YXRlIHJlZHVjaW5nIGJyYW5jaGVzIG9uIGZvcmtcblxuICAgIGNoZXNzLnJlbW92ZShraW5nKTtcbiAgICBjaGVzcy5wdXQoe1xuICAgICAgICB0eXBlOiAncCcsXG4gICAgICAgIGNvbG9yOiBraW5nc1NpZGVcbiAgICB9LCBraW5nKTtcblxuICAgIHZhciBzYW1lU2lkZXNUdXJuRmVuID0gYy5mZW5Gb3JPdGhlclNpZGUoY2hlc3MuZmVuKCkpO1xuXG4gICAgdmFyIHBpZWNlTW92ZXMgPSBjLm1vdmVzT2ZQaWVjZU9uKHNhbWVTaWRlc1R1cm5GZW4sIG1vdmUudG8pO1xuICAgIHZhciBjYXB0dXJlcyA9IHBpZWNlTW92ZXMuZmlsdGVyKGNhcHR1cmVzTWFqb3JQaWVjZSk7XG5cbiAgICBtb3ZlLmNhcHR1cmVzID0gdW5pcVRvKGNhcHR1cmVzKTtcbiAgICByZXR1cm4gbW92ZTtcbn1cblxuZnVuY3Rpb24gdW5pcVRvKG1vdmVzKSB7XG4gICAgdmFyIGRlc3RzID0gW107XG4gICAgcmV0dXJuIG1vdmVzLmZpbHRlcihtID0+IHtcbiAgICAgICAgaWYgKGRlc3RzLmluZGV4T2YobS50bykgIT0gLTEpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBkZXN0cy5wdXNoKG0udG8pO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9KTtcbn1cblxuZnVuY3Rpb24gY2FwdHVyZXNNYWpvclBpZWNlKG1vdmUpIHtcbiAgICByZXR1cm4gbW92ZS5jYXB0dXJlZCAmJiBtb3ZlLmNhcHR1cmVkICE9PSAncCc7XG59XG5cbmZ1bmN0aW9uIGRpYWdyYW0obW92ZSkge1xuICAgIHZhciBtYWluID0gW3tcbiAgICAgICAgb3JpZzogbW92ZS5mcm9tLFxuICAgICAgICBkZXN0OiBtb3ZlLnRvLFxuICAgICAgICBicnVzaDogJ3BhbGVCbHVlJ1xuICAgIH1dO1xuICAgIHZhciBmb3JrcyA9IG1vdmUuY2FwdHVyZXMubWFwKG0gPT4ge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgb3JpZzogbW92ZS50byxcbiAgICAgICAgICAgIGRlc3Q6IG0udG8sXG4gICAgICAgICAgICBicnVzaDogbS5jYXB0dXJlZCA9PT0gJ2snID8gJ3JlZCcgOiAnYmx1ZSdcbiAgICAgICAgfTtcbiAgICB9KTtcbiAgICByZXR1cm4gbWFpbi5jb25jYXQoZm9ya3MpO1xufVxuXG5mdW5jdGlvbiBhZGRGb3Jrc0J5KG1vdmVzLCBwaWVjZSwgc2lkZSwgZmVhdHVyZXMpIHtcbiAgICB2YXIgYnlwaWVjZSA9IG1vdmVzLmZpbHRlcihtID0+IG0ucGllY2UgPT09IHBpZWNlKTtcbiAgICBpZiAocGllY2UgPT09ICdwJykge1xuICAgICAgICBieXBpZWNlID0gYnlwaWVjZS5maWx0ZXIobSA9PiAhbS5wcm9tb3Rpb24pO1xuICAgIH1cbiAgICBmZWF0dXJlcy5wdXNoKHtcbiAgICAgICAgZGVzY3JpcHRpb246IGZvcmtNYXBbcGllY2VdLnBpZWNlRW5nbGlzaCArIFwiIGZvcmtzXCIsXG4gICAgICAgIHNpZGU6IHNpZGUsXG4gICAgICAgIHRhcmdldHM6IGJ5cGllY2UubWFwKG0gPT4ge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICB0YXJnZXQ6IG0udG8sXG4gICAgICAgICAgICAgICAgZGlhZ3JhbTogZGlhZ3JhbShtKSxcbiAgICAgICAgICAgICAgICBtYXJrZXI6IGZvcmtNYXBbcGllY2VdLm1hcmtlclxuICAgICAgICAgICAgfTtcbiAgICAgICAgfSlcbiAgICB9KTtcbn1cbiIsInZhciBjID0gcmVxdWlyZSgnLi9jaGVzc3V0aWxzJyk7XG52YXIgZm9ya3MgPSByZXF1aXJlKCcuL2ZvcmtzJyk7XG52YXIga25pZ2h0Zm9ya2ZlbnMgPSByZXF1aXJlKCcuL2ZlbnMva25pZ2h0Zm9ya3MnKTtcbnZhciBxdWVlbmZvcmtmZW5zID0gcmVxdWlyZSgnLi9mZW5zL3F1ZWVuZm9ya3MnKTtcbnZhciBwYXduZm9ya2ZlbnMgPSByZXF1aXJlKCcuL2ZlbnMvcGF3bmZvcmtzJyk7XG52YXIgcm9va2ZvcmtmZW5zID0gcmVxdWlyZSgnLi9mZW5zL3Jvb2tmb3JrcycpO1xudmFyIGJpc2hvcGZvcmtmZW5zID0gcmVxdWlyZSgnLi9mZW5zL2Jpc2hvcGZvcmtzJyk7XG52YXIgcGluZmVucyA9IHJlcXVpcmUoJy4vZmVucy9waW5zJyk7XG52YXIgcGluID0gcmVxdWlyZSgnLi9waW5zJyk7XG52YXIgaGlkZGVuID0gcmVxdWlyZSgnLi9oaWRkZW4nKTtcbnZhciBsb29zZSA9IHJlcXVpcmUoJy4vbG9vc2UnKTtcbnZhciBpbW1vYmlsZSA9IHJlcXVpcmUoJy4vaW1tb2JpbGUnKTtcbnZhciBtYXRldGhyZWF0ID0gcmVxdWlyZSgnLi9tYXRldGhyZWF0Jyk7XG52YXIgY2hlY2tzID0gcmVxdWlyZSgnLi9jaGVja3MnKTtcblxuLyoqXG4gKiBGZWF0dXJlIG1hcCBcbiAqL1xudmFyIGZlYXR1cmVNYXAgPSBbe1xuICAgIGRlc2NyaXB0aW9uOiBcIktuaWdodCBmb3Jrc1wiLFxuICAgIGZ1bGxEZXNjcmlwdGlvbjogXCJTcXVhcmVzIGZyb20gd2hlcmUgYSBrbmlnaHQgY2FuIG1vdmUgYW5kIGZvcmsgdHdvIHBpZWNlcyAobm90IHBhd25zKS5cIixcbiAgICBkYXRhOiBrbmlnaHRmb3JrZmVucyxcbiAgICBleHRyYWN0OiBmdW5jdGlvbihwdXp6bGUpIHtcbiAgICAgIHJldHVybiBmb3JrcyhwdXp6bGUsICduJyk7XG4gICAgfVxuICB9LCB7XG4gICAgZGVzY3JpcHRpb246IFwiUXVlZW4gZm9ya3NcIixcbiAgICBmdWxsRGVzY3JpcHRpb246IFwiU3F1YXJlcyBmcm9tIHdoZXJlIGEgcXVlZW4gY2FuIG1vdmUgYW5kIGZvcmsgdHdvIHBpZWNlcyAobm90IHBhd25zKS5cIixcbiAgICBkYXRhOiBxdWVlbmZvcmtmZW5zLFxuICAgIGV4dHJhY3Q6IGZ1bmN0aW9uKHB1enpsZSkge1xuICAgICAgcmV0dXJuIGZvcmtzKHB1enpsZSwgJ3EnKTtcbiAgICB9XG4gIH0sIHtcbiAgICBkZXNjcmlwdGlvbjogXCJQYXduIGZvcmtzXCIsXG4gICAgZnVsbERlc2NyaXB0aW9uOiBcIlNxdWFyZXMgZnJvbSB3aGVyZSBhIHBhd24gY2FuIG1vdmUgYW5kIGZvcmsgdHdvIHBpZWNlcyAobm90IHBhd25zKS5cIixcbiAgICBkYXRhOiBwYXduZm9ya2ZlbnMsXG4gICAgZXh0cmFjdDogZnVuY3Rpb24ocHV6emxlKSB7XG4gICAgICByZXR1cm4gZm9ya3MocHV6emxlLCAncCcpO1xuICAgIH1cbiAgfSwge1xuICAgIGRlc2NyaXB0aW9uOiBcIlJvb2sgZm9ya3NcIixcbiAgICBmdWxsRGVzY3JpcHRpb246IFwiU3F1YXJlcyBmcm9tIHdoZXJlIGEgcm9vayBjYW4gbW92ZSBhbmQgZm9yayB0d28gcGllY2VzIChub3QgcGF3bnMpLlwiLFxuICAgIGRhdGE6IHJvb2tmb3JrZmVucyxcbiAgICBleHRyYWN0OiBmdW5jdGlvbihwdXp6bGUpIHtcbiAgICAgIHJldHVybiBmb3JrcyhwdXp6bGUsICdyJyk7XG4gICAgfVxuICB9LCB7XG4gICAgZGVzY3JpcHRpb246IFwiQmlzaG9wIGZvcmtzXCIsXG4gICAgZnVsbERlc2NyaXB0aW9uOiBcIlNxdWFyZXMgZnJvbSB3aGVyZSBhIGJpc2hvcCBjYW4gbW92ZSBhbmQgZm9yayB0d28gcGllY2VzIChub3QgcGF3bnMpLlwiLFxuICAgIGRhdGE6IGJpc2hvcGZvcmtmZW5zLFxuICAgIGV4dHJhY3Q6IGZ1bmN0aW9uKHB1enpsZSkge1xuICAgICAgcmV0dXJuIGZvcmtzKHB1enpsZSwgJ2InKTtcbiAgICB9XG4gIH0sIHtcbiAgICBkZXNjcmlwdGlvbjogXCJMb29zZSBwaWVjZXNcIixcbiAgICBmdWxsRGVzY3JpcHRpb246IFwiUGllY2VzIHRoYXQgYXJlIG5vdCBwcm90ZWN0ZWQgYnkgYW55IHBpZWNlIG9mIHRoZSBzYW1lIGNvbG91ci5cIixcbiAgICBkYXRhOiBrbmlnaHRmb3JrZmVucyxcbiAgICBleHRyYWN0OiBmdW5jdGlvbihwdXp6bGUpIHtcbiAgICAgIHJldHVybiBsb29zZShwdXp6bGUpO1xuICAgIH1cbiAgfSwge1xuICAgIGRlc2NyaXB0aW9uOiBcIkNoZWNraW5nIHNxdWFyZXNcIixcbiAgICBmdWxsRGVzY3JpcHRpb246IFwiU3F1YXJlcyBmcm9tIHdoZXJlIGNoZWNrIGNhbiBiZSBkZWxpdmVyZWQuXCIsXG4gICAgZGF0YToga25pZ2h0Zm9ya2ZlbnMsXG4gICAgZXh0cmFjdDogZnVuY3Rpb24ocHV6emxlKSB7XG4gICAgICByZXR1cm4gY2hlY2tzKHB1enpsZSk7XG4gICAgfVxuICB9LCB7XG4gICAgZGVzY3JpcHRpb246IFwiSGlkZGVuIGF0dGFja2Vyc1wiLFxuICAgIGZ1bGxEZXNjcmlwdGlvbjogXCJQaWVjZXMgdGhhdCB3aWxsIGF0dGFjayBhbiBvcHBvbmVudHMgcGllY2UgKGJ1dCBub3QgcGF3bikgaWYgYW4gaW50ZXJ2aWVuaW5nIHBpZWNlIG9mIHRoZSBzYW1lIGNvbG91ciBtb3Zlcy5cIixcbiAgICBkYXRhOiBrbmlnaHRmb3JrZmVucyxcbiAgICBleHRyYWN0OiBmdW5jdGlvbihwdXp6bGUpIHtcbiAgICAgIHJldHVybiBoaWRkZW4ocHV6emxlKTtcbiAgICB9XG4gIH0sIHtcbiAgICBkZXNjcmlwdGlvbjogXCJQaW5zIGFuZCBTa2V3ZXJzXCIsXG4gICAgZnVsbERlc2NyaXB0aW9uOiBcIlBpZWNlcyB0aGF0IGFyZSBwaW5uZWQgb3Igc2tld2VyZWQgdG8gYSBwaWVjZSAoYnV0IG5vdCBwYXduKSBvZiB0aGUgc2FtZSBjb2xvdXIuXCIsXG4gICAgZGF0YTogcGluZmVucyxcbiAgICBleHRyYWN0OiBmdW5jdGlvbihwdXp6bGUpIHtcbiAgICAgIHJldHVybiBwaW4ocHV6emxlKTtcbiAgICB9XG4gIH0sIHtcbiAgICBkZXNjcmlwdGlvbjogXCJMb3cgbW9iaWxpdHkgcGllY2VzXCIsXG4gICAgZnVsbERlc2NyaXB0aW9uOiBcIlBpZWNlcyB0aGF0IGhhdmUgcmVkdWNlZCBtb2JpbGl0eS4gaS5lLiBQYXducyB0aGF0IGFyZSBpbW1vYmlsZSwga25pZ2h0cyB3aXRoIG9ubHkgMSBsZWdhbCBtb3ZlLCBiaXNob3BzIHdpdGggbm8gbW9yZSB0aGFuIDMgbGVnYWwgbW92ZXMsIHJvb2tzIHdpdGggbm8gbW9yZSB0aGFuIDYgbGVnYWwgbW92ZXMsIHF1ZWVucyB3aXRoIG5vIG1vcmUgdGhhbiAxMCBsZWdhbCBtb3ZlcyBhbmQgdGhlIGtpbmcgd2l0aCBubyBtb3JlIHRoYW4gMiBsZWdhbCBtb3Zlcy5cIixcbiAgICBkYXRhOiBrbmlnaHRmb3JrZmVucyxcbiAgICBleHRyYWN0OiBmdW5jdGlvbihwdXp6bGUpIHtcbiAgICAgIHJldHVybiBpbW1vYmlsZShwdXp6bGUpO1xuICAgIH1cbiAgfSwge1xuICAgIGRlc2NyaXB0aW9uOiBcIk1peGVkXCIsXG4gICAgZnVsbERlc2NyaXB0aW9uOiBcIlVzZSB0aGUgaWNvbnMgdG8gZGV0ZXJtaW5lIHdoaWNoIGZlYXR1cmUgdG8gZmluZC5cIixcbiAgICBkYXRhOiBudWxsLFxuICAgIGV4dHJhY3Q6IG51bGxcbiAgfVxuXG5cbl07XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuXG4gIC8qKlxuICAgKiBDYWxjdWxhdGUgYWxsIGZlYXR1cmVzIGluIHRoZSBwb3NpdGlvbi5cbiAgICovXG4gIGV4dHJhY3RGZWF0dXJlczogZnVuY3Rpb24oZmVuKSB7XG4gICAgdmFyIHB1enpsZSA9IHtcbiAgICAgIGZlbjogYy5yZXBhaXJGZW4oZmVuKSxcbiAgICAgIGZlYXR1cmVzOiBbXVxuICAgIH07XG5cbiAgICBwdXp6bGUgPSBmb3JrcyhwdXp6bGUpO1xuICAgIHB1enpsZSA9IGhpZGRlbihwdXp6bGUpO1xuICAgIHB1enpsZSA9IGxvb3NlKHB1enpsZSk7XG4gICAgcHV6emxlID0gcGluKHB1enpsZSk7XG4gICAgcHV6emxlID0gbWF0ZXRocmVhdChwdXp6bGUpO1xuICAgIHB1enpsZSA9IGNoZWNrcyhwdXp6bGUpO1xuICAgIHB1enpsZSA9IGltbW9iaWxlKHB1enpsZSk7XG5cbiAgICByZXR1cm4gcHV6emxlLmZlYXR1cmVzO1xuICB9LFxuXG5cbiAgZmVhdHVyZU1hcDogZmVhdHVyZU1hcCxcblxuICAvKipcbiAgICogQ2FsY3VsYXRlIHNpbmdsZSBmZWF0dXJlcyBpbiB0aGUgcG9zaXRpb24uXG4gICAqL1xuICBleHRyYWN0U2luZ2xlRmVhdHVyZTogZnVuY3Rpb24oZmVhdHVyZURlc2NyaXB0aW9uLCBmZW4pIHtcbiAgICB2YXIgcHV6emxlID0ge1xuICAgICAgZmVuOiBjLnJlcGFpckZlbihmZW4pLFxuICAgICAgZmVhdHVyZXM6IFtdXG4gICAgfTtcblxuICAgIGZlYXR1cmVNYXAuZm9yRWFjaChmID0+IHtcbiAgICAgIGlmIChmZWF0dXJlRGVzY3JpcHRpb24gPT09IGYuZGVzY3JpcHRpb24pIHtcbiAgICAgICAgcHV6emxlID0gZi5leHRyYWN0KHB1enpsZSk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICByZXR1cm4gcHV6emxlLmZlYXR1cmVzO1xuICB9LFxuXG4gIGZlYXR1cmVGb3VuZDogZnVuY3Rpb24oZmVhdHVyZXMsIHRhcmdldCkge1xuICAgIHZhciBmb3VuZCA9IDA7XG4gICAgZmVhdHVyZXNcbiAgICAgIC5mb3JFYWNoKGYgPT4ge1xuICAgICAgICBmLnRhcmdldHMuZm9yRWFjaCh0ID0+IHtcbiAgICAgICAgICBpZiAodC50YXJnZXQgPT09IHRhcmdldCkge1xuICAgICAgICAgICAgZm91bmQrKztcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgcmV0dXJuIGZvdW5kO1xuICB9LFxuXG4gIGFsbEZlYXR1cmVzRm91bmQ6IGZ1bmN0aW9uKGZlYXR1cmVzKSB7XG4gICAgdmFyIGZvdW5kID0gdHJ1ZTtcbiAgICBmZWF0dXJlc1xuICAgICAgLmZvckVhY2goZiA9PiB7XG4gICAgICAgIGYudGFyZ2V0cy5mb3JFYWNoKHQgPT4ge1xuICAgICAgICAgIGlmICghdC5zZWxlY3RlZCkge1xuICAgICAgICAgICAgZm91bmQgPSBmYWxzZTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgcmV0dXJuIGZvdW5kO1xuICB9LFxuXG4gIHJhbmRvbUZlYXR1cmU6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBmZWF0dXJlTWFwW01hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIChmZWF0dXJlTWFwLmxlbmd0aCAtIDEpKV0uZGVzY3JpcHRpb247XG4gIH0sXG5cbiAgcmFuZG9tRmVuRm9yRmVhdHVyZTogZnVuY3Rpb24oZmVhdHVyZURlc2NyaXB0aW9uKSB7XG4gICAgdmFyIGZlbnMgPSBmZWF0dXJlTWFwLmZpbmQoZiA9PiBmLmRlc2NyaXB0aW9uID09PSBmZWF0dXJlRGVzY3JpcHRpb24pLmRhdGE7XG4gICAgcmV0dXJuIGZlbnNbTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogZmVucy5sZW5ndGgpXTtcbiAgfSxcblxufTtcbiIsInZhciBDaGVzcyA9IHJlcXVpcmUoJ2NoZXNzLmpzJykuQ2hlc3M7XG52YXIgYyA9IHJlcXVpcmUoJy4vY2hlc3N1dGlscycpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKHB1enpsZSkge1xuICAgIGluc3BlY3RBbGlnbmVkKHB1enpsZS5mZW4sIHB1enpsZS5mZWF0dXJlcyk7XG4gICAgaW5zcGVjdEFsaWduZWQoYy5mZW5Gb3JPdGhlclNpZGUocHV6emxlLmZlbiksIHB1enpsZS5mZWF0dXJlcyk7XG4gICAgcmV0dXJuIHB1enpsZTtcbn07XG5cbmZ1bmN0aW9uIGluc3BlY3RBbGlnbmVkKGZlbiwgZmVhdHVyZXMpIHtcbiAgICB2YXIgY2hlc3MgPSBuZXcgQ2hlc3MoZmVuKTtcblxuICAgIHZhciBtb3ZlcyA9IGNoZXNzLm1vdmVzKHtcbiAgICAgICAgdmVyYm9zZTogdHJ1ZVxuICAgIH0pO1xuXG4gICAgdmFyIHBpZWNlcyA9IGMubWFqb3JQaWVjZXNGb3JDb2xvdXIoZmVuLCBjaGVzcy50dXJuKCkpO1xuICAgIHZhciBvcHBvbmVudHNQaWVjZXMgPSBjLm1ham9yUGllY2VzRm9yQ29sb3VyKGZlbiwgY2hlc3MudHVybigpID09ICd3JyA/ICdiJyA6ICd3Jyk7XG5cbiAgICB2YXIgcG90ZW50aWFsQ2FwdHVyZXMgPSBbXTtcbiAgICBwaWVjZXMuZm9yRWFjaChmcm9tID0+IHtcbiAgICAgICAgdmFyIHR5cGUgPSBjaGVzcy5nZXQoZnJvbSkudHlwZTtcbiAgICAgICAgaWYgKCh0eXBlICE9PSAnaycpICYmICh0eXBlICE9PSAnbicpKSB7XG4gICAgICAgICAgICBvcHBvbmVudHNQaWVjZXMuZm9yRWFjaCh0byA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKGMuY2FuQ2FwdHVyZShmcm9tLCBjaGVzcy5nZXQoZnJvbSksIHRvLCBjaGVzcy5nZXQodG8pKSkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgYXZhaWxhYmxlT25Cb2FyZCA9IG1vdmVzLmZpbHRlcihtID0+IG0uZnJvbSA9PT0gZnJvbSAmJiBtLnRvID09PSB0byk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChhdmFpbGFibGVPbkJvYXJkLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcG90ZW50aWFsQ2FwdHVyZXMucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYXR0YWNrZXI6IGZyb20sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYXR0YWNrZWQ6IHRvXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICBhZGRIaWRkZW5BdHRhY2tlcnMoZmVuLCBmZWF0dXJlcywgcG90ZW50aWFsQ2FwdHVyZXMpO1xufVxuXG5mdW5jdGlvbiBhZGRIaWRkZW5BdHRhY2tlcnMoZmVuLCBmZWF0dXJlcywgcG90ZW50aWFsQ2FwdHVyZXMpIHtcbiAgICB2YXIgY2hlc3MgPSBuZXcgQ2hlc3MoZmVuKTtcbiAgICB2YXIgdGFyZ2V0cyA9IFtdO1xuICAgIHBvdGVudGlhbENhcHR1cmVzLmZvckVhY2gocGFpciA9PiB7XG4gICAgICAgIHZhciByZXZlYWxpbmdNb3ZlcyA9IGMubW92ZXNUaGF0UmVzdWx0SW5DYXB0dXJlVGhyZWF0KGZlbiwgcGFpci5hdHRhY2tlciwgcGFpci5hdHRhY2tlZCwgdHJ1ZSk7XG4gICAgICAgIGlmIChyZXZlYWxpbmdNb3Zlcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICB0YXJnZXRzLnB1c2goe1xuICAgICAgICAgICAgICAgIHRhcmdldDogcGFpci5hdHRhY2tlcixcbiAgICAgICAgICAgICAgICBtYXJrZXI6ICfipYcnLFxuICAgICAgICAgICAgICAgIGRpYWdyYW06IGRpYWdyYW0ocGFpci5hdHRhY2tlciwgcGFpci5hdHRhY2tlZCwgcmV2ZWFsaW5nTW92ZXMpXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgZmVhdHVyZXMucHVzaCh7XG4gICAgICAgIGRlc2NyaXB0aW9uOiBcIkhpZGRlbiBhdHRhY2tlclwiLFxuICAgICAgICBzaWRlOiBjaGVzcy50dXJuKCksXG4gICAgICAgIHRhcmdldHM6IHRhcmdldHNcbiAgICB9KTtcblxufVxuXG5cbmZ1bmN0aW9uIGRpYWdyYW0oZnJvbSwgdG8sIHJldmVhbGluZ01vdmVzKSB7XG4gICAgdmFyIG1haW4gPSBbe1xuICAgICAgICBvcmlnOiBmcm9tLFxuICAgICAgICBkZXN0OiB0byxcbiAgICAgICAgYnJ1c2g6ICdyZWQnXG4gICAgfV07XG4gICAgdmFyIHJldmVhbHMgPSByZXZlYWxpbmdNb3Zlcy5tYXAobSA9PiB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBvcmlnOiBtLmZyb20sXG4gICAgICAgICAgICBkZXN0OiBtLnRvLFxuICAgICAgICAgICAgYnJ1c2g6ICdwYWxlQmx1ZSdcbiAgICAgICAgfTtcbiAgICB9KTtcbiAgICByZXR1cm4gbWFpbi5jb25jYXQocmV2ZWFscyk7XG59XG4iLCJ2YXIgQ2hlc3MgPSByZXF1aXJlKCdjaGVzcy5qcycpLkNoZXNzO1xudmFyIGMgPSByZXF1aXJlKCcuL2NoZXNzdXRpbHMnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihwdXp6bGUpIHtcbiAgICBhZGRMb3dNb2JpbGl0eShwdXp6bGUuZmVuLCBwdXp6bGUuZmVhdHVyZXMpO1xuICAgIGFkZExvd01vYmlsaXR5KGMuZmVuRm9yT3RoZXJTaWRlKHB1enpsZS5mZW4pLCBwdXp6bGUuZmVhdHVyZXMpO1xuICAgIHJldHVybiBwdXp6bGU7XG59O1xuXG52YXIgbW9iaWxpdHlNYXAgPSB7fTtcbm1vYmlsaXR5TWFwWydwJ10gPSAxO1xubW9iaWxpdHlNYXBbJ24nXSA9IDI7XG5tb2JpbGl0eU1hcFsnYiddID0gNDtcbm1vYmlsaXR5TWFwWydyJ10gPSA3O1xubW9iaWxpdHlNYXBbJ3EnXSA9IDExO1xubW9iaWxpdHlNYXBbJ2snXSA9IDI7XG5cbmZ1bmN0aW9uIGFkZExvd01vYmlsaXR5KGZlbiwgZmVhdHVyZXMpIHtcbiAgICB2YXIgY2hlc3MgPSBuZXcgQ2hlc3MoZmVuKTtcbiAgICB2YXIgcGllY2VzID0gYy5hbGxQaWVjZXNGb3JDb2xvdXIoZmVuLCBjaGVzcy50dXJuKCkpO1xuXG4gICAgcGllY2VzID0gcGllY2VzLm1hcChzcXVhcmUgPT4ge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgc3F1YXJlOiBzcXVhcmUsXG4gICAgICAgICAgICB0eXBlOiBjaGVzcy5nZXQoc3F1YXJlKS50eXBlLFxuICAgICAgICAgICAgbW92ZXM6IGNoZXNzLm1vdmVzKHtcbiAgICAgICAgICAgICAgICB2ZXJib3NlOiB0cnVlLFxuICAgICAgICAgICAgICAgIHNxdWFyZTogc3F1YXJlXG4gICAgICAgICAgICB9KVxuICAgICAgICB9O1xuICAgIH0pO1xuXG4gICAgcGllY2VzID0gcGllY2VzLmZpbHRlcihtID0+IG0ubW92ZXMubGVuZ3RoIDwgbW9iaWxpdHlNYXBbbS50eXBlXSk7XG5cbiAgICBmZWF0dXJlcy5wdXNoKHtcbiAgICAgICAgZGVzY3JpcHRpb246IFwiTG93IG1vYmlsaXR5XCIsXG4gICAgICAgIHNpZGU6IGNoZXNzLnR1cm4oKSxcbiAgICAgICAgdGFyZ2V0czogcGllY2VzLm1hcCh0ID0+IHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgdGFyZ2V0OiB0LnNxdWFyZSxcbiAgICAgICAgICAgICAgICBtYXJrZXI6ICfip4AnLFxuICAgICAgICAgICAgICAgIGRpYWdyYW06IFt7XG4gICAgICAgICAgICAgICAgICAgIG9yaWc6IHQuc3F1YXJlLFxuICAgICAgICAgICAgICAgICAgICBicnVzaDogJ3llbGxvdydcbiAgICAgICAgICAgICAgICB9XVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfSlcbiAgICB9KTtcbn1cbiIsInZhciBDaGVzcyA9IHJlcXVpcmUoJ2NoZXNzLmpzJykuQ2hlc3M7XG52YXIgYyA9IHJlcXVpcmUoJy4vY2hlc3N1dGlscycpO1xuXG5cblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihwdXp6bGUpIHtcbiAgICB2YXIgY2hlc3MgPSBuZXcgQ2hlc3MoKTtcbiAgICBhZGRMb29zZVBpZWNlcyhwdXp6bGUuZmVuLCBwdXp6bGUuZmVhdHVyZXMpO1xuICAgIGFkZExvb3NlUGllY2VzKGMuZmVuRm9yT3RoZXJTaWRlKHB1enpsZS5mZW4pLCBwdXp6bGUuZmVhdHVyZXMpO1xuICAgIHJldHVybiBwdXp6bGU7XG59O1xuXG5mdW5jdGlvbiBhZGRMb29zZVBpZWNlcyhmZW4sIGZlYXR1cmVzKSB7XG4gICAgdmFyIGNoZXNzID0gbmV3IENoZXNzKCk7XG4gICAgY2hlc3MubG9hZChmZW4pO1xuICAgIHZhciBraW5nID0gYy5raW5nc1NxdWFyZShmZW4sIGNoZXNzLnR1cm4oKSk7XG4gICAgdmFyIG9wcG9uZW50ID0gY2hlc3MudHVybigpID09PSAndycgPyAnYicgOiAndyc7XG4gICAgdmFyIHBpZWNlcyA9IGMucGllY2VzRm9yQ29sb3VyKGZlbiwgb3Bwb25lbnQpO1xuICAgIHBpZWNlcyA9IHBpZWNlcy5maWx0ZXIoc3F1YXJlID0+ICFjLmlzQ2hlY2tBZnRlclBsYWNpbmdLaW5nQXRTcXVhcmUoZmVuLCBraW5nLCBzcXVhcmUpKTtcbiAgICBmZWF0dXJlcy5wdXNoKHtcbiAgICAgICAgZGVzY3JpcHRpb246IFwiTG9vc2UgcGllY2VzXCIsXG4gICAgICAgIHNpZGU6IG9wcG9uZW50LFxuICAgICAgICB0YXJnZXRzOiBwaWVjZXMubWFwKHQgPT4ge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICB0YXJnZXQ6IHQsXG4gICAgICAgICAgICAgICAgbWFya2VyOiAn4pquJyxcbiAgICAgICAgICAgICAgICBkaWFncmFtOiBbe1xuICAgICAgICAgICAgICAgICAgICBvcmlnOiB0LFxuICAgICAgICAgICAgICAgICAgICBicnVzaDogJ3llbGxvdydcbiAgICAgICAgICAgICAgICB9XVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfSlcbiAgICB9KTtcbn1cbiIsInZhciBDaGVzcyA9IHJlcXVpcmUoJ2NoZXNzLmpzJykuQ2hlc3M7XG52YXIgYyA9IHJlcXVpcmUoJy4vY2hlc3N1dGlscycpO1xuXG5cblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihwdXp6bGUpIHtcbiAgICB2YXIgY2hlc3MgPSBuZXcgQ2hlc3MoKTtcbiAgICBjaGVzcy5sb2FkKHB1enpsZS5mZW4pO1xuICAgIGFkZE1hdGVJbk9uZVRocmVhdHMocHV6emxlLmZlbiwgcHV6emxlLmZlYXR1cmVzKTtcbiAgICBhZGRNYXRlSW5PbmVUaHJlYXRzKGMuZmVuRm9yT3RoZXJTaWRlKHB1enpsZS5mZW4pLCBwdXp6bGUuZmVhdHVyZXMpO1xuICAgIHJldHVybiBwdXp6bGU7XG59O1xuXG5mdW5jdGlvbiBhZGRNYXRlSW5PbmVUaHJlYXRzKGZlbiwgZmVhdHVyZXMpIHtcbiAgICB2YXIgY2hlc3MgPSBuZXcgQ2hlc3MoKTtcbiAgICBjaGVzcy5sb2FkKGZlbik7XG4gICAgdmFyIG1vdmVzID0gY2hlc3MubW92ZXMoe1xuICAgICAgICB2ZXJib3NlOiB0cnVlXG4gICAgfSk7XG5cbiAgICBtb3ZlcyA9IG1vdmVzLmZpbHRlcihtID0+IGNhbk1hdGVPbk5leHRUdXJuKGZlbiwgbSkpO1xuXG4gICAgZmVhdHVyZXMucHVzaCh7XG4gICAgICAgIGRlc2NyaXB0aW9uOiBcIk1hdGUtaW4tMSB0aHJlYXRzXCIsXG4gICAgICAgIHNpZGU6IGNoZXNzLnR1cm4oKSxcbiAgICAgICAgdGFyZ2V0czogbW92ZXMubWFwKG0gPT4gdGFyZ2V0QW5kRGlhZ3JhbShtKSlcbiAgICB9KTtcblxufVxuXG5mdW5jdGlvbiBjYW5NYXRlT25OZXh0VHVybihmZW4sIG1vdmUpIHtcbiAgICB2YXIgY2hlc3MgPSBuZXcgQ2hlc3MoZmVuKTtcbiAgICBjaGVzcy5tb3ZlKG1vdmUpO1xuICAgIGlmIChjaGVzcy5pbl9jaGVjaygpKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICBjaGVzcy5sb2FkKGMuZmVuRm9yT3RoZXJTaWRlKGNoZXNzLmZlbigpKSk7XG4gICAgdmFyIG1vdmVzID0gY2hlc3MubW92ZXMoe1xuICAgICAgICB2ZXJib3NlOiB0cnVlXG4gICAgfSk7XG5cbiAgICAvLyBzdHVmZiBtYXRpbmcgbW92ZXMgaW50byBtb3ZlIG9iamVjdCBmb3IgZGlhZ3JhbVxuICAgIG1vdmUubWF0aW5nTW92ZXMgPSBtb3Zlcy5maWx0ZXIobSA9PiAvIy8udGVzdChtLnNhbikpO1xuICAgIHJldHVybiBtb3ZlLm1hdGluZ01vdmVzLmxlbmd0aCA+IDA7XG59XG5cbmZ1bmN0aW9uIHRhcmdldEFuZERpYWdyYW0obW92ZSkge1xuICAgIHJldHVybiB7XG4gICAgICAgIHRhcmdldDogbW92ZS50byxcbiAgICAgICAgZGlhZ3JhbTogW3tcbiAgICAgICAgICAgIG9yaWc6IG1vdmUuZnJvbSxcbiAgICAgICAgICAgIGRlc3Q6IG1vdmUudG8sXG4gICAgICAgICAgICBicnVzaDogXCJwYWxlR3JlZW5cIlxuICAgICAgICB9XS5jb25jYXQobW92ZS5tYXRpbmdNb3Zlcy5tYXAobSA9PiB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIG9yaWc6IG0uZnJvbSxcbiAgICAgICAgICAgICAgICBkZXN0OiBtLnRvLFxuICAgICAgICAgICAgICAgIGJydXNoOiBcInBhbGVHcmVlblwiXG4gICAgICAgICAgICB9O1xuICAgICAgICB9KSkuY29uY2F0KG1vdmUubWF0aW5nTW92ZXMubWFwKG0gPT4ge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBvcmlnOiBtLmZyb20sXG4gICAgICAgICAgICAgICAgYnJ1c2g6IFwicGFsZUdyZWVuXCJcbiAgICAgICAgICAgIH07XG4gICAgICAgIH0pKVxuICAgIH07XG59XG4iLCJ2YXIgQ2hlc3MgPSByZXF1aXJlKCdjaGVzcy5qcycpLkNoZXNzO1xudmFyIGMgPSByZXF1aXJlKCcuL2NoZXNzdXRpbHMnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihwdXp6bGUpIHtcbiAgICBpbnNwZWN0QWxpZ25lZChwdXp6bGUuZmVuLCBwdXp6bGUuZmVhdHVyZXMpO1xuICAgIGluc3BlY3RBbGlnbmVkKGMuZmVuRm9yT3RoZXJTaWRlKHB1enpsZS5mZW4pLCBwdXp6bGUuZmVhdHVyZXMpO1xuICAgIHJldHVybiBwdXp6bGU7XG59O1xuXG5mdW5jdGlvbiBpbnNwZWN0QWxpZ25lZChmZW4sIGZlYXR1cmVzKSB7XG4gICAgdmFyIGNoZXNzID0gbmV3IENoZXNzKGZlbik7XG5cbiAgICB2YXIgbW92ZXMgPSBjaGVzcy5tb3Zlcyh7XG4gICAgICAgIHZlcmJvc2U6IHRydWVcbiAgICB9KTtcblxuICAgIHZhciBwaWVjZXMgPSBjLm1ham9yUGllY2VzRm9yQ29sb3VyKGZlbiwgY2hlc3MudHVybigpKTtcbiAgICB2YXIgb3Bwb25lbnRzUGllY2VzID0gYy5tYWpvclBpZWNlc0ZvckNvbG91cihmZW4sIGNoZXNzLnR1cm4oKSA9PSAndycgPyAnYicgOiAndycpO1xuXG4gICAgdmFyIHBvdGVudGlhbENhcHR1cmVzID0gW107XG4gICAgcGllY2VzLmZvckVhY2goZnJvbSA9PiB7XG4gICAgICAgIHZhciB0eXBlID0gY2hlc3MuZ2V0KGZyb20pLnR5cGU7XG4gICAgICAgIGlmICgodHlwZSAhPT0gJ2snKSAmJiAodHlwZSAhPT0gJ24nKSkge1xuICAgICAgICAgICAgb3Bwb25lbnRzUGllY2VzLmZvckVhY2godG8gPT4ge1xuICAgICAgICAgICAgICAgIGlmIChjLmNhbkNhcHR1cmUoZnJvbSwgY2hlc3MuZ2V0KGZyb20pLCB0bywgY2hlc3MuZ2V0KHRvKSkpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGF2YWlsYWJsZU9uQm9hcmQgPSBtb3Zlcy5maWx0ZXIobSA9PiBtLmZyb20gPT09IGZyb20gJiYgbS50byA9PT0gdG8pO1xuICAgICAgICAgICAgICAgICAgICBpZiAoYXZhaWxhYmxlT25Cb2FyZC5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHBvdGVudGlhbENhcHR1cmVzLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGF0dGFja2VyOiBmcm9tLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGF0dGFja2VkOiB0b1xuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgYWRkR2VvbWV0cmljUGlucyhmZW4sIGZlYXR1cmVzLCBwb3RlbnRpYWxDYXB0dXJlcyk7XG59XG5cbi8vIHBpbnMgYXJlIGZvdW5kIGlmIHRoZXJlIGlzIDEgcGllY2UgaW4gYmV0d2VlbiBhIGNhcHR1cmUgb2YgdGhlIG9wcG9uZW50cyBjb2xvdXIuXG5cbmZ1bmN0aW9uIGFkZEdlb21ldHJpY1BpbnMoZmVuLCBmZWF0dXJlcywgcG90ZW50aWFsQ2FwdHVyZXMpIHtcbiAgICB2YXIgY2hlc3MgPSBuZXcgQ2hlc3MoZmVuKTtcbiAgICB2YXIgdGFyZ2V0cyA9IFtdO1xuICAgIHBvdGVudGlhbENhcHR1cmVzLmZvckVhY2gocGFpciA9PiB7XG4gICAgICAgIHBhaXIucGllY2VzQmV0d2VlbiA9IGMuYmV0d2VlbihwYWlyLmF0dGFja2VyLCBwYWlyLmF0dGFja2VkKS5tYXAoc3F1YXJlID0+IHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgc3F1YXJlOiBzcXVhcmUsXG4gICAgICAgICAgICAgICAgcGllY2U6IGNoZXNzLmdldChzcXVhcmUpXG4gICAgICAgICAgICB9O1xuICAgICAgICB9KS5maWx0ZXIoaXRlbSA9PiBpdGVtLnBpZWNlKTtcbiAgICB9KTtcblxuICAgIHZhciBvdGhlclNpZGUgPSBjaGVzcy50dXJuKCkgPT09ICd3JyA/ICdiJyA6ICd3JztcblxuICAgIHBvdGVudGlhbENhcHR1cmVzID0gcG90ZW50aWFsQ2FwdHVyZXMuZmlsdGVyKHBhaXIgPT4gcGFpci5waWVjZXNCZXR3ZWVuLmxlbmd0aCA9PT0gMSk7XG4gICAgcG90ZW50aWFsQ2FwdHVyZXMgPSBwb3RlbnRpYWxDYXB0dXJlcy5maWx0ZXIocGFpciA9PiBwYWlyLnBpZWNlc0JldHdlZW5bMF0ucGllY2UuY29sb3IgPT09IG90aGVyU2lkZSk7XG4gICAgcG90ZW50aWFsQ2FwdHVyZXMuZm9yRWFjaChwYWlyID0+IHtcbiAgICAgICAgdGFyZ2V0cy5wdXNoKHtcbiAgICAgICAgICAgIHRhcmdldDogcGFpci5waWVjZXNCZXR3ZWVuWzBdLnNxdWFyZSxcbiAgICAgICAgICAgIG1hcmtlcjogbWFya2VyKGZlbiwgcGFpci5waWVjZXNCZXR3ZWVuWzBdLnNxdWFyZSwgcGFpci5hdHRhY2tlZCksXG4gICAgICAgICAgICBkaWFncmFtOiBkaWFncmFtKHBhaXIuYXR0YWNrZXIsIHBhaXIuYXR0YWNrZWQsIHBhaXIucGllY2VzQmV0d2VlblswXS5zcXVhcmUpXG4gICAgICAgIH0pO1xuXG4gICAgfSk7XG5cbiAgICBmZWF0dXJlcy5wdXNoKHtcbiAgICAgICAgZGVzY3JpcHRpb246IFwiUGlucyBhbmQgU2tld2Vyc1wiLFxuICAgICAgICBzaWRlOiBjaGVzcy50dXJuKCkgPT09ICd3JyA/ICdiJyA6ICd3JyxcbiAgICAgICAgdGFyZ2V0czogdGFyZ2V0c1xuICAgIH0pO1xuXG59XG5cbmZ1bmN0aW9uIG1hcmtlcihmZW4sIHBpbm5lZCwgYXR0YWNrZWQpIHtcbiAgICB2YXIgY2hlc3MgPSBuZXcgQ2hlc3MoZmVuKTtcbiAgICB2YXIgcCA9IGNoZXNzLmdldChwaW5uZWQpLnR5cGU7XG4gICAgdmFyIGEgPSBjaGVzcy5nZXQoYXR0YWNrZWQpLnR5cGU7XG4gICAgdmFyIGNoZWNrTW9kaWZpZXIgPSBhID09PSAnaycgPyAnKycgOiAnJztcbiAgICBpZiAoKHAgPT09ICdxJykgfHwgKHAgPT09ICdyJyAmJiAoYSA9PT0gJ2InIHx8IGEgPT09ICduJykpKSB7XG4gICAgICAgIHJldHVybiAn8J+NoicgKyBjaGVja01vZGlmaWVyO1xuICAgIH1cbiAgICByZXR1cm4gJ/Cfk4wnICsgY2hlY2tNb2RpZmllcjtcbn1cblxuZnVuY3Rpb24gZGlhZ3JhbShmcm9tLCB0bywgbWlkZGxlKSB7XG4gICAgcmV0dXJuIFt7XG4gICAgICAgIG9yaWc6IGZyb20sXG4gICAgICAgIGRlc3Q6IHRvLFxuICAgICAgICBicnVzaDogJ3JlZCdcbiAgICB9LCB7XG4gICAgICAgIG9yaWc6IG1pZGRsZSxcbiAgICAgICAgYnJ1c2g6ICdyZWQnXG4gICAgfV07XG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGxpc3QpIHtcblxuICAgIHZhciBvY2N1cmVkID0gW107XG4gICAgdmFyIHJlc3VsdCA9IFtdO1xuXG4gICAgbGlzdC5mb3JFYWNoKHggPT4ge1xuICAgICAgICB2YXIganNvbiA9IEpTT04uc3RyaW5naWZ5KHgpO1xuICAgICAgICBpZiAoIW9jY3VyZWQuaW5jbHVkZXMoanNvbikpIHtcbiAgICAgICAgICAgIG9jY3VyZWQucHVzaChqc29uKTtcbiAgICAgICAgICAgIHJlc3VsdC5wdXNoKHgpO1xuICAgICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIHJlc3VsdDtcbn07XG4iLCJ2YXIgbSA9IChmdW5jdGlvbiBhcHAod2luZG93LCB1bmRlZmluZWQpIHtcclxuXHRcInVzZSBzdHJpY3RcIjtcclxuICBcdHZhciBWRVJTSU9OID0gXCJ2MC4yLjFcIjtcclxuXHRmdW5jdGlvbiBpc0Z1bmN0aW9uKG9iamVjdCkge1xyXG5cdFx0cmV0dXJuIHR5cGVvZiBvYmplY3QgPT09IFwiZnVuY3Rpb25cIjtcclxuXHR9XHJcblx0ZnVuY3Rpb24gaXNPYmplY3Qob2JqZWN0KSB7XHJcblx0XHRyZXR1cm4gdHlwZS5jYWxsKG9iamVjdCkgPT09IFwiW29iamVjdCBPYmplY3RdXCI7XHJcblx0fVxyXG5cdGZ1bmN0aW9uIGlzU3RyaW5nKG9iamVjdCkge1xyXG5cdFx0cmV0dXJuIHR5cGUuY2FsbChvYmplY3QpID09PSBcIltvYmplY3QgU3RyaW5nXVwiO1xyXG5cdH1cclxuXHR2YXIgaXNBcnJheSA9IEFycmF5LmlzQXJyYXkgfHwgZnVuY3Rpb24gKG9iamVjdCkge1xyXG5cdFx0cmV0dXJuIHR5cGUuY2FsbChvYmplY3QpID09PSBcIltvYmplY3QgQXJyYXldXCI7XHJcblx0fTtcclxuXHR2YXIgdHlwZSA9IHt9LnRvU3RyaW5nO1xyXG5cdHZhciBwYXJzZXIgPSAvKD86KF58I3xcXC4pKFteI1xcLlxcW1xcXV0rKSl8KFxcWy4rP1xcXSkvZywgYXR0clBhcnNlciA9IC9cXFsoLis/KSg/Oj0oXCJ8J3wpKC4qPylcXDIpP1xcXS87XHJcblx0dmFyIHZvaWRFbGVtZW50cyA9IC9eKEFSRUF8QkFTRXxCUnxDT0x8Q09NTUFORHxFTUJFRHxIUnxJTUd8SU5QVVR8S0VZR0VOfExJTkt8TUVUQXxQQVJBTXxTT1VSQ0V8VFJBQ0t8V0JSKSQvO1xyXG5cdHZhciBub29wID0gZnVuY3Rpb24gKCkge307XHJcblxyXG5cdC8vIGNhY2hpbmcgY29tbW9ubHkgdXNlZCB2YXJpYWJsZXNcclxuXHR2YXIgJGRvY3VtZW50LCAkbG9jYXRpb24sICRyZXF1ZXN0QW5pbWF0aW9uRnJhbWUsICRjYW5jZWxBbmltYXRpb25GcmFtZTtcclxuXHJcblx0Ly8gc2VsZiBpbnZva2luZyBmdW5jdGlvbiBuZWVkZWQgYmVjYXVzZSBvZiB0aGUgd2F5IG1vY2tzIHdvcmtcclxuXHRmdW5jdGlvbiBpbml0aWFsaXplKHdpbmRvdykge1xyXG5cdFx0JGRvY3VtZW50ID0gd2luZG93LmRvY3VtZW50O1xyXG5cdFx0JGxvY2F0aW9uID0gd2luZG93LmxvY2F0aW9uO1xyXG5cdFx0JGNhbmNlbEFuaW1hdGlvbkZyYW1lID0gd2luZG93LmNhbmNlbEFuaW1hdGlvbkZyYW1lIHx8IHdpbmRvdy5jbGVhclRpbWVvdXQ7XHJcblx0XHQkcmVxdWVzdEFuaW1hdGlvbkZyYW1lID0gd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZSB8fCB3aW5kb3cuc2V0VGltZW91dDtcclxuXHR9XHJcblxyXG5cdGluaXRpYWxpemUod2luZG93KTtcclxuXHJcblx0bS52ZXJzaW9uID0gZnVuY3Rpb24oKSB7XHJcblx0XHRyZXR1cm4gVkVSU0lPTjtcclxuXHR9O1xyXG5cclxuXHQvKipcclxuXHQgKiBAdHlwZWRlZiB7U3RyaW5nfSBUYWdcclxuXHQgKiBBIHN0cmluZyB0aGF0IGxvb2tzIGxpa2UgLT4gZGl2LmNsYXNzbmFtZSNpZFtwYXJhbT1vbmVdW3BhcmFtMj10d29dXHJcblx0ICogV2hpY2ggZGVzY3JpYmVzIGEgRE9NIG5vZGVcclxuXHQgKi9cclxuXHJcblx0LyoqXHJcblx0ICpcclxuXHQgKiBAcGFyYW0ge1RhZ30gVGhlIERPTSBub2RlIHRhZ1xyXG5cdCAqIEBwYXJhbSB7T2JqZWN0PVtdfSBvcHRpb25hbCBrZXktdmFsdWUgcGFpcnMgdG8gYmUgbWFwcGVkIHRvIERPTSBhdHRyc1xyXG5cdCAqIEBwYXJhbSB7Li4ubU5vZGU9W119IFplcm8gb3IgbW9yZSBNaXRocmlsIGNoaWxkIG5vZGVzLiBDYW4gYmUgYW4gYXJyYXksIG9yIHNwbGF0IChvcHRpb25hbClcclxuXHQgKlxyXG5cdCAqL1xyXG5cdGZ1bmN0aW9uIG0odGFnLCBwYWlycykge1xyXG5cdFx0Zm9yICh2YXIgYXJncyA9IFtdLCBpID0gMTsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykge1xyXG5cdFx0XHRhcmdzW2kgLSAxXSA9IGFyZ3VtZW50c1tpXTtcclxuXHRcdH1cclxuXHRcdGlmIChpc09iamVjdCh0YWcpKSByZXR1cm4gcGFyYW1ldGVyaXplKHRhZywgYXJncyk7XHJcblx0XHR2YXIgaGFzQXR0cnMgPSBwYWlycyAhPSBudWxsICYmIGlzT2JqZWN0KHBhaXJzKSAmJiAhKFwidGFnXCIgaW4gcGFpcnMgfHwgXCJ2aWV3XCIgaW4gcGFpcnMgfHwgXCJzdWJ0cmVlXCIgaW4gcGFpcnMpO1xyXG5cdFx0dmFyIGF0dHJzID0gaGFzQXR0cnMgPyBwYWlycyA6IHt9O1xyXG5cdFx0dmFyIGNsYXNzQXR0ck5hbWUgPSBcImNsYXNzXCIgaW4gYXR0cnMgPyBcImNsYXNzXCIgOiBcImNsYXNzTmFtZVwiO1xyXG5cdFx0dmFyIGNlbGwgPSB7dGFnOiBcImRpdlwiLCBhdHRyczoge319O1xyXG5cdFx0dmFyIG1hdGNoLCBjbGFzc2VzID0gW107XHJcblx0XHRpZiAoIWlzU3RyaW5nKHRhZykpIHRocm93IG5ldyBFcnJvcihcInNlbGVjdG9yIGluIG0oc2VsZWN0b3IsIGF0dHJzLCBjaGlsZHJlbikgc2hvdWxkIGJlIGEgc3RyaW5nXCIpO1xyXG5cdFx0d2hpbGUgKChtYXRjaCA9IHBhcnNlci5leGVjKHRhZykpICE9IG51bGwpIHtcclxuXHRcdFx0aWYgKG1hdGNoWzFdID09PSBcIlwiICYmIG1hdGNoWzJdKSBjZWxsLnRhZyA9IG1hdGNoWzJdO1xyXG5cdFx0XHRlbHNlIGlmIChtYXRjaFsxXSA9PT0gXCIjXCIpIGNlbGwuYXR0cnMuaWQgPSBtYXRjaFsyXTtcclxuXHRcdFx0ZWxzZSBpZiAobWF0Y2hbMV0gPT09IFwiLlwiKSBjbGFzc2VzLnB1c2gobWF0Y2hbMl0pO1xyXG5cdFx0XHRlbHNlIGlmIChtYXRjaFszXVswXSA9PT0gXCJbXCIpIHtcclxuXHRcdFx0XHR2YXIgcGFpciA9IGF0dHJQYXJzZXIuZXhlYyhtYXRjaFszXSk7XHJcblx0XHRcdFx0Y2VsbC5hdHRyc1twYWlyWzFdXSA9IHBhaXJbM10gfHwgKHBhaXJbMl0gPyBcIlwiIDp0cnVlKTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdHZhciBjaGlsZHJlbiA9IGhhc0F0dHJzID8gYXJncy5zbGljZSgxKSA6IGFyZ3M7XHJcblx0XHRpZiAoY2hpbGRyZW4ubGVuZ3RoID09PSAxICYmIGlzQXJyYXkoY2hpbGRyZW5bMF0pKSB7XHJcblx0XHRcdGNlbGwuY2hpbGRyZW4gPSBjaGlsZHJlblswXTtcclxuXHRcdH1cclxuXHRcdGVsc2Uge1xyXG5cdFx0XHRjZWxsLmNoaWxkcmVuID0gY2hpbGRyZW47XHJcblx0XHR9XHJcblxyXG5cdFx0Zm9yICh2YXIgYXR0ck5hbWUgaW4gYXR0cnMpIHtcclxuXHRcdFx0aWYgKGF0dHJzLmhhc093blByb3BlcnR5KGF0dHJOYW1lKSkge1xyXG5cdFx0XHRcdGlmIChhdHRyTmFtZSA9PT0gY2xhc3NBdHRyTmFtZSAmJiBhdHRyc1thdHRyTmFtZV0gIT0gbnVsbCAmJiBhdHRyc1thdHRyTmFtZV0gIT09IFwiXCIpIHtcclxuXHRcdFx0XHRcdGNsYXNzZXMucHVzaChhdHRyc1thdHRyTmFtZV0pO1xyXG5cdFx0XHRcdFx0Y2VsbC5hdHRyc1thdHRyTmFtZV0gPSBcIlwiOyAvL2NyZWF0ZSBrZXkgaW4gY29ycmVjdCBpdGVyYXRpb24gb3JkZXJcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0ZWxzZSBjZWxsLmF0dHJzW2F0dHJOYW1lXSA9IGF0dHJzW2F0dHJOYW1lXTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdFx0aWYgKGNsYXNzZXMubGVuZ3RoKSBjZWxsLmF0dHJzW2NsYXNzQXR0ck5hbWVdID0gY2xhc3Nlcy5qb2luKFwiIFwiKTtcclxuXHJcblx0XHRyZXR1cm4gY2VsbDtcclxuXHR9XHJcblx0ZnVuY3Rpb24gZm9yRWFjaChsaXN0LCBmKSB7XHJcblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IGxpc3QubGVuZ3RoICYmICFmKGxpc3RbaV0sIGkrKyk7KSB7fVxyXG5cdH1cclxuXHRmdW5jdGlvbiBmb3JLZXlzKGxpc3QsIGYpIHtcclxuXHRcdGZvckVhY2gobGlzdCwgZnVuY3Rpb24gKGF0dHJzLCBpKSB7XHJcblx0XHRcdHJldHVybiAoYXR0cnMgPSBhdHRycyAmJiBhdHRycy5hdHRycykgJiYgYXR0cnMua2V5ICE9IG51bGwgJiYgZihhdHRycywgaSk7XHJcblx0XHR9KTtcclxuXHR9XHJcblx0Ly8gVGhpcyBmdW5jdGlvbiB3YXMgY2F1c2luZyBkZW9wdHMgaW4gQ2hyb21lLlxyXG5cdC8vIFdlbGwgbm8gbG9uZ2VyXHJcblx0ZnVuY3Rpb24gZGF0YVRvU3RyaW5nKGRhdGEpIHtcclxuICAgIGlmIChkYXRhID09IG51bGwpIHJldHVybiAnJztcclxuICAgIGlmICh0eXBlb2YgZGF0YSA9PT0gJ29iamVjdCcpIHJldHVybiBkYXRhO1xyXG4gICAgaWYgKGRhdGEudG9TdHJpbmcoKSA9PSBudWxsKSByZXR1cm4gXCJcIjsgLy8gcHJldmVudCByZWN1cnNpb24gZXJyb3Igb24gRkZcclxuICAgIHJldHVybiBkYXRhO1xyXG5cdH1cclxuXHQvLyBUaGlzIGZ1bmN0aW9uIHdhcyBjYXVzaW5nIGRlb3B0cyBpbiBDaHJvbWUuXHJcblx0ZnVuY3Rpb24gaW5qZWN0VGV4dE5vZGUocGFyZW50RWxlbWVudCwgZmlyc3QsIGluZGV4LCBkYXRhKSB7XHJcblx0XHR0cnkge1xyXG5cdFx0XHRpbnNlcnROb2RlKHBhcmVudEVsZW1lbnQsIGZpcnN0LCBpbmRleCk7XHJcblx0XHRcdGZpcnN0Lm5vZGVWYWx1ZSA9IGRhdGE7XHJcblx0XHR9IGNhdGNoIChlKSB7fSAvL0lFIGVycm9uZW91c2x5IHRocm93cyBlcnJvciB3aGVuIGFwcGVuZGluZyBhbiBlbXB0eSB0ZXh0IG5vZGUgYWZ0ZXIgYSBudWxsXHJcblx0fVxyXG5cclxuXHRmdW5jdGlvbiBmbGF0dGVuKGxpc3QpIHtcclxuXHRcdC8vcmVjdXJzaXZlbHkgZmxhdHRlbiBhcnJheVxyXG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBsaXN0Lmxlbmd0aDsgaSsrKSB7XHJcblx0XHRcdGlmIChpc0FycmF5KGxpc3RbaV0pKSB7XHJcblx0XHRcdFx0bGlzdCA9IGxpc3QuY29uY2F0LmFwcGx5KFtdLCBsaXN0KTtcclxuXHRcdFx0XHQvL2NoZWNrIGN1cnJlbnQgaW5kZXggYWdhaW4gYW5kIGZsYXR0ZW4gdW50aWwgdGhlcmUgYXJlIG5vIG1vcmUgbmVzdGVkIGFycmF5cyBhdCB0aGF0IGluZGV4XHJcblx0XHRcdFx0aS0tO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0XHRyZXR1cm4gbGlzdDtcclxuXHR9XHJcblxyXG5cdGZ1bmN0aW9uIGluc2VydE5vZGUocGFyZW50RWxlbWVudCwgbm9kZSwgaW5kZXgpIHtcclxuXHRcdHBhcmVudEVsZW1lbnQuaW5zZXJ0QmVmb3JlKG5vZGUsIHBhcmVudEVsZW1lbnQuY2hpbGROb2Rlc1tpbmRleF0gfHwgbnVsbCk7XHJcblx0fVxyXG5cclxuXHR2YXIgREVMRVRJT04gPSAxLCBJTlNFUlRJT04gPSAyLCBNT1ZFID0gMztcclxuXHJcblx0ZnVuY3Rpb24gaGFuZGxlS2V5c0RpZmZlcihkYXRhLCBleGlzdGluZywgY2FjaGVkLCBwYXJlbnRFbGVtZW50KSB7XHJcblx0XHRmb3JLZXlzKGRhdGEsIGZ1bmN0aW9uIChrZXksIGkpIHtcclxuXHRcdFx0ZXhpc3Rpbmdba2V5ID0ga2V5LmtleV0gPSBleGlzdGluZ1trZXldID8ge1xyXG5cdFx0XHRcdGFjdGlvbjogTU9WRSxcclxuXHRcdFx0XHRpbmRleDogaSxcclxuXHRcdFx0XHRmcm9tOiBleGlzdGluZ1trZXldLmluZGV4LFxyXG5cdFx0XHRcdGVsZW1lbnQ6IGNhY2hlZC5ub2Rlc1tleGlzdGluZ1trZXldLmluZGV4XSB8fCAkZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKVxyXG5cdFx0XHR9IDoge2FjdGlvbjogSU5TRVJUSU9OLCBpbmRleDogaX07XHJcblx0XHR9KTtcclxuXHRcdHZhciBhY3Rpb25zID0gW107XHJcblx0XHRmb3IgKHZhciBwcm9wIGluIGV4aXN0aW5nKSBhY3Rpb25zLnB1c2goZXhpc3RpbmdbcHJvcF0pO1xyXG5cdFx0dmFyIGNoYW5nZXMgPSBhY3Rpb25zLnNvcnQoc29ydENoYW5nZXMpLCBuZXdDYWNoZWQgPSBuZXcgQXJyYXkoY2FjaGVkLmxlbmd0aCk7XHJcblx0XHRuZXdDYWNoZWQubm9kZXMgPSBjYWNoZWQubm9kZXMuc2xpY2UoKTtcclxuXHJcblx0XHRmb3JFYWNoKGNoYW5nZXMsIGZ1bmN0aW9uIChjaGFuZ2UpIHtcclxuXHRcdFx0dmFyIGluZGV4ID0gY2hhbmdlLmluZGV4O1xyXG5cdFx0XHRpZiAoY2hhbmdlLmFjdGlvbiA9PT0gREVMRVRJT04pIHtcclxuXHRcdFx0XHRjbGVhcihjYWNoZWRbaW5kZXhdLm5vZGVzLCBjYWNoZWRbaW5kZXhdKTtcclxuXHRcdFx0XHRuZXdDYWNoZWQuc3BsaWNlKGluZGV4LCAxKTtcclxuXHRcdFx0fVxyXG5cdFx0XHRpZiAoY2hhbmdlLmFjdGlvbiA9PT0gSU5TRVJUSU9OKSB7XHJcblx0XHRcdFx0dmFyIGR1bW15ID0gJGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7XHJcblx0XHRcdFx0ZHVtbXkua2V5ID0gZGF0YVtpbmRleF0uYXR0cnMua2V5O1xyXG5cdFx0XHRcdGluc2VydE5vZGUocGFyZW50RWxlbWVudCwgZHVtbXksIGluZGV4KTtcclxuXHRcdFx0XHRuZXdDYWNoZWQuc3BsaWNlKGluZGV4LCAwLCB7XHJcblx0XHRcdFx0XHRhdHRyczoge2tleTogZGF0YVtpbmRleF0uYXR0cnMua2V5fSxcclxuXHRcdFx0XHRcdG5vZGVzOiBbZHVtbXldXHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdFx0bmV3Q2FjaGVkLm5vZGVzW2luZGV4XSA9IGR1bW15O1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRpZiAoY2hhbmdlLmFjdGlvbiA9PT0gTU9WRSkge1xyXG5cdFx0XHRcdHZhciBjaGFuZ2VFbGVtZW50ID0gY2hhbmdlLmVsZW1lbnQ7XHJcblx0XHRcdFx0dmFyIG1heWJlQ2hhbmdlZCA9IHBhcmVudEVsZW1lbnQuY2hpbGROb2Rlc1tpbmRleF07XHJcblx0XHRcdFx0aWYgKG1heWJlQ2hhbmdlZCAhPT0gY2hhbmdlRWxlbWVudCAmJiBjaGFuZ2VFbGVtZW50ICE9PSBudWxsKSB7XHJcblx0XHRcdFx0XHRwYXJlbnRFbGVtZW50Lmluc2VydEJlZm9yZShjaGFuZ2VFbGVtZW50LCBtYXliZUNoYW5nZWQgfHwgbnVsbCk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdG5ld0NhY2hlZFtpbmRleF0gPSBjYWNoZWRbY2hhbmdlLmZyb21dO1xyXG5cdFx0XHRcdG5ld0NhY2hlZC5ub2Rlc1tpbmRleF0gPSBjaGFuZ2VFbGVtZW50O1xyXG5cdFx0XHR9XHJcblx0XHR9KTtcclxuXHJcblx0XHRyZXR1cm4gbmV3Q2FjaGVkO1xyXG5cdH1cclxuXHJcblx0ZnVuY3Rpb24gZGlmZktleXMoZGF0YSwgY2FjaGVkLCBleGlzdGluZywgcGFyZW50RWxlbWVudCkge1xyXG5cdFx0dmFyIGtleXNEaWZmZXIgPSBkYXRhLmxlbmd0aCAhPT0gY2FjaGVkLmxlbmd0aDtcclxuXHRcdGlmICgha2V5c0RpZmZlcikge1xyXG5cdFx0XHRmb3JLZXlzKGRhdGEsIGZ1bmN0aW9uIChhdHRycywgaSkge1xyXG5cdFx0XHRcdHZhciBjYWNoZWRDZWxsID0gY2FjaGVkW2ldO1xyXG5cdFx0XHRcdHJldHVybiBrZXlzRGlmZmVyID0gY2FjaGVkQ2VsbCAmJiBjYWNoZWRDZWxsLmF0dHJzICYmIGNhY2hlZENlbGwuYXR0cnMua2V5ICE9PSBhdHRycy5rZXk7XHJcblx0XHRcdH0pO1xyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiBrZXlzRGlmZmVyID8gaGFuZGxlS2V5c0RpZmZlcihkYXRhLCBleGlzdGluZywgY2FjaGVkLCBwYXJlbnRFbGVtZW50KSA6IGNhY2hlZDtcclxuXHR9XHJcblxyXG5cdGZ1bmN0aW9uIGRpZmZBcnJheShkYXRhLCBjYWNoZWQsIG5vZGVzKSB7XHJcblx0XHQvL2RpZmYgdGhlIGFycmF5IGl0c2VsZlxyXG5cclxuXHRcdC8vdXBkYXRlIHRoZSBsaXN0IG9mIERPTSBub2RlcyBieSBjb2xsZWN0aW5nIHRoZSBub2RlcyBmcm9tIGVhY2ggaXRlbVxyXG5cdFx0Zm9yRWFjaChkYXRhLCBmdW5jdGlvbiAoXywgaSkge1xyXG5cdFx0XHRpZiAoY2FjaGVkW2ldICE9IG51bGwpIG5vZGVzLnB1c2guYXBwbHkobm9kZXMsIGNhY2hlZFtpXS5ub2Rlcyk7XHJcblx0XHR9KVxyXG5cdFx0Ly9yZW1vdmUgaXRlbXMgZnJvbSB0aGUgZW5kIG9mIHRoZSBhcnJheSBpZiB0aGUgbmV3IGFycmF5IGlzIHNob3J0ZXIgdGhhbiB0aGUgb2xkIG9uZS4gaWYgZXJyb3JzIGV2ZXIgaGFwcGVuIGhlcmUsIHRoZSBpc3N1ZSBpcyBtb3N0IGxpa2VseVxyXG5cdFx0Ly9hIGJ1ZyBpbiB0aGUgY29uc3RydWN0aW9uIG9mIHRoZSBgY2FjaGVkYCBkYXRhIHN0cnVjdHVyZSBzb21ld2hlcmUgZWFybGllciBpbiB0aGUgcHJvZ3JhbVxyXG5cdFx0Zm9yRWFjaChjYWNoZWQubm9kZXMsIGZ1bmN0aW9uIChub2RlLCBpKSB7XHJcblx0XHRcdGlmIChub2RlLnBhcmVudE5vZGUgIT0gbnVsbCAmJiBub2Rlcy5pbmRleE9mKG5vZGUpIDwgMCkgY2xlYXIoW25vZGVdLCBbY2FjaGVkW2ldXSk7XHJcblx0XHR9KVxyXG5cdFx0aWYgKGRhdGEubGVuZ3RoIDwgY2FjaGVkLmxlbmd0aCkgY2FjaGVkLmxlbmd0aCA9IGRhdGEubGVuZ3RoO1xyXG5cdFx0Y2FjaGVkLm5vZGVzID0gbm9kZXM7XHJcblx0fVxyXG5cclxuXHRmdW5jdGlvbiBidWlsZEFycmF5S2V5cyhkYXRhKSB7XHJcblx0XHR2YXIgZ3VpZCA9IDA7XHJcblx0XHRmb3JLZXlzKGRhdGEsIGZ1bmN0aW9uICgpIHtcclxuXHRcdFx0Zm9yRWFjaChkYXRhLCBmdW5jdGlvbiAoYXR0cnMpIHtcclxuXHRcdFx0XHRpZiAoKGF0dHJzID0gYXR0cnMgJiYgYXR0cnMuYXR0cnMpICYmIGF0dHJzLmtleSA9PSBudWxsKSBhdHRycy5rZXkgPSBcIl9fbWl0aHJpbF9fXCIgKyBndWlkKys7XHJcblx0XHRcdH0pXHJcblx0XHRcdHJldHVybiAxO1xyXG5cdFx0fSk7XHJcblx0fVxyXG5cclxuXHRmdW5jdGlvbiBtYXliZVJlY3JlYXRlT2JqZWN0KGRhdGEsIGNhY2hlZCwgZGF0YUF0dHJLZXlzKSB7XHJcblx0XHQvL2lmIGFuIGVsZW1lbnQgaXMgZGlmZmVyZW50IGVub3VnaCBmcm9tIHRoZSBvbmUgaW4gY2FjaGUsIHJlY3JlYXRlIGl0XHJcblx0XHRpZiAoZGF0YS50YWcgIT09IGNhY2hlZC50YWcgfHxcclxuXHRcdFx0XHRkYXRhQXR0cktleXMuc29ydCgpLmpvaW4oKSAhPT0gT2JqZWN0LmtleXMoY2FjaGVkLmF0dHJzKS5zb3J0KCkuam9pbigpIHx8XHJcblx0XHRcdFx0ZGF0YS5hdHRycy5pZCAhPT0gY2FjaGVkLmF0dHJzLmlkIHx8XHJcblx0XHRcdFx0ZGF0YS5hdHRycy5rZXkgIT09IGNhY2hlZC5hdHRycy5rZXkgfHxcclxuXHRcdFx0XHQobS5yZWRyYXcuc3RyYXRlZ3koKSA9PT0gXCJhbGxcIiAmJiAoIWNhY2hlZC5jb25maWdDb250ZXh0IHx8IGNhY2hlZC5jb25maWdDb250ZXh0LnJldGFpbiAhPT0gdHJ1ZSkpIHx8XHJcblx0XHRcdFx0KG0ucmVkcmF3LnN0cmF0ZWd5KCkgPT09IFwiZGlmZlwiICYmIGNhY2hlZC5jb25maWdDb250ZXh0ICYmIGNhY2hlZC5jb25maWdDb250ZXh0LnJldGFpbiA9PT0gZmFsc2UpKSB7XHJcblx0XHRcdGlmIChjYWNoZWQubm9kZXMubGVuZ3RoKSBjbGVhcihjYWNoZWQubm9kZXMpO1xyXG5cdFx0XHRpZiAoY2FjaGVkLmNvbmZpZ0NvbnRleHQgJiYgaXNGdW5jdGlvbihjYWNoZWQuY29uZmlnQ29udGV4dC5vbnVubG9hZCkpIGNhY2hlZC5jb25maWdDb250ZXh0Lm9udW5sb2FkKCk7XHJcblx0XHRcdGlmIChjYWNoZWQuY29udHJvbGxlcnMpIHtcclxuXHRcdFx0XHRmb3JFYWNoKGNhY2hlZC5jb250cm9sbGVycywgZnVuY3Rpb24gKGNvbnRyb2xsZXIpIHtcclxuXHRcdFx0XHRcdGlmIChjb250cm9sbGVyLnVubG9hZCkgY29udHJvbGxlci5vbnVubG9hZCh7cHJldmVudERlZmF1bHQ6IG5vb3B9KTtcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0ZnVuY3Rpb24gZ2V0T2JqZWN0TmFtZXNwYWNlKGRhdGEsIG5hbWVzcGFjZSkge1xyXG5cdFx0cmV0dXJuIGRhdGEuYXR0cnMueG1sbnMgPyBkYXRhLmF0dHJzLnhtbG5zIDpcclxuXHRcdFx0ZGF0YS50YWcgPT09IFwic3ZnXCIgPyBcImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCIgOlxyXG5cdFx0XHRkYXRhLnRhZyA9PT0gXCJtYXRoXCIgPyBcImh0dHA6Ly93d3cudzMub3JnLzE5OTgvTWF0aC9NYXRoTUxcIiA6XHJcblx0XHRcdG5hbWVzcGFjZTtcclxuXHR9XHJcblxyXG5cdGZ1bmN0aW9uIHVubG9hZENhY2hlZENvbnRyb2xsZXJzKGNhY2hlZCwgdmlld3MsIGNvbnRyb2xsZXJzKSB7XHJcblx0XHRpZiAoY29udHJvbGxlcnMubGVuZ3RoKSB7XHJcblx0XHRcdGNhY2hlZC52aWV3cyA9IHZpZXdzO1xyXG5cdFx0XHRjYWNoZWQuY29udHJvbGxlcnMgPSBjb250cm9sbGVycztcclxuXHRcdFx0Zm9yRWFjaChjb250cm9sbGVycywgZnVuY3Rpb24gKGNvbnRyb2xsZXIpIHtcclxuXHRcdFx0XHRpZiAoY29udHJvbGxlci5vbnVubG9hZCAmJiBjb250cm9sbGVyLm9udW5sb2FkLiRvbGQpIGNvbnRyb2xsZXIub251bmxvYWQgPSBjb250cm9sbGVyLm9udW5sb2FkLiRvbGQ7XHJcblx0XHRcdFx0aWYgKHBlbmRpbmdSZXF1ZXN0cyAmJiBjb250cm9sbGVyLm9udW5sb2FkKSB7XHJcblx0XHRcdFx0XHR2YXIgb251bmxvYWQgPSBjb250cm9sbGVyLm9udW5sb2FkO1xyXG5cdFx0XHRcdFx0Y29udHJvbGxlci5vbnVubG9hZCA9IG5vb3A7XHJcblx0XHRcdFx0XHRjb250cm9sbGVyLm9udW5sb2FkLiRvbGQgPSBvbnVubG9hZDtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH0pO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0ZnVuY3Rpb24gc2NoZWR1bGVDb25maWdzVG9CZUNhbGxlZChjb25maWdzLCBkYXRhLCBub2RlLCBpc05ldywgY2FjaGVkKSB7XHJcblx0XHQvL3NjaGVkdWxlIGNvbmZpZ3MgdG8gYmUgY2FsbGVkLiBUaGV5IGFyZSBjYWxsZWQgYWZ0ZXIgYGJ1aWxkYFxyXG5cdFx0Ly9maW5pc2hlcyBydW5uaW5nXHJcblx0XHRpZiAoaXNGdW5jdGlvbihkYXRhLmF0dHJzLmNvbmZpZykpIHtcclxuXHRcdFx0dmFyIGNvbnRleHQgPSBjYWNoZWQuY29uZmlnQ29udGV4dCA9IGNhY2hlZC5jb25maWdDb250ZXh0IHx8IHt9O1xyXG5cclxuXHRcdFx0Ly9iaW5kXHJcblx0XHRcdGNvbmZpZ3MucHVzaChmdW5jdGlvbigpIHtcclxuXHRcdFx0XHRyZXR1cm4gZGF0YS5hdHRycy5jb25maWcuY2FsbChkYXRhLCBub2RlLCAhaXNOZXcsIGNvbnRleHQsIGNhY2hlZCk7XHJcblx0XHRcdH0pO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0ZnVuY3Rpb24gYnVpbGRVcGRhdGVkTm9kZShjYWNoZWQsIGRhdGEsIGVkaXRhYmxlLCBoYXNLZXlzLCBuYW1lc3BhY2UsIHZpZXdzLCBjb25maWdzLCBjb250cm9sbGVycykge1xyXG5cdFx0dmFyIG5vZGUgPSBjYWNoZWQubm9kZXNbMF07XHJcblx0XHRpZiAoaGFzS2V5cykgc2V0QXR0cmlidXRlcyhub2RlLCBkYXRhLnRhZywgZGF0YS5hdHRycywgY2FjaGVkLmF0dHJzLCBuYW1lc3BhY2UpO1xyXG5cdFx0Y2FjaGVkLmNoaWxkcmVuID0gYnVpbGQobm9kZSwgZGF0YS50YWcsIHVuZGVmaW5lZCwgdW5kZWZpbmVkLCBkYXRhLmNoaWxkcmVuLCBjYWNoZWQuY2hpbGRyZW4sIGZhbHNlLCAwLCBkYXRhLmF0dHJzLmNvbnRlbnRlZGl0YWJsZSA/IG5vZGUgOiBlZGl0YWJsZSwgbmFtZXNwYWNlLCBjb25maWdzKTtcclxuXHRcdGNhY2hlZC5ub2Rlcy5pbnRhY3QgPSB0cnVlO1xyXG5cclxuXHRcdGlmIChjb250cm9sbGVycy5sZW5ndGgpIHtcclxuXHRcdFx0Y2FjaGVkLnZpZXdzID0gdmlld3M7XHJcblx0XHRcdGNhY2hlZC5jb250cm9sbGVycyA9IGNvbnRyb2xsZXJzO1xyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiBub2RlO1xyXG5cdH1cclxuXHJcblx0ZnVuY3Rpb24gaGFuZGxlTm9uZXhpc3RlbnROb2RlcyhkYXRhLCBwYXJlbnRFbGVtZW50LCBpbmRleCkge1xyXG5cdFx0dmFyIG5vZGVzO1xyXG5cdFx0aWYgKGRhdGEuJHRydXN0ZWQpIHtcclxuXHRcdFx0bm9kZXMgPSBpbmplY3RIVE1MKHBhcmVudEVsZW1lbnQsIGluZGV4LCBkYXRhKTtcclxuXHRcdH1cclxuXHRcdGVsc2Uge1xyXG5cdFx0XHRub2RlcyA9IFskZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoZGF0YSldO1xyXG5cdFx0XHRpZiAoIXBhcmVudEVsZW1lbnQubm9kZU5hbWUubWF0Y2godm9pZEVsZW1lbnRzKSkgaW5zZXJ0Tm9kZShwYXJlbnRFbGVtZW50LCBub2Rlc1swXSwgaW5kZXgpO1xyXG5cdFx0fVxyXG5cclxuXHRcdHZhciBjYWNoZWQgPSB0eXBlb2YgZGF0YSA9PT0gXCJzdHJpbmdcIiB8fCB0eXBlb2YgZGF0YSA9PT0gXCJudW1iZXJcIiB8fCB0eXBlb2YgZGF0YSA9PT0gXCJib29sZWFuXCIgPyBuZXcgZGF0YS5jb25zdHJ1Y3RvcihkYXRhKSA6IGRhdGE7XHJcblx0XHRjYWNoZWQubm9kZXMgPSBub2RlcztcclxuXHRcdHJldHVybiBjYWNoZWQ7XHJcblx0fVxyXG5cclxuXHRmdW5jdGlvbiByZWF0dGFjaE5vZGVzKGRhdGEsIGNhY2hlZCwgcGFyZW50RWxlbWVudCwgZWRpdGFibGUsIGluZGV4LCBwYXJlbnRUYWcpIHtcclxuXHRcdHZhciBub2RlcyA9IGNhY2hlZC5ub2RlcztcclxuXHRcdGlmICghZWRpdGFibGUgfHwgZWRpdGFibGUgIT09ICRkb2N1bWVudC5hY3RpdmVFbGVtZW50KSB7XHJcblx0XHRcdGlmIChkYXRhLiR0cnVzdGVkKSB7XHJcblx0XHRcdFx0Y2xlYXIobm9kZXMsIGNhY2hlZCk7XHJcblx0XHRcdFx0bm9kZXMgPSBpbmplY3RIVE1MKHBhcmVudEVsZW1lbnQsIGluZGV4LCBkYXRhKTtcclxuXHRcdFx0fVxyXG5cdFx0XHQvL2Nvcm5lciBjYXNlOiByZXBsYWNpbmcgdGhlIG5vZGVWYWx1ZSBvZiBhIHRleHQgbm9kZSB0aGF0IGlzIGEgY2hpbGQgb2YgYSB0ZXh0YXJlYS9jb250ZW50ZWRpdGFibGUgZG9lc24ndCB3b3JrXHJcblx0XHRcdC8vd2UgbmVlZCB0byB1cGRhdGUgdGhlIHZhbHVlIHByb3BlcnR5IG9mIHRoZSBwYXJlbnQgdGV4dGFyZWEgb3IgdGhlIGlubmVySFRNTCBvZiB0aGUgY29udGVudGVkaXRhYmxlIGVsZW1lbnQgaW5zdGVhZFxyXG5cdFx0XHRlbHNlIGlmIChwYXJlbnRUYWcgPT09IFwidGV4dGFyZWFcIikge1xyXG5cdFx0XHRcdHBhcmVudEVsZW1lbnQudmFsdWUgPSBkYXRhO1xyXG5cdFx0XHR9XHJcblx0XHRcdGVsc2UgaWYgKGVkaXRhYmxlKSB7XHJcblx0XHRcdFx0ZWRpdGFibGUuaW5uZXJIVE1MID0gZGF0YTtcclxuXHRcdFx0fVxyXG5cdFx0XHRlbHNlIHtcclxuXHRcdFx0XHQvL3dhcyBhIHRydXN0ZWQgc3RyaW5nXHJcblx0XHRcdFx0aWYgKG5vZGVzWzBdLm5vZGVUeXBlID09PSAxIHx8IG5vZGVzLmxlbmd0aCA+IDEpIHtcclxuXHRcdFx0XHRcdGNsZWFyKGNhY2hlZC5ub2RlcywgY2FjaGVkKTtcclxuXHRcdFx0XHRcdG5vZGVzID0gWyRkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShkYXRhKV07XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdGluamVjdFRleHROb2RlKHBhcmVudEVsZW1lbnQsIG5vZGVzWzBdLCBpbmRleCwgZGF0YSk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHRcdGNhY2hlZCA9IG5ldyBkYXRhLmNvbnN0cnVjdG9yKGRhdGEpO1xyXG5cdFx0Y2FjaGVkLm5vZGVzID0gbm9kZXM7XHJcblx0XHRyZXR1cm4gY2FjaGVkO1xyXG5cdH1cclxuXHJcblx0ZnVuY3Rpb24gaGFuZGxlVGV4dChjYWNoZWQsIGRhdGEsIGluZGV4LCBwYXJlbnRFbGVtZW50LCBzaG91bGRSZWF0dGFjaCwgZWRpdGFibGUsIHBhcmVudFRhZykge1xyXG5cdFx0Ly9oYW5kbGUgdGV4dCBub2Rlc1xyXG5cdFx0cmV0dXJuIGNhY2hlZC5ub2Rlcy5sZW5ndGggPT09IDAgPyBoYW5kbGVOb25leGlzdGVudE5vZGVzKGRhdGEsIHBhcmVudEVsZW1lbnQsIGluZGV4KSA6XHJcblx0XHRcdGNhY2hlZC52YWx1ZU9mKCkgIT09IGRhdGEudmFsdWVPZigpIHx8IHNob3VsZFJlYXR0YWNoID09PSB0cnVlID9cclxuXHRcdFx0XHRyZWF0dGFjaE5vZGVzKGRhdGEsIGNhY2hlZCwgcGFyZW50RWxlbWVudCwgZWRpdGFibGUsIGluZGV4LCBwYXJlbnRUYWcpIDpcclxuXHRcdFx0KGNhY2hlZC5ub2Rlcy5pbnRhY3QgPSB0cnVlLCBjYWNoZWQpO1xyXG5cdH1cclxuXHJcblx0ZnVuY3Rpb24gZ2V0U3ViQXJyYXlDb3VudChpdGVtKSB7XHJcblx0XHRpZiAoaXRlbS4kdHJ1c3RlZCkge1xyXG5cdFx0XHQvL2ZpeCBvZmZzZXQgb2YgbmV4dCBlbGVtZW50IGlmIGl0ZW0gd2FzIGEgdHJ1c3RlZCBzdHJpbmcgdy8gbW9yZSB0aGFuIG9uZSBodG1sIGVsZW1lbnRcclxuXHRcdFx0Ly90aGUgZmlyc3QgY2xhdXNlIGluIHRoZSByZWdleHAgbWF0Y2hlcyBlbGVtZW50c1xyXG5cdFx0XHQvL3RoZSBzZWNvbmQgY2xhdXNlIChhZnRlciB0aGUgcGlwZSkgbWF0Y2hlcyB0ZXh0IG5vZGVzXHJcblx0XHRcdHZhciBtYXRjaCA9IGl0ZW0ubWF0Y2goLzxbXlxcL118XFw+XFxzKltePF0vZyk7XHJcblx0XHRcdGlmIChtYXRjaCAhPSBudWxsKSByZXR1cm4gbWF0Y2gubGVuZ3RoO1xyXG5cdFx0fVxyXG5cdFx0ZWxzZSBpZiAoaXNBcnJheShpdGVtKSkge1xyXG5cdFx0XHRyZXR1cm4gaXRlbS5sZW5ndGg7XHJcblx0XHR9XHJcblx0XHRyZXR1cm4gMTtcclxuXHR9XHJcblxyXG5cdGZ1bmN0aW9uIGJ1aWxkQXJyYXkoZGF0YSwgY2FjaGVkLCBwYXJlbnRFbGVtZW50LCBpbmRleCwgcGFyZW50VGFnLCBzaG91bGRSZWF0dGFjaCwgZWRpdGFibGUsIG5hbWVzcGFjZSwgY29uZmlncykge1xyXG5cdFx0ZGF0YSA9IGZsYXR0ZW4oZGF0YSk7XHJcblx0XHR2YXIgbm9kZXMgPSBbXSwgaW50YWN0ID0gY2FjaGVkLmxlbmd0aCA9PT0gZGF0YS5sZW5ndGgsIHN1YkFycmF5Q291bnQgPSAwO1xyXG5cclxuXHRcdC8va2V5cyBhbGdvcml0aG06IHNvcnQgZWxlbWVudHMgd2l0aG91dCByZWNyZWF0aW5nIHRoZW0gaWYga2V5cyBhcmUgcHJlc2VudFxyXG5cdFx0Ly8xKSBjcmVhdGUgYSBtYXAgb2YgYWxsIGV4aXN0aW5nIGtleXMsIGFuZCBtYXJrIGFsbCBmb3IgZGVsZXRpb25cclxuXHRcdC8vMikgYWRkIG5ldyBrZXlzIHRvIG1hcCBhbmQgbWFyayB0aGVtIGZvciBhZGRpdGlvblxyXG5cdFx0Ly8zKSBpZiBrZXkgZXhpc3RzIGluIG5ldyBsaXN0LCBjaGFuZ2UgYWN0aW9uIGZyb20gZGVsZXRpb24gdG8gYSBtb3ZlXHJcblx0XHQvLzQpIGZvciBlYWNoIGtleSwgaGFuZGxlIGl0cyBjb3JyZXNwb25kaW5nIGFjdGlvbiBhcyBtYXJrZWQgaW4gcHJldmlvdXMgc3RlcHNcclxuXHRcdHZhciBleGlzdGluZyA9IHt9LCBzaG91bGRNYWludGFpbklkZW50aXRpZXMgPSBmYWxzZTtcclxuXHRcdGZvcktleXMoY2FjaGVkLCBmdW5jdGlvbiAoYXR0cnMsIGkpIHtcclxuXHRcdFx0c2hvdWxkTWFpbnRhaW5JZGVudGl0aWVzID0gdHJ1ZTtcclxuXHRcdFx0ZXhpc3RpbmdbY2FjaGVkW2ldLmF0dHJzLmtleV0gPSB7YWN0aW9uOiBERUxFVElPTiwgaW5kZXg6IGl9O1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0YnVpbGRBcnJheUtleXMoZGF0YSk7XHJcblx0XHRpZiAoc2hvdWxkTWFpbnRhaW5JZGVudGl0aWVzKSBjYWNoZWQgPSBkaWZmS2V5cyhkYXRhLCBjYWNoZWQsIGV4aXN0aW5nLCBwYXJlbnRFbGVtZW50KTtcclxuXHRcdC8vZW5kIGtleSBhbGdvcml0aG1cclxuXHJcblx0XHR2YXIgY2FjaGVDb3VudCA9IDA7XHJcblx0XHQvL2Zhc3RlciBleHBsaWNpdGx5IHdyaXR0ZW5cclxuXHRcdGZvciAodmFyIGkgPSAwLCBsZW4gPSBkYXRhLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XHJcblx0XHRcdC8vZGlmZiBlYWNoIGl0ZW0gaW4gdGhlIGFycmF5XHJcblx0XHRcdHZhciBpdGVtID0gYnVpbGQocGFyZW50RWxlbWVudCwgcGFyZW50VGFnLCBjYWNoZWQsIGluZGV4LCBkYXRhW2ldLCBjYWNoZWRbY2FjaGVDb3VudF0sIHNob3VsZFJlYXR0YWNoLCBpbmRleCArIHN1YkFycmF5Q291bnQgfHwgc3ViQXJyYXlDb3VudCwgZWRpdGFibGUsIG5hbWVzcGFjZSwgY29uZmlncyk7XHJcblxyXG5cdFx0XHRpZiAoaXRlbSAhPT0gdW5kZWZpbmVkKSB7XHJcblx0XHRcdFx0aW50YWN0ID0gaW50YWN0ICYmIGl0ZW0ubm9kZXMuaW50YWN0O1xyXG5cdFx0XHRcdHN1YkFycmF5Q291bnQgKz0gZ2V0U3ViQXJyYXlDb3VudChpdGVtKTtcclxuXHRcdFx0XHRjYWNoZWRbY2FjaGVDb3VudCsrXSA9IGl0ZW07XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHRpZiAoIWludGFjdCkgZGlmZkFycmF5KGRhdGEsIGNhY2hlZCwgbm9kZXMpO1xyXG5cdFx0cmV0dXJuIGNhY2hlZFxyXG5cdH1cclxuXHJcblx0ZnVuY3Rpb24gbWFrZUNhY2hlKGRhdGEsIGNhY2hlZCwgaW5kZXgsIHBhcmVudEluZGV4LCBwYXJlbnRDYWNoZSkge1xyXG5cdFx0aWYgKGNhY2hlZCAhPSBudWxsKSB7XHJcblx0XHRcdGlmICh0eXBlLmNhbGwoY2FjaGVkKSA9PT0gdHlwZS5jYWxsKGRhdGEpKSByZXR1cm4gY2FjaGVkO1xyXG5cclxuXHRcdFx0aWYgKHBhcmVudENhY2hlICYmIHBhcmVudENhY2hlLm5vZGVzKSB7XHJcblx0XHRcdFx0dmFyIG9mZnNldCA9IGluZGV4IC0gcGFyZW50SW5kZXgsIGVuZCA9IG9mZnNldCArIChpc0FycmF5KGRhdGEpID8gZGF0YSA6IGNhY2hlZC5ub2RlcykubGVuZ3RoO1xyXG5cdFx0XHRcdGNsZWFyKHBhcmVudENhY2hlLm5vZGVzLnNsaWNlKG9mZnNldCwgZW5kKSwgcGFyZW50Q2FjaGUuc2xpY2Uob2Zmc2V0LCBlbmQpKTtcclxuXHRcdFx0fSBlbHNlIGlmIChjYWNoZWQubm9kZXMpIHtcclxuXHRcdFx0XHRjbGVhcihjYWNoZWQubm9kZXMsIGNhY2hlZCk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHRjYWNoZWQgPSBuZXcgZGF0YS5jb25zdHJ1Y3RvcigpO1xyXG5cdFx0Ly9pZiBjb25zdHJ1Y3RvciBjcmVhdGVzIGEgdmlydHVhbCBkb20gZWxlbWVudCwgdXNlIGEgYmxhbmsgb2JqZWN0XHJcblx0XHQvL2FzIHRoZSBiYXNlIGNhY2hlZCBub2RlIGluc3RlYWQgb2YgY29weWluZyB0aGUgdmlydHVhbCBlbCAoIzI3NylcclxuXHRcdGlmIChjYWNoZWQudGFnKSBjYWNoZWQgPSB7fTtcclxuXHRcdGNhY2hlZC5ub2RlcyA9IFtdO1xyXG5cdFx0cmV0dXJuIGNhY2hlZDtcclxuXHR9XHJcblxyXG5cdGZ1bmN0aW9uIGNvbnN0cnVjdE5vZGUoZGF0YSwgbmFtZXNwYWNlKSB7XHJcblx0XHRyZXR1cm4gbmFtZXNwYWNlID09PSB1bmRlZmluZWQgP1xyXG5cdFx0XHRkYXRhLmF0dHJzLmlzID8gJGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoZGF0YS50YWcsIGRhdGEuYXR0cnMuaXMpIDogJGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoZGF0YS50YWcpIDpcclxuXHRcdFx0ZGF0YS5hdHRycy5pcyA/ICRkb2N1bWVudC5jcmVhdGVFbGVtZW50TlMobmFtZXNwYWNlLCBkYXRhLnRhZywgZGF0YS5hdHRycy5pcykgOiAkZG9jdW1lbnQuY3JlYXRlRWxlbWVudE5TKG5hbWVzcGFjZSwgZGF0YS50YWcpO1xyXG5cdH1cclxuXHJcblx0ZnVuY3Rpb24gY29uc3RydWN0QXR0cnMoZGF0YSwgbm9kZSwgbmFtZXNwYWNlLCBoYXNLZXlzKSB7XHJcblx0XHRyZXR1cm4gaGFzS2V5cyA/IHNldEF0dHJpYnV0ZXMobm9kZSwgZGF0YS50YWcsIGRhdGEuYXR0cnMsIHt9LCBuYW1lc3BhY2UpIDogZGF0YS5hdHRycztcclxuXHR9XHJcblxyXG5cdGZ1bmN0aW9uIGNvbnN0cnVjdENoaWxkcmVuKGRhdGEsIG5vZGUsIGNhY2hlZCwgZWRpdGFibGUsIG5hbWVzcGFjZSwgY29uZmlncykge1xyXG5cdFx0cmV0dXJuIGRhdGEuY2hpbGRyZW4gIT0gbnVsbCAmJiBkYXRhLmNoaWxkcmVuLmxlbmd0aCA+IDAgP1xyXG5cdFx0XHRidWlsZChub2RlLCBkYXRhLnRhZywgdW5kZWZpbmVkLCB1bmRlZmluZWQsIGRhdGEuY2hpbGRyZW4sIGNhY2hlZC5jaGlsZHJlbiwgdHJ1ZSwgMCwgZGF0YS5hdHRycy5jb250ZW50ZWRpdGFibGUgPyBub2RlIDogZWRpdGFibGUsIG5hbWVzcGFjZSwgY29uZmlncykgOlxyXG5cdFx0XHRkYXRhLmNoaWxkcmVuO1xyXG5cdH1cclxuXHJcblx0ZnVuY3Rpb24gcmVjb25zdHJ1Y3RDYWNoZWQoZGF0YSwgYXR0cnMsIGNoaWxkcmVuLCBub2RlLCBuYW1lc3BhY2UsIHZpZXdzLCBjb250cm9sbGVycykge1xyXG5cdFx0dmFyIGNhY2hlZCA9IHt0YWc6IGRhdGEudGFnLCBhdHRyczogYXR0cnMsIGNoaWxkcmVuOiBjaGlsZHJlbiwgbm9kZXM6IFtub2RlXX07XHJcblx0XHR1bmxvYWRDYWNoZWRDb250cm9sbGVycyhjYWNoZWQsIHZpZXdzLCBjb250cm9sbGVycyk7XHJcblx0XHRpZiAoY2FjaGVkLmNoaWxkcmVuICYmICFjYWNoZWQuY2hpbGRyZW4ubm9kZXMpIGNhY2hlZC5jaGlsZHJlbi5ub2RlcyA9IFtdO1xyXG5cdFx0Ly9lZGdlIGNhc2U6IHNldHRpbmcgdmFsdWUgb24gPHNlbGVjdD4gZG9lc24ndCB3b3JrIGJlZm9yZSBjaGlsZHJlbiBleGlzdCwgc28gc2V0IGl0IGFnYWluIGFmdGVyIGNoaWxkcmVuIGhhdmUgYmVlbiBjcmVhdGVkXHJcblx0XHRpZiAoZGF0YS50YWcgPT09IFwic2VsZWN0XCIgJiYgXCJ2YWx1ZVwiIGluIGRhdGEuYXR0cnMpIHNldEF0dHJpYnV0ZXMobm9kZSwgZGF0YS50YWcsIHt2YWx1ZTogZGF0YS5hdHRycy52YWx1ZX0sIHt9LCBuYW1lc3BhY2UpO1xyXG5cdFx0cmV0dXJuIGNhY2hlZFxyXG5cdH1cclxuXHJcblx0ZnVuY3Rpb24gZ2V0Q29udHJvbGxlcih2aWV3cywgdmlldywgY2FjaGVkQ29udHJvbGxlcnMsIGNvbnRyb2xsZXIpIHtcclxuXHRcdHZhciBjb250cm9sbGVySW5kZXggPSBtLnJlZHJhdy5zdHJhdGVneSgpID09PSBcImRpZmZcIiAmJiB2aWV3cyA/IHZpZXdzLmluZGV4T2YodmlldykgOiAtMTtcclxuXHRcdHJldHVybiBjb250cm9sbGVySW5kZXggPiAtMSA/IGNhY2hlZENvbnRyb2xsZXJzW2NvbnRyb2xsZXJJbmRleF0gOlxyXG5cdFx0XHR0eXBlb2YgY29udHJvbGxlciA9PT0gXCJmdW5jdGlvblwiID8gbmV3IGNvbnRyb2xsZXIoKSA6IHt9O1xyXG5cdH1cclxuXHJcblx0ZnVuY3Rpb24gdXBkYXRlTGlzdHModmlld3MsIGNvbnRyb2xsZXJzLCB2aWV3LCBjb250cm9sbGVyKSB7XHJcblx0XHRpZiAoY29udHJvbGxlci5vbnVubG9hZCAhPSBudWxsKSB1bmxvYWRlcnMucHVzaCh7Y29udHJvbGxlcjogY29udHJvbGxlciwgaGFuZGxlcjogY29udHJvbGxlci5vbnVubG9hZH0pO1xyXG5cdFx0dmlld3MucHVzaCh2aWV3KTtcclxuXHRcdGNvbnRyb2xsZXJzLnB1c2goY29udHJvbGxlcik7XHJcblx0fVxyXG5cclxuXHRmdW5jdGlvbiBjaGVja1ZpZXcoZGF0YSwgdmlldywgY2FjaGVkLCBjYWNoZWRDb250cm9sbGVycywgY29udHJvbGxlcnMsIHZpZXdzKSB7XHJcblx0XHR2YXIgY29udHJvbGxlciA9IGdldENvbnRyb2xsZXIoY2FjaGVkLnZpZXdzLCB2aWV3LCBjYWNoZWRDb250cm9sbGVycywgZGF0YS5jb250cm9sbGVyKTtcclxuXHRcdC8vRmFzdGVyIHRvIGNvZXJjZSB0byBudW1iZXIgYW5kIGNoZWNrIGZvciBOYU5cclxuXHRcdHZhciBrZXkgPSArKGRhdGEgJiYgZGF0YS5hdHRycyAmJiBkYXRhLmF0dHJzLmtleSk7XHJcblx0XHRkYXRhID0gcGVuZGluZ1JlcXVlc3RzID09PSAwIHx8IGZvcmNpbmcgfHwgY2FjaGVkQ29udHJvbGxlcnMgJiYgY2FjaGVkQ29udHJvbGxlcnMuaW5kZXhPZihjb250cm9sbGVyKSA+IC0xID8gZGF0YS52aWV3KGNvbnRyb2xsZXIpIDoge3RhZzogXCJwbGFjZWhvbGRlclwifTtcclxuXHRcdGlmIChkYXRhLnN1YnRyZWUgPT09IFwicmV0YWluXCIpIHJldHVybiBjYWNoZWQ7XHJcblx0XHRpZiAoa2V5ID09PSBrZXkpIChkYXRhLmF0dHJzID0gZGF0YS5hdHRycyB8fCB7fSkua2V5ID0ga2V5O1xyXG5cdFx0dXBkYXRlTGlzdHModmlld3MsIGNvbnRyb2xsZXJzLCB2aWV3LCBjb250cm9sbGVyKTtcclxuXHRcdHJldHVybiBkYXRhO1xyXG5cdH1cclxuXHJcblx0ZnVuY3Rpb24gbWFya1ZpZXdzKGRhdGEsIGNhY2hlZCwgdmlld3MsIGNvbnRyb2xsZXJzKSB7XHJcblx0XHR2YXIgY2FjaGVkQ29udHJvbGxlcnMgPSBjYWNoZWQgJiYgY2FjaGVkLmNvbnRyb2xsZXJzO1xyXG5cdFx0d2hpbGUgKGRhdGEudmlldyAhPSBudWxsKSBkYXRhID0gY2hlY2tWaWV3KGRhdGEsIGRhdGEudmlldy4kb3JpZ2luYWwgfHwgZGF0YS52aWV3LCBjYWNoZWQsIGNhY2hlZENvbnRyb2xsZXJzLCBjb250cm9sbGVycywgdmlld3MpO1xyXG5cdFx0cmV0dXJuIGRhdGE7XHJcblx0fVxyXG5cclxuXHRmdW5jdGlvbiBidWlsZE9iamVjdChkYXRhLCBjYWNoZWQsIGVkaXRhYmxlLCBwYXJlbnRFbGVtZW50LCBpbmRleCwgc2hvdWxkUmVhdHRhY2gsIG5hbWVzcGFjZSwgY29uZmlncykge1xyXG5cdFx0dmFyIHZpZXdzID0gW10sIGNvbnRyb2xsZXJzID0gW107XHJcblx0XHRkYXRhID0gbWFya1ZpZXdzKGRhdGEsIGNhY2hlZCwgdmlld3MsIGNvbnRyb2xsZXJzKTtcclxuXHRcdGlmICghZGF0YS50YWcgJiYgY29udHJvbGxlcnMubGVuZ3RoKSB0aHJvdyBuZXcgRXJyb3IoXCJDb21wb25lbnQgdGVtcGxhdGUgbXVzdCByZXR1cm4gYSB2aXJ0dWFsIGVsZW1lbnQsIG5vdCBhbiBhcnJheSwgc3RyaW5nLCBldGMuXCIpO1xyXG5cdFx0ZGF0YS5hdHRycyA9IGRhdGEuYXR0cnMgfHwge307XHJcblx0XHRjYWNoZWQuYXR0cnMgPSBjYWNoZWQuYXR0cnMgfHwge307XHJcblx0XHR2YXIgZGF0YUF0dHJLZXlzID0gT2JqZWN0LmtleXMoZGF0YS5hdHRycyk7XHJcblx0XHR2YXIgaGFzS2V5cyA9IGRhdGFBdHRyS2V5cy5sZW5ndGggPiAoXCJrZXlcIiBpbiBkYXRhLmF0dHJzID8gMSA6IDApO1xyXG5cdFx0bWF5YmVSZWNyZWF0ZU9iamVjdChkYXRhLCBjYWNoZWQsIGRhdGFBdHRyS2V5cyk7XHJcblx0XHRpZiAoIWlzU3RyaW5nKGRhdGEudGFnKSkgcmV0dXJuO1xyXG5cdFx0dmFyIGlzTmV3ID0gY2FjaGVkLm5vZGVzLmxlbmd0aCA9PT0gMDtcclxuXHRcdG5hbWVzcGFjZSA9IGdldE9iamVjdE5hbWVzcGFjZShkYXRhLCBuYW1lc3BhY2UpO1xyXG5cdFx0dmFyIG5vZGU7XHJcblx0XHRpZiAoaXNOZXcpIHtcclxuXHRcdFx0bm9kZSA9IGNvbnN0cnVjdE5vZGUoZGF0YSwgbmFtZXNwYWNlKTtcclxuXHRcdFx0Ly9zZXQgYXR0cmlidXRlcyBmaXJzdCwgdGhlbiBjcmVhdGUgY2hpbGRyZW5cclxuXHRcdFx0dmFyIGF0dHJzID0gY29uc3RydWN0QXR0cnMoZGF0YSwgbm9kZSwgbmFtZXNwYWNlLCBoYXNLZXlzKVxyXG5cdFx0XHR2YXIgY2hpbGRyZW4gPSBjb25zdHJ1Y3RDaGlsZHJlbihkYXRhLCBub2RlLCBjYWNoZWQsIGVkaXRhYmxlLCBuYW1lc3BhY2UsIGNvbmZpZ3MpO1xyXG5cdFx0XHRjYWNoZWQgPSByZWNvbnN0cnVjdENhY2hlZChkYXRhLCBhdHRycywgY2hpbGRyZW4sIG5vZGUsIG5hbWVzcGFjZSwgdmlld3MsIGNvbnRyb2xsZXJzKTtcclxuXHRcdH1cclxuXHRcdGVsc2Uge1xyXG5cdFx0XHRub2RlID0gYnVpbGRVcGRhdGVkTm9kZShjYWNoZWQsIGRhdGEsIGVkaXRhYmxlLCBoYXNLZXlzLCBuYW1lc3BhY2UsIHZpZXdzLCBjb25maWdzLCBjb250cm9sbGVycyk7XHJcblx0XHR9XHJcblx0XHRpZiAoaXNOZXcgfHwgc2hvdWxkUmVhdHRhY2ggPT09IHRydWUgJiYgbm9kZSAhPSBudWxsKSBpbnNlcnROb2RlKHBhcmVudEVsZW1lbnQsIG5vZGUsIGluZGV4KTtcclxuXHRcdC8vc2NoZWR1bGUgY29uZmlncyB0byBiZSBjYWxsZWQuIFRoZXkgYXJlIGNhbGxlZCBhZnRlciBgYnVpbGRgXHJcblx0XHQvL2ZpbmlzaGVzIHJ1bm5pbmdcclxuXHRcdHNjaGVkdWxlQ29uZmlnc1RvQmVDYWxsZWQoY29uZmlncywgZGF0YSwgbm9kZSwgaXNOZXcsIGNhY2hlZCk7XHJcblx0XHRyZXR1cm4gY2FjaGVkXHJcblx0fVxyXG5cclxuXHRmdW5jdGlvbiBidWlsZChwYXJlbnRFbGVtZW50LCBwYXJlbnRUYWcsIHBhcmVudENhY2hlLCBwYXJlbnRJbmRleCwgZGF0YSwgY2FjaGVkLCBzaG91bGRSZWF0dGFjaCwgaW5kZXgsIGVkaXRhYmxlLCBuYW1lc3BhY2UsIGNvbmZpZ3MpIHtcclxuXHRcdC8vYGJ1aWxkYCBpcyBhIHJlY3Vyc2l2ZSBmdW5jdGlvbiB0aGF0IG1hbmFnZXMgY3JlYXRpb24vZGlmZmluZy9yZW1vdmFsXHJcblx0XHQvL29mIERPTSBlbGVtZW50cyBiYXNlZCBvbiBjb21wYXJpc29uIGJldHdlZW4gYGRhdGFgIGFuZCBgY2FjaGVkYFxyXG5cdFx0Ly90aGUgZGlmZiBhbGdvcml0aG0gY2FuIGJlIHN1bW1hcml6ZWQgYXMgdGhpczpcclxuXHRcdC8vMSAtIGNvbXBhcmUgYGRhdGFgIGFuZCBgY2FjaGVkYFxyXG5cdFx0Ly8yIC0gaWYgdGhleSBhcmUgZGlmZmVyZW50LCBjb3B5IGBkYXRhYCB0byBgY2FjaGVkYCBhbmQgdXBkYXRlIHRoZSBET01cclxuXHRcdC8vICAgIGJhc2VkIG9uIHdoYXQgdGhlIGRpZmZlcmVuY2UgaXNcclxuXHRcdC8vMyAtIHJlY3Vyc2l2ZWx5IGFwcGx5IHRoaXMgYWxnb3JpdGhtIGZvciBldmVyeSBhcnJheSBhbmQgZm9yIHRoZVxyXG5cdFx0Ly8gICAgY2hpbGRyZW4gb2YgZXZlcnkgdmlydHVhbCBlbGVtZW50XHJcblxyXG5cdFx0Ly90aGUgYGNhY2hlZGAgZGF0YSBzdHJ1Y3R1cmUgaXMgZXNzZW50aWFsbHkgdGhlIHNhbWUgYXMgdGhlIHByZXZpb3VzXHJcblx0XHQvL3JlZHJhdydzIGBkYXRhYCBkYXRhIHN0cnVjdHVyZSwgd2l0aCBhIGZldyBhZGRpdGlvbnM6XHJcblx0XHQvLy0gYGNhY2hlZGAgYWx3YXlzIGhhcyBhIHByb3BlcnR5IGNhbGxlZCBgbm9kZXNgLCB3aGljaCBpcyBhIGxpc3Qgb2ZcclxuXHRcdC8vICAgRE9NIGVsZW1lbnRzIHRoYXQgY29ycmVzcG9uZCB0byB0aGUgZGF0YSByZXByZXNlbnRlZCBieSB0aGVcclxuXHRcdC8vICAgcmVzcGVjdGl2ZSB2aXJ0dWFsIGVsZW1lbnRcclxuXHRcdC8vLSBpbiBvcmRlciB0byBzdXBwb3J0IGF0dGFjaGluZyBgbm9kZXNgIGFzIGEgcHJvcGVydHkgb2YgYGNhY2hlZGAsXHJcblx0XHQvLyAgIGBjYWNoZWRgIGlzICphbHdheXMqIGEgbm9uLXByaW1pdGl2ZSBvYmplY3QsIGkuZS4gaWYgdGhlIGRhdGEgd2FzXHJcblx0XHQvLyAgIGEgc3RyaW5nLCB0aGVuIGNhY2hlZCBpcyBhIFN0cmluZyBpbnN0YW5jZS4gSWYgZGF0YSB3YXMgYG51bGxgIG9yXHJcblx0XHQvLyAgIGB1bmRlZmluZWRgLCBjYWNoZWQgaXMgYG5ldyBTdHJpbmcoXCJcIilgXHJcblx0XHQvLy0gYGNhY2hlZCBhbHNvIGhhcyBhIGBjb25maWdDb250ZXh0YCBwcm9wZXJ0eSwgd2hpY2ggaXMgdGhlIHN0YXRlXHJcblx0XHQvLyAgIHN0b3JhZ2Ugb2JqZWN0IGV4cG9zZWQgYnkgY29uZmlnKGVsZW1lbnQsIGlzSW5pdGlhbGl6ZWQsIGNvbnRleHQpXHJcblx0XHQvLy0gd2hlbiBgY2FjaGVkYCBpcyBhbiBPYmplY3QsIGl0IHJlcHJlc2VudHMgYSB2aXJ0dWFsIGVsZW1lbnQ7IHdoZW5cclxuXHRcdC8vICAgaXQncyBhbiBBcnJheSwgaXQgcmVwcmVzZW50cyBhIGxpc3Qgb2YgZWxlbWVudHM7IHdoZW4gaXQncyBhXHJcblx0XHQvLyAgIFN0cmluZywgTnVtYmVyIG9yIEJvb2xlYW4sIGl0IHJlcHJlc2VudHMgYSB0ZXh0IG5vZGVcclxuXHJcblx0XHQvL2BwYXJlbnRFbGVtZW50YCBpcyBhIERPTSBlbGVtZW50IHVzZWQgZm9yIFczQyBET00gQVBJIGNhbGxzXHJcblx0XHQvL2BwYXJlbnRUYWdgIGlzIG9ubHkgdXNlZCBmb3IgaGFuZGxpbmcgYSBjb3JuZXIgY2FzZSBmb3IgdGV4dGFyZWFcclxuXHRcdC8vdmFsdWVzXHJcblx0XHQvL2BwYXJlbnRDYWNoZWAgaXMgdXNlZCB0byByZW1vdmUgbm9kZXMgaW4gc29tZSBtdWx0aS1ub2RlIGNhc2VzXHJcblx0XHQvL2BwYXJlbnRJbmRleGAgYW5kIGBpbmRleGAgYXJlIHVzZWQgdG8gZmlndXJlIG91dCB0aGUgb2Zmc2V0IG9mIG5vZGVzLlxyXG5cdFx0Ly9UaGV5J3JlIGFydGlmYWN0cyBmcm9tIGJlZm9yZSBhcnJheXMgc3RhcnRlZCBiZWluZyBmbGF0dGVuZWQgYW5kIGFyZVxyXG5cdFx0Ly9saWtlbHkgcmVmYWN0b3JhYmxlXHJcblx0XHQvL2BkYXRhYCBhbmQgYGNhY2hlZGAgYXJlLCByZXNwZWN0aXZlbHksIHRoZSBuZXcgYW5kIG9sZCBub2RlcyBiZWluZ1xyXG5cdFx0Ly9kaWZmZWRcclxuXHRcdC8vYHNob3VsZFJlYXR0YWNoYCBpcyBhIGZsYWcgaW5kaWNhdGluZyB3aGV0aGVyIGEgcGFyZW50IG5vZGUgd2FzXHJcblx0XHQvL3JlY3JlYXRlZCAoaWYgc28sIGFuZCBpZiB0aGlzIG5vZGUgaXMgcmV1c2VkLCB0aGVuIHRoaXMgbm9kZSBtdXN0XHJcblx0XHQvL3JlYXR0YWNoIGl0c2VsZiB0byB0aGUgbmV3IHBhcmVudClcclxuXHRcdC8vYGVkaXRhYmxlYCBpcyBhIGZsYWcgdGhhdCBpbmRpY2F0ZXMgd2hldGhlciBhbiBhbmNlc3RvciBpc1xyXG5cdFx0Ly9jb250ZW50ZWRpdGFibGVcclxuXHRcdC8vYG5hbWVzcGFjZWAgaW5kaWNhdGVzIHRoZSBjbG9zZXN0IEhUTUwgbmFtZXNwYWNlIGFzIGl0IGNhc2NhZGVzIGRvd25cclxuXHRcdC8vZnJvbSBhbiBhbmNlc3RvclxyXG5cdFx0Ly9gY29uZmlnc2AgaXMgYSBsaXN0IG9mIGNvbmZpZyBmdW5jdGlvbnMgdG8gcnVuIGFmdGVyIHRoZSB0b3Btb3N0XHJcblx0XHQvL2BidWlsZGAgY2FsbCBmaW5pc2hlcyBydW5uaW5nXHJcblxyXG5cdFx0Ly90aGVyZSdzIGxvZ2ljIHRoYXQgcmVsaWVzIG9uIHRoZSBhc3N1bXB0aW9uIHRoYXQgbnVsbCBhbmQgdW5kZWZpbmVkXHJcblx0XHQvL2RhdGEgYXJlIGVxdWl2YWxlbnQgdG8gZW1wdHkgc3RyaW5nc1xyXG5cdFx0Ly8tIHRoaXMgcHJldmVudHMgbGlmZWN5Y2xlIHN1cnByaXNlcyBmcm9tIHByb2NlZHVyYWwgaGVscGVycyB0aGF0IG1peFxyXG5cdFx0Ly8gIGltcGxpY2l0IGFuZCBleHBsaWNpdCByZXR1cm4gc3RhdGVtZW50cyAoZS5nLlxyXG5cdFx0Ly8gIGZ1bmN0aW9uIGZvbygpIHtpZiAoY29uZCkgcmV0dXJuIG0oXCJkaXZcIil9XHJcblx0XHQvLy0gaXQgc2ltcGxpZmllcyBkaWZmaW5nIGNvZGVcclxuXHRcdGRhdGEgPSBkYXRhVG9TdHJpbmcoZGF0YSk7XHJcblx0XHRpZiAoZGF0YS5zdWJ0cmVlID09PSBcInJldGFpblwiKSByZXR1cm4gY2FjaGVkO1xyXG5cdFx0Y2FjaGVkID0gbWFrZUNhY2hlKGRhdGEsIGNhY2hlZCwgaW5kZXgsIHBhcmVudEluZGV4LCBwYXJlbnRDYWNoZSk7XHJcblx0XHRyZXR1cm4gaXNBcnJheShkYXRhKSA/IGJ1aWxkQXJyYXkoZGF0YSwgY2FjaGVkLCBwYXJlbnRFbGVtZW50LCBpbmRleCwgcGFyZW50VGFnLCBzaG91bGRSZWF0dGFjaCwgZWRpdGFibGUsIG5hbWVzcGFjZSwgY29uZmlncykgOlxyXG5cdFx0XHRkYXRhICE9IG51bGwgJiYgaXNPYmplY3QoZGF0YSkgPyBidWlsZE9iamVjdChkYXRhLCBjYWNoZWQsIGVkaXRhYmxlLCBwYXJlbnRFbGVtZW50LCBpbmRleCwgc2hvdWxkUmVhdHRhY2gsIG5hbWVzcGFjZSwgY29uZmlncykgOlxyXG5cdFx0XHQhaXNGdW5jdGlvbihkYXRhKSA/IGhhbmRsZVRleHQoY2FjaGVkLCBkYXRhLCBpbmRleCwgcGFyZW50RWxlbWVudCwgc2hvdWxkUmVhdHRhY2gsIGVkaXRhYmxlLCBwYXJlbnRUYWcpIDpcclxuXHRcdFx0Y2FjaGVkO1xyXG5cdH1cclxuXHRmdW5jdGlvbiBzb3J0Q2hhbmdlcyhhLCBiKSB7IHJldHVybiBhLmFjdGlvbiAtIGIuYWN0aW9uIHx8IGEuaW5kZXggLSBiLmluZGV4OyB9XHJcblx0ZnVuY3Rpb24gc2V0QXR0cmlidXRlcyhub2RlLCB0YWcsIGRhdGFBdHRycywgY2FjaGVkQXR0cnMsIG5hbWVzcGFjZSkge1xyXG5cdFx0Zm9yICh2YXIgYXR0ck5hbWUgaW4gZGF0YUF0dHJzKSB7XHJcblx0XHRcdHZhciBkYXRhQXR0ciA9IGRhdGFBdHRyc1thdHRyTmFtZV07XHJcblx0XHRcdHZhciBjYWNoZWRBdHRyID0gY2FjaGVkQXR0cnNbYXR0ck5hbWVdO1xyXG5cdFx0XHRpZiAoIShhdHRyTmFtZSBpbiBjYWNoZWRBdHRycykgfHwgKGNhY2hlZEF0dHIgIT09IGRhdGFBdHRyKSkge1xyXG5cdFx0XHRcdGNhY2hlZEF0dHJzW2F0dHJOYW1lXSA9IGRhdGFBdHRyO1xyXG5cdFx0XHRcdC8vYGNvbmZpZ2AgaXNuJ3QgYSByZWFsIGF0dHJpYnV0ZXMsIHNvIGlnbm9yZSBpdFxyXG5cdFx0XHRcdGlmIChhdHRyTmFtZSA9PT0gXCJjb25maWdcIiB8fCBhdHRyTmFtZSA9PT0gXCJrZXlcIikgY29udGludWU7XHJcblx0XHRcdFx0Ly9ob29rIGV2ZW50IGhhbmRsZXJzIHRvIHRoZSBhdXRvLXJlZHJhd2luZyBzeXN0ZW1cclxuXHRcdFx0XHRlbHNlIGlmIChpc0Z1bmN0aW9uKGRhdGFBdHRyKSAmJiBhdHRyTmFtZS5zbGljZSgwLCAyKSA9PT0gXCJvblwiKSB7XHJcblx0XHRcdFx0bm9kZVthdHRyTmFtZV0gPSBhdXRvcmVkcmF3KGRhdGFBdHRyLCBub2RlKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0Ly9oYW5kbGUgYHN0eWxlOiB7Li4ufWBcclxuXHRcdFx0XHRlbHNlIGlmIChhdHRyTmFtZSA9PT0gXCJzdHlsZVwiICYmIGRhdGFBdHRyICE9IG51bGwgJiYgaXNPYmplY3QoZGF0YUF0dHIpKSB7XHJcblx0XHRcdFx0Zm9yICh2YXIgcnVsZSBpbiBkYXRhQXR0cikge1xyXG5cdFx0XHRcdFx0XHRpZiAoY2FjaGVkQXR0ciA9PSBudWxsIHx8IGNhY2hlZEF0dHJbcnVsZV0gIT09IGRhdGFBdHRyW3J1bGVdKSBub2RlLnN0eWxlW3J1bGVdID0gZGF0YUF0dHJbcnVsZV07XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdGZvciAodmFyIHJ1bGUgaW4gY2FjaGVkQXR0cikge1xyXG5cdFx0XHRcdFx0XHRpZiAoIShydWxlIGluIGRhdGFBdHRyKSkgbm9kZS5zdHlsZVtydWxlXSA9IFwiXCI7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHQvL2hhbmRsZSBTVkdcclxuXHRcdFx0XHRlbHNlIGlmIChuYW1lc3BhY2UgIT0gbnVsbCkge1xyXG5cdFx0XHRcdGlmIChhdHRyTmFtZSA9PT0gXCJocmVmXCIpIG5vZGUuc2V0QXR0cmlidXRlTlMoXCJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rXCIsIFwiaHJlZlwiLCBkYXRhQXR0cik7XHJcblx0XHRcdFx0ZWxzZSBub2RlLnNldEF0dHJpYnV0ZShhdHRyTmFtZSA9PT0gXCJjbGFzc05hbWVcIiA/IFwiY2xhc3NcIiA6IGF0dHJOYW1lLCBkYXRhQXR0cik7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdC8vaGFuZGxlIGNhc2VzIHRoYXQgYXJlIHByb3BlcnRpZXMgKGJ1dCBpZ25vcmUgY2FzZXMgd2hlcmUgd2Ugc2hvdWxkIHVzZSBzZXRBdHRyaWJ1dGUgaW5zdGVhZClcclxuXHRcdFx0XHQvLy0gbGlzdCBhbmQgZm9ybSBhcmUgdHlwaWNhbGx5IHVzZWQgYXMgc3RyaW5ncywgYnV0IGFyZSBET00gZWxlbWVudCByZWZlcmVuY2VzIGluIGpzXHJcblx0XHRcdFx0Ly8tIHdoZW4gdXNpbmcgQ1NTIHNlbGVjdG9ycyAoZS5nLiBgbShcIltzdHlsZT0nJ11cIilgKSwgc3R5bGUgaXMgdXNlZCBhcyBhIHN0cmluZywgYnV0IGl0J3MgYW4gb2JqZWN0IGluIGpzXHJcblx0XHRcdFx0ZWxzZSBpZiAoYXR0ck5hbWUgaW4gbm9kZSAmJiBhdHRyTmFtZSAhPT0gXCJsaXN0XCIgJiYgYXR0ck5hbWUgIT09IFwic3R5bGVcIiAmJiBhdHRyTmFtZSAhPT0gXCJmb3JtXCIgJiYgYXR0ck5hbWUgIT09IFwidHlwZVwiICYmIGF0dHJOYW1lICE9PSBcIndpZHRoXCIgJiYgYXR0ck5hbWUgIT09IFwiaGVpZ2h0XCIpIHtcclxuXHRcdFx0XHQvLyMzNDggZG9uJ3Qgc2V0IHRoZSB2YWx1ZSBpZiBub3QgbmVlZGVkIG90aGVyd2lzZSBjdXJzb3IgcGxhY2VtZW50IGJyZWFrcyBpbiBDaHJvbWVcclxuXHRcdFx0XHRpZiAodGFnICE9PSBcImlucHV0XCIgfHwgbm9kZVthdHRyTmFtZV0gIT09IGRhdGFBdHRyKSBub2RlW2F0dHJOYW1lXSA9IGRhdGFBdHRyO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRlbHNlIG5vZGUuc2V0QXR0cmlidXRlKGF0dHJOYW1lLCBkYXRhQXR0cik7XHJcblx0XHRcdH1cclxuXHRcdFx0Ly8jMzQ4IGRhdGFBdHRyIG1heSBub3QgYmUgYSBzdHJpbmcsIHNvIHVzZSBsb29zZSBjb21wYXJpc29uIChkb3VibGUgZXF1YWwpIGluc3RlYWQgb2Ygc3RyaWN0ICh0cmlwbGUgZXF1YWwpXHJcblx0XHRcdGVsc2UgaWYgKGF0dHJOYW1lID09PSBcInZhbHVlXCIgJiYgdGFnID09PSBcImlucHV0XCIgJiYgbm9kZS52YWx1ZSAhPSBkYXRhQXR0cikge1xyXG5cdFx0XHRcdG5vZGUudmFsdWUgPSBkYXRhQXR0cjtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdFx0cmV0dXJuIGNhY2hlZEF0dHJzO1xyXG5cdH1cclxuXHRmdW5jdGlvbiBjbGVhcihub2RlcywgY2FjaGVkKSB7XHJcblx0XHRmb3IgKHZhciBpID0gbm9kZXMubGVuZ3RoIC0gMTsgaSA+IC0xOyBpLS0pIHtcclxuXHRcdFx0aWYgKG5vZGVzW2ldICYmIG5vZGVzW2ldLnBhcmVudE5vZGUpIHtcclxuXHRcdFx0XHR0cnkgeyBub2Rlc1tpXS5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKG5vZGVzW2ldKTsgfVxyXG5cdFx0XHRcdGNhdGNoIChlKSB7fSAvL2lnbm9yZSBpZiB0aGlzIGZhaWxzIGR1ZSB0byBvcmRlciBvZiBldmVudHMgKHNlZSBodHRwOi8vc3RhY2tvdmVyZmxvdy5jb20vcXVlc3Rpb25zLzIxOTI2MDgzL2ZhaWxlZC10by1leGVjdXRlLXJlbW92ZWNoaWxkLW9uLW5vZGUpXHJcblx0XHRcdFx0Y2FjaGVkID0gW10uY29uY2F0KGNhY2hlZCk7XHJcblx0XHRcdFx0aWYgKGNhY2hlZFtpXSkgdW5sb2FkKGNhY2hlZFtpXSk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHRcdC8vcmVsZWFzZSBtZW1vcnkgaWYgbm9kZXMgaXMgYW4gYXJyYXkuIFRoaXMgY2hlY2sgc2hvdWxkIGZhaWwgaWYgbm9kZXMgaXMgYSBOb2RlTGlzdCAoc2VlIGxvb3AgYWJvdmUpXHJcblx0XHRpZiAobm9kZXMubGVuZ3RoKSBub2Rlcy5sZW5ndGggPSAwO1xyXG5cdH1cclxuXHRmdW5jdGlvbiB1bmxvYWQoY2FjaGVkKSB7XHJcblx0XHRpZiAoY2FjaGVkLmNvbmZpZ0NvbnRleHQgJiYgaXNGdW5jdGlvbihjYWNoZWQuY29uZmlnQ29udGV4dC5vbnVubG9hZCkpIHtcclxuXHRcdFx0Y2FjaGVkLmNvbmZpZ0NvbnRleHQub251bmxvYWQoKTtcclxuXHRcdFx0Y2FjaGVkLmNvbmZpZ0NvbnRleHQub251bmxvYWQgPSBudWxsO1xyXG5cdFx0fVxyXG5cdFx0aWYgKGNhY2hlZC5jb250cm9sbGVycykge1xyXG5cdFx0XHRmb3JFYWNoKGNhY2hlZC5jb250cm9sbGVycywgZnVuY3Rpb24gKGNvbnRyb2xsZXIpIHtcclxuXHRcdFx0XHRpZiAoaXNGdW5jdGlvbihjb250cm9sbGVyLm9udW5sb2FkKSkgY29udHJvbGxlci5vbnVubG9hZCh7cHJldmVudERlZmF1bHQ6IG5vb3B9KTtcclxuXHRcdFx0fSk7XHJcblx0XHR9XHJcblx0XHRpZiAoY2FjaGVkLmNoaWxkcmVuKSB7XHJcblx0XHRcdGlmIChpc0FycmF5KGNhY2hlZC5jaGlsZHJlbikpIGZvckVhY2goY2FjaGVkLmNoaWxkcmVuLCB1bmxvYWQpO1xyXG5cdFx0XHRlbHNlIGlmIChjYWNoZWQuY2hpbGRyZW4udGFnKSB1bmxvYWQoY2FjaGVkLmNoaWxkcmVuKTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdHZhciBpbnNlcnRBZGphY2VudEJlZm9yZUVuZCA9IChmdW5jdGlvbiAoKSB7XHJcblx0XHR2YXIgcmFuZ2VTdHJhdGVneSA9IGZ1bmN0aW9uIChwYXJlbnRFbGVtZW50LCBkYXRhKSB7XHJcblx0XHRcdHBhcmVudEVsZW1lbnQuYXBwZW5kQ2hpbGQoJGRvY3VtZW50LmNyZWF0ZVJhbmdlKCkuY3JlYXRlQ29udGV4dHVhbEZyYWdtZW50KGRhdGEpKTtcclxuXHRcdH07XHJcblx0XHR2YXIgaW5zZXJ0QWRqYWNlbnRTdHJhdGVneSA9IGZ1bmN0aW9uIChwYXJlbnRFbGVtZW50LCBkYXRhKSB7XHJcblx0XHRcdHBhcmVudEVsZW1lbnQuaW5zZXJ0QWRqYWNlbnRIVE1MKFwiYmVmb3JlZW5kXCIsIGRhdGEpO1xyXG5cdFx0fTtcclxuXHJcblx0XHR0cnkge1xyXG5cdFx0XHQkZG9jdW1lbnQuY3JlYXRlUmFuZ2UoKS5jcmVhdGVDb250ZXh0dWFsRnJhZ21lbnQoJ3gnKTtcclxuXHRcdFx0cmV0dXJuIHJhbmdlU3RyYXRlZ3k7XHJcblx0XHR9IGNhdGNoIChlKSB7XHJcblx0XHRcdHJldHVybiBpbnNlcnRBZGphY2VudFN0cmF0ZWd5O1xyXG5cdFx0fVxyXG5cdH0pKCk7XHJcblxyXG5cdGZ1bmN0aW9uIGluamVjdEhUTUwocGFyZW50RWxlbWVudCwgaW5kZXgsIGRhdGEpIHtcclxuXHRcdHZhciBuZXh0U2libGluZyA9IHBhcmVudEVsZW1lbnQuY2hpbGROb2Rlc1tpbmRleF07XHJcblx0XHRpZiAobmV4dFNpYmxpbmcpIHtcclxuXHRcdFx0dmFyIGlzRWxlbWVudCA9IG5leHRTaWJsaW5nLm5vZGVUeXBlICE9PSAxO1xyXG5cdFx0XHR2YXIgcGxhY2Vob2xkZXIgPSAkZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcInNwYW5cIik7XHJcblx0XHRcdGlmIChpc0VsZW1lbnQpIHtcclxuXHRcdFx0XHRwYXJlbnRFbGVtZW50Lmluc2VydEJlZm9yZShwbGFjZWhvbGRlciwgbmV4dFNpYmxpbmcgfHwgbnVsbCk7XHJcblx0XHRcdFx0cGxhY2Vob2xkZXIuaW5zZXJ0QWRqYWNlbnRIVE1MKFwiYmVmb3JlYmVnaW5cIiwgZGF0YSk7XHJcblx0XHRcdFx0cGFyZW50RWxlbWVudC5yZW1vdmVDaGlsZChwbGFjZWhvbGRlcik7XHJcblx0XHRcdH1cclxuXHRcdFx0ZWxzZSBuZXh0U2libGluZy5pbnNlcnRBZGphY2VudEhUTUwoXCJiZWZvcmViZWdpblwiLCBkYXRhKTtcclxuXHRcdH1cclxuXHRcdGVsc2UgaW5zZXJ0QWRqYWNlbnRCZWZvcmVFbmQocGFyZW50RWxlbWVudCwgZGF0YSk7XHJcblxyXG5cdFx0dmFyIG5vZGVzID0gW107XHJcblx0XHR3aGlsZSAocGFyZW50RWxlbWVudC5jaGlsZE5vZGVzW2luZGV4XSAhPT0gbmV4dFNpYmxpbmcpIHtcclxuXHRcdFx0bm9kZXMucHVzaChwYXJlbnRFbGVtZW50LmNoaWxkTm9kZXNbaW5kZXhdKTtcclxuXHRcdFx0aW5kZXgrKztcclxuXHRcdH1cclxuXHRcdHJldHVybiBub2RlcztcclxuXHR9XHJcblx0ZnVuY3Rpb24gYXV0b3JlZHJhdyhjYWxsYmFjaywgb2JqZWN0KSB7XHJcblx0XHRyZXR1cm4gZnVuY3Rpb24oZSkge1xyXG5cdFx0XHRlID0gZSB8fCBldmVudDtcclxuXHRcdFx0bS5yZWRyYXcuc3RyYXRlZ3koXCJkaWZmXCIpO1xyXG5cdFx0XHRtLnN0YXJ0Q29tcHV0YXRpb24oKTtcclxuXHRcdFx0dHJ5IHsgcmV0dXJuIGNhbGxiYWNrLmNhbGwob2JqZWN0LCBlKTsgfVxyXG5cdFx0XHRmaW5hbGx5IHtcclxuXHRcdFx0XHRlbmRGaXJzdENvbXB1dGF0aW9uKCk7XHJcblx0XHRcdH1cclxuXHRcdH07XHJcblx0fVxyXG5cclxuXHR2YXIgaHRtbDtcclxuXHR2YXIgZG9jdW1lbnROb2RlID0ge1xyXG5cdFx0YXBwZW5kQ2hpbGQ6IGZ1bmN0aW9uKG5vZGUpIHtcclxuXHRcdFx0aWYgKGh0bWwgPT09IHVuZGVmaW5lZCkgaHRtbCA9ICRkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiaHRtbFwiKTtcclxuXHRcdFx0aWYgKCRkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQgJiYgJGRvY3VtZW50LmRvY3VtZW50RWxlbWVudCAhPT0gbm9kZSkge1xyXG5cdFx0XHRcdCRkb2N1bWVudC5yZXBsYWNlQ2hpbGQobm9kZSwgJGRvY3VtZW50LmRvY3VtZW50RWxlbWVudCk7XHJcblx0XHRcdH1cclxuXHRcdFx0ZWxzZSAkZG9jdW1lbnQuYXBwZW5kQ2hpbGQobm9kZSk7XHJcblx0XHRcdHRoaXMuY2hpbGROb2RlcyA9ICRkb2N1bWVudC5jaGlsZE5vZGVzO1xyXG5cdFx0fSxcclxuXHRcdGluc2VydEJlZm9yZTogZnVuY3Rpb24obm9kZSkge1xyXG5cdFx0XHR0aGlzLmFwcGVuZENoaWxkKG5vZGUpO1xyXG5cdFx0fSxcclxuXHRcdGNoaWxkTm9kZXM6IFtdXHJcblx0fTtcclxuXHR2YXIgbm9kZUNhY2hlID0gW10sIGNlbGxDYWNoZSA9IHt9O1xyXG5cdG0ucmVuZGVyID0gZnVuY3Rpb24ocm9vdCwgY2VsbCwgZm9yY2VSZWNyZWF0aW9uKSB7XHJcblx0XHR2YXIgY29uZmlncyA9IFtdO1xyXG5cdFx0aWYgKCFyb290KSB0aHJvdyBuZXcgRXJyb3IoXCJFbnN1cmUgdGhlIERPTSBlbGVtZW50IGJlaW5nIHBhc3NlZCB0byBtLnJvdXRlL20ubW91bnQvbS5yZW5kZXIgaXMgbm90IHVuZGVmaW5lZC5cIik7XHJcblx0XHR2YXIgaWQgPSBnZXRDZWxsQ2FjaGVLZXkocm9vdCk7XHJcblx0XHR2YXIgaXNEb2N1bWVudFJvb3QgPSByb290ID09PSAkZG9jdW1lbnQ7XHJcblx0XHR2YXIgbm9kZSA9IGlzRG9jdW1lbnRSb290IHx8IHJvb3QgPT09ICRkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQgPyBkb2N1bWVudE5vZGUgOiByb290O1xyXG5cdFx0aWYgKGlzRG9jdW1lbnRSb290ICYmIGNlbGwudGFnICE9PSBcImh0bWxcIikgY2VsbCA9IHt0YWc6IFwiaHRtbFwiLCBhdHRyczoge30sIGNoaWxkcmVuOiBjZWxsfTtcclxuXHRcdGlmIChjZWxsQ2FjaGVbaWRdID09PSB1bmRlZmluZWQpIGNsZWFyKG5vZGUuY2hpbGROb2Rlcyk7XHJcblx0XHRpZiAoZm9yY2VSZWNyZWF0aW9uID09PSB0cnVlKSByZXNldChyb290KTtcclxuXHRcdGNlbGxDYWNoZVtpZF0gPSBidWlsZChub2RlLCBudWxsLCB1bmRlZmluZWQsIHVuZGVmaW5lZCwgY2VsbCwgY2VsbENhY2hlW2lkXSwgZmFsc2UsIDAsIG51bGwsIHVuZGVmaW5lZCwgY29uZmlncyk7XHJcblx0XHRmb3JFYWNoKGNvbmZpZ3MsIGZ1bmN0aW9uIChjb25maWcpIHsgY29uZmlnKCk7IH0pO1xyXG5cdH07XHJcblx0ZnVuY3Rpb24gZ2V0Q2VsbENhY2hlS2V5KGVsZW1lbnQpIHtcclxuXHRcdHZhciBpbmRleCA9IG5vZGVDYWNoZS5pbmRleE9mKGVsZW1lbnQpO1xyXG5cdFx0cmV0dXJuIGluZGV4IDwgMCA/IG5vZGVDYWNoZS5wdXNoKGVsZW1lbnQpIC0gMSA6IGluZGV4O1xyXG5cdH1cclxuXHJcblx0bS50cnVzdCA9IGZ1bmN0aW9uKHZhbHVlKSB7XHJcblx0XHR2YWx1ZSA9IG5ldyBTdHJpbmcodmFsdWUpO1xyXG5cdFx0dmFsdWUuJHRydXN0ZWQgPSB0cnVlO1xyXG5cdFx0cmV0dXJuIHZhbHVlO1xyXG5cdH07XHJcblxyXG5cdGZ1bmN0aW9uIGdldHRlcnNldHRlcihzdG9yZSkge1xyXG5cdFx0dmFyIHByb3AgPSBmdW5jdGlvbigpIHtcclxuXHRcdFx0aWYgKGFyZ3VtZW50cy5sZW5ndGgpIHN0b3JlID0gYXJndW1lbnRzWzBdO1xyXG5cdFx0XHRyZXR1cm4gc3RvcmU7XHJcblx0XHR9O1xyXG5cclxuXHRcdHByb3AudG9KU09OID0gZnVuY3Rpb24oKSB7XHJcblx0XHRcdHJldHVybiBzdG9yZTtcclxuXHRcdH07XHJcblxyXG5cdFx0cmV0dXJuIHByb3A7XHJcblx0fVxyXG5cclxuXHRtLnByb3AgPSBmdW5jdGlvbiAoc3RvcmUpIHtcclxuXHRcdC8vbm90ZTogdXNpbmcgbm9uLXN0cmljdCBlcXVhbGl0eSBjaGVjayBoZXJlIGJlY2F1c2Ugd2UncmUgY2hlY2tpbmcgaWYgc3RvcmUgaXMgbnVsbCBPUiB1bmRlZmluZWRcclxuXHRcdGlmICgoc3RvcmUgIT0gbnVsbCAmJiBpc09iamVjdChzdG9yZSkgfHwgaXNGdW5jdGlvbihzdG9yZSkpICYmIGlzRnVuY3Rpb24oc3RvcmUudGhlbikpIHtcclxuXHRcdFx0cmV0dXJuIHByb3BpZnkoc3RvcmUpO1xyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiBnZXR0ZXJzZXR0ZXIoc3RvcmUpO1xyXG5cdH07XHJcblxyXG5cdHZhciByb290cyA9IFtdLCBjb21wb25lbnRzID0gW10sIGNvbnRyb2xsZXJzID0gW10sIGxhc3RSZWRyYXdJZCA9IG51bGwsIGxhc3RSZWRyYXdDYWxsVGltZSA9IDAsIGNvbXB1dGVQcmVSZWRyYXdIb29rID0gbnVsbCwgY29tcHV0ZVBvc3RSZWRyYXdIb29rID0gbnVsbCwgdG9wQ29tcG9uZW50LCB1bmxvYWRlcnMgPSBbXTtcclxuXHR2YXIgRlJBTUVfQlVER0VUID0gMTY7IC8vNjAgZnJhbWVzIHBlciBzZWNvbmQgPSAxIGNhbGwgcGVyIDE2IG1zXHJcblx0ZnVuY3Rpb24gcGFyYW1ldGVyaXplKGNvbXBvbmVudCwgYXJncykge1xyXG5cdFx0dmFyIGNvbnRyb2xsZXIgPSBmdW5jdGlvbigpIHtcclxuXHRcdFx0cmV0dXJuIChjb21wb25lbnQuY29udHJvbGxlciB8fCBub29wKS5hcHBseSh0aGlzLCBhcmdzKSB8fCB0aGlzO1xyXG5cdFx0fTtcclxuXHRcdGlmIChjb21wb25lbnQuY29udHJvbGxlcikgY29udHJvbGxlci5wcm90b3R5cGUgPSBjb21wb25lbnQuY29udHJvbGxlci5wcm90b3R5cGU7XHJcblx0XHR2YXIgdmlldyA9IGZ1bmN0aW9uKGN0cmwpIHtcclxuXHRcdFx0dmFyIGN1cnJlbnRBcmdzID0gYXJndW1lbnRzLmxlbmd0aCA+IDEgPyBhcmdzLmNvbmNhdChbXS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMSkpIDogYXJncztcclxuXHRcdFx0cmV0dXJuIGNvbXBvbmVudC52aWV3LmFwcGx5KGNvbXBvbmVudCwgY3VycmVudEFyZ3MgPyBbY3RybF0uY29uY2F0KGN1cnJlbnRBcmdzKSA6IFtjdHJsXSk7XHJcblx0XHR9O1xyXG5cdFx0dmlldy4kb3JpZ2luYWwgPSBjb21wb25lbnQudmlldztcclxuXHRcdHZhciBvdXRwdXQgPSB7Y29udHJvbGxlcjogY29udHJvbGxlciwgdmlldzogdmlld307XHJcblx0XHRpZiAoYXJnc1swXSAmJiBhcmdzWzBdLmtleSAhPSBudWxsKSBvdXRwdXQuYXR0cnMgPSB7a2V5OiBhcmdzWzBdLmtleX07XHJcblx0XHRyZXR1cm4gb3V0cHV0O1xyXG5cdH1cclxuXHRtLmNvbXBvbmVudCA9IGZ1bmN0aW9uKGNvbXBvbmVudCkge1xyXG5cdFx0Zm9yICh2YXIgYXJncyA9IFtdLCBpID0gMTsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykgYXJncy5wdXNoKGFyZ3VtZW50c1tpXSk7XHJcblx0XHRyZXR1cm4gcGFyYW1ldGVyaXplKGNvbXBvbmVudCwgYXJncyk7XHJcblx0fTtcclxuXHRtLm1vdW50ID0gbS5tb2R1bGUgPSBmdW5jdGlvbihyb290LCBjb21wb25lbnQpIHtcclxuXHRcdGlmICghcm9vdCkgdGhyb3cgbmV3IEVycm9yKFwiUGxlYXNlIGVuc3VyZSB0aGUgRE9NIGVsZW1lbnQgZXhpc3RzIGJlZm9yZSByZW5kZXJpbmcgYSB0ZW1wbGF0ZSBpbnRvIGl0LlwiKTtcclxuXHRcdHZhciBpbmRleCA9IHJvb3RzLmluZGV4T2Yocm9vdCk7XHJcblx0XHRpZiAoaW5kZXggPCAwKSBpbmRleCA9IHJvb3RzLmxlbmd0aDtcclxuXHJcblx0XHR2YXIgaXNQcmV2ZW50ZWQgPSBmYWxzZTtcclxuXHRcdHZhciBldmVudCA9IHtwcmV2ZW50RGVmYXVsdDogZnVuY3Rpb24oKSB7XHJcblx0XHRcdGlzUHJldmVudGVkID0gdHJ1ZTtcclxuXHRcdFx0Y29tcHV0ZVByZVJlZHJhd0hvb2sgPSBjb21wdXRlUG9zdFJlZHJhd0hvb2sgPSBudWxsO1xyXG5cdFx0fX07XHJcblxyXG5cdFx0Zm9yRWFjaCh1bmxvYWRlcnMsIGZ1bmN0aW9uICh1bmxvYWRlcikge1xyXG5cdFx0XHR1bmxvYWRlci5oYW5kbGVyLmNhbGwodW5sb2FkZXIuY29udHJvbGxlciwgZXZlbnQpO1xyXG5cdFx0XHR1bmxvYWRlci5jb250cm9sbGVyLm9udW5sb2FkID0gbnVsbDtcclxuXHRcdH0pO1xyXG5cclxuXHRcdGlmIChpc1ByZXZlbnRlZCkge1xyXG5cdFx0XHRmb3JFYWNoKHVubG9hZGVycywgZnVuY3Rpb24gKHVubG9hZGVyKSB7XHJcblx0XHRcdFx0dW5sb2FkZXIuY29udHJvbGxlci5vbnVubG9hZCA9IHVubG9hZGVyLmhhbmRsZXI7XHJcblx0XHRcdH0pO1xyXG5cdFx0fVxyXG5cdFx0ZWxzZSB1bmxvYWRlcnMgPSBbXTtcclxuXHJcblx0XHRpZiAoY29udHJvbGxlcnNbaW5kZXhdICYmIGlzRnVuY3Rpb24oY29udHJvbGxlcnNbaW5kZXhdLm9udW5sb2FkKSkge1xyXG5cdFx0XHRjb250cm9sbGVyc1tpbmRleF0ub251bmxvYWQoZXZlbnQpO1xyXG5cdFx0fVxyXG5cclxuXHRcdHZhciBpc051bGxDb21wb25lbnQgPSBjb21wb25lbnQgPT09IG51bGw7XHJcblxyXG5cdFx0aWYgKCFpc1ByZXZlbnRlZCkge1xyXG5cdFx0XHRtLnJlZHJhdy5zdHJhdGVneShcImFsbFwiKTtcclxuXHRcdFx0bS5zdGFydENvbXB1dGF0aW9uKCk7XHJcblx0XHRcdHJvb3RzW2luZGV4XSA9IHJvb3Q7XHJcblx0XHRcdHZhciBjdXJyZW50Q29tcG9uZW50ID0gY29tcG9uZW50ID8gKHRvcENvbXBvbmVudCA9IGNvbXBvbmVudCkgOiAodG9wQ29tcG9uZW50ID0gY29tcG9uZW50ID0ge2NvbnRyb2xsZXI6IG5vb3B9KTtcclxuXHRcdFx0dmFyIGNvbnRyb2xsZXIgPSBuZXcgKGNvbXBvbmVudC5jb250cm9sbGVyIHx8IG5vb3ApKCk7XHJcblx0XHRcdC8vY29udHJvbGxlcnMgbWF5IGNhbGwgbS5tb3VudCByZWN1cnNpdmVseSAodmlhIG0ucm91dGUgcmVkaXJlY3RzLCBmb3IgZXhhbXBsZSlcclxuXHRcdFx0Ly90aGlzIGNvbmRpdGlvbmFsIGVuc3VyZXMgb25seSB0aGUgbGFzdCByZWN1cnNpdmUgbS5tb3VudCBjYWxsIGlzIGFwcGxpZWRcclxuXHRcdFx0aWYgKGN1cnJlbnRDb21wb25lbnQgPT09IHRvcENvbXBvbmVudCkge1xyXG5cdFx0XHRcdGNvbnRyb2xsZXJzW2luZGV4XSA9IGNvbnRyb2xsZXI7XHJcblx0XHRcdFx0Y29tcG9uZW50c1tpbmRleF0gPSBjb21wb25lbnQ7XHJcblx0XHRcdH1cclxuXHRcdFx0ZW5kRmlyc3RDb21wdXRhdGlvbigpO1xyXG5cdFx0XHRpZiAoaXNOdWxsQ29tcG9uZW50KSB7XHJcblx0XHRcdFx0cmVtb3ZlUm9vdEVsZW1lbnQocm9vdCwgaW5kZXgpO1xyXG5cdFx0XHR9XHJcblx0XHRcdHJldHVybiBjb250cm9sbGVyc1tpbmRleF07XHJcblx0XHR9XHJcblx0XHRpZiAoaXNOdWxsQ29tcG9uZW50KSB7XHJcblx0XHRcdHJlbW92ZVJvb3RFbGVtZW50KHJvb3QsIGluZGV4KTtcclxuXHRcdH1cclxuXHR9O1xyXG5cclxuXHRmdW5jdGlvbiByZW1vdmVSb290RWxlbWVudChyb290LCBpbmRleCkge1xyXG5cdFx0cm9vdHMuc3BsaWNlKGluZGV4LCAxKTtcclxuXHRcdGNvbnRyb2xsZXJzLnNwbGljZShpbmRleCwgMSk7XHJcblx0XHRjb21wb25lbnRzLnNwbGljZShpbmRleCwgMSk7XHJcblx0XHRyZXNldChyb290KTtcclxuXHRcdG5vZGVDYWNoZS5zcGxpY2UoZ2V0Q2VsbENhY2hlS2V5KHJvb3QpLCAxKTtcclxuXHR9XHJcblxyXG5cdHZhciByZWRyYXdpbmcgPSBmYWxzZSwgZm9yY2luZyA9IGZhbHNlO1xyXG5cdG0ucmVkcmF3ID0gZnVuY3Rpb24oZm9yY2UpIHtcclxuXHRcdGlmIChyZWRyYXdpbmcpIHJldHVybjtcclxuXHRcdHJlZHJhd2luZyA9IHRydWU7XHJcblx0XHRpZiAoZm9yY2UpIGZvcmNpbmcgPSB0cnVlO1xyXG5cdFx0dHJ5IHtcclxuXHRcdFx0Ly9sYXN0UmVkcmF3SWQgaXMgYSBwb3NpdGl2ZSBudW1iZXIgaWYgYSBzZWNvbmQgcmVkcmF3IGlzIHJlcXVlc3RlZCBiZWZvcmUgdGhlIG5leHQgYW5pbWF0aW9uIGZyYW1lXHJcblx0XHRcdC8vbGFzdFJlZHJhd0lEIGlzIG51bGwgaWYgaXQncyB0aGUgZmlyc3QgcmVkcmF3IGFuZCBub3QgYW4gZXZlbnQgaGFuZGxlclxyXG5cdFx0XHRpZiAobGFzdFJlZHJhd0lkICYmICFmb3JjZSkge1xyXG5cdFx0XHRcdC8vd2hlbiBzZXRUaW1lb3V0OiBvbmx5IHJlc2NoZWR1bGUgcmVkcmF3IGlmIHRpbWUgYmV0d2VlbiBub3cgYW5kIHByZXZpb3VzIHJlZHJhdyBpcyBiaWdnZXIgdGhhbiBhIGZyYW1lLCBvdGhlcndpc2Uga2VlcCBjdXJyZW50bHkgc2NoZWR1bGVkIHRpbWVvdXRcclxuXHRcdFx0XHQvL3doZW4gckFGOiBhbHdheXMgcmVzY2hlZHVsZSByZWRyYXdcclxuXHRcdFx0XHRpZiAoJHJlcXVlc3RBbmltYXRpb25GcmFtZSA9PT0gd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZSB8fCBuZXcgRGF0ZSAtIGxhc3RSZWRyYXdDYWxsVGltZSA+IEZSQU1FX0JVREdFVCkge1xyXG5cdFx0XHRcdFx0aWYgKGxhc3RSZWRyYXdJZCA+IDApICRjYW5jZWxBbmltYXRpb25GcmFtZShsYXN0UmVkcmF3SWQpO1xyXG5cdFx0XHRcdFx0bGFzdFJlZHJhd0lkID0gJHJlcXVlc3RBbmltYXRpb25GcmFtZShyZWRyYXcsIEZSQU1FX0JVREdFVCk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHRcdGVsc2Uge1xyXG5cdFx0XHRcdHJlZHJhdygpO1xyXG5cdFx0XHRcdGxhc3RSZWRyYXdJZCA9ICRyZXF1ZXN0QW5pbWF0aW9uRnJhbWUoZnVuY3Rpb24oKSB7IGxhc3RSZWRyYXdJZCA9IG51bGw7IH0sIEZSQU1FX0JVREdFVCk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHRcdGZpbmFsbHkge1xyXG5cdFx0XHRyZWRyYXdpbmcgPSBmb3JjaW5nID0gZmFsc2U7XHJcblx0XHR9XHJcblx0fTtcclxuXHRtLnJlZHJhdy5zdHJhdGVneSA9IG0ucHJvcCgpO1xyXG5cdGZ1bmN0aW9uIHJlZHJhdygpIHtcclxuXHRcdGlmIChjb21wdXRlUHJlUmVkcmF3SG9vaykge1xyXG5cdFx0XHRjb21wdXRlUHJlUmVkcmF3SG9vaygpO1xyXG5cdFx0XHRjb21wdXRlUHJlUmVkcmF3SG9vayA9IG51bGw7XHJcblx0XHR9XHJcblx0XHRmb3JFYWNoKHJvb3RzLCBmdW5jdGlvbiAocm9vdCwgaSkge1xyXG5cdFx0XHR2YXIgY29tcG9uZW50ID0gY29tcG9uZW50c1tpXTtcclxuXHRcdFx0aWYgKGNvbnRyb2xsZXJzW2ldKSB7XHJcblx0XHRcdFx0dmFyIGFyZ3MgPSBbY29udHJvbGxlcnNbaV1dO1xyXG5cdFx0XHRcdG0ucmVuZGVyKHJvb3QsIGNvbXBvbmVudC52aWV3ID8gY29tcG9uZW50LnZpZXcoY29udHJvbGxlcnNbaV0sIGFyZ3MpIDogXCJcIik7XHJcblx0XHRcdH1cclxuXHRcdH0pO1xyXG5cdFx0Ly9hZnRlciByZW5kZXJpbmcgd2l0aGluIGEgcm91dGVkIGNvbnRleHQsIHdlIG5lZWQgdG8gc2Nyb2xsIGJhY2sgdG8gdGhlIHRvcCwgYW5kIGZldGNoIHRoZSBkb2N1bWVudCB0aXRsZSBmb3IgaGlzdG9yeS5wdXNoU3RhdGVcclxuXHRcdGlmIChjb21wdXRlUG9zdFJlZHJhd0hvb2spIHtcclxuXHRcdFx0Y29tcHV0ZVBvc3RSZWRyYXdIb29rKCk7XHJcblx0XHRcdGNvbXB1dGVQb3N0UmVkcmF3SG9vayA9IG51bGw7XHJcblx0XHR9XHJcblx0XHRsYXN0UmVkcmF3SWQgPSBudWxsO1xyXG5cdFx0bGFzdFJlZHJhd0NhbGxUaW1lID0gbmV3IERhdGU7XHJcblx0XHRtLnJlZHJhdy5zdHJhdGVneShcImRpZmZcIik7XHJcblx0fVxyXG5cclxuXHR2YXIgcGVuZGluZ1JlcXVlc3RzID0gMDtcclxuXHRtLnN0YXJ0Q29tcHV0YXRpb24gPSBmdW5jdGlvbigpIHsgcGVuZGluZ1JlcXVlc3RzKys7IH07XHJcblx0bS5lbmRDb21wdXRhdGlvbiA9IGZ1bmN0aW9uKCkge1xyXG5cdFx0aWYgKHBlbmRpbmdSZXF1ZXN0cyA+IDEpIHBlbmRpbmdSZXF1ZXN0cy0tO1xyXG5cdFx0ZWxzZSB7XHJcblx0XHRcdHBlbmRpbmdSZXF1ZXN0cyA9IDA7XHJcblx0XHRcdG0ucmVkcmF3KCk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRmdW5jdGlvbiBlbmRGaXJzdENvbXB1dGF0aW9uKCkge1xyXG5cdFx0aWYgKG0ucmVkcmF3LnN0cmF0ZWd5KCkgPT09IFwibm9uZVwiKSB7XHJcblx0XHRcdHBlbmRpbmdSZXF1ZXN0cy0tO1xyXG5cdFx0XHRtLnJlZHJhdy5zdHJhdGVneShcImRpZmZcIik7XHJcblx0XHR9XHJcblx0XHRlbHNlIG0uZW5kQ29tcHV0YXRpb24oKTtcclxuXHR9XHJcblxyXG5cdG0ud2l0aEF0dHIgPSBmdW5jdGlvbihwcm9wLCB3aXRoQXR0ckNhbGxiYWNrLCBjYWxsYmFja1RoaXMpIHtcclxuXHRcdHJldHVybiBmdW5jdGlvbihlKSB7XHJcblx0XHRcdGUgPSBlIHx8IGV2ZW50O1xyXG5cdFx0XHR2YXIgY3VycmVudFRhcmdldCA9IGUuY3VycmVudFRhcmdldCB8fCB0aGlzO1xyXG5cdFx0XHR2YXIgX3RoaXMgPSBjYWxsYmFja1RoaXMgfHwgdGhpcztcclxuXHRcdFx0d2l0aEF0dHJDYWxsYmFjay5jYWxsKF90aGlzLCBwcm9wIGluIGN1cnJlbnRUYXJnZXQgPyBjdXJyZW50VGFyZ2V0W3Byb3BdIDogY3VycmVudFRhcmdldC5nZXRBdHRyaWJ1dGUocHJvcCkpO1xyXG5cdFx0fTtcclxuXHR9O1xyXG5cclxuXHQvL3JvdXRpbmdcclxuXHR2YXIgbW9kZXMgPSB7cGF0aG5hbWU6IFwiXCIsIGhhc2g6IFwiI1wiLCBzZWFyY2g6IFwiP1wifTtcclxuXHR2YXIgcmVkaXJlY3QgPSBub29wLCByb3V0ZVBhcmFtcywgY3VycmVudFJvdXRlLCBpc0RlZmF1bHRSb3V0ZSA9IGZhbHNlO1xyXG5cdG0ucm91dGUgPSBmdW5jdGlvbihyb290LCBhcmcxLCBhcmcyLCB2ZG9tKSB7XHJcblx0XHQvL20ucm91dGUoKVxyXG5cdFx0aWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApIHJldHVybiBjdXJyZW50Um91dGU7XHJcblx0XHQvL20ucm91dGUoZWwsIGRlZmF1bHRSb3V0ZSwgcm91dGVzKVxyXG5cdFx0ZWxzZSBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMyAmJiBpc1N0cmluZyhhcmcxKSkge1xyXG5cdFx0XHRyZWRpcmVjdCA9IGZ1bmN0aW9uKHNvdXJjZSkge1xyXG5cdFx0XHRcdHZhciBwYXRoID0gY3VycmVudFJvdXRlID0gbm9ybWFsaXplUm91dGUoc291cmNlKTtcclxuXHRcdFx0XHRpZiAoIXJvdXRlQnlWYWx1ZShyb290LCBhcmcyLCBwYXRoKSkge1xyXG5cdFx0XHRcdFx0aWYgKGlzRGVmYXVsdFJvdXRlKSB0aHJvdyBuZXcgRXJyb3IoXCJFbnN1cmUgdGhlIGRlZmF1bHQgcm91dGUgbWF0Y2hlcyBvbmUgb2YgdGhlIHJvdXRlcyBkZWZpbmVkIGluIG0ucm91dGVcIik7XHJcblx0XHRcdFx0XHRpc0RlZmF1bHRSb3V0ZSA9IHRydWU7XHJcblx0XHRcdFx0XHRtLnJvdXRlKGFyZzEsIHRydWUpO1xyXG5cdFx0XHRcdFx0aXNEZWZhdWx0Um91dGUgPSBmYWxzZTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH07XHJcblx0XHRcdHZhciBsaXN0ZW5lciA9IG0ucm91dGUubW9kZSA9PT0gXCJoYXNoXCIgPyBcIm9uaGFzaGNoYW5nZVwiIDogXCJvbnBvcHN0YXRlXCI7XHJcblx0XHRcdHdpbmRvd1tsaXN0ZW5lcl0gPSBmdW5jdGlvbigpIHtcclxuXHRcdFx0XHR2YXIgcGF0aCA9ICRsb2NhdGlvblttLnJvdXRlLm1vZGVdO1xyXG5cdFx0XHRcdGlmIChtLnJvdXRlLm1vZGUgPT09IFwicGF0aG5hbWVcIikgcGF0aCArPSAkbG9jYXRpb24uc2VhcmNoO1xyXG5cdFx0XHRcdGlmIChjdXJyZW50Um91dGUgIT09IG5vcm1hbGl6ZVJvdXRlKHBhdGgpKSByZWRpcmVjdChwYXRoKTtcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdGNvbXB1dGVQcmVSZWRyYXdIb29rID0gc2V0U2Nyb2xsO1xyXG5cdFx0XHR3aW5kb3dbbGlzdGVuZXJdKCk7XHJcblx0XHR9XHJcblx0XHQvL2NvbmZpZzogbS5yb3V0ZVxyXG5cdFx0ZWxzZSBpZiAocm9vdC5hZGRFdmVudExpc3RlbmVyIHx8IHJvb3QuYXR0YWNoRXZlbnQpIHtcclxuXHRcdFx0cm9vdC5ocmVmID0gKG0ucm91dGUubW9kZSAhPT0gJ3BhdGhuYW1lJyA/ICRsb2NhdGlvbi5wYXRobmFtZSA6ICcnKSArIG1vZGVzW20ucm91dGUubW9kZV0gKyB2ZG9tLmF0dHJzLmhyZWY7XHJcblx0XHRcdGlmIChyb290LmFkZEV2ZW50TGlzdGVuZXIpIHtcclxuXHRcdFx0XHRyb290LnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCByb3V0ZVVub2J0cnVzaXZlKTtcclxuXHRcdFx0XHRyb290LmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCByb3V0ZVVub2J0cnVzaXZlKTtcclxuXHRcdFx0fVxyXG5cdFx0XHRlbHNlIHtcclxuXHRcdFx0XHRyb290LmRldGFjaEV2ZW50KFwib25jbGlja1wiLCByb3V0ZVVub2J0cnVzaXZlKTtcclxuXHRcdFx0XHRyb290LmF0dGFjaEV2ZW50KFwib25jbGlja1wiLCByb3V0ZVVub2J0cnVzaXZlKTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdFx0Ly9tLnJvdXRlKHJvdXRlLCBwYXJhbXMsIHNob3VsZFJlcGxhY2VIaXN0b3J5RW50cnkpXHJcblx0XHRlbHNlIGlmIChpc1N0cmluZyhyb290KSkge1xyXG5cdFx0XHR2YXIgb2xkUm91dGUgPSBjdXJyZW50Um91dGU7XHJcblx0XHRcdGN1cnJlbnRSb3V0ZSA9IHJvb3Q7XHJcblx0XHRcdHZhciBhcmdzID0gYXJnMSB8fCB7fTtcclxuXHRcdFx0dmFyIHF1ZXJ5SW5kZXggPSBjdXJyZW50Um91dGUuaW5kZXhPZihcIj9cIik7XHJcblx0XHRcdHZhciBwYXJhbXMgPSBxdWVyeUluZGV4ID4gLTEgPyBwYXJzZVF1ZXJ5U3RyaW5nKGN1cnJlbnRSb3V0ZS5zbGljZShxdWVyeUluZGV4ICsgMSkpIDoge307XHJcblx0XHRcdGZvciAodmFyIGkgaW4gYXJncykgcGFyYW1zW2ldID0gYXJnc1tpXTtcclxuXHRcdFx0dmFyIHF1ZXJ5c3RyaW5nID0gYnVpbGRRdWVyeVN0cmluZyhwYXJhbXMpO1xyXG5cdFx0XHR2YXIgY3VycmVudFBhdGggPSBxdWVyeUluZGV4ID4gLTEgPyBjdXJyZW50Um91dGUuc2xpY2UoMCwgcXVlcnlJbmRleCkgOiBjdXJyZW50Um91dGU7XHJcblx0XHRcdGlmIChxdWVyeXN0cmluZykgY3VycmVudFJvdXRlID0gY3VycmVudFBhdGggKyAoY3VycmVudFBhdGguaW5kZXhPZihcIj9cIikgPT09IC0xID8gXCI/XCIgOiBcIiZcIikgKyBxdWVyeXN0cmluZztcclxuXHJcblx0XHRcdHZhciBzaG91bGRSZXBsYWNlSGlzdG9yeUVudHJ5ID0gKGFyZ3VtZW50cy5sZW5ndGggPT09IDMgPyBhcmcyIDogYXJnMSkgPT09IHRydWUgfHwgb2xkUm91dGUgPT09IHJvb3Q7XHJcblxyXG5cdFx0XHRpZiAod2luZG93Lmhpc3RvcnkucHVzaFN0YXRlKSB7XHJcblx0XHRcdFx0Y29tcHV0ZVByZVJlZHJhd0hvb2sgPSBzZXRTY3JvbGw7XHJcblx0XHRcdFx0Y29tcHV0ZVBvc3RSZWRyYXdIb29rID0gZnVuY3Rpb24oKSB7XHJcblx0XHRcdFx0XHR3aW5kb3cuaGlzdG9yeVtzaG91bGRSZXBsYWNlSGlzdG9yeUVudHJ5ID8gXCJyZXBsYWNlU3RhdGVcIiA6IFwicHVzaFN0YXRlXCJdKG51bGwsICRkb2N1bWVudC50aXRsZSwgbW9kZXNbbS5yb3V0ZS5tb2RlXSArIGN1cnJlbnRSb3V0ZSk7XHJcblx0XHRcdFx0fTtcclxuXHRcdFx0XHRyZWRpcmVjdChtb2Rlc1ttLnJvdXRlLm1vZGVdICsgY3VycmVudFJvdXRlKTtcclxuXHRcdFx0fVxyXG5cdFx0XHRlbHNlIHtcclxuXHRcdFx0XHQkbG9jYXRpb25bbS5yb3V0ZS5tb2RlXSA9IGN1cnJlbnRSb3V0ZTtcclxuXHRcdFx0XHRyZWRpcmVjdChtb2Rlc1ttLnJvdXRlLm1vZGVdICsgY3VycmVudFJvdXRlKTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdH07XHJcblx0bS5yb3V0ZS5wYXJhbSA9IGZ1bmN0aW9uKGtleSkge1xyXG5cdFx0aWYgKCFyb3V0ZVBhcmFtcykgdGhyb3cgbmV3IEVycm9yKFwiWW91IG11c3QgY2FsbCBtLnJvdXRlKGVsZW1lbnQsIGRlZmF1bHRSb3V0ZSwgcm91dGVzKSBiZWZvcmUgY2FsbGluZyBtLnJvdXRlLnBhcmFtKClcIik7XHJcblx0XHRpZiggIWtleSApe1xyXG5cdFx0XHRyZXR1cm4gcm91dGVQYXJhbXM7XHJcblx0XHR9XHJcblx0XHRyZXR1cm4gcm91dGVQYXJhbXNba2V5XTtcclxuXHR9O1xyXG5cdG0ucm91dGUubW9kZSA9IFwic2VhcmNoXCI7XHJcblx0ZnVuY3Rpb24gbm9ybWFsaXplUm91dGUocm91dGUpIHtcclxuXHRcdHJldHVybiByb3V0ZS5zbGljZShtb2Rlc1ttLnJvdXRlLm1vZGVdLmxlbmd0aCk7XHJcblx0fVxyXG5cdGZ1bmN0aW9uIHJvdXRlQnlWYWx1ZShyb290LCByb3V0ZXIsIHBhdGgpIHtcclxuXHRcdHJvdXRlUGFyYW1zID0ge307XHJcblxyXG5cdFx0dmFyIHF1ZXJ5U3RhcnQgPSBwYXRoLmluZGV4T2YoXCI/XCIpO1xyXG5cdFx0aWYgKHF1ZXJ5U3RhcnQgIT09IC0xKSB7XHJcblx0XHRcdHJvdXRlUGFyYW1zID0gcGFyc2VRdWVyeVN0cmluZyhwYXRoLnN1YnN0cihxdWVyeVN0YXJ0ICsgMSwgcGF0aC5sZW5ndGgpKTtcclxuXHRcdFx0cGF0aCA9IHBhdGguc3Vic3RyKDAsIHF1ZXJ5U3RhcnQpO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIEdldCBhbGwgcm91dGVzIGFuZCBjaGVjayBpZiB0aGVyZSdzXHJcblx0XHQvLyBhbiBleGFjdCBtYXRjaCBmb3IgdGhlIGN1cnJlbnQgcGF0aFxyXG5cdFx0dmFyIGtleXMgPSBPYmplY3Qua2V5cyhyb3V0ZXIpO1xyXG5cdFx0dmFyIGluZGV4ID0ga2V5cy5pbmRleE9mKHBhdGgpO1xyXG5cdFx0aWYoaW5kZXggIT09IC0xKXtcclxuXHRcdFx0bS5tb3VudChyb290LCByb3V0ZXJba2V5cyBbaW5kZXhdXSk7XHJcblx0XHRcdHJldHVybiB0cnVlO1xyXG5cdFx0fVxyXG5cclxuXHRcdGZvciAodmFyIHJvdXRlIGluIHJvdXRlcikge1xyXG5cdFx0XHRpZiAocm91dGUgPT09IHBhdGgpIHtcclxuXHRcdFx0XHRtLm1vdW50KHJvb3QsIHJvdXRlcltyb3V0ZV0pO1xyXG5cdFx0XHRcdHJldHVybiB0cnVlO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHR2YXIgbWF0Y2hlciA9IG5ldyBSZWdFeHAoXCJeXCIgKyByb3V0ZS5yZXBsYWNlKC86W15cXC9dKz9cXC57M30vZywgXCIoLio/KVwiKS5yZXBsYWNlKC86W15cXC9dKy9nLCBcIihbXlxcXFwvXSspXCIpICsgXCJcXC8/JFwiKTtcclxuXHJcblx0XHRcdGlmIChtYXRjaGVyLnRlc3QocGF0aCkpIHtcclxuXHRcdFx0XHRwYXRoLnJlcGxhY2UobWF0Y2hlciwgZnVuY3Rpb24oKSB7XHJcblx0XHRcdFx0XHR2YXIga2V5cyA9IHJvdXRlLm1hdGNoKC86W15cXC9dKy9nKSB8fCBbXTtcclxuXHRcdFx0XHRcdHZhciB2YWx1ZXMgPSBbXS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMSwgLTIpO1xyXG5cdFx0XHRcdFx0Zm9yRWFjaChrZXlzLCBmdW5jdGlvbiAoa2V5LCBpKSB7XHJcblx0XHRcdFx0XHRcdHJvdXRlUGFyYW1zW2tleS5yZXBsYWNlKC86fFxcLi9nLCBcIlwiKV0gPSBkZWNvZGVVUklDb21wb25lbnQodmFsdWVzW2ldKTtcclxuXHRcdFx0XHRcdH0pXHJcblx0XHRcdFx0XHRtLm1vdW50KHJvb3QsIHJvdXRlcltyb3V0ZV0pO1xyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHRcdHJldHVybiB0cnVlO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0fVxyXG5cdGZ1bmN0aW9uIHJvdXRlVW5vYnRydXNpdmUoZSkge1xyXG5cdFx0ZSA9IGUgfHwgZXZlbnQ7XHJcblxyXG5cdFx0aWYgKGUuY3RybEtleSB8fCBlLm1ldGFLZXkgfHwgZS53aGljaCA9PT0gMikgcmV0dXJuO1xyXG5cclxuXHRcdGlmIChlLnByZXZlbnREZWZhdWx0KSBlLnByZXZlbnREZWZhdWx0KCk7XHJcblx0XHRlbHNlIGUucmV0dXJuVmFsdWUgPSBmYWxzZTtcclxuXHJcblx0XHR2YXIgY3VycmVudFRhcmdldCA9IGUuY3VycmVudFRhcmdldCB8fCBlLnNyY0VsZW1lbnQ7XHJcblx0XHR2YXIgYXJncyA9IG0ucm91dGUubW9kZSA9PT0gXCJwYXRobmFtZVwiICYmIGN1cnJlbnRUYXJnZXQuc2VhcmNoID8gcGFyc2VRdWVyeVN0cmluZyhjdXJyZW50VGFyZ2V0LnNlYXJjaC5zbGljZSgxKSkgOiB7fTtcclxuXHRcdHdoaWxlIChjdXJyZW50VGFyZ2V0ICYmIGN1cnJlbnRUYXJnZXQubm9kZU5hbWUudG9VcHBlckNhc2UoKSAhPT0gXCJBXCIpIGN1cnJlbnRUYXJnZXQgPSBjdXJyZW50VGFyZ2V0LnBhcmVudE5vZGU7XHJcblx0XHRtLnJvdXRlKGN1cnJlbnRUYXJnZXRbbS5yb3V0ZS5tb2RlXS5zbGljZShtb2Rlc1ttLnJvdXRlLm1vZGVdLmxlbmd0aCksIGFyZ3MpO1xyXG5cdH1cclxuXHRmdW5jdGlvbiBzZXRTY3JvbGwoKSB7XHJcblx0XHRpZiAobS5yb3V0ZS5tb2RlICE9PSBcImhhc2hcIiAmJiAkbG9jYXRpb24uaGFzaCkgJGxvY2F0aW9uLmhhc2ggPSAkbG9jYXRpb24uaGFzaDtcclxuXHRcdGVsc2Ugd2luZG93LnNjcm9sbFRvKDAsIDApO1xyXG5cdH1cclxuXHRmdW5jdGlvbiBidWlsZFF1ZXJ5U3RyaW5nKG9iamVjdCwgcHJlZml4KSB7XHJcblx0XHR2YXIgZHVwbGljYXRlcyA9IHt9O1xyXG5cdFx0dmFyIHN0ciA9IFtdO1xyXG5cdFx0Zm9yICh2YXIgcHJvcCBpbiBvYmplY3QpIHtcclxuXHRcdFx0dmFyIGtleSA9IHByZWZpeCA/IHByZWZpeCArIFwiW1wiICsgcHJvcCArIFwiXVwiIDogcHJvcDtcclxuXHRcdFx0dmFyIHZhbHVlID0gb2JqZWN0W3Byb3BdO1xyXG5cclxuXHRcdFx0aWYgKHZhbHVlID09PSBudWxsKSB7XHJcblx0XHRcdFx0c3RyLnB1c2goZW5jb2RlVVJJQ29tcG9uZW50KGtleSkpO1xyXG5cdFx0XHR9IGVsc2UgaWYgKGlzT2JqZWN0KHZhbHVlKSkge1xyXG5cdFx0XHRcdHN0ci5wdXNoKGJ1aWxkUXVlcnlTdHJpbmcodmFsdWUsIGtleSkpO1xyXG5cdFx0XHR9IGVsc2UgaWYgKGlzQXJyYXkodmFsdWUpKSB7XHJcblx0XHRcdFx0dmFyIGtleXMgPSBbXTtcclxuXHRcdFx0XHRkdXBsaWNhdGVzW2tleV0gPSBkdXBsaWNhdGVzW2tleV0gfHwge307XHJcblx0XHRcdFx0Zm9yRWFjaCh2YWx1ZSwgZnVuY3Rpb24gKGl0ZW0pIHtcclxuXHRcdFx0XHRcdGlmICghZHVwbGljYXRlc1trZXldW2l0ZW1dKSB7XHJcblx0XHRcdFx0XHRcdGR1cGxpY2F0ZXNba2V5XVtpdGVtXSA9IHRydWU7XHJcblx0XHRcdFx0XHRcdGtleXMucHVzaChlbmNvZGVVUklDb21wb25lbnQoa2V5KSArIFwiPVwiICsgZW5jb2RlVVJJQ29tcG9uZW50KGl0ZW0pKTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0XHRzdHIucHVzaChrZXlzLmpvaW4oXCImXCIpKTtcclxuXHRcdFx0fSBlbHNlIGlmICh2YWx1ZSAhPT0gdW5kZWZpbmVkKSB7XHJcblx0XHRcdFx0c3RyLnB1c2goZW5jb2RlVVJJQ29tcG9uZW50KGtleSkgKyBcIj1cIiArIGVuY29kZVVSSUNvbXBvbmVudCh2YWx1ZSkpO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0XHRyZXR1cm4gc3RyLmpvaW4oXCImXCIpO1xyXG5cdH1cclxuXHRmdW5jdGlvbiBwYXJzZVF1ZXJ5U3RyaW5nKHN0cikge1xyXG5cdFx0aWYgKHN0ciA9PT0gXCJcIiB8fCBzdHIgPT0gbnVsbCkgcmV0dXJuIHt9O1xyXG5cdFx0aWYgKHN0ci5jaGFyQXQoMCkgPT09IFwiP1wiKSBzdHIgPSBzdHIuc2xpY2UoMSk7XHJcblxyXG5cdFx0dmFyIHBhaXJzID0gc3RyLnNwbGl0KFwiJlwiKSwgcGFyYW1zID0ge307XHJcblx0XHRmb3JFYWNoKHBhaXJzLCBmdW5jdGlvbiAoc3RyaW5nKSB7XHJcblx0XHRcdHZhciBwYWlyID0gc3RyaW5nLnNwbGl0KFwiPVwiKTtcclxuXHRcdFx0dmFyIGtleSA9IGRlY29kZVVSSUNvbXBvbmVudChwYWlyWzBdKTtcclxuXHRcdFx0dmFyIHZhbHVlID0gcGFpci5sZW5ndGggPT09IDIgPyBkZWNvZGVVUklDb21wb25lbnQocGFpclsxXSkgOiBudWxsO1xyXG5cdFx0XHRpZiAocGFyYW1zW2tleV0gIT0gbnVsbCkge1xyXG5cdFx0XHRcdGlmICghaXNBcnJheShwYXJhbXNba2V5XSkpIHBhcmFtc1trZXldID0gW3BhcmFtc1trZXldXTtcclxuXHRcdFx0XHRwYXJhbXNba2V5XS5wdXNoKHZhbHVlKTtcclxuXHRcdFx0fVxyXG5cdFx0XHRlbHNlIHBhcmFtc1trZXldID0gdmFsdWU7XHJcblx0XHR9KTtcclxuXHJcblx0XHRyZXR1cm4gcGFyYW1zO1xyXG5cdH1cclxuXHRtLnJvdXRlLmJ1aWxkUXVlcnlTdHJpbmcgPSBidWlsZFF1ZXJ5U3RyaW5nO1xyXG5cdG0ucm91dGUucGFyc2VRdWVyeVN0cmluZyA9IHBhcnNlUXVlcnlTdHJpbmc7XHJcblxyXG5cdGZ1bmN0aW9uIHJlc2V0KHJvb3QpIHtcclxuXHRcdHZhciBjYWNoZUtleSA9IGdldENlbGxDYWNoZUtleShyb290KTtcclxuXHRcdGNsZWFyKHJvb3QuY2hpbGROb2RlcywgY2VsbENhY2hlW2NhY2hlS2V5XSk7XHJcblx0XHRjZWxsQ2FjaGVbY2FjaGVLZXldID0gdW5kZWZpbmVkO1xyXG5cdH1cclxuXHJcblx0bS5kZWZlcnJlZCA9IGZ1bmN0aW9uICgpIHtcclxuXHRcdHZhciBkZWZlcnJlZCA9IG5ldyBEZWZlcnJlZCgpO1xyXG5cdFx0ZGVmZXJyZWQucHJvbWlzZSA9IHByb3BpZnkoZGVmZXJyZWQucHJvbWlzZSk7XHJcblx0XHRyZXR1cm4gZGVmZXJyZWQ7XHJcblx0fTtcclxuXHRmdW5jdGlvbiBwcm9waWZ5KHByb21pc2UsIGluaXRpYWxWYWx1ZSkge1xyXG5cdFx0dmFyIHByb3AgPSBtLnByb3AoaW5pdGlhbFZhbHVlKTtcclxuXHRcdHByb21pc2UudGhlbihwcm9wKTtcclxuXHRcdHByb3AudGhlbiA9IGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCkge1xyXG5cdFx0XHRyZXR1cm4gcHJvcGlmeShwcm9taXNlLnRoZW4ocmVzb2x2ZSwgcmVqZWN0KSwgaW5pdGlhbFZhbHVlKTtcclxuXHRcdH07XHJcblx0XHRwcm9wW1wiY2F0Y2hcIl0gPSBwcm9wLnRoZW4uYmluZChudWxsLCBudWxsKTtcclxuXHRcdHByb3BbXCJmaW5hbGx5XCJdID0gZnVuY3Rpb24oY2FsbGJhY2spIHtcclxuXHRcdFx0dmFyIF9jYWxsYmFjayA9IGZ1bmN0aW9uKCkge3JldHVybiBtLmRlZmVycmVkKCkucmVzb2x2ZShjYWxsYmFjaygpKS5wcm9taXNlO307XHJcblx0XHRcdHJldHVybiBwcm9wLnRoZW4oZnVuY3Rpb24odmFsdWUpIHtcclxuXHRcdFx0XHRyZXR1cm4gcHJvcGlmeShfY2FsbGJhY2soKS50aGVuKGZ1bmN0aW9uKCkge3JldHVybiB2YWx1ZTt9KSwgaW5pdGlhbFZhbHVlKTtcclxuXHRcdFx0fSwgZnVuY3Rpb24ocmVhc29uKSB7XHJcblx0XHRcdFx0cmV0dXJuIHByb3BpZnkoX2NhbGxiYWNrKCkudGhlbihmdW5jdGlvbigpIHt0aHJvdyBuZXcgRXJyb3IocmVhc29uKTt9KSwgaW5pdGlhbFZhbHVlKTtcclxuXHRcdFx0fSk7XHJcblx0XHR9O1xyXG5cdFx0cmV0dXJuIHByb3A7XHJcblx0fVxyXG5cdC8vUHJvbWl6Lm1pdGhyaWwuanMgfCBab2xtZWlzdGVyIHwgTUlUXHJcblx0Ly9hIG1vZGlmaWVkIHZlcnNpb24gb2YgUHJvbWl6LmpzLCB3aGljaCBkb2VzIG5vdCBjb25mb3JtIHRvIFByb21pc2VzL0ErIGZvciB0d28gcmVhc29uczpcclxuXHQvLzEpIGB0aGVuYCBjYWxsYmFja3MgYXJlIGNhbGxlZCBzeW5jaHJvbm91c2x5IChiZWNhdXNlIHNldFRpbWVvdXQgaXMgdG9vIHNsb3csIGFuZCB0aGUgc2V0SW1tZWRpYXRlIHBvbHlmaWxsIGlzIHRvbyBiaWdcclxuXHQvLzIpIHRocm93aW5nIHN1YmNsYXNzZXMgb2YgRXJyb3IgY2F1c2UgdGhlIGVycm9yIHRvIGJlIGJ1YmJsZWQgdXAgaW5zdGVhZCBvZiB0cmlnZ2VyaW5nIHJlamVjdGlvbiAoYmVjYXVzZSB0aGUgc3BlYyBkb2VzIG5vdCBhY2NvdW50IGZvciB0aGUgaW1wb3J0YW50IHVzZSBjYXNlIG9mIGRlZmF1bHQgYnJvd3NlciBlcnJvciBoYW5kbGluZywgaS5lLiBtZXNzYWdlIHcvIGxpbmUgbnVtYmVyKVxyXG5cdGZ1bmN0aW9uIERlZmVycmVkKHN1Y2Nlc3NDYWxsYmFjaywgZmFpbHVyZUNhbGxiYWNrKSB7XHJcblx0XHR2YXIgUkVTT0xWSU5HID0gMSwgUkVKRUNUSU5HID0gMiwgUkVTT0xWRUQgPSAzLCBSRUpFQ1RFRCA9IDQ7XHJcblx0XHR2YXIgc2VsZiA9IHRoaXMsIHN0YXRlID0gMCwgcHJvbWlzZVZhbHVlID0gMCwgbmV4dCA9IFtdO1xyXG5cclxuXHRcdHNlbGYucHJvbWlzZSA9IHt9O1xyXG5cclxuXHRcdHNlbGYucmVzb2x2ZSA9IGZ1bmN0aW9uKHZhbHVlKSB7XHJcblx0XHRcdGlmICghc3RhdGUpIHtcclxuXHRcdFx0XHRwcm9taXNlVmFsdWUgPSB2YWx1ZTtcclxuXHRcdFx0XHRzdGF0ZSA9IFJFU09MVklORztcclxuXHJcblx0XHRcdFx0ZmlyZSgpO1xyXG5cdFx0XHR9XHJcblx0XHRcdHJldHVybiB0aGlzO1xyXG5cdFx0fTtcclxuXHJcblx0XHRzZWxmLnJlamVjdCA9IGZ1bmN0aW9uKHZhbHVlKSB7XHJcblx0XHRcdGlmICghc3RhdGUpIHtcclxuXHRcdFx0XHRwcm9taXNlVmFsdWUgPSB2YWx1ZTtcclxuXHRcdFx0XHRzdGF0ZSA9IFJFSkVDVElORztcclxuXHJcblx0XHRcdFx0ZmlyZSgpO1xyXG5cdFx0XHR9XHJcblx0XHRcdHJldHVybiB0aGlzO1xyXG5cdFx0fTtcclxuXHJcblx0XHRzZWxmLnByb21pc2UudGhlbiA9IGZ1bmN0aW9uKHN1Y2Nlc3NDYWxsYmFjaywgZmFpbHVyZUNhbGxiYWNrKSB7XHJcblx0XHRcdHZhciBkZWZlcnJlZCA9IG5ldyBEZWZlcnJlZChzdWNjZXNzQ2FsbGJhY2ssIGZhaWx1cmVDYWxsYmFjaylcclxuXHRcdFx0aWYgKHN0YXRlID09PSBSRVNPTFZFRCkge1xyXG5cdFx0XHRcdGRlZmVycmVkLnJlc29sdmUocHJvbWlzZVZhbHVlKTtcclxuXHRcdFx0fVxyXG5cdFx0XHRlbHNlIGlmIChzdGF0ZSA9PT0gUkVKRUNURUQpIHtcclxuXHRcdFx0XHRkZWZlcnJlZC5yZWplY3QocHJvbWlzZVZhbHVlKTtcclxuXHRcdFx0fVxyXG5cdFx0XHRlbHNlIHtcclxuXHRcdFx0XHRuZXh0LnB1c2goZGVmZXJyZWQpO1xyXG5cdFx0XHR9XHJcblx0XHRcdHJldHVybiBkZWZlcnJlZC5wcm9taXNlXHJcblx0XHR9O1xyXG5cclxuXHRcdGZ1bmN0aW9uIGZpbmlzaCh0eXBlKSB7XHJcblx0XHRcdHN0YXRlID0gdHlwZSB8fCBSRUpFQ1RFRDtcclxuXHRcdFx0bmV4dC5tYXAoZnVuY3Rpb24oZGVmZXJyZWQpIHtcclxuXHRcdFx0XHRzdGF0ZSA9PT0gUkVTT0xWRUQgPyBkZWZlcnJlZC5yZXNvbHZlKHByb21pc2VWYWx1ZSkgOiBkZWZlcnJlZC5yZWplY3QocHJvbWlzZVZhbHVlKTtcclxuXHRcdFx0fSk7XHJcblx0XHR9XHJcblxyXG5cdFx0ZnVuY3Rpb24gdGhlbm5hYmxlKHRoZW4sIHN1Y2Nlc3NDYWxsYmFjaywgZmFpbHVyZUNhbGxiYWNrLCBub3RUaGVubmFibGVDYWxsYmFjaykge1xyXG5cdFx0XHRpZiAoKChwcm9taXNlVmFsdWUgIT0gbnVsbCAmJiBpc09iamVjdChwcm9taXNlVmFsdWUpKSB8fCBpc0Z1bmN0aW9uKHByb21pc2VWYWx1ZSkpICYmIGlzRnVuY3Rpb24odGhlbikpIHtcclxuXHRcdFx0XHR0cnkge1xyXG5cdFx0XHRcdFx0Ly8gY291bnQgcHJvdGVjdHMgYWdhaW5zdCBhYnVzZSBjYWxscyBmcm9tIHNwZWMgY2hlY2tlclxyXG5cdFx0XHRcdFx0dmFyIGNvdW50ID0gMDtcclxuXHRcdFx0XHRcdHRoZW4uY2FsbChwcm9taXNlVmFsdWUsIGZ1bmN0aW9uKHZhbHVlKSB7XHJcblx0XHRcdFx0XHRcdGlmIChjb3VudCsrKSByZXR1cm47XHJcblx0XHRcdFx0XHRcdHByb21pc2VWYWx1ZSA9IHZhbHVlO1xyXG5cdFx0XHRcdFx0XHRzdWNjZXNzQ2FsbGJhY2soKTtcclxuXHRcdFx0XHRcdH0sIGZ1bmN0aW9uICh2YWx1ZSkge1xyXG5cdFx0XHRcdFx0XHRpZiAoY291bnQrKykgcmV0dXJuO1xyXG5cdFx0XHRcdFx0XHRwcm9taXNlVmFsdWUgPSB2YWx1ZTtcclxuXHRcdFx0XHRcdFx0ZmFpbHVyZUNhbGxiYWNrKCk7XHJcblx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0Y2F0Y2ggKGUpIHtcclxuXHRcdFx0XHRcdG0uZGVmZXJyZWQub25lcnJvcihlKTtcclxuXHRcdFx0XHRcdHByb21pc2VWYWx1ZSA9IGU7XHJcblx0XHRcdFx0XHRmYWlsdXJlQ2FsbGJhY2soKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0bm90VGhlbm5hYmxlQ2FsbGJhY2soKTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdGZ1bmN0aW9uIGZpcmUoKSB7XHJcblx0XHRcdC8vIGNoZWNrIGlmIGl0J3MgYSB0aGVuYWJsZVxyXG5cdFx0XHR2YXIgdGhlbjtcclxuXHRcdFx0dHJ5IHtcclxuXHRcdFx0XHR0aGVuID0gcHJvbWlzZVZhbHVlICYmIHByb21pc2VWYWx1ZS50aGVuO1xyXG5cdFx0XHR9XHJcblx0XHRcdGNhdGNoIChlKSB7XHJcblx0XHRcdFx0bS5kZWZlcnJlZC5vbmVycm9yKGUpO1xyXG5cdFx0XHRcdHByb21pc2VWYWx1ZSA9IGU7XHJcblx0XHRcdFx0c3RhdGUgPSBSRUpFQ1RJTkc7XHJcblx0XHRcdFx0cmV0dXJuIGZpcmUoKTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0dGhlbm5hYmxlKHRoZW4sIGZ1bmN0aW9uKCkge1xyXG5cdFx0XHRcdHN0YXRlID0gUkVTT0xWSU5HO1xyXG5cdFx0XHRcdGZpcmUoKTtcclxuXHRcdFx0fSwgZnVuY3Rpb24oKSB7XHJcblx0XHRcdFx0c3RhdGUgPSBSRUpFQ1RJTkc7XHJcblx0XHRcdFx0ZmlyZSgpO1xyXG5cdFx0XHR9LCBmdW5jdGlvbigpIHtcclxuXHRcdFx0XHR0cnkge1xyXG5cdFx0XHRcdFx0aWYgKHN0YXRlID09PSBSRVNPTFZJTkcgJiYgaXNGdW5jdGlvbihzdWNjZXNzQ2FsbGJhY2spKSB7XHJcblx0XHRcdFx0XHRcdHByb21pc2VWYWx1ZSA9IHN1Y2Nlc3NDYWxsYmFjayhwcm9taXNlVmFsdWUpO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0ZWxzZSBpZiAoc3RhdGUgPT09IFJFSkVDVElORyAmJiBpc0Z1bmN0aW9uKGZhaWx1cmVDYWxsYmFjaykpIHtcclxuXHRcdFx0XHRcdFx0cHJvbWlzZVZhbHVlID0gZmFpbHVyZUNhbGxiYWNrKHByb21pc2VWYWx1ZSk7XHJcblx0XHRcdFx0XHRcdHN0YXRlID0gUkVTT0xWSU5HO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRjYXRjaCAoZSkge1xyXG5cdFx0XHRcdFx0bS5kZWZlcnJlZC5vbmVycm9yKGUpO1xyXG5cdFx0XHRcdFx0cHJvbWlzZVZhbHVlID0gZTtcclxuXHRcdFx0XHRcdHJldHVybiBmaW5pc2goKTtcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdGlmIChwcm9taXNlVmFsdWUgPT09IHNlbGYpIHtcclxuXHRcdFx0XHRcdHByb21pc2VWYWx1ZSA9IFR5cGVFcnJvcigpO1xyXG5cdFx0XHRcdFx0ZmluaXNoKCk7XHJcblx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdHRoZW5uYWJsZSh0aGVuLCBmdW5jdGlvbiAoKSB7XHJcblx0XHRcdFx0XHRcdGZpbmlzaChSRVNPTFZFRCk7XHJcblx0XHRcdFx0XHR9LCBmaW5pc2gsIGZ1bmN0aW9uICgpIHtcclxuXHRcdFx0XHRcdFx0ZmluaXNoKHN0YXRlID09PSBSRVNPTFZJTkcgJiYgUkVTT0xWRUQpO1xyXG5cdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9KTtcclxuXHRcdH1cclxuXHR9XHJcblx0bS5kZWZlcnJlZC5vbmVycm9yID0gZnVuY3Rpb24oZSkge1xyXG5cdFx0aWYgKHR5cGUuY2FsbChlKSA9PT0gXCJbb2JqZWN0IEVycm9yXVwiICYmICFlLmNvbnN0cnVjdG9yLnRvU3RyaW5nKCkubWF0Y2goLyBFcnJvci8pKSB7XHJcblx0XHRcdHBlbmRpbmdSZXF1ZXN0cyA9IDA7XHJcblx0XHRcdHRocm93IGU7XHJcblx0XHR9XHJcblx0fTtcclxuXHJcblx0bS5zeW5jID0gZnVuY3Rpb24oYXJncykge1xyXG5cdFx0dmFyIG1ldGhvZCA9IFwicmVzb2x2ZVwiO1xyXG5cclxuXHRcdGZ1bmN0aW9uIHN5bmNocm9uaXplcihwb3MsIHJlc29sdmVkKSB7XHJcblx0XHRcdHJldHVybiBmdW5jdGlvbih2YWx1ZSkge1xyXG5cdFx0XHRcdHJlc3VsdHNbcG9zXSA9IHZhbHVlO1xyXG5cdFx0XHRcdGlmICghcmVzb2x2ZWQpIG1ldGhvZCA9IFwicmVqZWN0XCI7XHJcblx0XHRcdFx0aWYgKC0tb3V0c3RhbmRpbmcgPT09IDApIHtcclxuXHRcdFx0XHRcdGRlZmVycmVkLnByb21pc2UocmVzdWx0cyk7XHJcblx0XHRcdFx0XHRkZWZlcnJlZFttZXRob2RdKHJlc3VsdHMpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRyZXR1cm4gdmFsdWU7XHJcblx0XHRcdH07XHJcblx0XHR9XHJcblxyXG5cdFx0dmFyIGRlZmVycmVkID0gbS5kZWZlcnJlZCgpO1xyXG5cdFx0dmFyIG91dHN0YW5kaW5nID0gYXJncy5sZW5ndGg7XHJcblx0XHR2YXIgcmVzdWx0cyA9IG5ldyBBcnJheShvdXRzdGFuZGluZyk7XHJcblx0XHRpZiAoYXJncy5sZW5ndGggPiAwKSB7XHJcblx0XHRcdGZvckVhY2goYXJncywgZnVuY3Rpb24gKGFyZywgaSkge1xyXG5cdFx0XHRcdGFyZy50aGVuKHN5bmNocm9uaXplcihpLCB0cnVlKSwgc3luY2hyb25pemVyKGksIGZhbHNlKSk7XHJcblx0XHRcdH0pO1xyXG5cdFx0fVxyXG5cdFx0ZWxzZSBkZWZlcnJlZC5yZXNvbHZlKFtdKTtcclxuXHJcblx0XHRyZXR1cm4gZGVmZXJyZWQucHJvbWlzZTtcclxuXHR9O1xyXG5cdGZ1bmN0aW9uIGlkZW50aXR5KHZhbHVlKSB7IHJldHVybiB2YWx1ZTsgfVxyXG5cclxuXHRmdW5jdGlvbiBhamF4KG9wdGlvbnMpIHtcclxuXHRcdGlmIChvcHRpb25zLmRhdGFUeXBlICYmIG9wdGlvbnMuZGF0YVR5cGUudG9Mb3dlckNhc2UoKSA9PT0gXCJqc29ucFwiKSB7XHJcblx0XHRcdHZhciBjYWxsYmFja0tleSA9IFwibWl0aHJpbF9jYWxsYmFja19cIiArIG5ldyBEYXRlKCkuZ2V0VGltZSgpICsgXCJfXCIgKyAoTWF0aC5yb3VuZChNYXRoLnJhbmRvbSgpICogMWUxNikpLnRvU3RyaW5nKDM2KVxyXG5cdFx0XHR2YXIgc2NyaXB0ID0gJGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJzY3JpcHRcIik7XHJcblxyXG5cdFx0XHR3aW5kb3dbY2FsbGJhY2tLZXldID0gZnVuY3Rpb24ocmVzcCkge1xyXG5cdFx0XHRcdHNjcmlwdC5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKHNjcmlwdCk7XHJcblx0XHRcdFx0b3B0aW9ucy5vbmxvYWQoe1xyXG5cdFx0XHRcdFx0dHlwZTogXCJsb2FkXCIsXHJcblx0XHRcdFx0XHR0YXJnZXQ6IHtcclxuXHRcdFx0XHRcdFx0cmVzcG9uc2VUZXh0OiByZXNwXHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdFx0d2luZG93W2NhbGxiYWNrS2V5XSA9IHVuZGVmaW5lZDtcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdHNjcmlwdC5vbmVycm9yID0gZnVuY3Rpb24oKSB7XHJcblx0XHRcdFx0c2NyaXB0LnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQoc2NyaXB0KTtcclxuXHJcblx0XHRcdFx0b3B0aW9ucy5vbmVycm9yKHtcclxuXHRcdFx0XHRcdHR5cGU6IFwiZXJyb3JcIixcclxuXHRcdFx0XHRcdHRhcmdldDoge1xyXG5cdFx0XHRcdFx0XHRzdGF0dXM6IDUwMCxcclxuXHRcdFx0XHRcdFx0cmVzcG9uc2VUZXh0OiBKU09OLnN0cmluZ2lmeSh7XHJcblx0XHRcdFx0XHRcdFx0ZXJyb3I6IFwiRXJyb3IgbWFraW5nIGpzb25wIHJlcXVlc3RcIlxyXG5cdFx0XHRcdFx0XHR9KVxyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHRcdHdpbmRvd1tjYWxsYmFja0tleV0gPSB1bmRlZmluZWQ7XHJcblxyXG5cdFx0XHRcdHJldHVybiBmYWxzZTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0c2NyaXB0Lm9ubG9hZCA9IGZ1bmN0aW9uKCkge1xyXG5cdFx0XHRcdHJldHVybiBmYWxzZTtcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdHNjcmlwdC5zcmMgPSBvcHRpb25zLnVybFxyXG5cdFx0XHRcdCsgKG9wdGlvbnMudXJsLmluZGV4T2YoXCI/XCIpID4gMCA/IFwiJlwiIDogXCI/XCIpXHJcblx0XHRcdFx0KyAob3B0aW9ucy5jYWxsYmFja0tleSA/IG9wdGlvbnMuY2FsbGJhY2tLZXkgOiBcImNhbGxiYWNrXCIpXHJcblx0XHRcdFx0KyBcIj1cIiArIGNhbGxiYWNrS2V5XHJcblx0XHRcdFx0KyBcIiZcIiArIGJ1aWxkUXVlcnlTdHJpbmcob3B0aW9ucy5kYXRhIHx8IHt9KTtcclxuXHRcdFx0JGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQoc2NyaXB0KTtcclxuXHRcdH1cclxuXHRcdGVsc2Uge1xyXG5cdFx0XHR2YXIgeGhyID0gbmV3IHdpbmRvdy5YTUxIdHRwUmVxdWVzdCgpO1xyXG5cdFx0XHR4aHIub3BlbihvcHRpb25zLm1ldGhvZCwgb3B0aW9ucy51cmwsIHRydWUsIG9wdGlvbnMudXNlciwgb3B0aW9ucy5wYXNzd29yZCk7XHJcblx0XHRcdHhoci5vbnJlYWR5c3RhdGVjaGFuZ2UgPSBmdW5jdGlvbigpIHtcclxuXHRcdFx0XHRpZiAoeGhyLnJlYWR5U3RhdGUgPT09IDQpIHtcclxuXHRcdFx0XHRcdGlmICh4aHIuc3RhdHVzID49IDIwMCAmJiB4aHIuc3RhdHVzIDwgMzAwKSBvcHRpb25zLm9ubG9hZCh7dHlwZTogXCJsb2FkXCIsIHRhcmdldDogeGhyfSk7XHJcblx0XHRcdFx0XHRlbHNlIG9wdGlvbnMub25lcnJvcih7dHlwZTogXCJlcnJvclwiLCB0YXJnZXQ6IHhocn0pO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fTtcclxuXHRcdFx0aWYgKG9wdGlvbnMuc2VyaWFsaXplID09PSBKU09OLnN0cmluZ2lmeSAmJiBvcHRpb25zLmRhdGEgJiYgb3B0aW9ucy5tZXRob2QgIT09IFwiR0VUXCIpIHtcclxuXHRcdFx0XHR4aHIuc2V0UmVxdWVzdEhlYWRlcihcIkNvbnRlbnQtVHlwZVwiLCBcImFwcGxpY2F0aW9uL2pzb247IGNoYXJzZXQ9dXRmLThcIik7XHJcblx0XHRcdH1cclxuXHRcdFx0aWYgKG9wdGlvbnMuZGVzZXJpYWxpemUgPT09IEpTT04ucGFyc2UpIHtcclxuXHRcdFx0XHR4aHIuc2V0UmVxdWVzdEhlYWRlcihcIkFjY2VwdFwiLCBcImFwcGxpY2F0aW9uL2pzb24sIHRleHQvKlwiKTtcclxuXHRcdFx0fVxyXG5cdFx0XHRpZiAoaXNGdW5jdGlvbihvcHRpb25zLmNvbmZpZykpIHtcclxuXHRcdFx0XHR2YXIgbWF5YmVYaHIgPSBvcHRpb25zLmNvbmZpZyh4aHIsIG9wdGlvbnMpO1xyXG5cdFx0XHRcdGlmIChtYXliZVhociAhPSBudWxsKSB4aHIgPSBtYXliZVhocjtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0dmFyIGRhdGEgPSBvcHRpb25zLm1ldGhvZCA9PT0gXCJHRVRcIiB8fCAhb3B0aW9ucy5kYXRhID8gXCJcIiA6IG9wdGlvbnMuZGF0YTtcclxuXHRcdFx0aWYgKGRhdGEgJiYgKCFpc1N0cmluZyhkYXRhKSAmJiBkYXRhLmNvbnN0cnVjdG9yICE9PSB3aW5kb3cuRm9ybURhdGEpKSB7XHJcblx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKFwiUmVxdWVzdCBkYXRhIHNob3VsZCBiZSBlaXRoZXIgYmUgYSBzdHJpbmcgb3IgRm9ybURhdGEuIENoZWNrIHRoZSBgc2VyaWFsaXplYCBvcHRpb24gaW4gYG0ucmVxdWVzdGBcIik7XHJcblx0XHRcdH1cclxuXHRcdFx0eGhyLnNlbmQoZGF0YSk7XHJcblx0XHRcdHJldHVybiB4aHI7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRmdW5jdGlvbiBiaW5kRGF0YSh4aHJPcHRpb25zLCBkYXRhLCBzZXJpYWxpemUpIHtcclxuXHRcdGlmICh4aHJPcHRpb25zLm1ldGhvZCA9PT0gXCJHRVRcIiAmJiB4aHJPcHRpb25zLmRhdGFUeXBlICE9PSBcImpzb25wXCIpIHtcclxuXHRcdFx0dmFyIHByZWZpeCA9IHhock9wdGlvbnMudXJsLmluZGV4T2YoXCI/XCIpIDwgMCA/IFwiP1wiIDogXCImXCI7XHJcblx0XHRcdHZhciBxdWVyeXN0cmluZyA9IGJ1aWxkUXVlcnlTdHJpbmcoZGF0YSk7XHJcblx0XHRcdHhock9wdGlvbnMudXJsID0geGhyT3B0aW9ucy51cmwgKyAocXVlcnlzdHJpbmcgPyBwcmVmaXggKyBxdWVyeXN0cmluZyA6IFwiXCIpO1xyXG5cdFx0fVxyXG5cdFx0ZWxzZSB4aHJPcHRpb25zLmRhdGEgPSBzZXJpYWxpemUoZGF0YSk7XHJcblx0XHRyZXR1cm4geGhyT3B0aW9ucztcclxuXHR9XHJcblxyXG5cdGZ1bmN0aW9uIHBhcmFtZXRlcml6ZVVybCh1cmwsIGRhdGEpIHtcclxuXHRcdHZhciB0b2tlbnMgPSB1cmwubWF0Y2goLzpbYS16XVxcdysvZ2kpO1xyXG5cdFx0aWYgKHRva2VucyAmJiBkYXRhKSB7XHJcblx0XHRcdGZvckVhY2godG9rZW5zLCBmdW5jdGlvbiAodG9rZW4pIHtcclxuXHRcdFx0XHR2YXIga2V5ID0gdG9rZW4uc2xpY2UoMSk7XHJcblx0XHRcdFx0dXJsID0gdXJsLnJlcGxhY2UodG9rZW4sIGRhdGFba2V5XSk7XHJcblx0XHRcdFx0ZGVsZXRlIGRhdGFba2V5XTtcclxuXHRcdFx0fSk7XHJcblx0XHR9XHJcblx0XHRyZXR1cm4gdXJsO1xyXG5cdH1cclxuXHJcblx0bS5yZXF1ZXN0ID0gZnVuY3Rpb24oeGhyT3B0aW9ucykge1xyXG5cdFx0aWYgKHhock9wdGlvbnMuYmFja2dyb3VuZCAhPT0gdHJ1ZSkgbS5zdGFydENvbXB1dGF0aW9uKCk7XHJcblx0XHR2YXIgZGVmZXJyZWQgPSBuZXcgRGVmZXJyZWQoKTtcclxuXHRcdHZhciBpc0pTT05QID0geGhyT3B0aW9ucy5kYXRhVHlwZSAmJiB4aHJPcHRpb25zLmRhdGFUeXBlLnRvTG93ZXJDYXNlKCkgPT09IFwianNvbnBcIlxyXG5cdFx0dmFyIHNlcmlhbGl6ZSA9IHhock9wdGlvbnMuc2VyaWFsaXplID0gaXNKU09OUCA/IGlkZW50aXR5IDogeGhyT3B0aW9ucy5zZXJpYWxpemUgfHwgSlNPTi5zdHJpbmdpZnk7XHJcblx0XHR2YXIgZGVzZXJpYWxpemUgPSB4aHJPcHRpb25zLmRlc2VyaWFsaXplID0gaXNKU09OUCA/IGlkZW50aXR5IDogeGhyT3B0aW9ucy5kZXNlcmlhbGl6ZSB8fCBKU09OLnBhcnNlO1xyXG5cdFx0dmFyIGV4dHJhY3QgPSBpc0pTT05QID8gZnVuY3Rpb24oanNvbnApIHsgcmV0dXJuIGpzb25wLnJlc3BvbnNlVGV4dCB9IDogeGhyT3B0aW9ucy5leHRyYWN0IHx8IGZ1bmN0aW9uKHhocikge1xyXG5cdFx0XHRpZiAoeGhyLnJlc3BvbnNlVGV4dC5sZW5ndGggPT09IDAgJiYgZGVzZXJpYWxpemUgPT09IEpTT04ucGFyc2UpIHtcclxuXHRcdFx0XHRyZXR1cm4gbnVsbFxyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdHJldHVybiB4aHIucmVzcG9uc2VUZXh0XHJcblx0XHRcdH1cclxuXHRcdH07XHJcblx0XHR4aHJPcHRpb25zLm1ldGhvZCA9ICh4aHJPcHRpb25zLm1ldGhvZCB8fCBcIkdFVFwiKS50b1VwcGVyQ2FzZSgpO1xyXG5cdFx0eGhyT3B0aW9ucy51cmwgPSBwYXJhbWV0ZXJpemVVcmwoeGhyT3B0aW9ucy51cmwsIHhock9wdGlvbnMuZGF0YSk7XHJcblx0XHR4aHJPcHRpb25zID0gYmluZERhdGEoeGhyT3B0aW9ucywgeGhyT3B0aW9ucy5kYXRhLCBzZXJpYWxpemUpO1xyXG5cdFx0eGhyT3B0aW9ucy5vbmxvYWQgPSB4aHJPcHRpb25zLm9uZXJyb3IgPSBmdW5jdGlvbihlKSB7XHJcblx0XHRcdHRyeSB7XHJcblx0XHRcdFx0ZSA9IGUgfHwgZXZlbnQ7XHJcblx0XHRcdFx0dmFyIHVud3JhcCA9IChlLnR5cGUgPT09IFwibG9hZFwiID8geGhyT3B0aW9ucy51bndyYXBTdWNjZXNzIDogeGhyT3B0aW9ucy51bndyYXBFcnJvcikgfHwgaWRlbnRpdHk7XHJcblx0XHRcdFx0dmFyIHJlc3BvbnNlID0gdW53cmFwKGRlc2VyaWFsaXplKGV4dHJhY3QoZS50YXJnZXQsIHhock9wdGlvbnMpKSwgZS50YXJnZXQpO1xyXG5cdFx0XHRcdGlmIChlLnR5cGUgPT09IFwibG9hZFwiKSB7XHJcblx0XHRcdFx0XHRpZiAoaXNBcnJheShyZXNwb25zZSkgJiYgeGhyT3B0aW9ucy50eXBlKSB7XHJcblx0XHRcdFx0XHRcdGZvckVhY2gocmVzcG9uc2UsIGZ1bmN0aW9uIChyZXMsIGkpIHtcclxuXHRcdFx0XHRcdFx0XHRyZXNwb25zZVtpXSA9IG5ldyB4aHJPcHRpb25zLnR5cGUocmVzKTtcclxuXHRcdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0XHR9IGVsc2UgaWYgKHhock9wdGlvbnMudHlwZSkge1xyXG5cdFx0XHRcdFx0XHRyZXNwb25zZSA9IG5ldyB4aHJPcHRpb25zLnR5cGUocmVzcG9uc2UpO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0ZGVmZXJyZWRbZS50eXBlID09PSBcImxvYWRcIiA/IFwicmVzb2x2ZVwiIDogXCJyZWplY3RcIl0ocmVzcG9uc2UpO1xyXG5cdFx0XHR9IGNhdGNoIChlKSB7XHJcblx0XHRcdFx0bS5kZWZlcnJlZC5vbmVycm9yKGUpO1xyXG5cdFx0XHRcdGRlZmVycmVkLnJlamVjdChlKTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0aWYgKHhock9wdGlvbnMuYmFja2dyb3VuZCAhPT0gdHJ1ZSkgbS5lbmRDb21wdXRhdGlvbigpXHJcblx0XHR9XHJcblxyXG5cdFx0YWpheCh4aHJPcHRpb25zKTtcclxuXHRcdGRlZmVycmVkLnByb21pc2UgPSBwcm9waWZ5KGRlZmVycmVkLnByb21pc2UsIHhock9wdGlvbnMuaW5pdGlhbFZhbHVlKTtcclxuXHRcdHJldHVybiBkZWZlcnJlZC5wcm9taXNlO1xyXG5cdH07XHJcblxyXG5cdC8vdGVzdGluZyBBUElcclxuXHRtLmRlcHMgPSBmdW5jdGlvbihtb2NrKSB7XHJcblx0XHRpbml0aWFsaXplKHdpbmRvdyA9IG1vY2sgfHwgd2luZG93KTtcclxuXHRcdHJldHVybiB3aW5kb3c7XHJcblx0fTtcclxuXHQvL2ZvciBpbnRlcm5hbCB0ZXN0aW5nIG9ubHksIGRvIG5vdCB1c2UgYG0uZGVwcy5mYWN0b3J5YFxyXG5cdG0uZGVwcy5mYWN0b3J5ID0gYXBwO1xyXG5cclxuXHRyZXR1cm4gbTtcclxufSkodHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9KTtcclxuXHJcbmlmICh0eXBlb2YgbW9kdWxlID09PSBcIm9iamVjdFwiICYmIG1vZHVsZSAhPSBudWxsICYmIG1vZHVsZS5leHBvcnRzKSBtb2R1bGUuZXhwb3J0cyA9IG07XHJcbmVsc2UgaWYgKHR5cGVvZiBkZWZpbmUgPT09IFwiZnVuY3Rpb25cIiAmJiBkZWZpbmUuYW1kKSBkZWZpbmUoZnVuY3Rpb24oKSB7IHJldHVybiBtIH0pO1xyXG4iLCJ2YXIgdXRpbCA9IHJlcXVpcmUoJy4vdXRpbCcpO1xuXG4vLyBodHRwczovL2dpc3QuZ2l0aHViLmNvbS9ncmUvMTY1MDI5NFxudmFyIGVhc2luZyA9IHtcbiAgZWFzZUluT3V0Q3ViaWM6IGZ1bmN0aW9uKHQpIHtcbiAgICByZXR1cm4gdCA8IDAuNSA/IDQgKiB0ICogdCAqIHQgOiAodCAtIDEpICogKDIgKiB0IC0gMikgKiAoMiAqIHQgLSAyKSArIDE7XG4gIH0sXG59O1xuXG5mdW5jdGlvbiBtYWtlUGllY2UoaywgcGllY2UsIGludmVydCkge1xuICB2YXIga2V5ID0gaW52ZXJ0ID8gdXRpbC5pbnZlcnRLZXkoaykgOiBrO1xuICByZXR1cm4ge1xuICAgIGtleToga2V5LFxuICAgIHBvczogdXRpbC5rZXkycG9zKGtleSksXG4gICAgcm9sZTogcGllY2Uucm9sZSxcbiAgICBjb2xvcjogcGllY2UuY29sb3JcbiAgfTtcbn1cblxuZnVuY3Rpb24gc2FtZVBpZWNlKHAxLCBwMikge1xuICByZXR1cm4gcDEucm9sZSA9PT0gcDIucm9sZSAmJiBwMS5jb2xvciA9PT0gcDIuY29sb3I7XG59XG5cbmZ1bmN0aW9uIGNsb3NlcihwaWVjZSwgcGllY2VzKSB7XG4gIHJldHVybiBwaWVjZXMuc29ydChmdW5jdGlvbihwMSwgcDIpIHtcbiAgICByZXR1cm4gdXRpbC5kaXN0YW5jZShwaWVjZS5wb3MsIHAxLnBvcykgLSB1dGlsLmRpc3RhbmNlKHBpZWNlLnBvcywgcDIucG9zKTtcbiAgfSlbMF07XG59XG5cbmZ1bmN0aW9uIGNvbXB1dGVQbGFuKHByZXYsIGN1cnJlbnQpIHtcbiAgdmFyIGJvdW5kcyA9IGN1cnJlbnQuYm91bmRzKCksXG4gICAgd2lkdGggPSBib3VuZHMud2lkdGggLyA4LFxuICAgIGhlaWdodCA9IGJvdW5kcy5oZWlnaHQgLyA4LFxuICAgIGFuaW1zID0ge30sXG4gICAgYW5pbWVkT3JpZ3MgPSBbXSxcbiAgICBmYWRpbmdzID0gW10sXG4gICAgbWlzc2luZ3MgPSBbXSxcbiAgICBuZXdzID0gW10sXG4gICAgaW52ZXJ0ID0gcHJldi5vcmllbnRhdGlvbiAhPT0gY3VycmVudC5vcmllbnRhdGlvbixcbiAgICBwcmVQaWVjZXMgPSB7fSxcbiAgICB3aGl0ZSA9IGN1cnJlbnQub3JpZW50YXRpb24gPT09ICd3aGl0ZSc7XG4gIGZvciAodmFyIHBrIGluIHByZXYucGllY2VzKSB7XG4gICAgdmFyIHBpZWNlID0gbWFrZVBpZWNlKHBrLCBwcmV2LnBpZWNlc1twa10sIGludmVydCk7XG4gICAgcHJlUGllY2VzW3BpZWNlLmtleV0gPSBwaWVjZTtcbiAgfVxuICBmb3IgKHZhciBpID0gMDsgaSA8IHV0aWwuYWxsS2V5cy5sZW5ndGg7IGkrKykge1xuICAgIHZhciBrZXkgPSB1dGlsLmFsbEtleXNbaV07XG4gICAgaWYgKGtleSAhPT0gY3VycmVudC5tb3ZhYmxlLmRyb3BwZWRbMV0pIHtcbiAgICAgIHZhciBjdXJQID0gY3VycmVudC5waWVjZXNba2V5XTtcbiAgICAgIHZhciBwcmVQID0gcHJlUGllY2VzW2tleV07XG4gICAgICBpZiAoY3VyUCkge1xuICAgICAgICBpZiAocHJlUCkge1xuICAgICAgICAgIGlmICghc2FtZVBpZWNlKGN1clAsIHByZVApKSB7XG4gICAgICAgICAgICBtaXNzaW5ncy5wdXNoKHByZVApO1xuICAgICAgICAgICAgbmV3cy5wdXNoKG1ha2VQaWVjZShrZXksIGN1clAsIGZhbHNlKSk7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2VcbiAgICAgICAgICBuZXdzLnB1c2gobWFrZVBpZWNlKGtleSwgY3VyUCwgZmFsc2UpKTtcbiAgICAgIH0gZWxzZSBpZiAocHJlUClcbiAgICAgICAgbWlzc2luZ3MucHVzaChwcmVQKTtcbiAgICB9XG4gIH1cbiAgbmV3cy5mb3JFYWNoKGZ1bmN0aW9uKG5ld1ApIHtcbiAgICB2YXIgcHJlUCA9IGNsb3NlcihuZXdQLCBtaXNzaW5ncy5maWx0ZXIodXRpbC5wYXJ0aWFsKHNhbWVQaWVjZSwgbmV3UCkpKTtcbiAgICBpZiAocHJlUCkge1xuICAgICAgdmFyIG9yaWcgPSB3aGl0ZSA/IHByZVAucG9zIDogbmV3UC5wb3M7XG4gICAgICB2YXIgZGVzdCA9IHdoaXRlID8gbmV3UC5wb3MgOiBwcmVQLnBvcztcbiAgICAgIHZhciB2ZWN0b3IgPSBbKG9yaWdbMF0gLSBkZXN0WzBdKSAqIHdpZHRoLCAoZGVzdFsxXSAtIG9yaWdbMV0pICogaGVpZ2h0XTtcbiAgICAgIGFuaW1zW25ld1Aua2V5XSA9IFt2ZWN0b3IsIHZlY3Rvcl07XG4gICAgICBhbmltZWRPcmlncy5wdXNoKHByZVAua2V5KTtcbiAgICB9XG4gIH0pO1xuICBtaXNzaW5ncy5mb3JFYWNoKGZ1bmN0aW9uKHApIHtcbiAgICBpZiAoXG4gICAgICBwLmtleSAhPT0gY3VycmVudC5tb3ZhYmxlLmRyb3BwZWRbMF0gJiZcbiAgICAgICF1dGlsLmNvbnRhaW5zWChhbmltZWRPcmlncywgcC5rZXkpICYmXG4gICAgICAhKGN1cnJlbnQuaXRlbXMgPyBjdXJyZW50Lml0ZW1zLnJlbmRlcihwLnBvcywgcC5rZXkpIDogZmFsc2UpXG4gICAgKVxuICAgICAgZmFkaW5ncy5wdXNoKHtcbiAgICAgICAgcGllY2U6IHAsXG4gICAgICAgIG9wYWNpdHk6IDFcbiAgICAgIH0pO1xuICB9KTtcblxuICByZXR1cm4ge1xuICAgIGFuaW1zOiBhbmltcyxcbiAgICBmYWRpbmdzOiBmYWRpbmdzXG4gIH07XG59XG5cbmZ1bmN0aW9uIHJvdW5kQnkobiwgYnkpIHtcbiAgcmV0dXJuIE1hdGgucm91bmQobiAqIGJ5KSAvIGJ5O1xufVxuXG5mdW5jdGlvbiBnbyhkYXRhKSB7XG4gIGlmICghZGF0YS5hbmltYXRpb24uY3VycmVudC5zdGFydCkgcmV0dXJuOyAvLyBhbmltYXRpb24gd2FzIGNhbmNlbGVkXG4gIHZhciByZXN0ID0gMSAtIChuZXcgRGF0ZSgpLmdldFRpbWUoKSAtIGRhdGEuYW5pbWF0aW9uLmN1cnJlbnQuc3RhcnQpIC8gZGF0YS5hbmltYXRpb24uY3VycmVudC5kdXJhdGlvbjtcbiAgaWYgKHJlc3QgPD0gMCkge1xuICAgIGRhdGEuYW5pbWF0aW9uLmN1cnJlbnQgPSB7fTtcbiAgICBkYXRhLnJlbmRlcigpO1xuICB9IGVsc2Uge1xuICAgIHZhciBlYXNlID0gZWFzaW5nLmVhc2VJbk91dEN1YmljKHJlc3QpO1xuICAgIGZvciAodmFyIGtleSBpbiBkYXRhLmFuaW1hdGlvbi5jdXJyZW50LmFuaW1zKSB7XG4gICAgICB2YXIgY2ZnID0gZGF0YS5hbmltYXRpb24uY3VycmVudC5hbmltc1trZXldO1xuICAgICAgY2ZnWzFdID0gW3JvdW5kQnkoY2ZnWzBdWzBdICogZWFzZSwgMTApLCByb3VuZEJ5KGNmZ1swXVsxXSAqIGVhc2UsIDEwKV07XG4gICAgfVxuICAgIGZvciAodmFyIGkgaW4gZGF0YS5hbmltYXRpb24uY3VycmVudC5mYWRpbmdzKSB7XG4gICAgICBkYXRhLmFuaW1hdGlvbi5jdXJyZW50LmZhZGluZ3NbaV0ub3BhY2l0eSA9IHJvdW5kQnkoZWFzZSwgMTAwKTtcbiAgICB9XG4gICAgZGF0YS5yZW5kZXIoKTtcbiAgICB1dGlsLnJlcXVlc3RBbmltYXRpb25GcmFtZShmdW5jdGlvbigpIHtcbiAgICAgIGdvKGRhdGEpO1xuICAgIH0pO1xuICB9XG59XG5cbmZ1bmN0aW9uIGFuaW1hdGUodHJhbnNmb3JtYXRpb24sIGRhdGEpIHtcbiAgLy8gY2xvbmUgZGF0YVxuICB2YXIgcHJldiA9IHtcbiAgICBvcmllbnRhdGlvbjogZGF0YS5vcmllbnRhdGlvbixcbiAgICBwaWVjZXM6IHt9XG4gIH07XG4gIC8vIGNsb25lIHBpZWNlc1xuICBmb3IgKHZhciBrZXkgaW4gZGF0YS5waWVjZXMpIHtcbiAgICBwcmV2LnBpZWNlc1trZXldID0ge1xuICAgICAgcm9sZTogZGF0YS5waWVjZXNba2V5XS5yb2xlLFxuICAgICAgY29sb3I6IGRhdGEucGllY2VzW2tleV0uY29sb3JcbiAgICB9O1xuICB9XG4gIHZhciByZXN1bHQgPSB0cmFuc2Zvcm1hdGlvbigpO1xuICBpZiAoZGF0YS5hbmltYXRpb24uZW5hYmxlZCkge1xuICAgIHZhciBwbGFuID0gY29tcHV0ZVBsYW4ocHJldiwgZGF0YSk7XG4gICAgaWYgKE9iamVjdC5rZXlzKHBsYW4uYW5pbXMpLmxlbmd0aCA+IDAgfHwgcGxhbi5mYWRpbmdzLmxlbmd0aCA+IDApIHtcbiAgICAgIHZhciBhbHJlYWR5UnVubmluZyA9IGRhdGEuYW5pbWF0aW9uLmN1cnJlbnQuc3RhcnQ7XG4gICAgICBkYXRhLmFuaW1hdGlvbi5jdXJyZW50ID0ge1xuICAgICAgICBzdGFydDogbmV3IERhdGUoKS5nZXRUaW1lKCksXG4gICAgICAgIGR1cmF0aW9uOiBkYXRhLmFuaW1hdGlvbi5kdXJhdGlvbixcbiAgICAgICAgYW5pbXM6IHBsYW4uYW5pbXMsXG4gICAgICAgIGZhZGluZ3M6IHBsYW4uZmFkaW5nc1xuICAgICAgfTtcbiAgICAgIGlmICghYWxyZWFkeVJ1bm5pbmcpIGdvKGRhdGEpO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBkb24ndCBhbmltYXRlLCBqdXN0IHJlbmRlciByaWdodCBhd2F5XG4gICAgICBkYXRhLnJlbmRlclJBRigpO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICAvLyBhbmltYXRpb25zIGFyZSBub3cgZGlzYWJsZWRcbiAgICBkYXRhLnJlbmRlclJBRigpO1xuICB9XG4gIHJldHVybiByZXN1bHQ7XG59XG5cbi8vIHRyYW5zZm9ybWF0aW9uIGlzIGEgZnVuY3Rpb25cbi8vIGFjY2VwdHMgYm9hcmQgZGF0YSBhbmQgYW55IG51bWJlciBvZiBhcmd1bWVudHMsXG4vLyBhbmQgbXV0YXRlcyB0aGUgYm9hcmQuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKHRyYW5zZm9ybWF0aW9uLCBkYXRhLCBza2lwKSB7XG4gIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICB2YXIgdHJhbnNmb3JtYXRpb25BcmdzID0gW2RhdGFdLmNvbmNhdChBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDApKTtcbiAgICBpZiAoIWRhdGEucmVuZGVyKSByZXR1cm4gdHJhbnNmb3JtYXRpb24uYXBwbHkobnVsbCwgdHJhbnNmb3JtYXRpb25BcmdzKTtcbiAgICBlbHNlIGlmIChkYXRhLmFuaW1hdGlvbi5lbmFibGVkICYmICFza2lwKVxuICAgICAgcmV0dXJuIGFuaW1hdGUodXRpbC5wYXJ0aWFsQXBwbHkodHJhbnNmb3JtYXRpb24sIHRyYW5zZm9ybWF0aW9uQXJncyksIGRhdGEpO1xuICAgIGVsc2Uge1xuICAgICAgdmFyIHJlc3VsdCA9IHRyYW5zZm9ybWF0aW9uLmFwcGx5KG51bGwsIHRyYW5zZm9ybWF0aW9uQXJncyk7XG4gICAgICBkYXRhLnJlbmRlclJBRigpO1xuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG4gIH07XG59O1xuIiwidmFyIGJvYXJkID0gcmVxdWlyZSgnLi9ib2FyZCcpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGNvbnRyb2xsZXIpIHtcblxuICByZXR1cm4ge1xuICAgIHNldDogY29udHJvbGxlci5zZXQsXG4gICAgdG9nZ2xlT3JpZW50YXRpb246IGNvbnRyb2xsZXIudG9nZ2xlT3JpZW50YXRpb24sXG4gICAgZ2V0T3JpZW50YXRpb246IGNvbnRyb2xsZXIuZ2V0T3JpZW50YXRpb24sXG4gICAgZ2V0UGllY2VzOiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBjb250cm9sbGVyLmRhdGEucGllY2VzO1xuICAgIH0sXG4gICAgZ2V0TWF0ZXJpYWxEaWZmOiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBib2FyZC5nZXRNYXRlcmlhbERpZmYoY29udHJvbGxlci5kYXRhKTtcbiAgICB9LFxuICAgIGdldEZlbjogY29udHJvbGxlci5nZXRGZW4sXG4gICAgbW92ZTogY29udHJvbGxlci5hcGlNb3ZlLFxuICAgIG5ld1BpZWNlOiBjb250cm9sbGVyLmFwaU5ld1BpZWNlLFxuICAgIHNldFBpZWNlczogY29udHJvbGxlci5zZXRQaWVjZXMsXG4gICAgc2V0Q2hlY2s6IGNvbnRyb2xsZXIuc2V0Q2hlY2ssXG4gICAgcGxheVByZW1vdmU6IGNvbnRyb2xsZXIucGxheVByZW1vdmUsXG4gICAgcGxheVByZWRyb3A6IGNvbnRyb2xsZXIucGxheVByZWRyb3AsXG4gICAgY2FuY2VsUHJlbW92ZTogY29udHJvbGxlci5jYW5jZWxQcmVtb3ZlLFxuICAgIGNhbmNlbFByZWRyb3A6IGNvbnRyb2xsZXIuY2FuY2VsUHJlZHJvcCxcbiAgICBjYW5jZWxNb3ZlOiBjb250cm9sbGVyLmNhbmNlbE1vdmUsXG4gICAgc3RvcDogY29udHJvbGxlci5zdG9wLFxuICAgIGV4cGxvZGU6IGNvbnRyb2xsZXIuZXhwbG9kZSxcbiAgICBzZXRBdXRvU2hhcGVzOiBjb250cm9sbGVyLnNldEF1dG9TaGFwZXMsXG4gICAgc2V0U2hhcGVzOiBjb250cm9sbGVyLnNldFNoYXBlcyxcbiAgICBkYXRhOiBjb250cm9sbGVyLmRhdGEgLy8gZGlyZWN0bHkgZXhwb3NlcyBjaGVzc2dyb3VuZCBzdGF0ZSBmb3IgbW9yZSBtZXNzaW5nIGFyb3VuZFxuICB9O1xufTtcbiIsInZhciB1dGlsID0gcmVxdWlyZSgnLi91dGlsJyk7XG52YXIgcHJlbW92ZSA9IHJlcXVpcmUoJy4vcHJlbW92ZScpO1xudmFyIGFuaW0gPSByZXF1aXJlKCcuL2FuaW0nKTtcbnZhciBob2xkID0gcmVxdWlyZSgnLi9ob2xkJyk7XG5cbmZ1bmN0aW9uIGNhbGxVc2VyRnVuY3Rpb24oZikge1xuICBzZXRUaW1lb3V0KGYsIDEpO1xufVxuXG5mdW5jdGlvbiB0b2dnbGVPcmllbnRhdGlvbihkYXRhKSB7XG4gIGRhdGEub3JpZW50YXRpb24gPSB1dGlsLm9wcG9zaXRlKGRhdGEub3JpZW50YXRpb24pO1xufVxuXG5mdW5jdGlvbiByZXNldChkYXRhKSB7XG4gIGRhdGEubGFzdE1vdmUgPSBudWxsO1xuICBzZXRTZWxlY3RlZChkYXRhLCBudWxsKTtcbiAgdW5zZXRQcmVtb3ZlKGRhdGEpO1xuICB1bnNldFByZWRyb3AoZGF0YSk7XG59XG5cbmZ1bmN0aW9uIHNldFBpZWNlcyhkYXRhLCBwaWVjZXMpIHtcbiAgT2JqZWN0LmtleXMocGllY2VzKS5mb3JFYWNoKGZ1bmN0aW9uKGtleSkge1xuICAgIGlmIChwaWVjZXNba2V5XSkgZGF0YS5waWVjZXNba2V5XSA9IHBpZWNlc1trZXldO1xuICAgIGVsc2UgZGVsZXRlIGRhdGEucGllY2VzW2tleV07XG4gIH0pO1xuICBkYXRhLm1vdmFibGUuZHJvcHBlZCA9IFtdO1xufVxuXG5mdW5jdGlvbiBzZXRDaGVjayhkYXRhLCBjb2xvcikge1xuICB2YXIgY2hlY2tDb2xvciA9IGNvbG9yIHx8IGRhdGEudHVybkNvbG9yO1xuICBPYmplY3Qua2V5cyhkYXRhLnBpZWNlcykuZm9yRWFjaChmdW5jdGlvbihrZXkpIHtcbiAgICBpZiAoZGF0YS5waWVjZXNba2V5XS5jb2xvciA9PT0gY2hlY2tDb2xvciAmJiBkYXRhLnBpZWNlc1trZXldLnJvbGUgPT09ICdraW5nJykgZGF0YS5jaGVjayA9IGtleTtcbiAgfSk7XG59XG5cbmZ1bmN0aW9uIHNldFByZW1vdmUoZGF0YSwgb3JpZywgZGVzdCkge1xuICB1bnNldFByZWRyb3AoZGF0YSk7XG4gIGRhdGEucHJlbW92YWJsZS5jdXJyZW50ID0gW29yaWcsIGRlc3RdO1xuICBjYWxsVXNlckZ1bmN0aW9uKHV0aWwucGFydGlhbChkYXRhLnByZW1vdmFibGUuZXZlbnRzLnNldCwgb3JpZywgZGVzdCkpO1xufVxuXG5mdW5jdGlvbiB1bnNldFByZW1vdmUoZGF0YSkge1xuICBpZiAoZGF0YS5wcmVtb3ZhYmxlLmN1cnJlbnQpIHtcbiAgICBkYXRhLnByZW1vdmFibGUuY3VycmVudCA9IG51bGw7XG4gICAgY2FsbFVzZXJGdW5jdGlvbihkYXRhLnByZW1vdmFibGUuZXZlbnRzLnVuc2V0KTtcbiAgfVxufVxuXG5mdW5jdGlvbiBzZXRQcmVkcm9wKGRhdGEsIHJvbGUsIGtleSkge1xuICB1bnNldFByZW1vdmUoZGF0YSk7XG4gIGRhdGEucHJlZHJvcHBhYmxlLmN1cnJlbnQgPSB7XG4gICAgcm9sZTogcm9sZSxcbiAgICBrZXk6IGtleVxuICB9O1xuICBjYWxsVXNlckZ1bmN0aW9uKHV0aWwucGFydGlhbChkYXRhLnByZWRyb3BwYWJsZS5ldmVudHMuc2V0LCByb2xlLCBrZXkpKTtcbn1cblxuZnVuY3Rpb24gdW5zZXRQcmVkcm9wKGRhdGEpIHtcbiAgaWYgKGRhdGEucHJlZHJvcHBhYmxlLmN1cnJlbnQua2V5KSB7XG4gICAgZGF0YS5wcmVkcm9wcGFibGUuY3VycmVudCA9IHt9O1xuICAgIGNhbGxVc2VyRnVuY3Rpb24oZGF0YS5wcmVkcm9wcGFibGUuZXZlbnRzLnVuc2V0KTtcbiAgfVxufVxuXG5mdW5jdGlvbiB0cnlBdXRvQ2FzdGxlKGRhdGEsIG9yaWcsIGRlc3QpIHtcbiAgaWYgKCFkYXRhLmF1dG9DYXN0bGUpIHJldHVybjtcbiAgdmFyIGtpbmcgPSBkYXRhLnBpZWNlc1tkZXN0XTtcbiAgaWYgKGtpbmcucm9sZSAhPT0gJ2tpbmcnKSByZXR1cm47XG4gIHZhciBvcmlnUG9zID0gdXRpbC5rZXkycG9zKG9yaWcpO1xuICBpZiAob3JpZ1Bvc1swXSAhPT0gNSkgcmV0dXJuO1xuICBpZiAob3JpZ1Bvc1sxXSAhPT0gMSAmJiBvcmlnUG9zWzFdICE9PSA4KSByZXR1cm47XG4gIHZhciBkZXN0UG9zID0gdXRpbC5rZXkycG9zKGRlc3QpLFxuICAgIG9sZFJvb2tQb3MsIG5ld1Jvb2tQb3MsIG5ld0tpbmdQb3M7XG4gIGlmIChkZXN0UG9zWzBdID09PSA3IHx8IGRlc3RQb3NbMF0gPT09IDgpIHtcbiAgICBvbGRSb29rUG9zID0gdXRpbC5wb3Mya2V5KFs4LCBvcmlnUG9zWzFdXSk7XG4gICAgbmV3Um9va1BvcyA9IHV0aWwucG9zMmtleShbNiwgb3JpZ1Bvc1sxXV0pO1xuICAgIG5ld0tpbmdQb3MgPSB1dGlsLnBvczJrZXkoWzcsIG9yaWdQb3NbMV1dKTtcbiAgfSBlbHNlIGlmIChkZXN0UG9zWzBdID09PSAzIHx8IGRlc3RQb3NbMF0gPT09IDEpIHtcbiAgICBvbGRSb29rUG9zID0gdXRpbC5wb3Mya2V5KFsxLCBvcmlnUG9zWzFdXSk7XG4gICAgbmV3Um9va1BvcyA9IHV0aWwucG9zMmtleShbNCwgb3JpZ1Bvc1sxXV0pO1xuICAgIG5ld0tpbmdQb3MgPSB1dGlsLnBvczJrZXkoWzMsIG9yaWdQb3NbMV1dKTtcbiAgfSBlbHNlIHJldHVybjtcbiAgZGVsZXRlIGRhdGEucGllY2VzW29yaWddO1xuICBkZWxldGUgZGF0YS5waWVjZXNbZGVzdF07XG4gIGRlbGV0ZSBkYXRhLnBpZWNlc1tvbGRSb29rUG9zXTtcbiAgZGF0YS5waWVjZXNbbmV3S2luZ1Bvc10gPSB7XG4gICAgcm9sZTogJ2tpbmcnLFxuICAgIGNvbG9yOiBraW5nLmNvbG9yXG4gIH07XG4gIGRhdGEucGllY2VzW25ld1Jvb2tQb3NdID0ge1xuICAgIHJvbGU6ICdyb29rJyxcbiAgICBjb2xvcjoga2luZy5jb2xvclxuICB9O1xufVxuXG5mdW5jdGlvbiBiYXNlTW92ZShkYXRhLCBvcmlnLCBkZXN0KSB7XG4gIHZhciBzdWNjZXNzID0gYW5pbShmdW5jdGlvbigpIHtcbiAgICBpZiAob3JpZyA9PT0gZGVzdCB8fCAhZGF0YS5waWVjZXNbb3JpZ10pIHJldHVybiBmYWxzZTtcbiAgICB2YXIgY2FwdHVyZWQgPSAoXG4gICAgICBkYXRhLnBpZWNlc1tkZXN0XSAmJlxuICAgICAgZGF0YS5waWVjZXNbZGVzdF0uY29sb3IgIT09IGRhdGEucGllY2VzW29yaWddLmNvbG9yXG4gICAgKSA/IGRhdGEucGllY2VzW2Rlc3RdIDogbnVsbDtcbiAgICBjYWxsVXNlckZ1bmN0aW9uKHV0aWwucGFydGlhbChkYXRhLmV2ZW50cy5tb3ZlLCBvcmlnLCBkZXN0LCBjYXB0dXJlZCkpO1xuICAgIGRhdGEucGllY2VzW2Rlc3RdID0gZGF0YS5waWVjZXNbb3JpZ107XG4gICAgZGVsZXRlIGRhdGEucGllY2VzW29yaWddO1xuICAgIGRhdGEubGFzdE1vdmUgPSBbb3JpZywgZGVzdF07XG4gICAgZGF0YS5jaGVjayA9IG51bGw7XG4gICAgdHJ5QXV0b0Nhc3RsZShkYXRhLCBvcmlnLCBkZXN0KTtcbiAgICBjYWxsVXNlckZ1bmN0aW9uKGRhdGEuZXZlbnRzLmNoYW5nZSk7XG4gICAgcmV0dXJuIHRydWU7XG4gIH0sIGRhdGEpKCk7XG4gIGlmIChzdWNjZXNzKSBkYXRhLm1vdmFibGUuZHJvcHBlZCA9IFtdO1xuICByZXR1cm4gc3VjY2Vzcztcbn1cblxuZnVuY3Rpb24gYmFzZU5ld1BpZWNlKGRhdGEsIHBpZWNlLCBrZXkpIHtcbiAgaWYgKGRhdGEucGllY2VzW2tleV0pIHJldHVybiBmYWxzZTtcbiAgY2FsbFVzZXJGdW5jdGlvbih1dGlsLnBhcnRpYWwoZGF0YS5ldmVudHMuZHJvcE5ld1BpZWNlLCBwaWVjZSwga2V5KSk7XG4gIGRhdGEucGllY2VzW2tleV0gPSBwaWVjZTtcbiAgZGF0YS5sYXN0TW92ZSA9IFtrZXksIGtleV07XG4gIGRhdGEuY2hlY2sgPSBudWxsO1xuICBjYWxsVXNlckZ1bmN0aW9uKGRhdGEuZXZlbnRzLmNoYW5nZSk7XG4gIGRhdGEubW92YWJsZS5kcm9wcGVkID0gW107XG4gIGRhdGEubW92YWJsZS5kZXN0cyA9IHt9O1xuICBkYXRhLnR1cm5Db2xvciA9IHV0aWwub3Bwb3NpdGUoZGF0YS50dXJuQ29sb3IpO1xuICBkYXRhLnJlbmRlclJBRigpO1xuICByZXR1cm4gdHJ1ZTtcbn1cblxuZnVuY3Rpb24gYmFzZVVzZXJNb3ZlKGRhdGEsIG9yaWcsIGRlc3QpIHtcbiAgdmFyIHJlc3VsdCA9IGJhc2VNb3ZlKGRhdGEsIG9yaWcsIGRlc3QpO1xuICBpZiAocmVzdWx0KSB7XG4gICAgZGF0YS5tb3ZhYmxlLmRlc3RzID0ge307XG4gICAgZGF0YS50dXJuQ29sb3IgPSB1dGlsLm9wcG9zaXRlKGRhdGEudHVybkNvbG9yKTtcbiAgfVxuICByZXR1cm4gcmVzdWx0O1xufVxuXG5mdW5jdGlvbiBhcGlNb3ZlKGRhdGEsIG9yaWcsIGRlc3QpIHtcbiAgcmV0dXJuIGJhc2VNb3ZlKGRhdGEsIG9yaWcsIGRlc3QpO1xufVxuXG5mdW5jdGlvbiBhcGlOZXdQaWVjZShkYXRhLCBwaWVjZSwga2V5KSB7XG4gIHJldHVybiBiYXNlTmV3UGllY2UoZGF0YSwgcGllY2UsIGtleSk7XG59XG5cbmZ1bmN0aW9uIHVzZXJNb3ZlKGRhdGEsIG9yaWcsIGRlc3QpIHtcbiAgaWYgKCFkZXN0KSB7XG4gICAgaG9sZC5jYW5jZWwoKTtcbiAgICBzZXRTZWxlY3RlZChkYXRhLCBudWxsKTtcbiAgICBpZiAoZGF0YS5tb3ZhYmxlLmRyb3BPZmYgPT09ICd0cmFzaCcpIHtcbiAgICAgIGRlbGV0ZSBkYXRhLnBpZWNlc1tvcmlnXTtcbiAgICAgIGNhbGxVc2VyRnVuY3Rpb24oZGF0YS5ldmVudHMuY2hhbmdlKTtcbiAgICB9XG4gIH0gZWxzZSBpZiAoY2FuTW92ZShkYXRhLCBvcmlnLCBkZXN0KSkge1xuICAgIGlmIChiYXNlVXNlck1vdmUoZGF0YSwgb3JpZywgZGVzdCkpIHtcbiAgICAgIHZhciBob2xkVGltZSA9IGhvbGQuc3RvcCgpO1xuICAgICAgc2V0U2VsZWN0ZWQoZGF0YSwgbnVsbCk7XG4gICAgICBjYWxsVXNlckZ1bmN0aW9uKHV0aWwucGFydGlhbChkYXRhLm1vdmFibGUuZXZlbnRzLmFmdGVyLCBvcmlnLCBkZXN0LCB7XG4gICAgICAgIHByZW1vdmU6IGZhbHNlLFxuICAgICAgICBob2xkVGltZTogaG9sZFRpbWVcbiAgICAgIH0pKTtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgfSBlbHNlIGlmIChjYW5QcmVtb3ZlKGRhdGEsIG9yaWcsIGRlc3QpKSB7XG4gICAgc2V0UHJlbW92ZShkYXRhLCBvcmlnLCBkZXN0KTtcbiAgICBzZXRTZWxlY3RlZChkYXRhLCBudWxsKTtcbiAgfSBlbHNlIGlmIChpc01vdmFibGUoZGF0YSwgZGVzdCkgfHwgaXNQcmVtb3ZhYmxlKGRhdGEsIGRlc3QpKSB7XG4gICAgc2V0U2VsZWN0ZWQoZGF0YSwgZGVzdCk7XG4gICAgaG9sZC5zdGFydCgpO1xuICB9IGVsc2Ugc2V0U2VsZWN0ZWQoZGF0YSwgbnVsbCk7XG59XG5cbmZ1bmN0aW9uIGRyb3BOZXdQaWVjZShkYXRhLCBvcmlnLCBkZXN0KSB7XG4gIGlmIChjYW5Ecm9wKGRhdGEsIG9yaWcsIGRlc3QpKSB7XG4gICAgdmFyIHBpZWNlID0gZGF0YS5waWVjZXNbb3JpZ107XG4gICAgZGVsZXRlIGRhdGEucGllY2VzW29yaWddO1xuICAgIGJhc2VOZXdQaWVjZShkYXRhLCBwaWVjZSwgZGVzdCk7XG4gICAgZGF0YS5tb3ZhYmxlLmRyb3BwZWQgPSBbXTtcbiAgICBjYWxsVXNlckZ1bmN0aW9uKHV0aWwucGFydGlhbChkYXRhLm1vdmFibGUuZXZlbnRzLmFmdGVyTmV3UGllY2UsIHBpZWNlLnJvbGUsIGRlc3QsIHtcbiAgICAgIHByZWRyb3A6IGZhbHNlXG4gICAgfSkpO1xuICB9IGVsc2UgaWYgKGNhblByZWRyb3AoZGF0YSwgb3JpZywgZGVzdCkpIHtcbiAgICBzZXRQcmVkcm9wKGRhdGEsIGRhdGEucGllY2VzW29yaWddLnJvbGUsIGRlc3QpO1xuICB9IGVsc2Uge1xuICAgIHVuc2V0UHJlbW92ZShkYXRhKTtcbiAgICB1bnNldFByZWRyb3AoZGF0YSk7XG4gIH1cbiAgZGVsZXRlIGRhdGEucGllY2VzW29yaWddO1xuICBzZXRTZWxlY3RlZChkYXRhLCBudWxsKTtcbn1cblxuZnVuY3Rpb24gc2VsZWN0U3F1YXJlKGRhdGEsIGtleSkge1xuICBpZiAoZGF0YS5zZWxlY3RlZCkge1xuICAgIGlmIChrZXkpIHtcbiAgICAgIGlmIChkYXRhLnNlbGVjdGVkID09PSBrZXkgJiYgIWRhdGEuZHJhZ2dhYmxlLmVuYWJsZWQpIHtcbiAgICAgICAgc2V0U2VsZWN0ZWQoZGF0YSwgbnVsbCk7XG4gICAgICAgIGhvbGQuY2FuY2VsKCk7XG4gICAgICB9IGVsc2UgaWYgKGRhdGEuc2VsZWN0YWJsZS5lbmFibGVkICYmIGRhdGEuc2VsZWN0ZWQgIT09IGtleSkge1xuICAgICAgICBpZiAodXNlck1vdmUoZGF0YSwgZGF0YS5zZWxlY3RlZCwga2V5KSkgZGF0YS5zdGF0cy5kcmFnZ2VkID0gZmFsc2U7XG4gICAgICB9IGVsc2UgaG9sZC5zdGFydCgpO1xuICAgIH0gZWxzZSB7XG4gICAgICBzZXRTZWxlY3RlZChkYXRhLCBudWxsKTtcbiAgICAgIGhvbGQuY2FuY2VsKCk7XG4gICAgfVxuICB9IGVsc2UgaWYgKGlzTW92YWJsZShkYXRhLCBrZXkpIHx8IGlzUHJlbW92YWJsZShkYXRhLCBrZXkpKSB7XG4gICAgc2V0U2VsZWN0ZWQoZGF0YSwga2V5KTtcbiAgICBob2xkLnN0YXJ0KCk7XG4gIH1cbiAgaWYgKGtleSkgY2FsbFVzZXJGdW5jdGlvbih1dGlsLnBhcnRpYWwoZGF0YS5ldmVudHMuc2VsZWN0LCBrZXkpKTtcbn1cblxuZnVuY3Rpb24gc2V0U2VsZWN0ZWQoZGF0YSwga2V5KSB7XG4gIGRhdGEuc2VsZWN0ZWQgPSBrZXk7XG4gIGlmIChrZXkgJiYgaXNQcmVtb3ZhYmxlKGRhdGEsIGtleSkpXG4gICAgZGF0YS5wcmVtb3ZhYmxlLmRlc3RzID0gcHJlbW92ZShkYXRhLnBpZWNlcywga2V5LCBkYXRhLnByZW1vdmFibGUuY2FzdGxlKTtcbiAgZWxzZVxuICAgIGRhdGEucHJlbW92YWJsZS5kZXN0cyA9IG51bGw7XG59XG5cbmZ1bmN0aW9uIGlzTW92YWJsZShkYXRhLCBvcmlnKSB7XG4gIHZhciBwaWVjZSA9IGRhdGEucGllY2VzW29yaWddO1xuICByZXR1cm4gcGllY2UgJiYgKFxuICAgIGRhdGEubW92YWJsZS5jb2xvciA9PT0gJ2JvdGgnIHx8IChcbiAgICAgIGRhdGEubW92YWJsZS5jb2xvciA9PT0gcGllY2UuY29sb3IgJiZcbiAgICAgIGRhdGEudHVybkNvbG9yID09PSBwaWVjZS5jb2xvclxuICAgICkpO1xufVxuXG5mdW5jdGlvbiBjYW5Nb3ZlKGRhdGEsIG9yaWcsIGRlc3QpIHtcbiAgcmV0dXJuIG9yaWcgIT09IGRlc3QgJiYgaXNNb3ZhYmxlKGRhdGEsIG9yaWcpICYmIChcbiAgICBkYXRhLm1vdmFibGUuZnJlZSB8fCB1dGlsLmNvbnRhaW5zWChkYXRhLm1vdmFibGUuZGVzdHNbb3JpZ10sIGRlc3QpXG4gICk7XG59XG5cbmZ1bmN0aW9uIGNhbkRyb3AoZGF0YSwgb3JpZywgZGVzdCkge1xuICB2YXIgcGllY2UgPSBkYXRhLnBpZWNlc1tvcmlnXTtcbiAgcmV0dXJuIHBpZWNlICYmIGRlc3QgJiYgKG9yaWcgPT09IGRlc3QgfHwgIWRhdGEucGllY2VzW2Rlc3RdKSAmJiAoXG4gICAgZGF0YS5tb3ZhYmxlLmNvbG9yID09PSAnYm90aCcgfHwgKFxuICAgICAgZGF0YS5tb3ZhYmxlLmNvbG9yID09PSBwaWVjZS5jb2xvciAmJlxuICAgICAgZGF0YS50dXJuQ29sb3IgPT09IHBpZWNlLmNvbG9yXG4gICAgKSk7XG59XG5cblxuZnVuY3Rpb24gaXNQcmVtb3ZhYmxlKGRhdGEsIG9yaWcpIHtcbiAgdmFyIHBpZWNlID0gZGF0YS5waWVjZXNbb3JpZ107XG4gIHJldHVybiBwaWVjZSAmJiBkYXRhLnByZW1vdmFibGUuZW5hYmxlZCAmJlxuICAgIGRhdGEubW92YWJsZS5jb2xvciA9PT0gcGllY2UuY29sb3IgJiZcbiAgICBkYXRhLnR1cm5Db2xvciAhPT0gcGllY2UuY29sb3I7XG59XG5cbmZ1bmN0aW9uIGNhblByZW1vdmUoZGF0YSwgb3JpZywgZGVzdCkge1xuICByZXR1cm4gb3JpZyAhPT0gZGVzdCAmJlxuICAgIGlzUHJlbW92YWJsZShkYXRhLCBvcmlnKSAmJlxuICAgIHV0aWwuY29udGFpbnNYKHByZW1vdmUoZGF0YS5waWVjZXMsIG9yaWcsIGRhdGEucHJlbW92YWJsZS5jYXN0bGUpLCBkZXN0KTtcbn1cblxuZnVuY3Rpb24gY2FuUHJlZHJvcChkYXRhLCBvcmlnLCBkZXN0KSB7XG4gIHZhciBwaWVjZSA9IGRhdGEucGllY2VzW29yaWddO1xuICByZXR1cm4gcGllY2UgJiYgZGVzdCAmJlxuICAgICghZGF0YS5waWVjZXNbZGVzdF0gfHwgZGF0YS5waWVjZXNbZGVzdF0uY29sb3IgIT09IGRhdGEubW92YWJsZS5jb2xvcikgJiZcbiAgICBkYXRhLnByZWRyb3BwYWJsZS5lbmFibGVkICYmXG4gICAgKHBpZWNlLnJvbGUgIT09ICdwYXduJyB8fCAoZGVzdFsxXSAhPT0gJzEnICYmIGRlc3RbMV0gIT09ICc4JykpICYmXG4gICAgZGF0YS5tb3ZhYmxlLmNvbG9yID09PSBwaWVjZS5jb2xvciAmJlxuICAgIGRhdGEudHVybkNvbG9yICE9PSBwaWVjZS5jb2xvcjtcbn1cblxuZnVuY3Rpb24gaXNEcmFnZ2FibGUoZGF0YSwgb3JpZykge1xuICB2YXIgcGllY2UgPSBkYXRhLnBpZWNlc1tvcmlnXTtcbiAgcmV0dXJuIHBpZWNlICYmIGRhdGEuZHJhZ2dhYmxlLmVuYWJsZWQgJiYgKFxuICAgIGRhdGEubW92YWJsZS5jb2xvciA9PT0gJ2JvdGgnIHx8IChcbiAgICAgIGRhdGEubW92YWJsZS5jb2xvciA9PT0gcGllY2UuY29sb3IgJiYgKFxuICAgICAgICBkYXRhLnR1cm5Db2xvciA9PT0gcGllY2UuY29sb3IgfHwgZGF0YS5wcmVtb3ZhYmxlLmVuYWJsZWRcbiAgICAgIClcbiAgICApXG4gICk7XG59XG5cbmZ1bmN0aW9uIHBsYXlQcmVtb3ZlKGRhdGEpIHtcbiAgdmFyIG1vdmUgPSBkYXRhLnByZW1vdmFibGUuY3VycmVudDtcbiAgaWYgKCFtb3ZlKSByZXR1cm47XG4gIHZhciBvcmlnID0gbW92ZVswXSxcbiAgICBkZXN0ID0gbW92ZVsxXSxcbiAgICBzdWNjZXNzID0gZmFsc2U7XG4gIGlmIChjYW5Nb3ZlKGRhdGEsIG9yaWcsIGRlc3QpKSB7XG4gICAgaWYgKGJhc2VVc2VyTW92ZShkYXRhLCBvcmlnLCBkZXN0KSkge1xuICAgICAgY2FsbFVzZXJGdW5jdGlvbih1dGlsLnBhcnRpYWwoZGF0YS5tb3ZhYmxlLmV2ZW50cy5hZnRlciwgb3JpZywgZGVzdCwge1xuICAgICAgICBwcmVtb3ZlOiB0cnVlXG4gICAgICB9KSk7XG4gICAgICBzdWNjZXNzID0gdHJ1ZTtcbiAgICB9XG4gIH1cbiAgdW5zZXRQcmVtb3ZlKGRhdGEpO1xuICByZXR1cm4gc3VjY2Vzcztcbn1cblxuZnVuY3Rpb24gcGxheVByZWRyb3AoZGF0YSwgdmFsaWRhdGUpIHtcbiAgdmFyIGRyb3AgPSBkYXRhLnByZWRyb3BwYWJsZS5jdXJyZW50LFxuICAgIHN1Y2Nlc3MgPSBmYWxzZTtcbiAgaWYgKCFkcm9wLmtleSkgcmV0dXJuO1xuICBpZiAodmFsaWRhdGUoZHJvcCkpIHtcbiAgICB2YXIgcGllY2UgPSB7XG4gICAgICByb2xlOiBkcm9wLnJvbGUsXG4gICAgICBjb2xvcjogZGF0YS5tb3ZhYmxlLmNvbG9yXG4gICAgfTtcbiAgICBpZiAoYmFzZU5ld1BpZWNlKGRhdGEsIHBpZWNlLCBkcm9wLmtleSkpIHtcbiAgICAgIGNhbGxVc2VyRnVuY3Rpb24odXRpbC5wYXJ0aWFsKGRhdGEubW92YWJsZS5ldmVudHMuYWZ0ZXJOZXdQaWVjZSwgZHJvcC5yb2xlLCBkcm9wLmtleSwge1xuICAgICAgICBwcmVkcm9wOiB0cnVlXG4gICAgICB9KSk7XG4gICAgICBzdWNjZXNzID0gdHJ1ZTtcbiAgICB9XG4gIH1cbiAgdW5zZXRQcmVkcm9wKGRhdGEpO1xuICByZXR1cm4gc3VjY2Vzcztcbn1cblxuZnVuY3Rpb24gY2FuY2VsTW92ZShkYXRhKSB7XG4gIHVuc2V0UHJlbW92ZShkYXRhKTtcbiAgdW5zZXRQcmVkcm9wKGRhdGEpO1xuICBzZWxlY3RTcXVhcmUoZGF0YSwgbnVsbCk7XG59XG5cbmZ1bmN0aW9uIHN0b3AoZGF0YSkge1xuICBkYXRhLm1vdmFibGUuY29sb3IgPSBudWxsO1xuICBkYXRhLm1vdmFibGUuZGVzdHMgPSB7fTtcbiAgY2FuY2VsTW92ZShkYXRhKTtcbn1cblxuZnVuY3Rpb24gZ2V0S2V5QXREb21Qb3MoZGF0YSwgcG9zLCBib3VuZHMpIHtcbiAgaWYgKCFib3VuZHMgJiYgIWRhdGEuYm91bmRzKSByZXR1cm47XG4gIGJvdW5kcyA9IGJvdW5kcyB8fCBkYXRhLmJvdW5kcygpOyAvLyB1c2UgcHJvdmlkZWQgdmFsdWUsIG9yIGNvbXB1dGUgaXRcbiAgdmFyIGZpbGUgPSBNYXRoLmNlaWwoOCAqICgocG9zWzBdIC0gYm91bmRzLmxlZnQpIC8gYm91bmRzLndpZHRoKSk7XG4gIGZpbGUgPSBkYXRhLm9yaWVudGF0aW9uID09PSAnd2hpdGUnID8gZmlsZSA6IDkgLSBmaWxlO1xuICB2YXIgcmFuayA9IE1hdGguY2VpbCg4IC0gKDggKiAoKHBvc1sxXSAtIGJvdW5kcy50b3ApIC8gYm91bmRzLmhlaWdodCkpKTtcbiAgcmFuayA9IGRhdGEub3JpZW50YXRpb24gPT09ICd3aGl0ZScgPyByYW5rIDogOSAtIHJhbms7XG4gIGlmIChmaWxlID4gMCAmJiBmaWxlIDwgOSAmJiByYW5rID4gMCAmJiByYW5rIDwgOSkgcmV0dXJuIHV0aWwucG9zMmtleShbZmlsZSwgcmFua10pO1xufVxuXG4vLyB7d2hpdGU6IHtwYXduOiAzIHF1ZWVuOiAxfSwgYmxhY2s6IHtiaXNob3A6IDJ9fVxuZnVuY3Rpb24gZ2V0TWF0ZXJpYWxEaWZmKGRhdGEpIHtcbiAgdmFyIGNvdW50cyA9IHtcbiAgICBraW5nOiAwLFxuICAgIHF1ZWVuOiAwLFxuICAgIHJvb2s6IDAsXG4gICAgYmlzaG9wOiAwLFxuICAgIGtuaWdodDogMCxcbiAgICBwYXduOiAwXG4gIH07XG4gIGZvciAodmFyIGsgaW4gZGF0YS5waWVjZXMpIHtcbiAgICB2YXIgcCA9IGRhdGEucGllY2VzW2tdO1xuICAgIGNvdW50c1twLnJvbGVdICs9ICgocC5jb2xvciA9PT0gJ3doaXRlJykgPyAxIDogLTEpO1xuICB9XG4gIHZhciBkaWZmID0ge1xuICAgIHdoaXRlOiB7fSxcbiAgICBibGFjazoge31cbiAgfTtcbiAgZm9yICh2YXIgcm9sZSBpbiBjb3VudHMpIHtcbiAgICB2YXIgYyA9IGNvdW50c1tyb2xlXTtcbiAgICBpZiAoYyA+IDApIGRpZmYud2hpdGVbcm9sZV0gPSBjO1xuICAgIGVsc2UgaWYgKGMgPCAwKSBkaWZmLmJsYWNrW3JvbGVdID0gLWM7XG4gIH1cbiAgcmV0dXJuIGRpZmY7XG59XG5cbnZhciBwaWVjZVNjb3JlcyA9IHtcbiAgcGF3bjogMSxcbiAga25pZ2h0OiAzLFxuICBiaXNob3A6IDMsXG4gIHJvb2s6IDUsXG4gIHF1ZWVuOiA5LFxuICBraW5nOiAwXG59O1xuXG5mdW5jdGlvbiBnZXRTY29yZShkYXRhKSB7XG4gIHZhciBzY29yZSA9IDA7XG4gIGZvciAodmFyIGsgaW4gZGF0YS5waWVjZXMpIHtcbiAgICBzY29yZSArPSBwaWVjZVNjb3Jlc1tkYXRhLnBpZWNlc1trXS5yb2xlXSAqIChkYXRhLnBpZWNlc1trXS5jb2xvciA9PT0gJ3doaXRlJyA/IDEgOiAtMSk7XG4gIH1cbiAgcmV0dXJuIHNjb3JlO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgcmVzZXQ6IHJlc2V0LFxuICB0b2dnbGVPcmllbnRhdGlvbjogdG9nZ2xlT3JpZW50YXRpb24sXG4gIHNldFBpZWNlczogc2V0UGllY2VzLFxuICBzZXRDaGVjazogc2V0Q2hlY2ssXG4gIHNlbGVjdFNxdWFyZTogc2VsZWN0U3F1YXJlLFxuICBzZXRTZWxlY3RlZDogc2V0U2VsZWN0ZWQsXG4gIGlzRHJhZ2dhYmxlOiBpc0RyYWdnYWJsZSxcbiAgY2FuTW92ZTogY2FuTW92ZSxcbiAgdXNlck1vdmU6IHVzZXJNb3ZlLFxuICBkcm9wTmV3UGllY2U6IGRyb3BOZXdQaWVjZSxcbiAgYXBpTW92ZTogYXBpTW92ZSxcbiAgYXBpTmV3UGllY2U6IGFwaU5ld1BpZWNlLFxuICBwbGF5UHJlbW92ZTogcGxheVByZW1vdmUsXG4gIHBsYXlQcmVkcm9wOiBwbGF5UHJlZHJvcCxcbiAgdW5zZXRQcmVtb3ZlOiB1bnNldFByZW1vdmUsXG4gIHVuc2V0UHJlZHJvcDogdW5zZXRQcmVkcm9wLFxuICBjYW5jZWxNb3ZlOiBjYW5jZWxNb3ZlLFxuICBzdG9wOiBzdG9wLFxuICBnZXRLZXlBdERvbVBvczogZ2V0S2V5QXREb21Qb3MsXG4gIGdldE1hdGVyaWFsRGlmZjogZ2V0TWF0ZXJpYWxEaWZmLFxuICBnZXRTY29yZTogZ2V0U2NvcmVcbn07XG4iLCJ2YXIgbWVyZ2UgPSByZXF1aXJlKCdtZXJnZScpO1xudmFyIGJvYXJkID0gcmVxdWlyZSgnLi9ib2FyZCcpO1xudmFyIGZlbiA9IHJlcXVpcmUoJy4vZmVuJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oZGF0YSwgY29uZmlnKSB7XG5cbiAgaWYgKCFjb25maWcpIHJldHVybjtcblxuICAvLyBkb24ndCBtZXJnZSBkZXN0aW5hdGlvbnMuIEp1c3Qgb3ZlcnJpZGUuXG4gIGlmIChjb25maWcubW92YWJsZSAmJiBjb25maWcubW92YWJsZS5kZXN0cykgZGVsZXRlIGRhdGEubW92YWJsZS5kZXN0cztcblxuICBtZXJnZS5yZWN1cnNpdmUoZGF0YSwgY29uZmlnKTtcblxuICAvLyBpZiBhIGZlbiB3YXMgcHJvdmlkZWQsIHJlcGxhY2UgdGhlIHBpZWNlc1xuICBpZiAoZGF0YS5mZW4pIHtcbiAgICBkYXRhLnBpZWNlcyA9IGZlbi5yZWFkKGRhdGEuZmVuKTtcbiAgICBkYXRhLmNoZWNrID0gY29uZmlnLmNoZWNrO1xuICAgIGRhdGEuZHJhd2FibGUuc2hhcGVzID0gW107XG4gICAgZGVsZXRlIGRhdGEuZmVuO1xuICB9XG5cbiAgaWYgKGRhdGEuY2hlY2sgPT09IHRydWUpIGJvYXJkLnNldENoZWNrKGRhdGEpO1xuXG4gIC8vIGZvcmdldCBhYm91dCB0aGUgbGFzdCBkcm9wcGVkIHBpZWNlXG4gIGRhdGEubW92YWJsZS5kcm9wcGVkID0gW107XG5cbiAgLy8gZml4IG1vdmUvcHJlbW92ZSBkZXN0c1xuICBpZiAoZGF0YS5zZWxlY3RlZCkgYm9hcmQuc2V0U2VsZWN0ZWQoZGF0YSwgZGF0YS5zZWxlY3RlZCk7XG5cbiAgLy8gbm8gbmVlZCBmb3Igc3VjaCBzaG9ydCBhbmltYXRpb25zXG4gIGlmICghZGF0YS5hbmltYXRpb24uZHVyYXRpb24gfHwgZGF0YS5hbmltYXRpb24uZHVyYXRpb24gPCA0MClcbiAgICBkYXRhLmFuaW1hdGlvbi5lbmFibGVkID0gZmFsc2U7XG5cbiAgaWYgKCFkYXRhLm1vdmFibGUucm9va0Nhc3RsZSkge1xuICAgIHZhciByYW5rID0gZGF0YS5tb3ZhYmxlLmNvbG9yID09PSAnd2hpdGUnID8gMSA6IDg7XG4gICAgdmFyIGtpbmdTdGFydFBvcyA9ICdlJyArIHJhbms7XG4gICAgaWYgKGRhdGEubW92YWJsZS5kZXN0cykge1xuICAgICAgdmFyIGRlc3RzID0gZGF0YS5tb3ZhYmxlLmRlc3RzW2tpbmdTdGFydFBvc107XG4gICAgICBpZiAoIWRlc3RzIHx8IGRhdGEucGllY2VzW2tpbmdTdGFydFBvc10ucm9sZSAhPT0gJ2tpbmcnKSByZXR1cm47XG4gICAgICBkYXRhLm1vdmFibGUuZGVzdHNba2luZ1N0YXJ0UG9zXSA9IGRlc3RzLmZpbHRlcihmdW5jdGlvbihkKSB7XG4gICAgICAgIHJldHVybiBkICE9PSAnYScgKyByYW5rICYmIGQgIT09ICdoJyArIHJhbmtcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxufTtcbiIsInZhciBtID0gcmVxdWlyZSgnbWl0aHJpbCcpO1xudmFyIHV0aWwgPSByZXF1aXJlKCcuL3V0aWwnKTtcblxuZnVuY3Rpb24gcmVuZGVyQ29vcmRzKGVsZW1zLCBrbGFzcywgb3JpZW50KSB7XG4gIHZhciBlbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2Nvb3JkcycpO1xuICBlbC5jbGFzc05hbWUgPSBrbGFzcztcbiAgZWxlbXMuZm9yRWFjaChmdW5jdGlvbihjb250ZW50KSB7XG4gICAgdmFyIGYgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdjb29yZCcpO1xuICAgIGYudGV4dENvbnRlbnQgPSBjb250ZW50O1xuICAgIGVsLmFwcGVuZENoaWxkKGYpO1xuICB9KTtcbiAgcmV0dXJuIGVsO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKG9yaWVudGF0aW9uLCBlbCkge1xuXG4gIHV0aWwucmVxdWVzdEFuaW1hdGlvbkZyYW1lKGZ1bmN0aW9uKCkge1xuICAgIHZhciBjb29yZHMgPSBkb2N1bWVudC5jcmVhdGVEb2N1bWVudEZyYWdtZW50KCk7XG4gICAgdmFyIG9yaWVudENsYXNzID0gb3JpZW50YXRpb24gPT09ICdibGFjaycgPyAnIGJsYWNrJyA6ICcnO1xuICAgIGNvb3Jkcy5hcHBlbmRDaGlsZChyZW5kZXJDb29yZHModXRpbC5yYW5rcywgJ3JhbmtzJyArIG9yaWVudENsYXNzKSk7XG4gICAgY29vcmRzLmFwcGVuZENoaWxkKHJlbmRlckNvb3Jkcyh1dGlsLmZpbGVzLCAnZmlsZXMnICsgb3JpZW50Q2xhc3MpKTtcbiAgICBlbC5hcHBlbmRDaGlsZChjb29yZHMpO1xuICB9KTtcblxuICB2YXIgb3JpZW50YXRpb247XG5cbiAgcmV0dXJuIGZ1bmN0aW9uKG8pIHtcbiAgICBpZiAobyA9PT0gb3JpZW50YXRpb24pIHJldHVybjtcbiAgICBvcmllbnRhdGlvbiA9IG87XG4gICAgdmFyIGNvb3JkcyA9IGVsLnF1ZXJ5U2VsZWN0b3JBbGwoJ2Nvb3JkcycpO1xuICAgIGZvciAoaSA9IDA7IGkgPCBjb29yZHMubGVuZ3RoOyArK2kpXG4gICAgICBjb29yZHNbaV0uY2xhc3NMaXN0LnRvZ2dsZSgnYmxhY2snLCBvID09PSAnYmxhY2snKTtcbiAgfTtcbn1cbiIsInZhciBib2FyZCA9IHJlcXVpcmUoJy4vYm9hcmQnKTtcbnZhciBkYXRhID0gcmVxdWlyZSgnLi9kYXRhJyk7XG52YXIgZmVuID0gcmVxdWlyZSgnLi9mZW4nKTtcbnZhciBjb25maWd1cmUgPSByZXF1aXJlKCcuL2NvbmZpZ3VyZScpO1xudmFyIGFuaW0gPSByZXF1aXJlKCcuL2FuaW0nKTtcbnZhciBkcmFnID0gcmVxdWlyZSgnLi9kcmFnJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oY2ZnKSB7XG5cbiAgdGhpcy5kYXRhID0gZGF0YShjZmcpO1xuXG4gIHRoaXMudm0gPSB7XG4gICAgZXhwbG9kaW5nOiBmYWxzZVxuICB9O1xuXG4gIHRoaXMuZ2V0RmVuID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIGZlbi53cml0ZSh0aGlzLmRhdGEucGllY2VzKTtcbiAgfS5iaW5kKHRoaXMpO1xuXG4gIHRoaXMuZ2V0T3JpZW50YXRpb24gPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5kYXRhLm9yaWVudGF0aW9uO1xuICB9LmJpbmQodGhpcyk7XG5cbiAgdGhpcy5zZXQgPSBhbmltKGNvbmZpZ3VyZSwgdGhpcy5kYXRhKTtcblxuICB0aGlzLnRvZ2dsZU9yaWVudGF0aW9uID0gZnVuY3Rpb24oKSB7XG4gICAgYW5pbShib2FyZC50b2dnbGVPcmllbnRhdGlvbiwgdGhpcy5kYXRhKSgpO1xuICAgIGlmICh0aGlzLmRhdGEucmVkcmF3Q29vcmRzKSB0aGlzLmRhdGEucmVkcmF3Q29vcmRzKHRoaXMuZGF0YS5vcmllbnRhdGlvbik7XG4gIH0uYmluZCh0aGlzKTtcblxuICB0aGlzLnNldFBpZWNlcyA9IGFuaW0oYm9hcmQuc2V0UGllY2VzLCB0aGlzLmRhdGEpO1xuXG4gIHRoaXMuc2VsZWN0U3F1YXJlID0gYW5pbShib2FyZC5zZWxlY3RTcXVhcmUsIHRoaXMuZGF0YSwgdHJ1ZSk7XG5cbiAgdGhpcy5hcGlNb3ZlID0gYW5pbShib2FyZC5hcGlNb3ZlLCB0aGlzLmRhdGEpO1xuXG4gIHRoaXMuYXBpTmV3UGllY2UgPSBhbmltKGJvYXJkLmFwaU5ld1BpZWNlLCB0aGlzLmRhdGEpO1xuXG4gIHRoaXMucGxheVByZW1vdmUgPSBhbmltKGJvYXJkLnBsYXlQcmVtb3ZlLCB0aGlzLmRhdGEpO1xuXG4gIHRoaXMucGxheVByZWRyb3AgPSBhbmltKGJvYXJkLnBsYXlQcmVkcm9wLCB0aGlzLmRhdGEpO1xuXG4gIHRoaXMuY2FuY2VsUHJlbW92ZSA9IGFuaW0oYm9hcmQudW5zZXRQcmVtb3ZlLCB0aGlzLmRhdGEsIHRydWUpO1xuXG4gIHRoaXMuY2FuY2VsUHJlZHJvcCA9IGFuaW0oYm9hcmQudW5zZXRQcmVkcm9wLCB0aGlzLmRhdGEsIHRydWUpO1xuXG4gIHRoaXMuc2V0Q2hlY2sgPSBhbmltKGJvYXJkLnNldENoZWNrLCB0aGlzLmRhdGEsIHRydWUpO1xuXG4gIHRoaXMuY2FuY2VsTW92ZSA9IGFuaW0oZnVuY3Rpb24oZGF0YSkge1xuICAgIGJvYXJkLmNhbmNlbE1vdmUoZGF0YSk7XG4gICAgZHJhZy5jYW5jZWwoZGF0YSk7XG4gIH0uYmluZCh0aGlzKSwgdGhpcy5kYXRhLCB0cnVlKTtcblxuICB0aGlzLnN0b3AgPSBhbmltKGZ1bmN0aW9uKGRhdGEpIHtcbiAgICBib2FyZC5zdG9wKGRhdGEpO1xuICAgIGRyYWcuY2FuY2VsKGRhdGEpO1xuICB9LmJpbmQodGhpcyksIHRoaXMuZGF0YSwgdHJ1ZSk7XG5cbiAgdGhpcy5leHBsb2RlID0gZnVuY3Rpb24oa2V5cykge1xuICAgIGlmICghdGhpcy5kYXRhLnJlbmRlcikgcmV0dXJuO1xuICAgIHRoaXMudm0uZXhwbG9kaW5nID0ge1xuICAgICAgc3RhZ2U6IDEsXG4gICAgICBrZXlzOiBrZXlzXG4gICAgfTtcbiAgICB0aGlzLmRhdGEucmVuZGVyUkFGKCk7XG4gICAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgIHRoaXMudm0uZXhwbG9kaW5nLnN0YWdlID0gMjtcbiAgICAgIHRoaXMuZGF0YS5yZW5kZXJSQUYoKTtcbiAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgIHRoaXMudm0uZXhwbG9kaW5nID0gZmFsc2U7XG4gICAgICAgIHRoaXMuZGF0YS5yZW5kZXJSQUYoKTtcbiAgICAgIH0uYmluZCh0aGlzKSwgMTIwKTtcbiAgICB9LmJpbmQodGhpcyksIDEyMCk7XG4gIH0uYmluZCh0aGlzKTtcblxuICB0aGlzLnNldEF1dG9TaGFwZXMgPSBmdW5jdGlvbihzaGFwZXMpIHtcbiAgICBhbmltKGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgIGRhdGEuZHJhd2FibGUuYXV0b1NoYXBlcyA9IHNoYXBlcztcbiAgICB9LCB0aGlzLmRhdGEsIGZhbHNlKSgpO1xuICB9LmJpbmQodGhpcyk7XG5cbiAgdGhpcy5zZXRTaGFwZXMgPSBmdW5jdGlvbihzaGFwZXMpIHtcbiAgICBhbmltKGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgIGRhdGEuZHJhd2FibGUuc2hhcGVzID0gc2hhcGVzO1xuICAgIH0sIHRoaXMuZGF0YSwgZmFsc2UpKCk7XG4gIH0uYmluZCh0aGlzKTtcbn07XG4iLCJ2YXIgZmVuID0gcmVxdWlyZSgnLi9mZW4nKTtcbnZhciBjb25maWd1cmUgPSByZXF1aXJlKCcuL2NvbmZpZ3VyZScpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGNmZykge1xuICB2YXIgZGVmYXVsdHMgPSB7XG4gICAgcGllY2VzOiBmZW4ucmVhZChmZW4uaW5pdGlhbCksXG4gICAgb3JpZW50YXRpb246ICd3aGl0ZScsIC8vIGJvYXJkIG9yaWVudGF0aW9uLiB3aGl0ZSB8IGJsYWNrXG4gICAgdHVybkNvbG9yOiAnd2hpdGUnLCAvLyB0dXJuIHRvIHBsYXkuIHdoaXRlIHwgYmxhY2tcbiAgICBjaGVjazogbnVsbCwgLy8gc3F1YXJlIGN1cnJlbnRseSBpbiBjaGVjayBcImEyXCIgfCBudWxsXG4gICAgbGFzdE1vdmU6IG51bGwsIC8vIHNxdWFyZXMgcGFydCBvZiB0aGUgbGFzdCBtb3ZlIFtcImMzXCIsIFwiYzRcIl0gfCBudWxsXG4gICAgc2VsZWN0ZWQ6IG51bGwsIC8vIHNxdWFyZSBjdXJyZW50bHkgc2VsZWN0ZWQgXCJhMVwiIHwgbnVsbFxuICAgIGNvb3JkaW5hdGVzOiB0cnVlLCAvLyBpbmNsdWRlIGNvb3JkcyBhdHRyaWJ1dGVzXG4gICAgcmVuZGVyOiBudWxsLCAvLyBmdW5jdGlvbiB0aGF0IHJlcmVuZGVycyB0aGUgYm9hcmRcbiAgICByZW5kZXJSQUY6IG51bGwsIC8vIGZ1bmN0aW9uIHRoYXQgcmVyZW5kZXJzIHRoZSBib2FyZCB1c2luZyByZXF1ZXN0QW5pbWF0aW9uRnJhbWVcbiAgICBlbGVtZW50OiBudWxsLCAvLyBET00gZWxlbWVudCBvZiB0aGUgYm9hcmQsIHJlcXVpcmVkIGZvciBkcmFnIHBpZWNlIGNlbnRlcmluZ1xuICAgIGJvdW5kczogbnVsbCwgLy8gZnVuY3Rpb24gdGhhdCBjYWxjdWxhdGVzIHRoZSBib2FyZCBib3VuZHNcbiAgICBhdXRvQ2FzdGxlOiBmYWxzZSwgLy8gaW1tZWRpYXRlbHkgY29tcGxldGUgdGhlIGNhc3RsZSBieSBtb3ZpbmcgdGhlIHJvb2sgYWZ0ZXIga2luZyBtb3ZlXG4gICAgdmlld09ubHk6IGZhbHNlLCAvLyBkb24ndCBiaW5kIGV2ZW50czogdGhlIHVzZXIgd2lsbCBuZXZlciBiZSBhYmxlIHRvIG1vdmUgcGllY2VzIGFyb3VuZFxuICAgIGRpc2FibGVDb250ZXh0TWVudTogZmFsc2UsIC8vIGJlY2F1c2Ugd2hvIG5lZWRzIGEgY29udGV4dCBtZW51IG9uIGEgY2hlc3Nib2FyZFxuICAgIHJlc2l6YWJsZTogdHJ1ZSwgLy8gbGlzdGVucyB0byBjaGVzc2dyb3VuZC5yZXNpemUgb24gZG9jdW1lbnQuYm9keSB0byBjbGVhciBib3VuZHMgY2FjaGVcbiAgICBwaWVjZUtleTogZmFsc2UsIC8vIGFkZCBhIGRhdGEta2V5IGF0dHJpYnV0ZSB0byBwaWVjZSBlbGVtZW50c1xuICAgIGhpZ2hsaWdodDoge1xuICAgICAgbGFzdE1vdmU6IHRydWUsIC8vIGFkZCBsYXN0LW1vdmUgY2xhc3MgdG8gc3F1YXJlc1xuICAgICAgY2hlY2s6IHRydWUsIC8vIGFkZCBjaGVjayBjbGFzcyB0byBzcXVhcmVzXG4gICAgICBkcmFnT3ZlcjogdHJ1ZSAvLyBhZGQgZHJhZy1vdmVyIGNsYXNzIHRvIHNxdWFyZSB3aGVuIGRyYWdnaW5nIG92ZXIgaXRcbiAgICB9LFxuICAgIGFuaW1hdGlvbjoge1xuICAgICAgZW5hYmxlZDogdHJ1ZSxcbiAgICAgIGR1cmF0aW9uOiAyMDAsXG4gICAgICAvKnsgLy8gY3VycmVudFxuICAgICAgICogIHN0YXJ0OiB0aW1lc3RhbXAsXG4gICAgICAgKiAgZHVyYXRpb246IG1zLFxuICAgICAgICogIGFuaW1zOiB7XG4gICAgICAgKiAgICBhMjogW1xuICAgICAgICogICAgICBbLTMwLCA1MF0sIC8vIGFuaW1hdGlvbiBnb2FsXG4gICAgICAgKiAgICAgIFstMjAsIDM3XSAgLy8gYW5pbWF0aW9uIGN1cnJlbnQgc3RhdHVzXG4gICAgICAgKiAgICBdLCAuLi5cbiAgICAgICAqICB9LFxuICAgICAgICogIGZhZGluZzogW1xuICAgICAgICogICAge1xuICAgICAgICogICAgICBwb3M6IFs4MCwgMTIwXSwgLy8gcG9zaXRpb24gcmVsYXRpdmUgdG8gdGhlIGJvYXJkXG4gICAgICAgKiAgICAgIG9wYWNpdHk6IDAuMzQsXG4gICAgICAgKiAgICAgIHJvbGU6ICdyb29rJyxcbiAgICAgICAqICAgICAgY29sb3I6ICdibGFjaydcbiAgICAgICAqICAgIH1cbiAgICAgICAqICB9XG4gICAgICAgKn0qL1xuICAgICAgY3VycmVudDoge31cbiAgICB9LFxuICAgIG1vdmFibGU6IHtcbiAgICAgIGZyZWU6IHRydWUsIC8vIGFsbCBtb3ZlcyBhcmUgdmFsaWQgLSBib2FyZCBlZGl0b3JcbiAgICAgIGNvbG9yOiAnYm90aCcsIC8vIGNvbG9yIHRoYXQgY2FuIG1vdmUuIHdoaXRlIHwgYmxhY2sgfCBib3RoIHwgbnVsbFxuICAgICAgZGVzdHM6IHt9LCAvLyB2YWxpZCBtb3Zlcy4ge1wiYTJcIiBbXCJhM1wiIFwiYTRcIl0gXCJiMVwiIFtcImEzXCIgXCJjM1wiXX0gfCBudWxsXG4gICAgICBkcm9wT2ZmOiAncmV2ZXJ0JywgLy8gd2hlbiBhIHBpZWNlIGlzIGRyb3BwZWQgb3V0c2lkZSB0aGUgYm9hcmQuIFwicmV2ZXJ0XCIgfCBcInRyYXNoXCJcbiAgICAgIGRyb3BwZWQ6IFtdLCAvLyBsYXN0IGRyb3BwZWQgW29yaWcsIGRlc3RdLCBub3QgdG8gYmUgYW5pbWF0ZWRcbiAgICAgIHNob3dEZXN0czogdHJ1ZSwgLy8gd2hldGhlciB0byBhZGQgdGhlIG1vdmUtZGVzdCBjbGFzcyBvbiBzcXVhcmVzXG4gICAgICBldmVudHM6IHtcbiAgICAgICAgYWZ0ZXI6IGZ1bmN0aW9uKG9yaWcsIGRlc3QsIG1ldGFkYXRhKSB7fSwgLy8gY2FsbGVkIGFmdGVyIHRoZSBtb3ZlIGhhcyBiZWVuIHBsYXllZFxuICAgICAgICBhZnRlck5ld1BpZWNlOiBmdW5jdGlvbihyb2xlLCBwb3MpIHt9IC8vIGNhbGxlZCBhZnRlciBhIG5ldyBwaWVjZSBpcyBkcm9wcGVkIG9uIHRoZSBib2FyZFxuICAgICAgfSxcbiAgICAgIHJvb2tDYXN0bGU6IHRydWUgLy8gY2FzdGxlIGJ5IG1vdmluZyB0aGUga2luZyB0byB0aGUgcm9va1xuICAgIH0sXG4gICAgcHJlbW92YWJsZToge1xuICAgICAgZW5hYmxlZDogdHJ1ZSwgLy8gYWxsb3cgcHJlbW92ZXMgZm9yIGNvbG9yIHRoYXQgY2FuIG5vdCBtb3ZlXG4gICAgICBzaG93RGVzdHM6IHRydWUsIC8vIHdoZXRoZXIgdG8gYWRkIHRoZSBwcmVtb3ZlLWRlc3QgY2xhc3Mgb24gc3F1YXJlc1xuICAgICAgY2FzdGxlOiB0cnVlLCAvLyB3aGV0aGVyIHRvIGFsbG93IGtpbmcgY2FzdGxlIHByZW1vdmVzXG4gICAgICBkZXN0czogW10sIC8vIHByZW1vdmUgZGVzdGluYXRpb25zIGZvciB0aGUgY3VycmVudCBzZWxlY3Rpb25cbiAgICAgIGN1cnJlbnQ6IG51bGwsIC8vIGtleXMgb2YgdGhlIGN1cnJlbnQgc2F2ZWQgcHJlbW92ZSBbXCJlMlwiIFwiZTRcIl0gfCBudWxsXG4gICAgICBldmVudHM6IHtcbiAgICAgICAgc2V0OiBmdW5jdGlvbihvcmlnLCBkZXN0KSB7fSwgLy8gY2FsbGVkIGFmdGVyIHRoZSBwcmVtb3ZlIGhhcyBiZWVuIHNldFxuICAgICAgICB1bnNldDogZnVuY3Rpb24oKSB7fSAvLyBjYWxsZWQgYWZ0ZXIgdGhlIHByZW1vdmUgaGFzIGJlZW4gdW5zZXRcbiAgICAgIH1cbiAgICB9LFxuICAgIHByZWRyb3BwYWJsZToge1xuICAgICAgZW5hYmxlZDogZmFsc2UsIC8vIGFsbG93IHByZWRyb3BzIGZvciBjb2xvciB0aGF0IGNhbiBub3QgbW92ZVxuICAgICAgY3VycmVudDoge30sIC8vIGN1cnJlbnQgc2F2ZWQgcHJlZHJvcCB7cm9sZTogJ2tuaWdodCcsIGtleTogJ2U0J30gfCB7fVxuICAgICAgZXZlbnRzOiB7XG4gICAgICAgIHNldDogZnVuY3Rpb24ocm9sZSwga2V5KSB7fSwgLy8gY2FsbGVkIGFmdGVyIHRoZSBwcmVkcm9wIGhhcyBiZWVuIHNldFxuICAgICAgICB1bnNldDogZnVuY3Rpb24oKSB7fSAvLyBjYWxsZWQgYWZ0ZXIgdGhlIHByZWRyb3AgaGFzIGJlZW4gdW5zZXRcbiAgICAgIH1cbiAgICB9LFxuICAgIGRyYWdnYWJsZToge1xuICAgICAgZW5hYmxlZDogdHJ1ZSwgLy8gYWxsb3cgbW92ZXMgJiBwcmVtb3ZlcyB0byB1c2UgZHJhZyduIGRyb3BcbiAgICAgIGRpc3RhbmNlOiAzLCAvLyBtaW5pbXVtIGRpc3RhbmNlIHRvIGluaXRpYXRlIGEgZHJhZywgaW4gcGl4ZWxzXG4gICAgICBhdXRvRGlzdGFuY2U6IHRydWUsIC8vIGxldHMgY2hlc3Nncm91bmQgc2V0IGRpc3RhbmNlIHRvIHplcm8gd2hlbiB1c2VyIGRyYWdzIHBpZWNlc1xuICAgICAgY2VudGVyUGllY2U6IHRydWUsIC8vIGNlbnRlciB0aGUgcGllY2Ugb24gY3Vyc29yIGF0IGRyYWcgc3RhcnRcbiAgICAgIHNob3dHaG9zdDogdHJ1ZSwgLy8gc2hvdyBnaG9zdCBvZiBwaWVjZSBiZWluZyBkcmFnZ2VkXG4gICAgICAvKnsgLy8gY3VycmVudFxuICAgICAgICogIG9yaWc6IFwiYTJcIiwgLy8gb3JpZyBrZXkgb2YgZHJhZ2dpbmcgcGllY2VcbiAgICAgICAqICByZWw6IFsxMDAsIDE3MF0gLy8geCwgeSBvZiB0aGUgcGllY2UgYXQgb3JpZ2luYWwgcG9zaXRpb25cbiAgICAgICAqICBwb3M6IFsyMCwgLTEyXSAvLyByZWxhdGl2ZSBjdXJyZW50IHBvc2l0aW9uXG4gICAgICAgKiAgZGVjOiBbNCwgLThdIC8vIHBpZWNlIGNlbnRlciBkZWNheVxuICAgICAgICogIG92ZXI6IFwiYjNcIiAvLyBzcXVhcmUgYmVpbmcgbW91c2VkIG92ZXJcbiAgICAgICAqICBib3VuZHM6IGN1cnJlbnQgY2FjaGVkIGJvYXJkIGJvdW5kc1xuICAgICAgICogIHN0YXJ0ZWQ6IHdoZXRoZXIgdGhlIGRyYWcgaGFzIHN0YXJ0ZWQsIGFzIHBlciB0aGUgZGlzdGFuY2Ugc2V0dGluZ1xuICAgICAgICp9Ki9cbiAgICAgIGN1cnJlbnQ6IHt9XG4gICAgfSxcbiAgICBzZWxlY3RhYmxlOiB7XG4gICAgICAvLyBkaXNhYmxlIHRvIGVuZm9yY2UgZHJhZ2dpbmcgb3ZlciBjbGljay1jbGljayBtb3ZlXG4gICAgICBlbmFibGVkOiB0cnVlXG4gICAgfSxcbiAgICBzdGF0czoge1xuICAgICAgLy8gd2FzIGxhc3QgcGllY2UgZHJhZ2dlZCBvciBjbGlja2VkP1xuICAgICAgLy8gbmVlZHMgZGVmYXVsdCB0byBmYWxzZSBmb3IgdG91Y2hcbiAgICAgIGRyYWdnZWQ6ICEoJ29udG91Y2hzdGFydCcgaW4gd2luZG93KVxuICAgIH0sXG4gICAgZXZlbnRzOiB7XG4gICAgICBjaGFuZ2U6IGZ1bmN0aW9uKCkge30sIC8vIGNhbGxlZCBhZnRlciB0aGUgc2l0dWF0aW9uIGNoYW5nZXMgb24gdGhlIGJvYXJkXG4gICAgICAvLyBjYWxsZWQgYWZ0ZXIgYSBwaWVjZSBoYXMgYmVlbiBtb3ZlZC5cbiAgICAgIC8vIGNhcHR1cmVkUGllY2UgaXMgbnVsbCBvciBsaWtlIHtjb2xvcjogJ3doaXRlJywgJ3JvbGUnOiAncXVlZW4nfVxuICAgICAgbW92ZTogZnVuY3Rpb24ob3JpZywgZGVzdCwgY2FwdHVyZWRQaWVjZSkge30sXG4gICAgICBkcm9wTmV3UGllY2U6IGZ1bmN0aW9uKHJvbGUsIHBvcykge30sXG4gICAgICBjYXB0dXJlOiBmdW5jdGlvbihrZXksIHBpZWNlKSB7fSwgLy8gREVQUkVDQVRFRCBjYWxsZWQgd2hlbiBhIHBpZWNlIGhhcyBiZWVuIGNhcHR1cmVkXG4gICAgICBzZWxlY3Q6IGZ1bmN0aW9uKGtleSkge30gLy8gY2FsbGVkIHdoZW4gYSBzcXVhcmUgaXMgc2VsZWN0ZWRcbiAgICB9LFxuICAgIGl0ZW1zOiBudWxsLCAvLyBpdGVtcyBvbiB0aGUgYm9hcmQgeyByZW5kZXI6IGtleSAtPiB2ZG9tIH1cbiAgICBkcmF3YWJsZToge1xuICAgICAgZW5hYmxlZDogZmFsc2UsIC8vIGFsbG93cyBTVkcgZHJhd2luZ3NcbiAgICAgIGVyYXNlT25DbGljazogdHJ1ZSxcbiAgICAgIG9uQ2hhbmdlOiBmdW5jdGlvbihzaGFwZXMpIHt9LFxuICAgICAgLy8gdXNlciBzaGFwZXNcbiAgICAgIHNoYXBlczogW1xuICAgICAgICAvLyB7YnJ1c2g6ICdncmVlbicsIG9yaWc6ICdlOCd9LFxuICAgICAgICAvLyB7YnJ1c2g6ICd5ZWxsb3cnLCBvcmlnOiAnYzQnLCBkZXN0OiAnZjcnfVxuICAgICAgXSxcbiAgICAgIC8vIGNvbXB1dGVyIHNoYXBlc1xuICAgICAgYXV0b1NoYXBlczogW1xuICAgICAgICAvLyB7YnJ1c2g6ICdwYWxlQmx1ZScsIG9yaWc6ICdlOCd9LFxuICAgICAgICAvLyB7YnJ1c2g6ICdwYWxlUmVkJywgb3JpZzogJ2M0JywgZGVzdDogJ2Y3J31cbiAgICAgIF0sXG4gICAgICAvKnsgLy8gY3VycmVudFxuICAgICAgICogIG9yaWc6IFwiYTJcIiwgLy8gb3JpZyBrZXkgb2YgZHJhd2luZ1xuICAgICAgICogIHBvczogWzIwLCAtMTJdIC8vIHJlbGF0aXZlIGN1cnJlbnQgcG9zaXRpb25cbiAgICAgICAqICBkZXN0OiBcImIzXCIgLy8gc3F1YXJlIGJlaW5nIG1vdXNlZCBvdmVyXG4gICAgICAgKiAgYm91bmRzOiAvLyBjdXJyZW50IGNhY2hlZCBib2FyZCBib3VuZHNcbiAgICAgICAqICBicnVzaDogJ2dyZWVuJyAvLyBicnVzaCBuYW1lIGZvciBzaGFwZVxuICAgICAgICp9Ki9cbiAgICAgIGN1cnJlbnQ6IHt9LFxuICAgICAgYnJ1c2hlczoge1xuICAgICAgICBncmVlbjoge1xuICAgICAgICAgIGtleTogJ2cnLFxuICAgICAgICAgIGNvbG9yOiAnIzE1NzgxQicsXG4gICAgICAgICAgb3BhY2l0eTogMSxcbiAgICAgICAgICBsaW5lV2lkdGg6IDEwXG4gICAgICAgIH0sXG4gICAgICAgIHJlZDoge1xuICAgICAgICAgIGtleTogJ3InLFxuICAgICAgICAgIGNvbG9yOiAnIzg4MjAyMCcsXG4gICAgICAgICAgb3BhY2l0eTogMSxcbiAgICAgICAgICBsaW5lV2lkdGg6IDEwXG4gICAgICAgIH0sXG4gICAgICAgIGJsdWU6IHtcbiAgICAgICAgICBrZXk6ICdiJyxcbiAgICAgICAgICBjb2xvcjogJyMwMDMwODgnLFxuICAgICAgICAgIG9wYWNpdHk6IDEsXG4gICAgICAgICAgbGluZVdpZHRoOiAxMFxuICAgICAgICB9LFxuICAgICAgICB5ZWxsb3c6IHtcbiAgICAgICAgICBrZXk6ICd5JyxcbiAgICAgICAgICBjb2xvcjogJyNlNjhmMDAnLFxuICAgICAgICAgIG9wYWNpdHk6IDEsXG4gICAgICAgICAgbGluZVdpZHRoOiAxMFxuICAgICAgICB9LFxuICAgICAgICBwYWxlQmx1ZToge1xuICAgICAgICAgIGtleTogJ3BiJyxcbiAgICAgICAgICBjb2xvcjogJyMwMDMwODgnLFxuICAgICAgICAgIG9wYWNpdHk6IDAuNCxcbiAgICAgICAgICBsaW5lV2lkdGg6IDE1XG4gICAgICAgIH0sXG4gICAgICAgIHBhbGVHcmVlbjoge1xuICAgICAgICAgIGtleTogJ3BnJyxcbiAgICAgICAgICBjb2xvcjogJyMxNTc4MUInLFxuICAgICAgICAgIG9wYWNpdHk6IDAuNCxcbiAgICAgICAgICBsaW5lV2lkdGg6IDE1XG4gICAgICAgIH0sXG4gICAgICAgIHBhbGVSZWQ6IHtcbiAgICAgICAgICBrZXk6ICdwcicsXG4gICAgICAgICAgY29sb3I6ICcjODgyMDIwJyxcbiAgICAgICAgICBvcGFjaXR5OiAwLjQsXG4gICAgICAgICAgbGluZVdpZHRoOiAxNVxuICAgICAgICB9LFxuICAgICAgICBwYWxlR3JleToge1xuICAgICAgICAgIGtleTogJ3BncicsXG4gICAgICAgICAgY29sb3I6ICcjNGE0YTRhJyxcbiAgICAgICAgICBvcGFjaXR5OiAwLjM1LFxuICAgICAgICAgIGxpbmVXaWR0aDogMTVcbiAgICAgICAgfVxuICAgICAgfSxcbiAgICAgIC8vIGRyYXdhYmxlIFNWRyBwaWVjZXMsIHVzZWQgZm9yIGNyYXp5aG91c2UgZHJvcFxuICAgICAgcGllY2VzOiB7XG4gICAgICAgIGJhc2VVcmw6ICdodHRwczovL2xpY2hlc3MxLm9yZy9hc3NldHMvcGllY2UvY2J1cm5ldHQvJ1xuICAgICAgfVxuICAgIH1cbiAgfTtcblxuICBjb25maWd1cmUoZGVmYXVsdHMsIGNmZyB8fCB7fSk7XG5cbiAgcmV0dXJuIGRlZmF1bHRzO1xufTtcbiIsInZhciBib2FyZCA9IHJlcXVpcmUoJy4vYm9hcmQnKTtcbnZhciB1dGlsID0gcmVxdWlyZSgnLi91dGlsJyk7XG52YXIgZHJhdyA9IHJlcXVpcmUoJy4vZHJhdycpO1xuXG52YXIgb3JpZ2luVGFyZ2V0O1xuXG5mdW5jdGlvbiBoYXNoUGllY2UocGllY2UpIHtcbiAgcmV0dXJuIHBpZWNlID8gcGllY2UuY29sb3IgKyBwaWVjZS5yb2xlIDogJyc7XG59XG5cbmZ1bmN0aW9uIGNvbXB1dGVTcXVhcmVCb3VuZHMoZGF0YSwgYm91bmRzLCBrZXkpIHtcbiAgdmFyIHBvcyA9IHV0aWwua2V5MnBvcyhrZXkpO1xuICBpZiAoZGF0YS5vcmllbnRhdGlvbiAhPT0gJ3doaXRlJykge1xuICAgIHBvc1swXSA9IDkgLSBwb3NbMF07XG4gICAgcG9zWzFdID0gOSAtIHBvc1sxXTtcbiAgfVxuICByZXR1cm4ge1xuICAgIGxlZnQ6IGJvdW5kcy5sZWZ0ICsgYm91bmRzLndpZHRoICogKHBvc1swXSAtIDEpIC8gOCxcbiAgICB0b3A6IGJvdW5kcy50b3AgKyBib3VuZHMuaGVpZ2h0ICogKDggLSBwb3NbMV0pIC8gOCxcbiAgICB3aWR0aDogYm91bmRzLndpZHRoIC8gOCxcbiAgICBoZWlnaHQ6IGJvdW5kcy5oZWlnaHQgLyA4XG4gIH07XG59XG5cbmZ1bmN0aW9uIHN0YXJ0KGRhdGEsIGUpIHtcbiAgaWYgKGUuYnV0dG9uICE9PSB1bmRlZmluZWQgJiYgZS5idXR0b24gIT09IDApIHJldHVybjsgLy8gb25seSB0b3VjaCBvciBsZWZ0IGNsaWNrXG4gIGlmIChlLnRvdWNoZXMgJiYgZS50b3VjaGVzLmxlbmd0aCA+IDEpIHJldHVybjsgLy8gc3VwcG9ydCBvbmUgZmluZ2VyIHRvdWNoIG9ubHlcbiAgZS5zdG9wUHJvcGFnYXRpb24oKTtcbiAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICBvcmlnaW5UYXJnZXQgPSBlLnRhcmdldDtcbiAgdmFyIHByZXZpb3VzbHlTZWxlY3RlZCA9IGRhdGEuc2VsZWN0ZWQ7XG4gIHZhciBwb3NpdGlvbiA9IHV0aWwuZXZlbnRQb3NpdGlvbihlKTtcbiAgdmFyIGJvdW5kcyA9IGRhdGEuYm91bmRzKCk7XG4gIHZhciBvcmlnID0gYm9hcmQuZ2V0S2V5QXREb21Qb3MoZGF0YSwgcG9zaXRpb24sIGJvdW5kcyk7XG4gIHZhciBwaWVjZSA9IGRhdGEucGllY2VzW29yaWddO1xuICBpZiAoIXByZXZpb3VzbHlTZWxlY3RlZCAmJiAoXG4gICAgZGF0YS5kcmF3YWJsZS5lcmFzZU9uQ2xpY2sgfHxcbiAgICAoIXBpZWNlIHx8IHBpZWNlLmNvbG9yICE9PSBkYXRhLnR1cm5Db2xvcilcbiAgKSkgZHJhdy5jbGVhcihkYXRhKTtcbiAgaWYgKGRhdGEudmlld09ubHkpIHJldHVybjtcbiAgdmFyIGhhZFByZW1vdmUgPSAhIWRhdGEucHJlbW92YWJsZS5jdXJyZW50O1xuICB2YXIgaGFkUHJlZHJvcCA9ICEhZGF0YS5wcmVkcm9wcGFibGUuY3VycmVudC5rZXk7XG4gIGJvYXJkLnNlbGVjdFNxdWFyZShkYXRhLCBvcmlnKTtcbiAgdmFyIHN0aWxsU2VsZWN0ZWQgPSBkYXRhLnNlbGVjdGVkID09PSBvcmlnO1xuICBpZiAocGllY2UgJiYgc3RpbGxTZWxlY3RlZCAmJiBib2FyZC5pc0RyYWdnYWJsZShkYXRhLCBvcmlnKSkge1xuICAgIHZhciBzcXVhcmVCb3VuZHMgPSBjb21wdXRlU3F1YXJlQm91bmRzKGRhdGEsIGJvdW5kcywgb3JpZyk7XG4gICAgZGF0YS5kcmFnZ2FibGUuY3VycmVudCA9IHtcbiAgICAgIHByZXZpb3VzbHlTZWxlY3RlZDogcHJldmlvdXNseVNlbGVjdGVkLFxuICAgICAgb3JpZzogb3JpZyxcbiAgICAgIHBpZWNlOiBoYXNoUGllY2UocGllY2UpLFxuICAgICAgcmVsOiBwb3NpdGlvbixcbiAgICAgIGVwb3M6IHBvc2l0aW9uLFxuICAgICAgcG9zOiBbMCwgMF0sXG4gICAgICBkZWM6IGRhdGEuZHJhZ2dhYmxlLmNlbnRlclBpZWNlID8gW1xuICAgICAgICBwb3NpdGlvblswXSAtIChzcXVhcmVCb3VuZHMubGVmdCArIHNxdWFyZUJvdW5kcy53aWR0aCAvIDIpLFxuICAgICAgICBwb3NpdGlvblsxXSAtIChzcXVhcmVCb3VuZHMudG9wICsgc3F1YXJlQm91bmRzLmhlaWdodCAvIDIpXG4gICAgICBdIDogWzAsIDBdLFxuICAgICAgYm91bmRzOiBib3VuZHMsXG4gICAgICBzdGFydGVkOiBkYXRhLmRyYWdnYWJsZS5hdXRvRGlzdGFuY2UgJiYgZGF0YS5zdGF0cy5kcmFnZ2VkXG4gICAgfTtcbiAgfSBlbHNlIHtcbiAgICBpZiAoaGFkUHJlbW92ZSkgYm9hcmQudW5zZXRQcmVtb3ZlKGRhdGEpO1xuICAgIGlmIChoYWRQcmVkcm9wKSBib2FyZC51bnNldFByZWRyb3AoZGF0YSk7XG4gIH1cbiAgcHJvY2Vzc0RyYWcoZGF0YSk7XG59XG5cbmZ1bmN0aW9uIHByb2Nlc3NEcmFnKGRhdGEpIHtcbiAgdXRpbC5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUoZnVuY3Rpb24oKSB7XG4gICAgdmFyIGN1ciA9IGRhdGEuZHJhZ2dhYmxlLmN1cnJlbnQ7XG4gICAgaWYgKGN1ci5vcmlnKSB7XG4gICAgICAvLyBjYW5jZWwgYW5pbWF0aW9ucyB3aGlsZSBkcmFnZ2luZ1xuICAgICAgaWYgKGRhdGEuYW5pbWF0aW9uLmN1cnJlbnQuc3RhcnQgJiYgZGF0YS5hbmltYXRpb24uY3VycmVudC5hbmltc1tjdXIub3JpZ10pXG4gICAgICAgIGRhdGEuYW5pbWF0aW9uLmN1cnJlbnQgPSB7fTtcbiAgICAgIC8vIGlmIG1vdmluZyBwaWVjZSBpcyBnb25lLCBjYW5jZWxcbiAgICAgIGlmIChoYXNoUGllY2UoZGF0YS5waWVjZXNbY3VyLm9yaWddKSAhPT0gY3VyLnBpZWNlKSBjYW5jZWwoZGF0YSk7XG4gICAgICBlbHNlIHtcbiAgICAgICAgaWYgKCFjdXIuc3RhcnRlZCAmJiB1dGlsLmRpc3RhbmNlKGN1ci5lcG9zLCBjdXIucmVsKSA+PSBkYXRhLmRyYWdnYWJsZS5kaXN0YW5jZSlcbiAgICAgICAgICBjdXIuc3RhcnRlZCA9IHRydWU7XG4gICAgICAgIGlmIChjdXIuc3RhcnRlZCkge1xuICAgICAgICAgIGN1ci5wb3MgPSBbXG4gICAgICAgICAgICBjdXIuZXBvc1swXSAtIGN1ci5yZWxbMF0sXG4gICAgICAgICAgICBjdXIuZXBvc1sxXSAtIGN1ci5yZWxbMV1cbiAgICAgICAgICBdO1xuICAgICAgICAgIGN1ci5vdmVyID0gYm9hcmQuZ2V0S2V5QXREb21Qb3MoZGF0YSwgY3VyLmVwb3MsIGN1ci5ib3VuZHMpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIGRhdGEucmVuZGVyKCk7XG4gICAgaWYgKGN1ci5vcmlnKSBwcm9jZXNzRHJhZyhkYXRhKTtcbiAgfSk7XG59XG5cbmZ1bmN0aW9uIG1vdmUoZGF0YSwgZSkge1xuICBpZiAoZS50b3VjaGVzICYmIGUudG91Y2hlcy5sZW5ndGggPiAxKSByZXR1cm47IC8vIHN1cHBvcnQgb25lIGZpbmdlciB0b3VjaCBvbmx5XG4gIGlmIChkYXRhLmRyYWdnYWJsZS5jdXJyZW50Lm9yaWcpXG4gICAgZGF0YS5kcmFnZ2FibGUuY3VycmVudC5lcG9zID0gdXRpbC5ldmVudFBvc2l0aW9uKGUpO1xufVxuXG5mdW5jdGlvbiBlbmQoZGF0YSwgZSkge1xuICB2YXIgY3VyID0gZGF0YS5kcmFnZ2FibGUuY3VycmVudDtcbiAgdmFyIG9yaWcgPSBjdXIgPyBjdXIub3JpZyA6IG51bGw7XG4gIGlmICghb3JpZykgcmV0dXJuO1xuICAvLyBjb21wYXJpbmcgd2l0aCB0aGUgb3JpZ2luIHRhcmdldCBpcyBhbiBlYXN5IHdheSB0byB0ZXN0IHRoYXQgdGhlIGVuZCBldmVudFxuICAvLyBoYXMgdGhlIHNhbWUgdG91Y2ggb3JpZ2luXG4gIGlmIChlLnR5cGUgPT09IFwidG91Y2hlbmRcIiAmJiBvcmlnaW5UYXJnZXQgIT09IGUudGFyZ2V0ICYmICFjdXIubmV3UGllY2UpIHtcbiAgICBkYXRhLmRyYWdnYWJsZS5jdXJyZW50ID0ge307XG4gICAgcmV0dXJuO1xuICB9XG4gIGJvYXJkLnVuc2V0UHJlbW92ZShkYXRhKTtcbiAgYm9hcmQudW5zZXRQcmVkcm9wKGRhdGEpO1xuICB2YXIgZXZlbnRQb3MgPSB1dGlsLmV2ZW50UG9zaXRpb24oZSlcbiAgdmFyIGRlc3QgPSBldmVudFBvcyA/IGJvYXJkLmdldEtleUF0RG9tUG9zKGRhdGEsIGV2ZW50UG9zLCBjdXIuYm91bmRzKSA6IGN1ci5vdmVyO1xuICBpZiAoY3VyLnN0YXJ0ZWQpIHtcbiAgICBpZiAoY3VyLm5ld1BpZWNlKSBib2FyZC5kcm9wTmV3UGllY2UoZGF0YSwgb3JpZywgZGVzdCk7XG4gICAgZWxzZSB7XG4gICAgICBpZiAob3JpZyAhPT0gZGVzdCkgZGF0YS5tb3ZhYmxlLmRyb3BwZWQgPSBbb3JpZywgZGVzdF07XG4gICAgICBpZiAoYm9hcmQudXNlck1vdmUoZGF0YSwgb3JpZywgZGVzdCkpIGRhdGEuc3RhdHMuZHJhZ2dlZCA9IHRydWU7XG4gICAgfVxuICB9XG4gIGlmIChvcmlnID09PSBjdXIucHJldmlvdXNseVNlbGVjdGVkICYmIChvcmlnID09PSBkZXN0IHx8ICFkZXN0KSlcbiAgICBib2FyZC5zZXRTZWxlY3RlZChkYXRhLCBudWxsKTtcbiAgZWxzZSBpZiAoIWRhdGEuc2VsZWN0YWJsZS5lbmFibGVkKSBib2FyZC5zZXRTZWxlY3RlZChkYXRhLCBudWxsKTtcbiAgZGF0YS5kcmFnZ2FibGUuY3VycmVudCA9IHt9O1xufVxuXG5mdW5jdGlvbiBjYW5jZWwoZGF0YSkge1xuICBpZiAoZGF0YS5kcmFnZ2FibGUuY3VycmVudC5vcmlnKSB7XG4gICAgZGF0YS5kcmFnZ2FibGUuY3VycmVudCA9IHt9O1xuICAgIGJvYXJkLnNlbGVjdFNxdWFyZShkYXRhLCBudWxsKTtcbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgc3RhcnQ6IHN0YXJ0LFxuICBtb3ZlOiBtb3ZlLFxuICBlbmQ6IGVuZCxcbiAgY2FuY2VsOiBjYW5jZWwsXG4gIHByb2Nlc3NEcmFnOiBwcm9jZXNzRHJhZyAvLyBtdXN0IGJlIGV4cG9zZWQgZm9yIGJvYXJkIGVkaXRvcnNcbn07XG4iLCJ2YXIgYm9hcmQgPSByZXF1aXJlKCcuL2JvYXJkJyk7XG52YXIgdXRpbCA9IHJlcXVpcmUoJy4vdXRpbCcpO1xuXG52YXIgYnJ1c2hlcyA9IFsnZ3JlZW4nLCAncmVkJywgJ2JsdWUnLCAneWVsbG93J107XG5cbmZ1bmN0aW9uIGhhc2hQaWVjZShwaWVjZSkge1xuICByZXR1cm4gcGllY2UgPyBwaWVjZS5jb2xvciArICcgJyArIHBpZWNlLnJvbGUgOiAnJztcbn1cblxuZnVuY3Rpb24gc3RhcnQoZGF0YSwgZSkge1xuICBpZiAoZS50b3VjaGVzICYmIGUudG91Y2hlcy5sZW5ndGggPiAxKSByZXR1cm47IC8vIHN1cHBvcnQgb25lIGZpbmdlciB0b3VjaCBvbmx5XG4gIGUuc3RvcFByb3BhZ2F0aW9uKCk7XG4gIGUucHJldmVudERlZmF1bHQoKTtcbiAgYm9hcmQuY2FuY2VsTW92ZShkYXRhKTtcbiAgdmFyIHBvc2l0aW9uID0gdXRpbC5ldmVudFBvc2l0aW9uKGUpO1xuICB2YXIgYm91bmRzID0gZGF0YS5ib3VuZHMoKTtcbiAgdmFyIG9yaWcgPSBib2FyZC5nZXRLZXlBdERvbVBvcyhkYXRhLCBwb3NpdGlvbiwgYm91bmRzKTtcbiAgZGF0YS5kcmF3YWJsZS5jdXJyZW50ID0ge1xuICAgIG9yaWc6IG9yaWcsXG4gICAgZXBvczogcG9zaXRpb24sXG4gICAgYm91bmRzOiBib3VuZHMsXG4gICAgYnJ1c2g6IGJydXNoZXNbKGUuc2hpZnRLZXkgJiB1dGlsLmlzUmlnaHRCdXR0b24oZSkpICsgKGUuYWx0S2V5ID8gMiA6IDApXVxuICB9O1xuICBwcm9jZXNzRHJhdyhkYXRhKTtcbn1cblxuZnVuY3Rpb24gcHJvY2Vzc0RyYXcoZGF0YSkge1xuICB1dGlsLnJlcXVlc3RBbmltYXRpb25GcmFtZShmdW5jdGlvbigpIHtcbiAgICB2YXIgY3VyID0gZGF0YS5kcmF3YWJsZS5jdXJyZW50O1xuICAgIGlmIChjdXIub3JpZykge1xuICAgICAgdmFyIGRlc3QgPSBib2FyZC5nZXRLZXlBdERvbVBvcyhkYXRhLCBjdXIuZXBvcywgY3VyLmJvdW5kcyk7XG4gICAgICBpZiAoY3VyLm9yaWcgPT09IGRlc3QpIGN1ci5kZXN0ID0gdW5kZWZpbmVkO1xuICAgICAgZWxzZSBjdXIuZGVzdCA9IGRlc3Q7XG4gICAgfVxuICAgIGRhdGEucmVuZGVyKCk7XG4gICAgaWYgKGN1ci5vcmlnKSBwcm9jZXNzRHJhdyhkYXRhKTtcbiAgfSk7XG59XG5cbmZ1bmN0aW9uIG1vdmUoZGF0YSwgZSkge1xuICBpZiAoZGF0YS5kcmF3YWJsZS5jdXJyZW50Lm9yaWcpXG4gICAgZGF0YS5kcmF3YWJsZS5jdXJyZW50LmVwb3MgPSB1dGlsLmV2ZW50UG9zaXRpb24oZSk7XG59XG5cbmZ1bmN0aW9uIGVuZChkYXRhLCBlKSB7XG4gIHZhciBkcmF3YWJsZSA9IGRhdGEuZHJhd2FibGU7XG4gIHZhciBvcmlnID0gZHJhd2FibGUuY3VycmVudC5vcmlnO1xuICB2YXIgZGVzdCA9IGRyYXdhYmxlLmN1cnJlbnQuZGVzdDtcbiAgaWYgKG9yaWcgJiYgZGVzdCkgYWRkTGluZShkcmF3YWJsZSwgb3JpZywgZGVzdCk7XG4gIGVsc2UgaWYgKG9yaWcpIGFkZENpcmNsZShkcmF3YWJsZSwgb3JpZyk7XG4gIGRyYXdhYmxlLmN1cnJlbnQgPSB7fTtcbiAgZGF0YS5yZW5kZXIoKTtcbn1cblxuZnVuY3Rpb24gY2FuY2VsKGRhdGEpIHtcbiAgaWYgKGRhdGEuZHJhd2FibGUuY3VycmVudC5vcmlnKSBkYXRhLmRyYXdhYmxlLmN1cnJlbnQgPSB7fTtcbn1cblxuZnVuY3Rpb24gY2xlYXIoZGF0YSkge1xuICBpZiAoZGF0YS5kcmF3YWJsZS5zaGFwZXMubGVuZ3RoKSB7XG4gICAgZGF0YS5kcmF3YWJsZS5zaGFwZXMgPSBbXTtcbiAgICBkYXRhLnJlbmRlcigpO1xuICAgIG9uQ2hhbmdlKGRhdGEuZHJhd2FibGUpO1xuICB9XG59XG5cbmZ1bmN0aW9uIG5vdChmKSB7XG4gIHJldHVybiBmdW5jdGlvbih4KSB7XG4gICAgcmV0dXJuICFmKHgpO1xuICB9O1xufVxuXG5mdW5jdGlvbiBhZGRDaXJjbGUoZHJhd2FibGUsIGtleSkge1xuICB2YXIgYnJ1c2ggPSBkcmF3YWJsZS5jdXJyZW50LmJydXNoO1xuICB2YXIgc2FtZUNpcmNsZSA9IGZ1bmN0aW9uKHMpIHtcbiAgICByZXR1cm4gcy5vcmlnID09PSBrZXkgJiYgIXMuZGVzdDtcbiAgfTtcbiAgdmFyIHNpbWlsYXIgPSBkcmF3YWJsZS5zaGFwZXMuZmlsdGVyKHNhbWVDaXJjbGUpWzBdO1xuICBpZiAoc2ltaWxhcikgZHJhd2FibGUuc2hhcGVzID0gZHJhd2FibGUuc2hhcGVzLmZpbHRlcihub3Qoc2FtZUNpcmNsZSkpO1xuICBpZiAoIXNpbWlsYXIgfHwgc2ltaWxhci5icnVzaCAhPT0gYnJ1c2gpIGRyYXdhYmxlLnNoYXBlcy5wdXNoKHtcbiAgICBicnVzaDogYnJ1c2gsXG4gICAgb3JpZzoga2V5XG4gIH0pO1xuICBvbkNoYW5nZShkcmF3YWJsZSk7XG59XG5cbmZ1bmN0aW9uIGFkZExpbmUoZHJhd2FibGUsIG9yaWcsIGRlc3QpIHtcbiAgdmFyIGJydXNoID0gZHJhd2FibGUuY3VycmVudC5icnVzaDtcbiAgdmFyIHNhbWVMaW5lID0gZnVuY3Rpb24ocykge1xuICAgIHJldHVybiBzLm9yaWcgJiYgcy5kZXN0ICYmIChcbiAgICAgIChzLm9yaWcgPT09IG9yaWcgJiYgcy5kZXN0ID09PSBkZXN0KSB8fFxuICAgICAgKHMuZGVzdCA9PT0gb3JpZyAmJiBzLm9yaWcgPT09IGRlc3QpXG4gICAgKTtcbiAgfTtcbiAgdmFyIGV4aXN0cyA9IGRyYXdhYmxlLnNoYXBlcy5maWx0ZXIoc2FtZUxpbmUpLmxlbmd0aCA+IDA7XG4gIGlmIChleGlzdHMpIGRyYXdhYmxlLnNoYXBlcyA9IGRyYXdhYmxlLnNoYXBlcy5maWx0ZXIobm90KHNhbWVMaW5lKSk7XG4gIGVsc2UgZHJhd2FibGUuc2hhcGVzLnB1c2goe1xuICAgIGJydXNoOiBicnVzaCxcbiAgICBvcmlnOiBvcmlnLFxuICAgIGRlc3Q6IGRlc3RcbiAgfSk7XG4gIG9uQ2hhbmdlKGRyYXdhYmxlKTtcbn1cblxuZnVuY3Rpb24gb25DaGFuZ2UoZHJhd2FibGUpIHtcbiAgZHJhd2FibGUub25DaGFuZ2UoZHJhd2FibGUuc2hhcGVzKTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIHN0YXJ0OiBzdGFydCxcbiAgbW92ZTogbW92ZSxcbiAgZW5kOiBlbmQsXG4gIGNhbmNlbDogY2FuY2VsLFxuICBjbGVhcjogY2xlYXIsXG4gIHByb2Nlc3NEcmF3OiBwcm9jZXNzRHJhd1xufTtcbiIsInZhciB1dGlsID0gcmVxdWlyZSgnLi91dGlsJyk7XG5cbnZhciBpbml0aWFsID0gJ3JuYnFrYm5yL3BwcHBwcHBwLzgvOC84LzgvUFBQUFBQUFAvUk5CUUtCTlInO1xuXG52YXIgcm9sZXMgPSB7XG4gIHA6IFwicGF3blwiLFxuICByOiBcInJvb2tcIixcbiAgbjogXCJrbmlnaHRcIixcbiAgYjogXCJiaXNob3BcIixcbiAgcTogXCJxdWVlblwiLFxuICBrOiBcImtpbmdcIlxufTtcblxudmFyIGxldHRlcnMgPSB7XG4gIHBhd246IFwicFwiLFxuICByb29rOiBcInJcIixcbiAga25pZ2h0OiBcIm5cIixcbiAgYmlzaG9wOiBcImJcIixcbiAgcXVlZW46IFwicVwiLFxuICBraW5nOiBcImtcIlxufTtcblxuZnVuY3Rpb24gcmVhZChmZW4pIHtcbiAgaWYgKGZlbiA9PT0gJ3N0YXJ0JykgZmVuID0gaW5pdGlhbDtcbiAgdmFyIHBpZWNlcyA9IHt9O1xuICBmZW4ucmVwbGFjZSgvIC4rJC8sICcnKS5yZXBsYWNlKC9+L2csICcnKS5zcGxpdCgnLycpLmZvckVhY2goZnVuY3Rpb24ocm93LCB5KSB7XG4gICAgdmFyIHggPSAwO1xuICAgIHJvdy5zcGxpdCgnJykuZm9yRWFjaChmdW5jdGlvbih2KSB7XG4gICAgICB2YXIgbmIgPSBwYXJzZUludCh2KTtcbiAgICAgIGlmIChuYikgeCArPSBuYjtcbiAgICAgIGVsc2Uge1xuICAgICAgICB4Kys7XG4gICAgICAgIHBpZWNlc1t1dGlsLnBvczJrZXkoW3gsIDggLSB5XSldID0ge1xuICAgICAgICAgIHJvbGU6IHJvbGVzW3YudG9Mb3dlckNhc2UoKV0sXG4gICAgICAgICAgY29sb3I6IHYgPT09IHYudG9Mb3dlckNhc2UoKSA/ICdibGFjaycgOiAnd2hpdGUnXG4gICAgICAgIH07XG4gICAgICB9XG4gICAgfSk7XG4gIH0pO1xuXG4gIHJldHVybiBwaWVjZXM7XG59XG5cbmZ1bmN0aW9uIHdyaXRlKHBpZWNlcykge1xuICByZXR1cm4gWzgsIDcsIDYsIDUsIDQsIDMsIDJdLnJlZHVjZShcbiAgICBmdW5jdGlvbihzdHIsIG5iKSB7XG4gICAgICByZXR1cm4gc3RyLnJlcGxhY2UobmV3IFJlZ0V4cChBcnJheShuYiArIDEpLmpvaW4oJzEnKSwgJ2cnKSwgbmIpO1xuICAgIH0sXG4gICAgdXRpbC5pbnZSYW5rcy5tYXAoZnVuY3Rpb24oeSkge1xuICAgICAgcmV0dXJuIHV0aWwucmFua3MubWFwKGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgdmFyIHBpZWNlID0gcGllY2VzW3V0aWwucG9zMmtleShbeCwgeV0pXTtcbiAgICAgICAgaWYgKHBpZWNlKSB7XG4gICAgICAgICAgdmFyIGxldHRlciA9IGxldHRlcnNbcGllY2Uucm9sZV07XG4gICAgICAgICAgcmV0dXJuIHBpZWNlLmNvbG9yID09PSAnd2hpdGUnID8gbGV0dGVyLnRvVXBwZXJDYXNlKCkgOiBsZXR0ZXI7XG4gICAgICAgIH0gZWxzZSByZXR1cm4gJzEnO1xuICAgICAgfSkuam9pbignJyk7XG4gICAgfSkuam9pbignLycpKTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIGluaXRpYWw6IGluaXRpYWwsXG4gIHJlYWQ6IHJlYWQsXG4gIHdyaXRlOiB3cml0ZVxufTtcbiIsInZhciBzdGFydEF0O1xuXG52YXIgc3RhcnQgPSBmdW5jdGlvbigpIHtcbiAgc3RhcnRBdCA9IG5ldyBEYXRlKCk7XG59O1xuXG52YXIgY2FuY2VsID0gZnVuY3Rpb24oKSB7XG4gIHN0YXJ0QXQgPSBudWxsO1xufTtcblxudmFyIHN0b3AgPSBmdW5jdGlvbigpIHtcbiAgaWYgKCFzdGFydEF0KSByZXR1cm4gMDtcbiAgdmFyIHRpbWUgPSBuZXcgRGF0ZSgpIC0gc3RhcnRBdDtcbiAgc3RhcnRBdCA9IG51bGw7XG4gIHJldHVybiB0aW1lO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIHN0YXJ0OiBzdGFydCxcbiAgY2FuY2VsOiBjYW5jZWwsXG4gIHN0b3A6IHN0b3Bcbn07XG4iLCJ2YXIgbSA9IHJlcXVpcmUoJ21pdGhyaWwnKTtcbnZhciBjdHJsID0gcmVxdWlyZSgnLi9jdHJsJyk7XG52YXIgdmlldyA9IHJlcXVpcmUoJy4vdmlldycpO1xudmFyIGFwaSA9IHJlcXVpcmUoJy4vYXBpJyk7XG5cbi8vIGZvciB1c2FnZSBvdXRzaWRlIG9mIG1pdGhyaWxcbmZ1bmN0aW9uIGluaXQoZWxlbWVudCwgY29uZmlnKSB7XG5cbiAgdmFyIGNvbnRyb2xsZXIgPSBuZXcgY3RybChjb25maWcpO1xuXG4gIG0ucmVuZGVyKGVsZW1lbnQsIHZpZXcoY29udHJvbGxlcikpO1xuXG4gIHJldHVybiBhcGkoY29udHJvbGxlcik7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gaW5pdDtcbm1vZHVsZS5leHBvcnRzLmNvbnRyb2xsZXIgPSBjdHJsO1xubW9kdWxlLmV4cG9ydHMudmlldyA9IHZpZXc7XG5tb2R1bGUuZXhwb3J0cy5mZW4gPSByZXF1aXJlKCcuL2ZlbicpO1xubW9kdWxlLmV4cG9ydHMudXRpbCA9IHJlcXVpcmUoJy4vdXRpbCcpO1xubW9kdWxlLmV4cG9ydHMuY29uZmlndXJlID0gcmVxdWlyZSgnLi9jb25maWd1cmUnKTtcbm1vZHVsZS5leHBvcnRzLmFuaW0gPSByZXF1aXJlKCcuL2FuaW0nKTtcbm1vZHVsZS5leHBvcnRzLmJvYXJkID0gcmVxdWlyZSgnLi9ib2FyZCcpO1xubW9kdWxlLmV4cG9ydHMuZHJhZyA9IHJlcXVpcmUoJy4vZHJhZycpO1xuIiwidmFyIHV0aWwgPSByZXF1aXJlKCcuL3V0aWwnKTtcblxuZnVuY3Rpb24gZGlmZihhLCBiKSB7XG4gIHJldHVybiBNYXRoLmFicyhhIC0gYik7XG59XG5cbmZ1bmN0aW9uIHBhd24oY29sb3IsIHgxLCB5MSwgeDIsIHkyKSB7XG4gIHJldHVybiBkaWZmKHgxLCB4MikgPCAyICYmIChcbiAgICBjb2xvciA9PT0gJ3doaXRlJyA/IChcbiAgICAgIC8vIGFsbG93IDIgc3F1YXJlcyBmcm9tIDEgYW5kIDgsIGZvciBob3JkZVxuICAgICAgeTIgPT09IHkxICsgMSB8fCAoeTEgPD0gMiAmJiB5MiA9PT0gKHkxICsgMikgJiYgeDEgPT09IHgyKVxuICAgICkgOiAoXG4gICAgICB5MiA9PT0geTEgLSAxIHx8ICh5MSA+PSA3ICYmIHkyID09PSAoeTEgLSAyKSAmJiB4MSA9PT0geDIpXG4gICAgKVxuICApO1xufVxuXG5mdW5jdGlvbiBrbmlnaHQoeDEsIHkxLCB4MiwgeTIpIHtcbiAgdmFyIHhkID0gZGlmZih4MSwgeDIpO1xuICB2YXIgeWQgPSBkaWZmKHkxLCB5Mik7XG4gIHJldHVybiAoeGQgPT09IDEgJiYgeWQgPT09IDIpIHx8ICh4ZCA9PT0gMiAmJiB5ZCA9PT0gMSk7XG59XG5cbmZ1bmN0aW9uIGJpc2hvcCh4MSwgeTEsIHgyLCB5Mikge1xuICByZXR1cm4gZGlmZih4MSwgeDIpID09PSBkaWZmKHkxLCB5Mik7XG59XG5cbmZ1bmN0aW9uIHJvb2soeDEsIHkxLCB4MiwgeTIpIHtcbiAgcmV0dXJuIHgxID09PSB4MiB8fCB5MSA9PT0geTI7XG59XG5cbmZ1bmN0aW9uIHF1ZWVuKHgxLCB5MSwgeDIsIHkyKSB7XG4gIHJldHVybiBiaXNob3AoeDEsIHkxLCB4MiwgeTIpIHx8IHJvb2soeDEsIHkxLCB4MiwgeTIpO1xufVxuXG5mdW5jdGlvbiBraW5nKGNvbG9yLCByb29rRmlsZXMsIGNhbkNhc3RsZSwgeDEsIHkxLCB4MiwgeTIpIHtcbiAgcmV0dXJuIChcbiAgICBkaWZmKHgxLCB4MikgPCAyICYmIGRpZmYoeTEsIHkyKSA8IDJcbiAgKSB8fCAoXG4gICAgY2FuQ2FzdGxlICYmIHkxID09PSB5MiAmJiB5MSA9PT0gKGNvbG9yID09PSAnd2hpdGUnID8gMSA6IDgpICYmIChcbiAgICAgICh4MSA9PT0gNSAmJiAoeDIgPT09IDMgfHwgeDIgPT09IDcpKSB8fCB1dGlsLmNvbnRhaW5zWChyb29rRmlsZXMsIHgyKVxuICAgIClcbiAgKTtcbn1cblxuZnVuY3Rpb24gcm9va0ZpbGVzT2YocGllY2VzLCBjb2xvcikge1xuICByZXR1cm4gT2JqZWN0LmtleXMocGllY2VzKS5maWx0ZXIoZnVuY3Rpb24oa2V5KSB7XG4gICAgdmFyIHBpZWNlID0gcGllY2VzW2tleV07XG4gICAgcmV0dXJuIHBpZWNlICYmIHBpZWNlLmNvbG9yID09PSBjb2xvciAmJiBwaWVjZS5yb2xlID09PSAncm9vayc7XG4gIH0pLm1hcChmdW5jdGlvbihrZXkpIHtcbiAgICByZXR1cm4gdXRpbC5rZXkycG9zKGtleSlbMF07XG4gIH0pO1xufVxuXG5mdW5jdGlvbiBjb21wdXRlKHBpZWNlcywga2V5LCBjYW5DYXN0bGUpIHtcbiAgdmFyIHBpZWNlID0gcGllY2VzW2tleV07XG4gIHZhciBwb3MgPSB1dGlsLmtleTJwb3Moa2V5KTtcbiAgdmFyIG1vYmlsaXR5O1xuICBzd2l0Y2ggKHBpZWNlLnJvbGUpIHtcbiAgICBjYXNlICdwYXduJzpcbiAgICAgIG1vYmlsaXR5ID0gcGF3bi5iaW5kKG51bGwsIHBpZWNlLmNvbG9yKTtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ2tuaWdodCc6XG4gICAgICBtb2JpbGl0eSA9IGtuaWdodDtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ2Jpc2hvcCc6XG4gICAgICBtb2JpbGl0eSA9IGJpc2hvcDtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ3Jvb2snOlxuICAgICAgbW9iaWxpdHkgPSByb29rO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSAncXVlZW4nOlxuICAgICAgbW9iaWxpdHkgPSBxdWVlbjtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ2tpbmcnOlxuICAgICAgbW9iaWxpdHkgPSBraW5nLmJpbmQobnVsbCwgcGllY2UuY29sb3IsIHJvb2tGaWxlc09mKHBpZWNlcywgcGllY2UuY29sb3IpLCBjYW5DYXN0bGUpO1xuICAgICAgYnJlYWs7XG4gIH1cbiAgcmV0dXJuIHV0aWwuYWxsUG9zLmZpbHRlcihmdW5jdGlvbihwb3MyKSB7XG4gICAgcmV0dXJuIChwb3NbMF0gIT09IHBvczJbMF0gfHwgcG9zWzFdICE9PSBwb3MyWzFdKSAmJiBtb2JpbGl0eShwb3NbMF0sIHBvc1sxXSwgcG9zMlswXSwgcG9zMlsxXSk7XG4gIH0pLm1hcCh1dGlsLnBvczJrZXkpO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGNvbXB1dGU7XG4iLCJ2YXIgbSA9IHJlcXVpcmUoJ21pdGhyaWwnKTtcbnZhciBrZXkycG9zID0gcmVxdWlyZSgnLi91dGlsJykua2V5MnBvcztcbnZhciBpc1RyaWRlbnQgPSByZXF1aXJlKCcuL3V0aWwnKS5pc1RyaWRlbnQ7XG5cbmZ1bmN0aW9uIGNpcmNsZVdpZHRoKGN1cnJlbnQsIGJvdW5kcykge1xuICByZXR1cm4gKGN1cnJlbnQgPyAzIDogNCkgLyA1MTIgKiBib3VuZHMud2lkdGg7XG59XG5cbmZ1bmN0aW9uIGxpbmVXaWR0aChicnVzaCwgY3VycmVudCwgYm91bmRzKSB7XG4gIHJldHVybiAoYnJ1c2gubGluZVdpZHRoIHx8IDEwKSAqIChjdXJyZW50ID8gMC44NSA6IDEpIC8gNTEyICogYm91bmRzLndpZHRoO1xufVxuXG5mdW5jdGlvbiBvcGFjaXR5KGJydXNoLCBjdXJyZW50KSB7XG4gIHJldHVybiAoYnJ1c2gub3BhY2l0eSB8fCAxKSAqIChjdXJyZW50ID8gMC45IDogMSk7XG59XG5cbmZ1bmN0aW9uIGFycm93TWFyZ2luKGN1cnJlbnQsIGJvdW5kcykge1xuICByZXR1cm4gaXNUcmlkZW50KCkgPyAwIDogKChjdXJyZW50ID8gMTAgOiAyMCkgLyA1MTIgKiBib3VuZHMud2lkdGgpO1xufVxuXG5mdW5jdGlvbiBwb3MycHgocG9zLCBib3VuZHMpIHtcbiAgdmFyIHNxdWFyZVNpemUgPSBib3VuZHMud2lkdGggLyA4O1xuICByZXR1cm4gWyhwb3NbMF0gLSAwLjUpICogc3F1YXJlU2l6ZSwgKDguNSAtIHBvc1sxXSkgKiBzcXVhcmVTaXplXTtcbn1cblxuZnVuY3Rpb24gY2lyY2xlKGJydXNoLCBwb3MsIGN1cnJlbnQsIGJvdW5kcykge1xuICB2YXIgbyA9IHBvczJweChwb3MsIGJvdW5kcyk7XG4gIHZhciB3aWR0aCA9IGNpcmNsZVdpZHRoKGN1cnJlbnQsIGJvdW5kcyk7XG4gIHZhciByYWRpdXMgPSBib3VuZHMud2lkdGggLyAxNjtcbiAgcmV0dXJuIHtcbiAgICB0YWc6ICdjaXJjbGUnLFxuICAgIGF0dHJzOiB7XG4gICAgICBrZXk6IGN1cnJlbnQgPyAnY3VycmVudCcgOiBwb3MgKyBicnVzaC5rZXksXG4gICAgICBzdHJva2U6IGJydXNoLmNvbG9yLFxuICAgICAgJ3N0cm9rZS13aWR0aCc6IHdpZHRoLFxuICAgICAgZmlsbDogJ25vbmUnLFxuICAgICAgb3BhY2l0eTogb3BhY2l0eShicnVzaCwgY3VycmVudCksXG4gICAgICBjeDogb1swXSxcbiAgICAgIGN5OiBvWzFdLFxuICAgICAgcjogcmFkaXVzIC0gd2lkdGggLyAyXG4gICAgfVxuICB9O1xufVxuXG5mdW5jdGlvbiBhcnJvdyhicnVzaCwgb3JpZywgZGVzdCwgY3VycmVudCwgYm91bmRzKSB7XG4gIHZhciBtID0gYXJyb3dNYXJnaW4oY3VycmVudCwgYm91bmRzKTtcbiAgdmFyIGEgPSBwb3MycHgob3JpZywgYm91bmRzKTtcbiAgdmFyIGIgPSBwb3MycHgoZGVzdCwgYm91bmRzKTtcbiAgdmFyIGR4ID0gYlswXSAtIGFbMF0sXG4gICAgZHkgPSBiWzFdIC0gYVsxXSxcbiAgICBhbmdsZSA9IE1hdGguYXRhbjIoZHksIGR4KTtcbiAgdmFyIHhvID0gTWF0aC5jb3MoYW5nbGUpICogbSxcbiAgICB5byA9IE1hdGguc2luKGFuZ2xlKSAqIG07XG4gIHJldHVybiB7XG4gICAgdGFnOiAnbGluZScsXG4gICAgYXR0cnM6IHtcbiAgICAgIGtleTogY3VycmVudCA/ICdjdXJyZW50JyA6IG9yaWcgKyBkZXN0ICsgYnJ1c2gua2V5LFxuICAgICAgc3Ryb2tlOiBicnVzaC5jb2xvcixcbiAgICAgICdzdHJva2Utd2lkdGgnOiBsaW5lV2lkdGgoYnJ1c2gsIGN1cnJlbnQsIGJvdW5kcyksXG4gICAgICAnc3Ryb2tlLWxpbmVjYXAnOiAncm91bmQnLFxuICAgICAgJ21hcmtlci1lbmQnOiBpc1RyaWRlbnQoKSA/IG51bGwgOiAndXJsKCNhcnJvd2hlYWQtJyArIGJydXNoLmtleSArICcpJyxcbiAgICAgIG9wYWNpdHk6IG9wYWNpdHkoYnJ1c2gsIGN1cnJlbnQpLFxuICAgICAgeDE6IGFbMF0sXG4gICAgICB5MTogYVsxXSxcbiAgICAgIHgyOiBiWzBdIC0geG8sXG4gICAgICB5MjogYlsxXSAtIHlvXG4gICAgfVxuICB9O1xufVxuXG5mdW5jdGlvbiBwaWVjZShjZmcsIHBvcywgcGllY2UsIGJvdW5kcykge1xuICB2YXIgbyA9IHBvczJweChwb3MsIGJvdW5kcyk7XG4gIHZhciBzaXplID0gYm91bmRzLndpZHRoIC8gOCAqIChwaWVjZS5zY2FsZSB8fCAxKTtcbiAgdmFyIG5hbWUgPSBwaWVjZS5jb2xvciA9PT0gJ3doaXRlJyA/ICd3JyA6ICdiJztcbiAgbmFtZSArPSAocGllY2Uucm9sZSA9PT0gJ2tuaWdodCcgPyAnbicgOiBwaWVjZS5yb2xlWzBdKS50b1VwcGVyQ2FzZSgpO1xuICB2YXIgaHJlZiA9IGNmZy5iYXNlVXJsICsgbmFtZSArICcuc3ZnJztcbiAgcmV0dXJuIHtcbiAgICB0YWc6ICdpbWFnZScsXG4gICAgYXR0cnM6IHtcbiAgICAgIGNsYXNzOiBwaWVjZS5jb2xvciArICcgJyArIHBpZWNlLnJvbGUsXG4gICAgICB4OiBvWzBdIC0gc2l6ZSAvIDIsXG4gICAgICB5OiBvWzFdIC0gc2l6ZSAvIDIsXG4gICAgICB3aWR0aDogc2l6ZSxcbiAgICAgIGhlaWdodDogc2l6ZSxcbiAgICAgIGhyZWY6IGhyZWZcbiAgICB9XG4gIH07XG59XG5cbmZ1bmN0aW9uIGRlZnMoYnJ1c2hlcykge1xuICByZXR1cm4ge1xuICAgIHRhZzogJ2RlZnMnLFxuICAgIGNoaWxkcmVuOiBbXG4gICAgICBicnVzaGVzLm1hcChmdW5jdGlvbihicnVzaCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIGtleTogYnJ1c2gua2V5LFxuICAgICAgICAgIHRhZzogJ21hcmtlcicsXG4gICAgICAgICAgYXR0cnM6IHtcbiAgICAgICAgICAgIGlkOiAnYXJyb3doZWFkLScgKyBicnVzaC5rZXksXG4gICAgICAgICAgICBvcmllbnQ6ICdhdXRvJyxcbiAgICAgICAgICAgIG1hcmtlcldpZHRoOiA0LFxuICAgICAgICAgICAgbWFya2VySGVpZ2h0OiA4LFxuICAgICAgICAgICAgcmVmWDogMi4wNSxcbiAgICAgICAgICAgIHJlZlk6IDIuMDFcbiAgICAgICAgICB9LFxuICAgICAgICAgIGNoaWxkcmVuOiBbe1xuICAgICAgICAgICAgdGFnOiAncGF0aCcsXG4gICAgICAgICAgICBhdHRyczoge1xuICAgICAgICAgICAgICBkOiAnTTAsMCBWNCBMMywyIFonLFxuICAgICAgICAgICAgICBmaWxsOiBicnVzaC5jb2xvclxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1dXG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgXVxuICB9O1xufVxuXG5mdW5jdGlvbiBvcmllbnQocG9zLCBjb2xvcikge1xuICByZXR1cm4gY29sb3IgPT09ICd3aGl0ZScgPyBwb3MgOiBbOSAtIHBvc1swXSwgOSAtIHBvc1sxXV07XG59XG5cbmZ1bmN0aW9uIHJlbmRlclNoYXBlKGRhdGEsIGN1cnJlbnQsIGJvdW5kcykge1xuICByZXR1cm4gZnVuY3Rpb24oc2hhcGUsIGkpIHtcbiAgICBpZiAoc2hhcGUucGllY2UpIHJldHVybiBwaWVjZShcbiAgICAgIGRhdGEuZHJhd2FibGUucGllY2VzLFxuICAgICAgb3JpZW50KGtleTJwb3Moc2hhcGUub3JpZyksIGRhdGEub3JpZW50YXRpb24pLFxuICAgICAgc2hhcGUucGllY2UsXG4gICAgICBib3VuZHMpO1xuICAgIGVsc2UgaWYgKHNoYXBlLmJydXNoKSB7XG4gICAgICB2YXIgYnJ1c2ggPSBzaGFwZS5icnVzaE1vZGlmaWVycyA/XG4gICAgICAgIG1ha2VDdXN0b21CcnVzaChkYXRhLmRyYXdhYmxlLmJydXNoZXNbc2hhcGUuYnJ1c2hdLCBzaGFwZS5icnVzaE1vZGlmaWVycywgaSkgOlxuICAgICAgICBkYXRhLmRyYXdhYmxlLmJydXNoZXNbc2hhcGUuYnJ1c2hdO1xuICAgICAgdmFyIG9yaWcgPSBvcmllbnQoa2V5MnBvcyhzaGFwZS5vcmlnKSwgZGF0YS5vcmllbnRhdGlvbik7XG4gICAgICBpZiAoc2hhcGUub3JpZyAmJiBzaGFwZS5kZXN0KSByZXR1cm4gYXJyb3coXG4gICAgICAgIGJydXNoLFxuICAgICAgICBvcmlnLFxuICAgICAgICBvcmllbnQoa2V5MnBvcyhzaGFwZS5kZXN0KSwgZGF0YS5vcmllbnRhdGlvbiksXG4gICAgICAgIGN1cnJlbnQsIGJvdW5kcyk7XG4gICAgICBlbHNlIGlmIChzaGFwZS5vcmlnKSByZXR1cm4gY2lyY2xlKFxuICAgICAgICBicnVzaCxcbiAgICAgICAgb3JpZyxcbiAgICAgICAgY3VycmVudCwgYm91bmRzKTtcbiAgICB9XG4gIH07XG59XG5cbmZ1bmN0aW9uIG1ha2VDdXN0b21CcnVzaChiYXNlLCBtb2RpZmllcnMsIGkpIHtcbiAgcmV0dXJuIHtcbiAgICBrZXk6ICdibScgKyBpLFxuICAgIGNvbG9yOiBtb2RpZmllcnMuY29sb3IgfHwgYmFzZS5jb2xvcixcbiAgICBvcGFjaXR5OiBtb2RpZmllcnMub3BhY2l0eSB8fCBiYXNlLm9wYWNpdHksXG4gICAgbGluZVdpZHRoOiBtb2RpZmllcnMubGluZVdpZHRoIHx8IGJhc2UubGluZVdpZHRoXG4gIH07XG59XG5cbmZ1bmN0aW9uIGNvbXB1dGVVc2VkQnJ1c2hlcyhkLCBkcmF3biwgY3VycmVudCkge1xuICB2YXIgYnJ1c2hlcyA9IFtdO1xuICB2YXIga2V5cyA9IFtdO1xuICB2YXIgc2hhcGVzID0gKGN1cnJlbnQgJiYgY3VycmVudC5kZXN0KSA/IGRyYXduLmNvbmNhdChjdXJyZW50KSA6IGRyYXduO1xuICBmb3IgKHZhciBpIGluIHNoYXBlcykge1xuICAgIHZhciBzaGFwZSA9IHNoYXBlc1tpXTtcbiAgICBpZiAoIXNoYXBlLmRlc3QpIGNvbnRpbnVlO1xuICAgIHZhciBicnVzaEtleSA9IHNoYXBlLmJydXNoO1xuICAgIGlmIChzaGFwZS5icnVzaE1vZGlmaWVycylcbiAgICAgIGJydXNoZXMucHVzaChtYWtlQ3VzdG9tQnJ1c2goZC5icnVzaGVzW2JydXNoS2V5XSwgc2hhcGUuYnJ1c2hNb2RpZmllcnMsIGkpKTtcbiAgICBlbHNlIHtcbiAgICAgIGlmIChrZXlzLmluZGV4T2YoYnJ1c2hLZXkpID09PSAtMSkge1xuICAgICAgICBicnVzaGVzLnB1c2goZC5icnVzaGVzW2JydXNoS2V5XSk7XG4gICAgICAgIGtleXMucHVzaChicnVzaEtleSk7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIHJldHVybiBicnVzaGVzO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGN0cmwpIHtcbiAgaWYgKCFjdHJsLmRhdGEuYm91bmRzKSByZXR1cm47XG4gIHZhciBkID0gY3RybC5kYXRhLmRyYXdhYmxlO1xuICB2YXIgYWxsU2hhcGVzID0gZC5zaGFwZXMuY29uY2F0KGQuYXV0b1NoYXBlcyk7XG4gIGlmICghYWxsU2hhcGVzLmxlbmd0aCAmJiAhZC5jdXJyZW50Lm9yaWcpIHJldHVybjtcbiAgdmFyIGJvdW5kcyA9IGN0cmwuZGF0YS5ib3VuZHMoKTtcbiAgaWYgKGJvdW5kcy53aWR0aCAhPT0gYm91bmRzLmhlaWdodCkgcmV0dXJuO1xuICB2YXIgdXNlZEJydXNoZXMgPSBjb21wdXRlVXNlZEJydXNoZXMoZCwgYWxsU2hhcGVzLCBkLmN1cnJlbnQpO1xuICByZXR1cm4ge1xuICAgIHRhZzogJ3N2ZycsXG4gICAgYXR0cnM6IHtcbiAgICAgIGtleTogJ3N2ZydcbiAgICB9LFxuICAgIGNoaWxkcmVuOiBbXG4gICAgICBkZWZzKHVzZWRCcnVzaGVzKSxcbiAgICAgIGFsbFNoYXBlcy5tYXAocmVuZGVyU2hhcGUoY3RybC5kYXRhLCBmYWxzZSwgYm91bmRzKSksXG4gICAgICByZW5kZXJTaGFwZShjdHJsLmRhdGEsIHRydWUsIGJvdW5kcykoZC5jdXJyZW50LCA5OTk5KVxuICAgIF1cbiAgfTtcbn1cbiIsInZhciBmaWxlcyA9IFwiYWJjZGVmZ2hcIi5zcGxpdCgnJyk7XG52YXIgcmFua3MgPSBbMSwgMiwgMywgNCwgNSwgNiwgNywgOF07XG52YXIgaW52UmFua3MgPSBbOCwgNywgNiwgNSwgNCwgMywgMiwgMV07XG52YXIgZmlsZU51bWJlcnMgPSB7XG4gIGE6IDEsXG4gIGI6IDIsXG4gIGM6IDMsXG4gIGQ6IDQsXG4gIGU6IDUsXG4gIGY6IDYsXG4gIGc6IDcsXG4gIGg6IDhcbn07XG5cbmZ1bmN0aW9uIHBvczJrZXkocG9zKSB7XG4gIHJldHVybiBmaWxlc1twb3NbMF0gLSAxXSArIHBvc1sxXTtcbn1cblxuZnVuY3Rpb24ga2V5MnBvcyhwb3MpIHtcbiAgcmV0dXJuIFtmaWxlTnVtYmVyc1twb3NbMF1dLCBwYXJzZUludChwb3NbMV0pXTtcbn1cblxuZnVuY3Rpb24gaW52ZXJ0S2V5KGtleSkge1xuICByZXR1cm4gZmlsZXNbOCAtIGZpbGVOdW1iZXJzW2tleVswXV1dICsgKDkgLSBwYXJzZUludChrZXlbMV0pKTtcbn1cblxudmFyIGFsbFBvcyA9IChmdW5jdGlvbigpIHtcbiAgdmFyIHBzID0gW107XG4gIGludlJhbmtzLmZvckVhY2goZnVuY3Rpb24oeSkge1xuICAgIHJhbmtzLmZvckVhY2goZnVuY3Rpb24oeCkge1xuICAgICAgcHMucHVzaChbeCwgeV0pO1xuICAgIH0pO1xuICB9KTtcbiAgcmV0dXJuIHBzO1xufSkoKTtcbnZhciBhbGxLZXlzID0gYWxsUG9zLm1hcChwb3Mya2V5KTtcbnZhciBpbnZLZXlzID0gYWxsS2V5cy5zbGljZSgwKS5yZXZlcnNlKCk7XG5cbmZ1bmN0aW9uIGNsYXNzU2V0KGNsYXNzZXMpIHtcbiAgdmFyIGFyciA9IFtdO1xuICBmb3IgKHZhciBpIGluIGNsYXNzZXMpIHtcbiAgICBpZiAoY2xhc3Nlc1tpXSkgYXJyLnB1c2goaSk7XG4gIH1cbiAgcmV0dXJuIGFyci5qb2luKCcgJyk7XG59XG5cbmZ1bmN0aW9uIG9wcG9zaXRlKGNvbG9yKSB7XG4gIHJldHVybiBjb2xvciA9PT0gJ3doaXRlJyA/ICdibGFjaycgOiAnd2hpdGUnO1xufVxuXG5mdW5jdGlvbiBjb250YWluc1goeHMsIHgpIHtcbiAgcmV0dXJuIHhzICYmIHhzLmluZGV4T2YoeCkgIT09IC0xO1xufVxuXG5mdW5jdGlvbiBkaXN0YW5jZShwb3MxLCBwb3MyKSB7XG4gIHJldHVybiBNYXRoLnNxcnQoTWF0aC5wb3cocG9zMVswXSAtIHBvczJbMF0sIDIpICsgTWF0aC5wb3cocG9zMVsxXSAtIHBvczJbMV0sIDIpKTtcbn1cblxuLy8gdGhpcyBtdXN0IGJlIGNhY2hlZCBiZWNhdXNlIG9mIHRoZSBhY2Nlc3MgdG8gZG9jdW1lbnQuYm9keS5zdHlsZVxudmFyIGNhY2hlZFRyYW5zZm9ybVByb3A7XG5cbmZ1bmN0aW9uIGNvbXB1dGVUcmFuc2Zvcm1Qcm9wKCkge1xuICByZXR1cm4gJ3RyYW5zZm9ybScgaW4gZG9jdW1lbnQuYm9keS5zdHlsZSA/XG4gICAgJ3RyYW5zZm9ybScgOiAnd2Via2l0VHJhbnNmb3JtJyBpbiBkb2N1bWVudC5ib2R5LnN0eWxlID9cbiAgICAnd2Via2l0VHJhbnNmb3JtJyA6ICdtb3pUcmFuc2Zvcm0nIGluIGRvY3VtZW50LmJvZHkuc3R5bGUgP1xuICAgICdtb3pUcmFuc2Zvcm0nIDogJ29UcmFuc2Zvcm0nIGluIGRvY3VtZW50LmJvZHkuc3R5bGUgP1xuICAgICdvVHJhbnNmb3JtJyA6ICdtc1RyYW5zZm9ybSc7XG59XG5cbmZ1bmN0aW9uIHRyYW5zZm9ybVByb3AoKSB7XG4gIGlmICghY2FjaGVkVHJhbnNmb3JtUHJvcCkgY2FjaGVkVHJhbnNmb3JtUHJvcCA9IGNvbXB1dGVUcmFuc2Zvcm1Qcm9wKCk7XG4gIHJldHVybiBjYWNoZWRUcmFuc2Zvcm1Qcm9wO1xufVxuXG52YXIgY2FjaGVkSXNUcmlkZW50ID0gbnVsbDtcblxuZnVuY3Rpb24gaXNUcmlkZW50KCkge1xuICBpZiAoY2FjaGVkSXNUcmlkZW50ID09PSBudWxsKVxuICAgIGNhY2hlZElzVHJpZGVudCA9IHdpbmRvdy5uYXZpZ2F0b3IudXNlckFnZW50LmluZGV4T2YoJ1RyaWRlbnQvJykgPiAtMTtcbiAgcmV0dXJuIGNhY2hlZElzVHJpZGVudDtcbn1cblxuZnVuY3Rpb24gdHJhbnNsYXRlKHBvcykge1xuICByZXR1cm4gJ3RyYW5zbGF0ZSgnICsgcG9zWzBdICsgJ3B4LCcgKyBwb3NbMV0gKyAncHgpJztcbn1cblxuZnVuY3Rpb24gZXZlbnRQb3NpdGlvbihlKSB7XG4gIGlmIChlLmNsaWVudFggfHwgZS5jbGllbnRYID09PSAwKSByZXR1cm4gW2UuY2xpZW50WCwgZS5jbGllbnRZXTtcbiAgaWYgKGUudG91Y2hlcyAmJiBlLnRhcmdldFRvdWNoZXNbMF0pIHJldHVybiBbZS50YXJnZXRUb3VjaGVzWzBdLmNsaWVudFgsIGUudGFyZ2V0VG91Y2hlc1swXS5jbGllbnRZXTtcbn1cblxuZnVuY3Rpb24gcGFydGlhbEFwcGx5KGZuLCBhcmdzKSB7XG4gIHJldHVybiBmbi5iaW5kLmFwcGx5KGZuLCBbbnVsbF0uY29uY2F0KGFyZ3MpKTtcbn1cblxuZnVuY3Rpb24gcGFydGlhbCgpIHtcbiAgcmV0dXJuIHBhcnRpYWxBcHBseShhcmd1bWVudHNbMF0sIEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMSkpO1xufVxuXG5mdW5jdGlvbiBpc1JpZ2h0QnV0dG9uKGUpIHtcbiAgcmV0dXJuIGUuYnV0dG9ucyA9PT0gMiB8fCBlLmJ1dHRvbiA9PT0gMjtcbn1cblxuZnVuY3Rpb24gbWVtbyhmKSB7XG4gIHZhciB2LCByZXQgPSBmdW5jdGlvbigpIHtcbiAgICBpZiAodiA9PT0gdW5kZWZpbmVkKSB2ID0gZigpO1xuICAgIHJldHVybiB2O1xuICB9O1xuICByZXQuY2xlYXIgPSBmdW5jdGlvbigpIHtcbiAgICB2ID0gdW5kZWZpbmVkO1xuICB9XG4gIHJldHVybiByZXQ7XG59XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBmaWxlczogZmlsZXMsXG4gIHJhbmtzOiByYW5rcyxcbiAgaW52UmFua3M6IGludlJhbmtzLFxuICBhbGxQb3M6IGFsbFBvcyxcbiAgYWxsS2V5czogYWxsS2V5cyxcbiAgaW52S2V5czogaW52S2V5cyxcbiAgcG9zMmtleTogcG9zMmtleSxcbiAga2V5MnBvczoga2V5MnBvcyxcbiAgaW52ZXJ0S2V5OiBpbnZlcnRLZXksXG4gIGNsYXNzU2V0OiBjbGFzc1NldCxcbiAgb3Bwb3NpdGU6IG9wcG9zaXRlLFxuICB0cmFuc2xhdGU6IHRyYW5zbGF0ZSxcbiAgY29udGFpbnNYOiBjb250YWluc1gsXG4gIGRpc3RhbmNlOiBkaXN0YW5jZSxcbiAgZXZlbnRQb3NpdGlvbjogZXZlbnRQb3NpdGlvbixcbiAgcGFydGlhbEFwcGx5OiBwYXJ0aWFsQXBwbHksXG4gIHBhcnRpYWw6IHBhcnRpYWwsXG4gIHRyYW5zZm9ybVByb3A6IHRyYW5zZm9ybVByb3AsXG4gIGlzVHJpZGVudDogaXNUcmlkZW50LFxuICByZXF1ZXN0QW5pbWF0aW9uRnJhbWU6ICh3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lIHx8IHdpbmRvdy5zZXRUaW1lb3V0KS5iaW5kKHdpbmRvdyksXG4gIGlzUmlnaHRCdXR0b246IGlzUmlnaHRCdXR0b24sXG4gIG1lbW86IG1lbW9cbn07XG4iLCJ2YXIgZHJhZyA9IHJlcXVpcmUoJy4vZHJhZycpO1xudmFyIGRyYXcgPSByZXF1aXJlKCcuL2RyYXcnKTtcbnZhciB1dGlsID0gcmVxdWlyZSgnLi91dGlsJyk7XG52YXIgc3ZnID0gcmVxdWlyZSgnLi9zdmcnKTtcbnZhciBtYWtlQ29vcmRzID0gcmVxdWlyZSgnLi9jb29yZHMnKTtcbnZhciBtID0gcmVxdWlyZSgnbWl0aHJpbCcpO1xuXG52YXIgcGllY2VUYWcgPSAncGllY2UnO1xudmFyIHNxdWFyZVRhZyA9ICdzcXVhcmUnO1xuXG5mdW5jdGlvbiBwaWVjZUNsYXNzKHApIHtcbiAgcmV0dXJuIHAucm9sZSArICcgJyArIHAuY29sb3I7XG59XG5cbmZ1bmN0aW9uIHJlbmRlclBpZWNlKGQsIGtleSwgY3R4KSB7XG4gIHZhciBhdHRycyA9IHtcbiAgICBrZXk6ICdwJyArIGtleSxcbiAgICBzdHlsZToge30sXG4gICAgY2xhc3M6IHBpZWNlQ2xhc3MoZC5waWVjZXNba2V5XSlcbiAgfTtcbiAgdmFyIHRyYW5zbGF0ZSA9IHBvc1RvVHJhbnNsYXRlKHV0aWwua2V5MnBvcyhrZXkpLCBjdHgpO1xuICB2YXIgZHJhZ2dhYmxlID0gZC5kcmFnZ2FibGUuY3VycmVudDtcbiAgaWYgKGRyYWdnYWJsZS5vcmlnID09PSBrZXkgJiYgZHJhZ2dhYmxlLnN0YXJ0ZWQpIHtcbiAgICB0cmFuc2xhdGVbMF0gKz0gZHJhZ2dhYmxlLnBvc1swXSArIGRyYWdnYWJsZS5kZWNbMF07XG4gICAgdHJhbnNsYXRlWzFdICs9IGRyYWdnYWJsZS5wb3NbMV0gKyBkcmFnZ2FibGUuZGVjWzFdO1xuICAgIGF0dHJzLmNsYXNzICs9ICcgZHJhZ2dpbmcnO1xuICB9IGVsc2UgaWYgKGQuYW5pbWF0aW9uLmN1cnJlbnQuYW5pbXMpIHtcbiAgICB2YXIgYW5pbWF0aW9uID0gZC5hbmltYXRpb24uY3VycmVudC5hbmltc1trZXldO1xuICAgIGlmIChhbmltYXRpb24pIHtcbiAgICAgIHRyYW5zbGF0ZVswXSArPSBhbmltYXRpb25bMV1bMF07XG4gICAgICB0cmFuc2xhdGVbMV0gKz0gYW5pbWF0aW9uWzFdWzFdO1xuICAgIH1cbiAgfVxuICBhdHRycy5zdHlsZVtjdHgudHJhbnNmb3JtUHJvcF0gPSB1dGlsLnRyYW5zbGF0ZSh0cmFuc2xhdGUpO1xuICBpZiAoZC5waWVjZUtleSkgYXR0cnNbJ2RhdGEta2V5J10gPSBrZXk7XG4gIHJldHVybiB7XG4gICAgdGFnOiBwaWVjZVRhZyxcbiAgICBhdHRyczogYXR0cnNcbiAgfTtcbn1cblxuZnVuY3Rpb24gcmVuZGVyU3F1YXJlKGtleSwgY2xhc3NlcywgY3R4KSB7XG4gIHZhciBhdHRycyA9IHtcbiAgICBrZXk6ICdzJyArIGtleSxcbiAgICBjbGFzczogY2xhc3NlcyxcbiAgICBzdHlsZToge31cbiAgfTtcbiAgYXR0cnMuc3R5bGVbY3R4LnRyYW5zZm9ybVByb3BdID0gdXRpbC50cmFuc2xhdGUocG9zVG9UcmFuc2xhdGUodXRpbC5rZXkycG9zKGtleSksIGN0eCkpO1xuICByZXR1cm4ge1xuICAgIHRhZzogc3F1YXJlVGFnLFxuICAgIGF0dHJzOiBhdHRyc1xuICB9O1xufVxuXG5mdW5jdGlvbiBwb3NUb1RyYW5zbGF0ZShwb3MsIGN0eCkge1xuICByZXR1cm4gW1xuICAgIChjdHguYXNXaGl0ZSA/IHBvc1swXSAtIDEgOiA4IC0gcG9zWzBdKSAqIGN0eC5ib3VuZHMud2lkdGggLyA4LCAoY3R4LmFzV2hpdGUgPyA4IC0gcG9zWzFdIDogcG9zWzFdIC0gMSkgKiBjdHguYm91bmRzLmhlaWdodCAvIDhcbiAgXTtcbn1cblxuZnVuY3Rpb24gcmVuZGVyR2hvc3Qoa2V5LCBwaWVjZSwgY3R4KSB7XG4gIGlmICghcGllY2UpIHJldHVybjtcbiAgdmFyIGF0dHJzID0ge1xuICAgIGtleTogJ2cnICsga2V5LFxuICAgIHN0eWxlOiB7fSxcbiAgICBjbGFzczogcGllY2VDbGFzcyhwaWVjZSkgKyAnIGdob3N0J1xuICB9O1xuICBhdHRycy5zdHlsZVtjdHgudHJhbnNmb3JtUHJvcF0gPSB1dGlsLnRyYW5zbGF0ZShwb3NUb1RyYW5zbGF0ZSh1dGlsLmtleTJwb3Moa2V5KSwgY3R4KSk7XG4gIHJldHVybiB7XG4gICAgdGFnOiBwaWVjZVRhZyxcbiAgICBhdHRyczogYXR0cnNcbiAgfTtcbn1cblxuZnVuY3Rpb24gcmVuZGVyRmFkaW5nKGNmZywgY3R4KSB7XG4gIHZhciBhdHRycyA9IHtcbiAgICBrZXk6ICdmJyArIGNmZy5waWVjZS5rZXksXG4gICAgY2xhc3M6ICdmYWRpbmcgJyArIHBpZWNlQ2xhc3MoY2ZnLnBpZWNlKSxcbiAgICBzdHlsZToge1xuICAgICAgb3BhY2l0eTogY2ZnLm9wYWNpdHlcbiAgICB9XG4gIH07XG4gIGF0dHJzLnN0eWxlW2N0eC50cmFuc2Zvcm1Qcm9wXSA9IHV0aWwudHJhbnNsYXRlKHBvc1RvVHJhbnNsYXRlKGNmZy5waWVjZS5wb3MsIGN0eCkpO1xuICByZXR1cm4ge1xuICAgIHRhZzogcGllY2VUYWcsXG4gICAgYXR0cnM6IGF0dHJzXG4gIH07XG59XG5cbmZ1bmN0aW9uIGFkZFNxdWFyZShzcXVhcmVzLCBrZXksIGtsYXNzKSB7XG4gIGlmIChzcXVhcmVzW2tleV0pIHNxdWFyZXNba2V5XS5wdXNoKGtsYXNzKTtcbiAgZWxzZSBzcXVhcmVzW2tleV0gPSBba2xhc3NdO1xufVxuXG5mdW5jdGlvbiByZW5kZXJTcXVhcmVzKGN0cmwsIGN0eCkge1xuICB2YXIgZCA9IGN0cmwuZGF0YTtcbiAgdmFyIHNxdWFyZXMgPSB7fTtcbiAgaWYgKGQubGFzdE1vdmUgJiYgZC5oaWdobGlnaHQubGFzdE1vdmUpIGQubGFzdE1vdmUuZm9yRWFjaChmdW5jdGlvbihrKSB7XG4gICAgYWRkU3F1YXJlKHNxdWFyZXMsIGssICdsYXN0LW1vdmUnKTtcbiAgfSk7XG4gIGlmIChkLmNoZWNrICYmIGQuaGlnaGxpZ2h0LmNoZWNrKSBhZGRTcXVhcmUoc3F1YXJlcywgZC5jaGVjaywgJ2NoZWNrJyk7XG4gIGlmIChkLnNlbGVjdGVkKSB7XG4gICAgYWRkU3F1YXJlKHNxdWFyZXMsIGQuc2VsZWN0ZWQsICdzZWxlY3RlZCcpO1xuICAgIHZhciBvdmVyID0gZC5kcmFnZ2FibGUuY3VycmVudC5vdmVyO1xuICAgIHZhciBkZXN0cyA9IGQubW92YWJsZS5kZXN0c1tkLnNlbGVjdGVkXTtcbiAgICBpZiAoZGVzdHMpIGRlc3RzLmZvckVhY2goZnVuY3Rpb24oaykge1xuICAgICAgaWYgKGsgPT09IG92ZXIpIGFkZFNxdWFyZShzcXVhcmVzLCBrLCAnbW92ZS1kZXN0IGRyYWctb3ZlcicpO1xuICAgICAgZWxzZSBpZiAoZC5tb3ZhYmxlLnNob3dEZXN0cykgYWRkU3F1YXJlKHNxdWFyZXMsIGssICdtb3ZlLWRlc3QnICsgKGQucGllY2VzW2tdID8gJyBvYycgOiAnJykpO1xuICAgIH0pO1xuICAgIHZhciBwRGVzdHMgPSBkLnByZW1vdmFibGUuZGVzdHM7XG4gICAgaWYgKHBEZXN0cykgcERlc3RzLmZvckVhY2goZnVuY3Rpb24oaykge1xuICAgICAgaWYgKGsgPT09IG92ZXIpIGFkZFNxdWFyZShzcXVhcmVzLCBrLCAncHJlbW92ZS1kZXN0IGRyYWctb3ZlcicpO1xuICAgICAgZWxzZSBpZiAoZC5tb3ZhYmxlLnNob3dEZXN0cykgYWRkU3F1YXJlKHNxdWFyZXMsIGssICdwcmVtb3ZlLWRlc3QnICsgKGQucGllY2VzW2tdID8gJyBvYycgOiAnJykpO1xuICAgIH0pO1xuICB9XG4gIHZhciBwcmVtb3ZlID0gZC5wcmVtb3ZhYmxlLmN1cnJlbnQ7XG4gIGlmIChwcmVtb3ZlKSBwcmVtb3ZlLmZvckVhY2goZnVuY3Rpb24oaykge1xuICAgIGFkZFNxdWFyZShzcXVhcmVzLCBrLCAnY3VycmVudC1wcmVtb3ZlJyk7XG4gIH0pO1xuICBlbHNlIGlmIChkLnByZWRyb3BwYWJsZS5jdXJyZW50LmtleSlcbiAgICBhZGRTcXVhcmUoc3F1YXJlcywgZC5wcmVkcm9wcGFibGUuY3VycmVudC5rZXksICdjdXJyZW50LXByZW1vdmUnKTtcblxuICBpZiAoY3RybC52bS5leHBsb2RpbmcpIGN0cmwudm0uZXhwbG9kaW5nLmtleXMuZm9yRWFjaChmdW5jdGlvbihrKSB7XG4gICAgYWRkU3F1YXJlKHNxdWFyZXMsIGssICdleHBsb2RpbmcnICsgY3RybC52bS5leHBsb2Rpbmcuc3RhZ2UpO1xuICB9KTtcblxuICB2YXIgZG9tID0gW107XG4gIGlmIChkLml0ZW1zKSB7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCA2NDsgaSsrKSB7XG4gICAgICB2YXIga2V5ID0gdXRpbC5hbGxLZXlzW2ldO1xuICAgICAgdmFyIHNxdWFyZSA9IHNxdWFyZXNba2V5XTtcbiAgICAgIHZhciBpdGVtID0gZC5pdGVtcy5yZW5kZXIodXRpbC5rZXkycG9zKGtleSksIGtleSk7XG4gICAgICBpZiAoc3F1YXJlIHx8IGl0ZW0pIHtcbiAgICAgICAgdmFyIHNxID0gcmVuZGVyU3F1YXJlKGtleSwgc3F1YXJlID8gc3F1YXJlLmpvaW4oJyAnKSArIChpdGVtID8gJyBoYXMtaXRlbScgOiAnJykgOiAnaGFzLWl0ZW0nLCBjdHgpO1xuICAgICAgICBpZiAoaXRlbSkgc3EuY2hpbGRyZW4gPSBbaXRlbV07XG4gICAgICAgIGRvbS5wdXNoKHNxKTtcbiAgICAgIH1cbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgZm9yICh2YXIga2V5IGluIHNxdWFyZXMpXG4gICAgICBkb20ucHVzaChyZW5kZXJTcXVhcmUoa2V5LCBzcXVhcmVzW2tleV0uam9pbignICcpLCBjdHgpKTtcbiAgfVxuICByZXR1cm4gZG9tO1xufVxuXG5mdW5jdGlvbiByZW5kZXJDb250ZW50KGN0cmwpIHtcbiAgdmFyIGQgPSBjdHJsLmRhdGE7XG4gIGlmICghZC5ib3VuZHMpIHJldHVybjtcbiAgdmFyIGN0eCA9IHtcbiAgICBhc1doaXRlOiBkLm9yaWVudGF0aW9uID09PSAnd2hpdGUnLFxuICAgIGJvdW5kczogZC5ib3VuZHMoKSxcbiAgICB0cmFuc2Zvcm1Qcm9wOiB1dGlsLnRyYW5zZm9ybVByb3AoKVxuICB9O1xuICB2YXIgY2hpbGRyZW4gPSByZW5kZXJTcXVhcmVzKGN0cmwsIGN0eCk7XG4gIGlmIChkLmFuaW1hdGlvbi5jdXJyZW50LmZhZGluZ3MpXG4gICAgZC5hbmltYXRpb24uY3VycmVudC5mYWRpbmdzLmZvckVhY2goZnVuY3Rpb24ocCkge1xuICAgICAgY2hpbGRyZW4ucHVzaChyZW5kZXJGYWRpbmcocCwgY3R4KSk7XG4gICAgfSk7XG5cbiAgLy8gbXVzdCBpbnNlcnQgcGllY2VzIGluIHRoZSByaWdodCBvcmRlclxuICAvLyBmb3IgM0QgdG8gZGlzcGxheSBjb3JyZWN0bHlcbiAgdmFyIGtleXMgPSBjdHguYXNXaGl0ZSA/IHV0aWwuYWxsS2V5cyA6IHV0aWwuaW52S2V5cztcbiAgaWYgKGQuaXRlbXMpXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCA2NDsgaSsrKSB7XG4gICAgICBpZiAoZC5waWVjZXNba2V5c1tpXV0gJiYgIWQuaXRlbXMucmVuZGVyKHV0aWwua2V5MnBvcyhrZXlzW2ldKSwga2V5c1tpXSkpXG4gICAgICAgIGNoaWxkcmVuLnB1c2gocmVuZGVyUGllY2UoZCwga2V5c1tpXSwgY3R4KSk7XG4gICAgfSBlbHNlXG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IDY0OyBpKyspIHtcbiAgICAgICAgaWYgKGQucGllY2VzW2tleXNbaV1dKSBjaGlsZHJlbi5wdXNoKHJlbmRlclBpZWNlKGQsIGtleXNbaV0sIGN0eCkpO1xuICAgICAgfVxuXG4gIGlmIChkLmRyYWdnYWJsZS5zaG93R2hvc3QpIHtcbiAgICB2YXIgZHJhZ09yaWcgPSBkLmRyYWdnYWJsZS5jdXJyZW50Lm9yaWc7XG4gICAgaWYgKGRyYWdPcmlnICYmICFkLmRyYWdnYWJsZS5jdXJyZW50Lm5ld1BpZWNlKVxuICAgICAgY2hpbGRyZW4ucHVzaChyZW5kZXJHaG9zdChkcmFnT3JpZywgZC5waWVjZXNbZHJhZ09yaWddLCBjdHgpKTtcbiAgfVxuICBpZiAoZC5kcmF3YWJsZS5lbmFibGVkKSBjaGlsZHJlbi5wdXNoKHN2ZyhjdHJsKSk7XG4gIHJldHVybiBjaGlsZHJlbjtcbn1cblxuZnVuY3Rpb24gc3RhcnREcmFnT3JEcmF3KGQpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKGUpIHtcbiAgICBpZiAodXRpbC5pc1JpZ2h0QnV0dG9uKGUpICYmIGQuZHJhZ2dhYmxlLmN1cnJlbnQub3JpZykge1xuICAgICAgaWYgKGQuZHJhZ2dhYmxlLmN1cnJlbnQubmV3UGllY2UpIGRlbGV0ZSBkLnBpZWNlc1tkLmRyYWdnYWJsZS5jdXJyZW50Lm9yaWddO1xuICAgICAgZC5kcmFnZ2FibGUuY3VycmVudCA9IHt9XG4gICAgICBkLnNlbGVjdGVkID0gbnVsbDtcbiAgICB9IGVsc2UgaWYgKChlLnNoaWZ0S2V5IHx8IHV0aWwuaXNSaWdodEJ1dHRvbihlKSkgJiYgZC5kcmF3YWJsZS5lbmFibGVkKSBkcmF3LnN0YXJ0KGQsIGUpO1xuICAgIGVsc2UgZHJhZy5zdGFydChkLCBlKTtcbiAgfTtcbn1cblxuZnVuY3Rpb24gZHJhZ09yRHJhdyhkLCB3aXRoRHJhZywgd2l0aERyYXcpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKGUpIHtcbiAgICBpZiAoKGUuc2hpZnRLZXkgfHwgdXRpbC5pc1JpZ2h0QnV0dG9uKGUpKSAmJiBkLmRyYXdhYmxlLmVuYWJsZWQpIHdpdGhEcmF3KGQsIGUpO1xuICAgIGVsc2UgaWYgKCFkLnZpZXdPbmx5KSB3aXRoRHJhZyhkLCBlKTtcbiAgfTtcbn1cblxuZnVuY3Rpb24gYmluZEV2ZW50cyhjdHJsLCBlbCwgY29udGV4dCkge1xuICB2YXIgZCA9IGN0cmwuZGF0YTtcbiAgdmFyIG9uc3RhcnQgPSBzdGFydERyYWdPckRyYXcoZCk7XG4gIHZhciBvbm1vdmUgPSBkcmFnT3JEcmF3KGQsIGRyYWcubW92ZSwgZHJhdy5tb3ZlKTtcbiAgdmFyIG9uZW5kID0gZHJhZ09yRHJhdyhkLCBkcmFnLmVuZCwgZHJhdy5lbmQpO1xuICB2YXIgc3RhcnRFdmVudHMgPSBbJ3RvdWNoc3RhcnQnLCAnbW91c2Vkb3duJ107XG4gIHZhciBtb3ZlRXZlbnRzID0gWyd0b3VjaG1vdmUnLCAnbW91c2Vtb3ZlJ107XG4gIHZhciBlbmRFdmVudHMgPSBbJ3RvdWNoZW5kJywgJ21vdXNldXAnXTtcbiAgc3RhcnRFdmVudHMuZm9yRWFjaChmdW5jdGlvbihldikge1xuICAgIGVsLmFkZEV2ZW50TGlzdGVuZXIoZXYsIG9uc3RhcnQpO1xuICB9KTtcbiAgbW92ZUV2ZW50cy5mb3JFYWNoKGZ1bmN0aW9uKGV2KSB7XG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihldiwgb25tb3ZlKTtcbiAgfSk7XG4gIGVuZEV2ZW50cy5mb3JFYWNoKGZ1bmN0aW9uKGV2KSB7XG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihldiwgb25lbmQpO1xuICB9KTtcbiAgY29udGV4dC5vbnVubG9hZCA9IGZ1bmN0aW9uKCkge1xuICAgIHN0YXJ0RXZlbnRzLmZvckVhY2goZnVuY3Rpb24oZXYpIHtcbiAgICAgIGVsLnJlbW92ZUV2ZW50TGlzdGVuZXIoZXYsIG9uc3RhcnQpO1xuICAgIH0pO1xuICAgIG1vdmVFdmVudHMuZm9yRWFjaChmdW5jdGlvbihldikge1xuICAgICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihldiwgb25tb3ZlKTtcbiAgICB9KTtcbiAgICBlbmRFdmVudHMuZm9yRWFjaChmdW5jdGlvbihldikge1xuICAgICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihldiwgb25lbmQpO1xuICAgIH0pO1xuICB9O1xufVxuXG5mdW5jdGlvbiByZW5kZXJCb2FyZChjdHJsKSB7XG4gIHZhciBkID0gY3RybC5kYXRhO1xuICByZXR1cm4ge1xuICAgIHRhZzogJ2RpdicsXG4gICAgYXR0cnM6IHtcbiAgICAgIGNsYXNzOiAnY2ctYm9hcmQgb3JpZW50YXRpb24tJyArIGQub3JpZW50YXRpb24sXG4gICAgICBjb25maWc6IGZ1bmN0aW9uKGVsLCBpc1VwZGF0ZSwgY29udGV4dCkge1xuICAgICAgICBpZiAoaXNVcGRhdGUpIHJldHVybjtcbiAgICAgICAgaWYgKCFkLnZpZXdPbmx5IHx8IGQuZHJhd2FibGUuZW5hYmxlZClcbiAgICAgICAgICBiaW5kRXZlbnRzKGN0cmwsIGVsLCBjb250ZXh0KTtcbiAgICAgICAgLy8gdGhpcyBmdW5jdGlvbiBvbmx5IHJlcGFpbnRzIHRoZSBib2FyZCBpdHNlbGYuXG4gICAgICAgIC8vIGl0J3MgY2FsbGVkIHdoZW4gZHJhZ2dpbmcgb3IgYW5pbWF0aW5nIHBpZWNlcyxcbiAgICAgICAgLy8gdG8gcHJldmVudCB0aGUgZnVsbCBhcHBsaWNhdGlvbiBlbWJlZGRpbmcgY2hlc3Nncm91bmRcbiAgICAgICAgLy8gcmVuZGVyaW5nIG9uIGV2ZXJ5IGFuaW1hdGlvbiBmcmFtZVxuICAgICAgICBkLnJlbmRlciA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIG0ucmVuZGVyKGVsLCByZW5kZXJDb250ZW50KGN0cmwpKTtcbiAgICAgICAgfTtcbiAgICAgICAgZC5yZW5kZXJSQUYgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICB1dGlsLnJlcXVlc3RBbmltYXRpb25GcmFtZShkLnJlbmRlcik7XG4gICAgICAgIH07XG4gICAgICAgIGQuYm91bmRzID0gdXRpbC5tZW1vKGVsLmdldEJvdW5kaW5nQ2xpZW50UmVjdC5iaW5kKGVsKSk7XG4gICAgICAgIGQuZWxlbWVudCA9IGVsO1xuICAgICAgICBkLnJlbmRlcigpO1xuICAgICAgfVxuICAgIH0sXG4gICAgY2hpbGRyZW46IFtdXG4gIH07XG59XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oY3RybCkge1xuICB2YXIgZCA9IGN0cmwuZGF0YTtcbiAgcmV0dXJuIHtcbiAgICB0YWc6ICdkaXYnLFxuICAgIGF0dHJzOiB7XG4gICAgICBjb25maWc6IGZ1bmN0aW9uKGVsLCBpc1VwZGF0ZSkge1xuICAgICAgICBpZiAoaXNVcGRhdGUpIHtcbiAgICAgICAgICBpZiAoZC5yZWRyYXdDb29yZHMpIGQucmVkcmF3Q29vcmRzKGQub3JpZW50YXRpb24pO1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBpZiAoZC5jb29yZGluYXRlcykgZC5yZWRyYXdDb29yZHMgPSBtYWtlQ29vcmRzKGQub3JpZW50YXRpb24sIGVsKTtcbiAgICAgICAgZWwuYWRkRXZlbnRMaXN0ZW5lcignY29udGV4dG1lbnUnLCBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgaWYgKGQuZGlzYWJsZUNvbnRleHRNZW51IHx8IGQuZHJhd2FibGUuZW5hYmxlZCkge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIGlmIChkLnJlc2l6YWJsZSlcbiAgICAgICAgICBkb2N1bWVudC5ib2R5LmFkZEV2ZW50TGlzdGVuZXIoJ2NoZXNzZ3JvdW5kLnJlc2l6ZScsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgIGQuYm91bmRzLmNsZWFyKCk7XG4gICAgICAgICAgICBkLnJlbmRlcigpO1xuICAgICAgICAgIH0sIGZhbHNlKTtcbiAgICAgICAgWydvbnNjcm9sbCcsICdvbnJlc2l6ZSddLmZvckVhY2goZnVuY3Rpb24obikge1xuICAgICAgICAgIHZhciBwcmV2ID0gd2luZG93W25dO1xuICAgICAgICAgIHdpbmRvd1tuXSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcHJldiAmJiBwcmV2KCk7XG4gICAgICAgICAgICBkLmJvdW5kcy5jbGVhcigpO1xuICAgICAgICAgIH07XG4gICAgICAgIH0pO1xuICAgICAgfSxcbiAgICAgIGNsYXNzOiBbXG4gICAgICAgICdjZy1ib2FyZC13cmFwJyxcbiAgICAgICAgZC52aWV3T25seSA/ICd2aWV3LW9ubHknIDogJ21hbmlwdWxhYmxlJ1xuICAgICAgXS5qb2luKCcgJylcbiAgICB9LFxuICAgIGNoaWxkcmVuOiBbcmVuZGVyQm9hcmQoY3RybCldXG4gIH07XG59O1xuIiwiLyohXHJcbiAqIEBuYW1lIEphdmFTY3JpcHQvTm9kZUpTIE1lcmdlIHYxLjIuMFxyXG4gKiBAYXV0aG9yIHllaWtvc1xyXG4gKiBAcmVwb3NpdG9yeSBodHRwczovL2dpdGh1Yi5jb20veWVpa29zL2pzLm1lcmdlXHJcblxyXG4gKiBDb3B5cmlnaHQgMjAxNCB5ZWlrb3MgLSBNSVQgbGljZW5zZVxyXG4gKiBodHRwczovL3Jhdy5naXRodWIuY29tL3llaWtvcy9qcy5tZXJnZS9tYXN0ZXIvTElDRU5TRVxyXG4gKi9cclxuXHJcbjsoZnVuY3Rpb24oaXNOb2RlKSB7XHJcblxyXG5cdC8qKlxyXG5cdCAqIE1lcmdlIG9uZSBvciBtb3JlIG9iamVjdHMgXHJcblx0ICogQHBhcmFtIGJvb2w/IGNsb25lXHJcblx0ICogQHBhcmFtIG1peGVkLC4uLiBhcmd1bWVudHNcclxuXHQgKiBAcmV0dXJuIG9iamVjdFxyXG5cdCAqL1xyXG5cclxuXHR2YXIgUHVibGljID0gZnVuY3Rpb24oY2xvbmUpIHtcclxuXHJcblx0XHRyZXR1cm4gbWVyZ2UoY2xvbmUgPT09IHRydWUsIGZhbHNlLCBhcmd1bWVudHMpO1xyXG5cclxuXHR9LCBwdWJsaWNOYW1lID0gJ21lcmdlJztcclxuXHJcblx0LyoqXHJcblx0ICogTWVyZ2UgdHdvIG9yIG1vcmUgb2JqZWN0cyByZWN1cnNpdmVseSBcclxuXHQgKiBAcGFyYW0gYm9vbD8gY2xvbmVcclxuXHQgKiBAcGFyYW0gbWl4ZWQsLi4uIGFyZ3VtZW50c1xyXG5cdCAqIEByZXR1cm4gb2JqZWN0XHJcblx0ICovXHJcblxyXG5cdFB1YmxpYy5yZWN1cnNpdmUgPSBmdW5jdGlvbihjbG9uZSkge1xyXG5cclxuXHRcdHJldHVybiBtZXJnZShjbG9uZSA9PT0gdHJ1ZSwgdHJ1ZSwgYXJndW1lbnRzKTtcclxuXHJcblx0fTtcclxuXHJcblx0LyoqXHJcblx0ICogQ2xvbmUgdGhlIGlucHV0IHJlbW92aW5nIGFueSByZWZlcmVuY2VcclxuXHQgKiBAcGFyYW0gbWl4ZWQgaW5wdXRcclxuXHQgKiBAcmV0dXJuIG1peGVkXHJcblx0ICovXHJcblxyXG5cdFB1YmxpYy5jbG9uZSA9IGZ1bmN0aW9uKGlucHV0KSB7XHJcblxyXG5cdFx0dmFyIG91dHB1dCA9IGlucHV0LFxyXG5cdFx0XHR0eXBlID0gdHlwZU9mKGlucHV0KSxcclxuXHRcdFx0aW5kZXgsIHNpemU7XHJcblxyXG5cdFx0aWYgKHR5cGUgPT09ICdhcnJheScpIHtcclxuXHJcblx0XHRcdG91dHB1dCA9IFtdO1xyXG5cdFx0XHRzaXplID0gaW5wdXQubGVuZ3RoO1xyXG5cclxuXHRcdFx0Zm9yIChpbmRleD0wO2luZGV4PHNpemU7KytpbmRleClcclxuXHJcblx0XHRcdFx0b3V0cHV0W2luZGV4XSA9IFB1YmxpYy5jbG9uZShpbnB1dFtpbmRleF0pO1xyXG5cclxuXHRcdH0gZWxzZSBpZiAodHlwZSA9PT0gJ29iamVjdCcpIHtcclxuXHJcblx0XHRcdG91dHB1dCA9IHt9O1xyXG5cclxuXHRcdFx0Zm9yIChpbmRleCBpbiBpbnB1dClcclxuXHJcblx0XHRcdFx0b3V0cHV0W2luZGV4XSA9IFB1YmxpYy5jbG9uZShpbnB1dFtpbmRleF0pO1xyXG5cclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4gb3V0cHV0O1xyXG5cclxuXHR9O1xyXG5cclxuXHQvKipcclxuXHQgKiBNZXJnZSB0d28gb2JqZWN0cyByZWN1cnNpdmVseVxyXG5cdCAqIEBwYXJhbSBtaXhlZCBpbnB1dFxyXG5cdCAqIEBwYXJhbSBtaXhlZCBleHRlbmRcclxuXHQgKiBAcmV0dXJuIG1peGVkXHJcblx0ICovXHJcblxyXG5cdGZ1bmN0aW9uIG1lcmdlX3JlY3Vyc2l2ZShiYXNlLCBleHRlbmQpIHtcclxuXHJcblx0XHRpZiAodHlwZU9mKGJhc2UpICE9PSAnb2JqZWN0JylcclxuXHJcblx0XHRcdHJldHVybiBleHRlbmQ7XHJcblxyXG5cdFx0Zm9yICh2YXIga2V5IGluIGV4dGVuZCkge1xyXG5cclxuXHRcdFx0aWYgKHR5cGVPZihiYXNlW2tleV0pID09PSAnb2JqZWN0JyAmJiB0eXBlT2YoZXh0ZW5kW2tleV0pID09PSAnb2JqZWN0Jykge1xyXG5cclxuXHRcdFx0XHRiYXNlW2tleV0gPSBtZXJnZV9yZWN1cnNpdmUoYmFzZVtrZXldLCBleHRlbmRba2V5XSk7XHJcblxyXG5cdFx0XHR9IGVsc2Uge1xyXG5cclxuXHRcdFx0XHRiYXNlW2tleV0gPSBleHRlbmRba2V5XTtcclxuXHJcblx0XHRcdH1cclxuXHJcblx0XHR9XHJcblxyXG5cdFx0cmV0dXJuIGJhc2U7XHJcblxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogTWVyZ2UgdHdvIG9yIG1vcmUgb2JqZWN0c1xyXG5cdCAqIEBwYXJhbSBib29sIGNsb25lXHJcblx0ICogQHBhcmFtIGJvb2wgcmVjdXJzaXZlXHJcblx0ICogQHBhcmFtIGFycmF5IGFyZ3ZcclxuXHQgKiBAcmV0dXJuIG9iamVjdFxyXG5cdCAqL1xyXG5cclxuXHRmdW5jdGlvbiBtZXJnZShjbG9uZSwgcmVjdXJzaXZlLCBhcmd2KSB7XHJcblxyXG5cdFx0dmFyIHJlc3VsdCA9IGFyZ3ZbMF0sXHJcblx0XHRcdHNpemUgPSBhcmd2Lmxlbmd0aDtcclxuXHJcblx0XHRpZiAoY2xvbmUgfHwgdHlwZU9mKHJlc3VsdCkgIT09ICdvYmplY3QnKVxyXG5cclxuXHRcdFx0cmVzdWx0ID0ge307XHJcblxyXG5cdFx0Zm9yICh2YXIgaW5kZXg9MDtpbmRleDxzaXplOysraW5kZXgpIHtcclxuXHJcblx0XHRcdHZhciBpdGVtID0gYXJndltpbmRleF0sXHJcblxyXG5cdFx0XHRcdHR5cGUgPSB0eXBlT2YoaXRlbSk7XHJcblxyXG5cdFx0XHRpZiAodHlwZSAhPT0gJ29iamVjdCcpIGNvbnRpbnVlO1xyXG5cclxuXHRcdFx0Zm9yICh2YXIga2V5IGluIGl0ZW0pIHtcclxuXHJcblx0XHRcdFx0dmFyIHNpdGVtID0gY2xvbmUgPyBQdWJsaWMuY2xvbmUoaXRlbVtrZXldKSA6IGl0ZW1ba2V5XTtcclxuXHJcblx0XHRcdFx0aWYgKHJlY3Vyc2l2ZSkge1xyXG5cclxuXHRcdFx0XHRcdHJlc3VsdFtrZXldID0gbWVyZ2VfcmVjdXJzaXZlKHJlc3VsdFtrZXldLCBzaXRlbSk7XHJcblxyXG5cdFx0XHRcdH0gZWxzZSB7XHJcblxyXG5cdFx0XHRcdFx0cmVzdWx0W2tleV0gPSBzaXRlbTtcclxuXHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0fVxyXG5cclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4gcmVzdWx0O1xyXG5cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEdldCB0eXBlIG9mIHZhcmlhYmxlXHJcblx0ICogQHBhcmFtIG1peGVkIGlucHV0XHJcblx0ICogQHJldHVybiBzdHJpbmdcclxuXHQgKlxyXG5cdCAqIEBzZWUgaHR0cDovL2pzcGVyZi5jb20vdHlwZW9mdmFyXHJcblx0ICovXHJcblxyXG5cdGZ1bmN0aW9uIHR5cGVPZihpbnB1dCkge1xyXG5cclxuXHRcdHJldHVybiAoe30pLnRvU3RyaW5nLmNhbGwoaW5wdXQpLnNsaWNlKDgsIC0xKS50b0xvd2VyQ2FzZSgpO1xyXG5cclxuXHR9XHJcblxyXG5cdGlmIChpc05vZGUpIHtcclxuXHJcblx0XHRtb2R1bGUuZXhwb3J0cyA9IFB1YmxpYztcclxuXHJcblx0fSBlbHNlIHtcclxuXHJcblx0XHR3aW5kb3dbcHVibGljTmFtZV0gPSBQdWJsaWM7XHJcblxyXG5cdH1cclxuXHJcbn0pKHR5cGVvZiBtb2R1bGUgPT09ICdvYmplY3QnICYmIG1vZHVsZSAmJiB0eXBlb2YgbW9kdWxlLmV4cG9ydHMgPT09ICdvYmplY3QnICYmIG1vZHVsZS5leHBvcnRzKTsiLCJ2YXIgbSA9IHJlcXVpcmUoJ21pdGhyaWwnKTtcbnZhciBncm91bmRCdWlsZCA9IHJlcXVpcmUoJy4vZ3JvdW5kJyk7XG52YXIgZ2VuZXJhdGUgPSByZXF1aXJlKCcuLi8uLi9nZW5lcmF0ZS9zcmMvZ2VuZXJhdGUnKTtcbnZhciBkaWFncmFtID0gcmVxdWlyZSgnLi4vLi4vZ2VuZXJhdGUvc3JjL2RpYWdyYW0nKTtcblxuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKG9wdHMsIGkxOG4pIHtcblxuICB2YXIgYmV0d2VlbkZlbnMgPSBmYWxzZTtcbiAgdmFyIGdhbWVUb3RhbCA9IDQwO1xuICB2YXIgc2VsZWN0aW9uID0gbS5wcm9wKG9wdHMubW9kZSk7XG4gIHZhciBmZW4gPSBtLnByb3Aob3B0cy5mZW4gPyBvcHRzLmZlbiA6IGdlbmVyYXRlLnJhbmRvbUZlbkZvckZlYXR1cmUoc2VsZWN0aW9uKCkpKTtcbiAgdmFyIGZlbkZvckJvYXJkID0gZmVuKCk7XG4gIHZhciBmZWF0dXJlcyA9IG0ucHJvcChnZW5lcmF0ZS5leHRyYWN0U2luZ2xlRmVhdHVyZShzZWxlY3Rpb24oKSwgZmVuKCkpKTtcblxuICB2YXIgcmFuZG9tRmVhdHVyZTtcbiAgdmFyIGdyb3VuZDtcbiAgdmFyIHNjb3JlID0gbS5wcm9wKCk7XG4gIHZhciBkaXNwbGF5c2NvcmUgPSBtLnByb3AoKTtcbiAgdmFyIGJyZWFrbGV2ZWwgPSBtLnByb3AoKTtcbiAgdmFyIGNvcnJlY3QgPSBtLnByb3AoW10pO1xuICB2YXIgaW5jb3JyZWN0ID0gbS5wcm9wKFtdKTtcbiAgdmFyIHRpbWVySWQ7XG5cbiAgZnVuY3Rpb24gc2hvd0dyb3VuZCgpIHtcbiAgICBpZiAoIWdyb3VuZCkgZ3JvdW5kID0gZ3JvdW5kQnVpbGQoZmVuRm9yQm9hcmQsIG9uU3F1YXJlU2VsZWN0KTtcbiAgfVxuXG5cbiAgZnVuY3Rpb24gbmV3R2FtZSgpIHtcbiAgICBzY29yZSgwKTtcbiAgICBkaXNwbGF5c2NvcmUoMCk7XG5cbiAgICBjb3JyZWN0KFtdKTtcbiAgICBpbmNvcnJlY3QoW10pO1xuICAgIG5leHRGZW4oKTtcbiAgICBpZiAoIXRpbWVySWQpIHtcbiAgICAgIHRpbWVySWQgPSBzZXRJbnRlcnZhbChvblRpY2ssIDI1KTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBvblRpY2soKSB7XG5cbiAgICB2YXIgdCA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpIC8gMTAwMDtcbiAgICB2YXIgcmFkaWFucyA9IHQgKiAyICogTWF0aC5QSTtcbiAgICB2YXIgYnBtID0gMzA7XG4gICAgdmFyIGJwcyA9IGJwbSAvIDYwO1xuICAgIHZhciBiZWF0ID0gTWF0aC5zaW4ocmFkaWFucyAqIGJwcyk7XG4gICAgYnJlYWtsZXZlbCg1MCArIGJlYXQgKiA1MCk7XG5cbiAgICBtLnJlZHJhdygpO1xuICB9XG5cbiAgZnVuY3Rpb24gb25TcXVhcmVTZWxlY3QodGFyZ2V0KSB7XG4gICAgaWYgKGJldHdlZW5GZW5zKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGlmIChjb3JyZWN0KCkuaW5jbHVkZXModGFyZ2V0KSB8fCBpbmNvcnJlY3QoKS5pbmNsdWRlcyh0YXJnZXQpKSB7XG4gICAgICB0YXJnZXQgPSAnbm9uZSc7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgdmFyIGZvdW5kID0gZ2VuZXJhdGUuZmVhdHVyZUZvdW5kKGZlYXR1cmVzKCksIHRhcmdldCk7XG4gICAgICBpZiAoZm91bmQgPiAwKSB7XG4gICAgICAgIGNvcnJlY3QoKS5wdXNoKHRhcmdldCk7XG4gICAgICB9XG4gICAgICBlbHNlIHtcbiAgICAgICAgaW5jb3JyZWN0KCkucHVzaCh0YXJnZXQpO1xuICAgICAgICBzY29yZShzY29yZSgpIC0gMSk7XG4gICAgICB9XG4gICAgfVxuICAgIGdyb3VuZC5zZXQoe1xuICAgICAgZmVuOiBmZW5Gb3JCb2FyZCxcbiAgICB9KTtcbiAgICB2YXIgY2xpY2tlZERpYWdyYW0gPSBkaWFncmFtLmNsaWNrZWRTcXVhcmVzKGZlYXR1cmVzKCksIGNvcnJlY3QoKSwgaW5jb3JyZWN0KCksIHRhcmdldCk7XG4gICAgZ3JvdW5kLnNldFNoYXBlcyhjbGlja2VkRGlhZ3JhbSk7XG4gICAgbS5yZWRyYXcoKTtcbiAgICBpZiAoZ2VuZXJhdGUuYWxsRmVhdHVyZXNGb3VuZChmZWF0dXJlcygpKSkge1xuXG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gZ2FtZU92ZXIoKSB7XG4gICAgbS5yZWRyYXcoKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHVwZGF0ZUZlbih2YWx1ZSkge1xuICAgIGRpYWdyYW0uY2xlYXJEaWFncmFtcyhmZWF0dXJlcygpKTtcbiAgICBmZW4odmFsdWUpO1xuICAgIGZlbkZvckJvYXJkID0gZmVuKCk7XG4gICAgZ3JvdW5kLnNldCh7XG4gICAgICBmZW46IGZlbkZvckJvYXJkLFxuICAgIH0pO1xuICAgIGdyb3VuZC5zZXRTaGFwZXMoW10pO1xuICAgIGNvcnJlY3QoW10pO1xuICAgIGluY29ycmVjdChbXSk7XG5cbiAgICB2YXIgZmVhdHVyZSA9IHNlbGVjdGlvbigpID09PSAnTWl4ZWQnID8gcmFuZG9tRmVhdHVyZSA6IHNlbGVjdGlvbigpO1xuXG4gICAgZmVhdHVyZXMoZ2VuZXJhdGUuZXh0cmFjdFNpbmdsZUZlYXR1cmUoZmVhdHVyZSwgZmVuKCkpKTtcbiAgICBpZiAoZ2VuZXJhdGUuYWxsRmVhdHVyZXNGb3VuZChmZWF0dXJlcygpKSkge1xuICAgICAgcmV0dXJuIG5leHRGZW4oKTtcbiAgICB9XG4gICAgbS5yZWRyYXcoKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIG5leHRGZW4oKSB7XG4gICAgcmFuZG9tRmVhdHVyZSA9IGdlbmVyYXRlLnJhbmRvbUZlYXR1cmUoKTtcbiAgICB2YXIgZmVhdHVyZSA9IHNlbGVjdGlvbigpID09PSAnTWl4ZWQnID8gcmFuZG9tRmVhdHVyZSA6IHNlbGVjdGlvbigpO1xuICAgIHVwZGF0ZUZlbihnZW5lcmF0ZS5yYW5kb21GZW5Gb3JGZWF0dXJlKGZlYXR1cmUpKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGJsaW5kZm9sZCgpIHtcbiAgICBpZiAoZmVuRm9yQm9hcmQgPT09ICc4LzgvOC84LzgvOC84LzgnKSB7XG4gICAgICBmZW5Gb3JCb2FyZCA9IGZlbigpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIGZlbkZvckJvYXJkID0gJzgvOC84LzgvOC84LzgvOCc7XG4gICAgfVxuICAgIGdyb3VuZC5zZXQoe1xuICAgICAgZmVuOiBmZW5Gb3JCb2FyZCxcbiAgICB9KTtcbiAgICBtLnJlZHJhdygpO1xuICB9XG5cbiAgc2hvd0dyb3VuZCgpO1xuICBuZXdHYW1lKCk7XG4gIG0ucmVkcmF3KCk7XG5cbiAgcmV0dXJuIHtcbiAgICBmZW46IGZlbixcbiAgICBncm91bmQ6IGdyb3VuZCxcbiAgICBmZWF0dXJlczogZmVhdHVyZXMsXG4gICAgdXBkYXRlRmVuOiB1cGRhdGVGZW4sXG4gICAgb25TcXVhcmVTZWxlY3Q6IG9uU3F1YXJlU2VsZWN0LFxuICAgIG5leHRGZW46IG5leHRGZW4sXG4gICAgc2NvcmU6IHNjb3JlLFxuICAgIGRpc3BsYXlzY29yZTogZGlzcGxheXNjb3JlLFxuICAgIGJyZWFrbGV2ZWw6IGJyZWFrbGV2ZWwsXG4gICAgc2VsZWN0aW9uOiBzZWxlY3Rpb24sXG4gICAgbmV3R2FtZTogbmV3R2FtZSxcbiAgICBibGluZGZvbGQ6IGJsaW5kZm9sZCxcbiAgICBkZXNjcmlwdGlvbnM6IGdlbmVyYXRlLmZlYXR1cmVNYXAubWFwKGYgPT4gZi5kZXNjcmlwdGlvbilcbiAgfTtcbn07XG4iLCJ2YXIgY2hlc3Nncm91bmQgPSByZXF1aXJlKCdjaGVzc2dyb3VuZCcpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGZlbiwgb25TZWxlY3QpIHtcbiAgcmV0dXJuIG5ldyBjaGVzc2dyb3VuZC5jb250cm9sbGVyKHtcbiAgICBmZW46IGZlbixcbiAgICB2aWV3T25seTogZmFsc2UsXG4gICAgdHVybkNvbG9yOiAnd2hpdGUnLFxuICAgIGFuaW1hdGlvbjoge1xuICAgICAgZHVyYXRpb246IDIwMFxuICAgIH0sXG4gICAgaGlnaGxpZ2h0OiB7XG4gICAgICBsYXN0TW92ZTogZmFsc2VcbiAgICB9LFxuICAgIG1vdmFibGU6IHtcbiAgICAgIGZyZWU6IGZhbHNlLFxuICAgICAgY29sb3I6ICd3aGl0ZScsXG4gICAgICBwcmVtb3ZlOiB0cnVlLFxuICAgICAgZGVzdHM6IFtdLFxuICAgICAgc2hvd0Rlc3RzOiBmYWxzZSxcbiAgICAgIGV2ZW50czoge1xuICAgICAgICBhZnRlcjogZnVuY3Rpb24oKSB7fVxuICAgICAgfVxuICAgIH0sXG4gICAgZHJhd2FibGU6IHtcbiAgICAgIGVuYWJsZWQ6IHRydWVcbiAgICB9LFxuICAgIGV2ZW50czoge1xuICAgICAgbW92ZTogZnVuY3Rpb24ob3JpZywgZGVzdCwgY2FwdHVyZWRQaWVjZSkge1xuICAgICAgICBvblNlbGVjdChkZXN0KTtcbiAgICAgIH0sXG4gICAgICBzZWxlY3Q6IGZ1bmN0aW9uKGtleSkge1xuICAgICAgICBvblNlbGVjdChrZXkpO1xuICAgICAgfVxuICAgIH1cbiAgfSk7XG59O1xuIiwidmFyIG0gPSByZXF1aXJlKCdtaXRocmlsJyk7XG52YXIgY3RybCA9IHJlcXVpcmUoJy4vY3RybCcpO1xudmFyIHZpZXcgPSByZXF1aXJlKCcuL3ZpZXcvbWFpbicpO1xudmFyIHF1ZXJ5cGFyYW0gPSByZXF1aXJlKCcuLi8uLi9leHBsb3Jlci9zcmMvdXRpbC9xdWVyeXBhcmFtJyk7XG5cbmZ1bmN0aW9uIG1haW4ob3B0cykge1xuICAgIHZhciBjb250cm9sbGVyID0gbmV3IGN0cmwob3B0cyk7XG4gICAgbS5tb3VudChvcHRzLmVsZW1lbnQsIHtcbiAgICAgICAgY29udHJvbGxlcjogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4gY29udHJvbGxlcjtcbiAgICAgICAgfSxcbiAgICAgICAgdmlldzogdmlld1xuICAgIH0pO1xufVxuXG5cbnZhciBtb2RlID0gcXVlcnlwYXJhbS5nZXRQYXJhbWV0ZXJCeU5hbWUoJ21vZGUnKTtcbmlmICghbW9kZSkge1xuICAgIG1vZGUgPSBcIktuaWdodCBmb3Jrc1wiO1xufVxuXG5tYWluKHtcbiAgICBlbGVtZW50OiBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIndyYXBwZXJcIiksXG4gICAgbW9kZTogbW9kZVxufSk7XG4iLCJ2YXIgbSA9IHJlcXVpcmUoJ21pdGhyaWwnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihjb250cm9sbGVyKSB7XG4gIHJldHVybiBbXG4gICAgbSgnZGl2LmJyZWFrYmFyJywgW1xuICAgICAgbSgnZGl2LnJoeXRobScsIHtcbiAgICAgICAgc3R5bGU6IHtcbiAgICAgICAgICB3aWR0aDogY29udHJvbGxlci5icmVha2xldmVsKCkgKyBcIiVcIlxuICAgICAgICB9XG4gICAgICB9KSxcbiAgICAgIG0oJ2Rpdi5icmVha2FyZWEnLCAnYnJlYWsnKSxcbiAgICBdKVxuXG4gIF07XG59O1xuIiwidmFyIG0gPSByZXF1aXJlKCdtaXRocmlsJyk7XG52YXIgY2hlc3Nncm91bmQgPSByZXF1aXJlKCdjaGVzc2dyb3VuZCcpO1xudmFyIHNjb3JlID0gcmVxdWlyZSgnLi9zY29yZScpO1xudmFyIGJyZWFrYmFyID0gcmVxdWlyZSgnLi9icmVha2JhcicpO1xudmFyIGdlbmVyYXRlID0gcmVxdWlyZSgnLi4vLi4vLi4vZ2VuZXJhdGUvc3JjL2dlbmVyYXRlJyk7XG5cbmZ1bmN0aW9uIHZpc3VhbEJvYXJkKGN0cmwpIHtcbiAgcmV0dXJuIG0oJ2Rpdi5saWNoZXNzX2JvYXJkJywgbSgnZGl2LmxpY2hlc3NfYm9hcmRfd3JhcCcsIG0oJ2Rpdi5saWNoZXNzX2JvYXJkJywgW1xuICAgIGNoZXNzZ3JvdW5kLnZpZXcoY3RybC5ncm91bmQpXG4gIF0pKSk7XG59XG5cbmZ1bmN0aW9uIGluZm8oY3RybCkge1xuICByZXR1cm4gW20oJ2Rpdi5leHBsYW5hdGlvbicsIFtcbiAgICAgIG0oJ2JyJyksXG4gICAgICBtKCdicicpLFxuICAgICAgbSgncC5jZW50ZXInLCB7XG4gICAgICAgIHN0eWxlOiB7XG4gICAgICAgICAgdGV4dEFsaWduOiAnY2VudGVyJ1xuICAgICAgICB9XG4gICAgICB9LCAnVHJhaW5pbmcgbW9kZScpLFxuICAgICAgbSgnYnInKSxcbiAgICAgIG0oJ2JyJyksXG4gICAgICBnZW5lcmF0ZS5mZWF0dXJlTWFwLm1hcChmID0+IHtcbiAgICAgICAgcmV0dXJuIG0oJ2Rpdi5idXR0b24ubmV3Z2FtZScsIHtcbiAgICAgICAgICB0aXRsZTogZi5mdWxsRGVzY3JpcHRpb24sXG4gICAgICAgICAgb25jbGljazogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBjdHJsLnNlbGVjdGlvbihmLmRlc2NyaXB0aW9uKTtcbiAgICAgICAgICAgIGN0cmwubmV3R2FtZSgpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSwgZi5kZXNjcmlwdGlvbik7XG4gICAgICB9KSxcbiAgICBdKSxcbiAgICBtKCdicicpLFxuICAgIG0oJ2JyJyksXG4gICAgbSgncC5jZW50ZXInLCB7XG4gICAgICAgIHN0eWxlOiB7XG4gICAgICAgICAgdGV4dEFsaWduOiAnY2VudGVyJ1xuICAgICAgICB9XG4gICAgICB9LCAnUG9zdCB5b3VyIGhpZ2ggc2NvcmVzIG9uICcsXG4gICAgICBtKFwiYS5oaXNjb3JlLmV4dGVybmFsW2hyZWY9J2h0dHBzOi8vZW4ubGljaGVzcy5vcmcvZm9ydW0vZ2FtZS1hbmFseXNpcy9mb3JraW5nLWhlbGwtY2hhbGxlbmdlJ11cIiwge1xuICAgICAgICBzdHlsZToge1xuICAgICAgICAgIGNvbG9yOiBcIiM1NWFcIlxuICAgICAgICB9XG4gICAgICB9LCAnbGljaGVzcy4nKSksXG4gICAgbSgnYnInKSxcbiAgICBtKCdicicpLFxuICAgIG0oJ3AuY2VudGVyJyxtKCdkaXYuYnV0dG9uLm5ld2dhbWUnLCB7XG4gICAgICBvbmNsaWNrOiBmdW5jdGlvbigpIHtcbiAgICAgICAgY3RybC5ibGluZGZvbGQoKTtcbiAgICAgIH1cbiAgICB9LCAnQmxpbmRmb2xkIGJvbnVzJykpXG5cbiAgXTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihjdHJsKSB7XG4gIHJldHVybiBbXG4gICAgbShcImRpdi4jc2l0ZV9oZWFkZXJcIixcbiAgICAgIG0oJ2Rpdi5ib2FyZF9sZWZ0JywgW1xuICAgICAgICBtKCdoMi5jZW50ZXInLFxuICAgICAgICAgIG0oJ2Ejc2l0ZV90aXRsZScsIHtcbiAgICAgICAgICAgICAgb25jbGljazogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgd2luZG93Lm9wZW4oXCIuL2luZGV4Lmh0bWw/ZmVuPVwiICsgZW5jb2RlVVJJKGN0cmwuZmVuKCkpKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSwgJ2ZlYXR1cmUnLFxuICAgICAgICAgICAgbSgnc3Bhbi5leHRlbnNpb24nLCAndHJvbicpKSksXG4gICAgICAgIG0oJ2JyJylcbiAgICAgICAgXG4gICAgICBdKVxuICAgICksXG4gICAgbSgnZGl2LiNsaWNoZXNzJyxcbiAgICAgIG0oJ2Rpdi5hbmFseXNlLmNnLTUxMicsIFtcbiAgICAgICAgbSgnZGl2JyxcbiAgICAgICAgICBtKCdkaXYubGljaGVzc19nYW1lJywgW1xuICAgICAgICAgICAgdmlzdWFsQm9hcmQoY3RybCksXG4gICAgICAgICAgICBtKCdkaXYubGljaGVzc19ncm91bmQnLCBpbmZvKGN0cmwpKVxuICAgICAgICAgIF0pXG4gICAgICAgICksXG4gICAgICAgIG0oJ2Rpdi51bmRlcmJvYXJkJywgW1xuICAgICAgICAgIG0oJ2Rpdi5jZW50ZXInLCBbXG4gICAgICAgICAgICBicmVha2JhcihjdHJsKSxcbiAgICAgICAgICAgIG0oJ2JyJyksXG4gICAgICAgICAgICBzY29yZShjdHJsKSxcbiAgICAgICAgICAgIG0oJ2JyJyksXG4gICAgICAgICAgICBtKCdicicpLFxuICAgICAgICAgICAgbSgnc21hbGwnLCAnRGF0YSBhdXRvZ2VuZXJhdGVkIGZyb20gZ2FtZXMgb24gJywgbShcImEuZXh0ZXJuYWxbaHJlZj0naHR0cDovL2xpY2hlc3Mub3JnJ11cIiwgJ2xpY2hlc3Mub3JnLicpKSxcbiAgICAgICAgICAgIG0oJ3NtYWxsJywgW1xuICAgICAgICAgICAgICAnVXNlcyBsaWJyYXJpZXMgJywgbShcImEuZXh0ZXJuYWxbaHJlZj0naHR0cHM6Ly9naXRodWIuY29tL29ybmljYXIvY2hlc3Nncm91bmQnXVwiLCAnY2hlc3Nncm91bmQnKSxcbiAgICAgICAgICAgICAgJyBhbmQgJywgbShcImEuZXh0ZXJuYWxbaHJlZj0naHR0cHM6Ly9naXRodWIuY29tL2pobHl3YS9jaGVzcy5qcyddXCIsICdjaGVzc2pzLicpLFxuICAgICAgICAgICAgICAnIFNvdXJjZSBjb2RlIG9uICcsIG0oXCJhLmV4dGVybmFsW2hyZWY9J2h0dHBzOi8vZ2l0aHViLmNvbS90YWlsdWdlL2NoZXNzLW8tdHJvbiddXCIsICdHaXRIdWIuJylcbiAgICAgICAgICAgIF0pXG4gICAgICAgICAgXSlcbiAgICAgICAgXSlcbiAgICAgIF0pXG4gICAgKVxuICBdO1xufTtcbiIsInZhciBtID0gcmVxdWlyZSgnbWl0aHJpbCcpO1xuXG5mdW5jdGlvbiBjb252ZXJ0VG9QaWVjZXMoaSkge1xuICByZXR1cm4gaS50b1N0cmluZyg2KVxuICAgIC5yZXBsYWNlKC8wL2csIFwi4pmZXCIpXG4gICAgLnJlcGxhY2UoLzEvZywgXCLimZhcIilcbiAgICAucmVwbGFjZSgvMi9nLCBcIuKZl1wiKVxuICAgIC5yZXBsYWNlKC8zL2csIFwi4pmWXCIpXG4gICAgLnJlcGxhY2UoLzQvZywgXCLimZVcIilcbiAgICAucmVwbGFjZSgvNS9nLCBcIuKZlFwiKTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihjb250cm9sbGVyKSB7XG4gIHJldHVybiBbXG4gICAgbSgnZGl2LnNjb3JlJyAsIFwic2NvcmU6IFwiICsgKGNvbnRyb2xsZXIuZGlzcGxheXNjb3JlKCkpKVxuICBdO1xufTtcbiJdfQ==
