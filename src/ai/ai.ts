// Ported from AI.swift
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

import { monteCarloTreeSearch, type Random } from './mcts.js';
import {
  GAME_WON,
  PACKED_SIZE,
  PLAYER,
  calcLegalMoves,
  isTerminal,
  set,
  type PackedState,
} from './packedState.js';

/** Playouts per candidate move for AI levels 1..4. Level 0 plays at random. */
const ITERATIONS_FOR_LEVEL = [0, 100, 200, 400, 1000];

/** Opening moves the AI picks from when it moves first, from AI.respondFast(). */
const OPENING_MOVES = [
  3 * 9 + 3, // (3, 3)
  5 * 9 + 3, // (3, 5)
  3 * 9 + 5, // (5, 3)
  5 * 9 + 5, // (5, 5)
  4 * 9 + 4, // (4, 4)
];

export function iterationsForLevel(level: number): number {
  return ITERATIONS_FOR_LEVEL[level] ?? ITERATIONS_FOR_LEVEL[1];
}

/** A cheap first move, so the AI does not think on a wide open board. */
export function openingMove(random: Random = Math.random): number {
  return OPENING_MOVES[Math.floor(random() * OPENING_MOVES.length) % OPENING_MOVES.length];
}

/**
 * Chooses the AI's reply, as a cell index 0..80, or -1 if there is no legal move.
 *
 * An immediately winning move is always taken. Otherwise level 0 answers at
 * random and higher levels hand the position to the Monte Carlo search.
 */
export function chooseMove(
  bs: PackedState,
  level: number,
  random: Random = Math.random,
): number {
  const moves = new Int32Array(81);
  const moveCount = calcLegalMoves(bs, moves);

  if (moveCount === 0) {
    return -1;
  }

  const whoami = bs[PLAYER];
  const child = new Int8Array(PACKED_SIZE);

  // check for an immediately winning move
  for (let i = 0; i < moveCount; i++) {
    child.set(bs);
    set(child, moves[i]);
    if (isTerminal(child) && child[GAME_WON] === whoami) {
      return moves[i];
    }
  }

  if (level <= 0) {
    return moves[Math.floor(random() * moveCount) % moveCount];
  }

  return monteCarloTreeSearch(iterationsForLevel(level), bs, random);
}
