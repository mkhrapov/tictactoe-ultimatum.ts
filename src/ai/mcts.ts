// Ported from monte_carlo_tree_search.c
//
// Copyright 2019 Maksim Khrapov
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { DONE } from '../game/constants.js';
import {
  GAME_WON,
  PACKED_SIZE,
  PLAYER,
  calcLegalMoves,
  calcLegalMovesUnordered,
  isTerminal,
  set,
  type PackedState,
} from './packedState.js';

/** Returns a float in [0, 1). Injectable so tests can run deterministically. */
export type Random = () => number;

/** Score awarded to a playout that ends in a draw. Value taken from the original. */
const DRAW_SCORE = 0.05;

function randomInt(random: Random, limit: number): number {
  return Math.floor(random() * limit) % limit;
}

/**
 * Scratch space for one search. The C original relied on stack-allocated arrays;
 * reusing buffers here keeps the hot loop free of allocation.
 */
class Scratch {
  readonly scores = new Float64Array(81);
  readonly rootMoves = new Int32Array(81);
  readonly smartMoves = new Int32Array(81);
  readonly replyMoves = new Int32Array(81);
  readonly playoutMoves = new Int32Array(81);
  readonly child = new Int8Array(PACKED_SIZE);
  readonly current = new Int8Array(PACKED_SIZE);
  readonly reply = new Int8Array(PACKED_SIZE);
}

/** Plays the position out at random and returns the winner (or DONE for a draw). */
export function playout(bs: PackedState, random: Random, buf: Int32Array): number {
  while (!isTerminal(bs)) {
    const count = calcLegalMovesUnordered(bs, buf);
    if (count === 0) {
      break;
    }
    set(bs, buf[randomInt(random, count)]);
  }

  return bs[GAME_WON];
}

/**
 * A move is "smart" when it does not hand the opponent an immediate win.
 * Mirrors `is_smart_move` in the C original.
 */
function isSmartMove(bs: PackedState, move: number, s: Scratch): boolean {
  s.current.set(bs);
  set(s.current, move);
  const opponent = s.current[PLAYER];

  if (isTerminal(s.current)) {
    return true;
  }

  const count = calcLegalMovesUnordered(s.current, s.replyMoves);

  for (let i = 0; i < count; i++) {
    s.reply.set(s.current);
    set(s.reply, s.replyMoves[i]);
    if (isTerminal(s.reply) && s.reply[GAME_WON] === opponent) {
      return false;
    }
  }

  return true;
}

/**
 * Picks a move for the player to move in `bs`, as a cell index 0..80.
 *
 * Dumb moves (those that let the opponent win at once) are filtered out first.
 * If every move is dumb, one is chosen at random; if exactly one survives, it is
 * played; otherwise each surviving move is scored by `iterCount` random playouts
 * and the best scoring one wins.
 *
 * Returns -1 when there is no legal move at all.
 */
export function monteCarloTreeSearch(
  iterCount: number,
  bs: PackedState,
  random: Random = Math.random,
): number {
  const s = new Scratch();
  const whoami = bs[PLAYER];

  const legalMoveCount = calcLegalMoves(bs, s.rootMoves);
  if (legalMoveCount === 0) {
    return -1;
  }

  let smartMoveCount = 0;
  for (let i = 0; i < legalMoveCount; i++) {
    const move = s.rootMoves[i];
    if (isSmartMove(bs, move, s)) {
      s.smartMoves[smartMoveCount] = move;
      smartMoveCount++;
    }
  }

  if (smartMoveCount === 0) {
    return s.rootMoves[randomInt(random, legalMoveCount)];
  }

  if (smartMoveCount === 1) {
    return s.smartMoves[0];
  }

  // two or more smart moves: score them by random playouts
  for (let counter = 0; counter < iterCount; counter++) {
    for (let moveIdx = 0; moveIdx < smartMoveCount; moveIdx++) {
      const move = s.smartMoves[moveIdx];
      s.child.set(bs);
      set(s.child, move);
      const winner = playout(s.child, random, s.playoutMoves);

      if (winner === whoami) {
        s.scores[move] += 1.0;
      } else if (winner === DONE) {
        s.scores[move] += DRAW_SCORE;
      }
    }
  }

  // The C original scanned all 81 scores and fell back to cell 0, which can be an
  // illegal move when every playout was lost. Scanning the smart moves instead
  // keeps the same pick whenever any score is positive and stays legal otherwise.
  let winningMove = s.smartMoves[0];
  let max = -1.0;

  for (let moveIdx = 0; moveIdx < smartMoveCount; moveIdx++) {
    const move = s.smartMoves[moveIdx];
    if (s.scores[move] > max) {
      winningMove = move;
      max = s.scores[move];
    }
  }

  return winningMove;
}
