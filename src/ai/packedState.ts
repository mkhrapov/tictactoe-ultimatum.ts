// Ported from monte_carlo_tree_search.c / BoardStateInt8.swift
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

import { BoardState } from '../game/boardState.js';
import {
  CROS,
  DONE,
  LINES,
  NOUG,
  OPEN,
  SECTION_LOCATIONS,
  ownSection,
  targetSection,
} from '../game/constants.js';

/**
 * The search runs on a flat byte array rather than on BoardState objects: the C
 * original copied its `board_state` struct with memcpy for every playout, and a
 * single Int8Array copy is the closest equivalent the platform offers.
 *
 * Layout, matching the struct in monte_carlo_tree_search.h:
 *   [0..80]  cells
 *   [81..89] allowedSegments
 *   [90..98] closedSegments
 *   [99]     player
 *   [100]    gameWon
 */
export const PACKED_SIZE = 101;
export const ALLOWED = 81;
export const CLOSED = 90;
export const PLAYER = 99;
export const GAME_WON = 100;

export type PackedState = Int8Array;

/** Section a move lands in / sends the opponent to, by cell index. */
export const OWN_SECTION_OF = new Int8Array(81);
export const TARGET_SECTION_OF = new Int8Array(81);

for (let move = 0; move < 81; move++) {
  const x = move % 9;
  const y = Math.floor(move / 9);
  OWN_SECTION_OF[move] = ownSection(x, y);
  TARGET_SECTION_OF[move] = targetSection(x, y);
}

/** Flattened SECTION_LOCATIONS: cell index of relative position `i` in `section`. */
const CELL_OF = new Int8Array(81);

for (let section = 0; section < 9; section++) {
  for (let i = 0; i < 9; i++) {
    CELL_OF[section * 9 + i] = SECTION_LOCATIONS[section][i];
  }
}

/** Flattened LINES. */
const LINE_A = new Int8Array(8);
const LINE_B = new Int8Array(8);
const LINE_C = new Int8Array(8);

for (let i = 0; i < 8; i++) {
  LINE_A[i] = LINES[i][0];
  LINE_B[i] = LINES[i][1];
  LINE_C[i] = LINES[i][2];
}

export function pack(bs: BoardState): PackedState {
  const p = new Int8Array(PACKED_SIZE);
  p.set(bs.cells, 0);
  p.set(bs.allowedSegments, ALLOWED);
  p.set(bs.closedSegments, CLOSED);
  p[PLAYER] = bs.player;
  p[GAME_WON] = bs.gameWon;
  return p;
}

export function isTerminal(bs: PackedState): boolean {
  return bs[GAME_WON] !== OPEN;
}

export function legalMove(bs: PackedState, move: number): boolean {
  if (bs[GAME_WON] !== OPEN) {
    return false;
  }

  if (move < 0 || move > 80) {
    return false;
  }

  if (bs[ALLOWED + OWN_SECTION_OF[move]] === 0) {
    return false;
  }

  return bs[move] === OPEN;
}

/** Fills `out` with the legal moves and returns how many there are. */
export function calcLegalMoves(bs: PackedState, out: Int32Array): number {
  let counter = 0;

  for (let i = 0; i < 81; i++) {
    if (legalMove(bs, i)) {
      out[counter] = i;
      counter++;
    }
  }

  return counter;
}

/**
 * Like calcLegalMoves, but walks only the sections that are open for play
 * instead of all 81 cells. The moves come out grouped by section rather than in
 * ascending cell order, so this is used only where order cannot matter: random
 * playouts and the "does this reply win outright" scan.
 */
export function calcLegalMovesUnordered(bs: PackedState, out: Int32Array): number {
  if (bs[GAME_WON] !== OPEN) {
    return 0;
  }

  let counter = 0;

  for (let section = 0; section < 9; section++) {
    if (bs[ALLOWED + section] === 0) {
      continue;
    }

    const base = section * 9;
    for (let i = 0; i < 9; i++) {
      const cell = CELL_OF[base + i];
      if (bs[cell] === OPEN) {
        out[counter] = cell;
        counter++;
      }
    }
  }

  return counter;
}

function won(bs: PackedState, player: number, section: number): boolean {
  const base = section * 9;

  for (let row = 0; row < 8; row++) {
    if (
      bs[CELL_OF[base + LINE_A[row]]] === player &&
      bs[CELL_OF[base + LINE_B[row]]] === player &&
      bs[CELL_OF[base + LINE_C[row]]] === player
    ) {
      return true;
    }
  }

  return false;
}

function entireGameWonBy(bs: PackedState, player: number): boolean {
  for (let row = 0; row < 8; row++) {
    if (
      bs[CLOSED + LINE_A[row]] === player &&
      bs[CLOSED + LINE_B[row]] === player &&
      bs[CLOSED + LINE_C[row]] === player
    ) {
      return true;
    }
  }

  return false;
}

function entireBoardIsFull(bs: PackedState): boolean {
  for (let section = 0; section < 9; section++) {
    if (bs[CLOSED + section] === OPEN) {
      return false;
    }
  }

  return true;
}

function full(bs: PackedState, section: number): boolean {
  const base = section * 9;

  for (let i = 0; i < 9; i++) {
    if (bs[CELL_OF[base + i]] === OPEN) {
      return false;
    }
  }

  return true;
}

/** Applies a move in place. Mirrors `set` in monte_carlo_tree_search.c. */
export function set(bs: PackedState, move: number): void {
  if (!legalMove(bs, move)) {
    return;
  }

  const player = bs[PLAYER];
  const currentSection = OWN_SECTION_OF[move];
  bs[move] = player;

  if (won(bs, player, currentSection)) {
    bs[CLOSED + currentSection] = player;
    if (entireGameWonBy(bs, player)) {
      bs[GAME_WON] = player;
    } else if (entireBoardIsFull(bs)) {
      bs[GAME_WON] = DONE;
    }
  } else if (full(bs, currentSection)) {
    bs[CLOSED + currentSection] = DONE;
    if (entireBoardIsFull(bs)) {
      bs[GAME_WON] = DONE;
    }
  }

  // figure out the next set of allowed positions
  for (let i = 0; i < 9; i++) {
    bs[ALLOWED + i] = 0;
  }

  if (bs[GAME_WON] === OPEN) {
    const nextSection = TARGET_SECTION_OF[move];
    if (bs[CLOSED + nextSection] === OPEN) {
      bs[ALLOWED + nextSection] = 1;
    } else {
      for (let i = 0; i < 9; i++) {
        if (bs[CLOSED + i] === OPEN) {
          bs[ALLOWED + i] = 1;
        }
      }
    }
  }

  bs[PLAYER] = player === CROS ? NOUG : CROS;
}
