// Ported from BoardState.swift
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

import {
  CROS,
  DONE,
  LINES,
  NOUG,
  OPEN,
  SECTION_LOCATIONS,
  other,
  ownSection,
  targetSection,
  type CellValue,
  type GameResult,
  type Player,
  type SectionValue,
} from './constants.js';

/** Sentinel for "no move has been played yet", so nothing is highlighted. */
export const NO_RECENT_MOVE = 100;

/**
 * The complete state of one position: the 81 cells, which sections may be
 * played in next, which sections are closed, and whose turn it is.
 *
 * Instances are treated as immutable by the UI: every move is applied to a
 * clone, and the clones are kept in a history list to support undo.
 */
export class BoardState {
  /** OPEN, CROS or NOUG for each of the 81 cells, row major. */
  readonly cells: Int8Array;
  /** 1 where the next move may be played, 0 elsewhere. */
  readonly allowedSegments: Uint8Array;
  /** OPEN while a section can still be played in, else CROS, NOUG or DONE. */
  readonly closedSegments: Int8Array;
  /** OPEN while the game runs, CROS or NOUG for a win, DONE for a draw. */
  gameWon: GameResult = OPEN;
  /** Sections at the ends of the winning line, for drawing the final strike. */
  finalStrikeStart = -1;
  finalStrikeEnd = -1;
  player: Player = CROS;
  /** Cell index of the move that produced this state, or NO_RECENT_MOVE. */
  mostRecent: number = NO_RECENT_MOVE;

  constructor() {
    this.cells = new Int8Array(81);
    this.allowedSegments = new Uint8Array(9).fill(1);
    this.closedSegments = new Int8Array(9);
  }

  isTerminal(): boolean {
    return this.gameWon !== OPEN;
  }

  cellAt(x: number, y: number): CellValue {
    return this.cells[y * 9 + x] as CellValue;
  }

  sectionAt(section: number): SectionValue {
    return this.closedSegments[section] as SectionValue;
  }

  isSegmentAllowed(section: number): boolean {
    return this.allowedSegments[section] === 1;
  }

  legalPlay(x: number, y: number): boolean {
    if (this.gameWon !== OPEN) {
      return false;
    }

    if (x < 0 || x > 8 || y < 0 || y > 8) {
      return false;
    }

    // check if the move was in an allowed section
    if (this.allowedSegments[ownSection(x, y)] === 0) {
      return false;
    }

    // check to see if the cell itself is not already occupied
    return this.cells[y * 9 + x] === OPEN;
  }

  legalMove(move: number): boolean {
    return this.legalPlay(move % 9, Math.floor(move / 9));
  }

  /** Every legal move in this position, as (x, y) pairs. */
  allLegalMoves(): [number, number][] {
    const res: [number, number][] = [];

    for (let x = 0; x < 9; x++) {
      for (let y = 0; y < 9; y++) {
        if (this.legalPlay(x, y)) {
          res.push([x, y]);
        }
      }
    }

    return res;
  }

  /** Every legal move in this position, as cell indexes 0..80. */
  allLegalMoveIndexes(): number[] {
    const res: number[] = [];

    for (let i = 0; i < 81; i++) {
      if (this.legalMove(i)) {
        res.push(i);
      }
    }

    return res;
  }

  /** A copy of this position. As in the original, mostRecent is not carried over. */
  clone(): BoardState {
    const child = new BoardState();

    child.cells.set(this.cells);
    child.allowedSegments.set(this.allowedSegments);
    child.closedSegments.set(this.closedSegments);
    child.gameWon = this.gameWon;
    child.player = this.player;

    return child;
  }

  /** Plays the current player's mark at (x, y). Returns false for an illegal move. */
  set(x: number, y: number): boolean {
    if (!this.legalPlay(x, y)) {
      return false;
    }

    const cell = y * 9 + x;
    const section = ownSection(x, y);
    this.mostRecent = cell;

    // set position
    this.cells[cell] = this.player;
    if (this.won(this.player, section)) {
      this.closedSegments[section] = this.player;
      if (this.entireGameWonBy(this.player)) {
        this.gameWon = this.player;
      } else if (this.entireBoardIsFull()) {
        this.gameWon = DONE;
      }
    } else if (this.full(section)) {
      this.closedSegments[section] = DONE;
      if (this.entireBoardIsFull()) {
        this.gameWon = DONE;
      }
    }

    // figure out the next set of allowed positions
    this.allowedSegments.fill(0);

    if (this.gameWon === OPEN) {
      const nextSection = targetSection(x, y);
      if (this.segmentClosed(nextSection)) {
        // wildcard play: any section that is still open
        for (let i = 0; i < 9; i++) {
          if (!this.segmentClosed(i)) {
            this.allowedSegments[i] = 1;
          }
        }
      } else {
        this.allowedSegments[nextSection] = 1;
      }
    }

    this.player = other(this.player);

    return true;
  }

  /** Plays a move given as a cell index 0..80. */
  setMove(move: number): boolean {
    return this.set(move % 9, Math.floor(move / 9));
  }

  segmentClosed(i: number): boolean {
    return this.closedSegments[i] !== OPEN;
  }

  /** True when `who` holds three in a row inside `segment`. */
  won(who: number, segment: number): boolean {
    const locations = SECTION_LOCATIONS[segment];

    for (const [a, b, c] of LINES) {
      if (
        this.cells[locations[a]] === who &&
        this.cells[locations[b]] === who &&
        this.cells[locations[c]] === who
      ) {
        return true;
      }
    }

    return false;
  }

  full(segment: number): boolean {
    for (const i of SECTION_LOCATIONS[segment]) {
      if (this.cells[i] === OPEN) {
        return false;
      }
    }

    return true;
  }

  /** True when `who` holds three sections in a row; records the strike line. */
  entireGameWonBy(who: number): boolean {
    for (const [a, b, c] of LINES) {
      if (
        this.closedSegments[a] === who &&
        this.closedSegments[b] === who &&
        this.closedSegments[c] === who
      ) {
        this.finalStrikeStart = a;
        this.finalStrikeEnd = c;
        return true;
      }
    }

    return false;
  }

  entireBoardIsFull(): boolean {
    for (let i = 0; i < 9; i++) {
      if (this.closedSegments[i] === OPEN) {
        return false;
      }
    }

    return true;
  }
}

export { CROS, DONE, NOUG, OPEN, other, ownSection, targetSection };
export type { GameResult, Player };
