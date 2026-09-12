// Game session: move history, undo rules and turn ownership.
// The undo rules are ported from ViewController.swift.
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

import { BoardState } from './boardState.js';
import { CROS, NOUG, OPEN, type Player } from './constants.js';

/** Who plays which side, matching the settings screen of the iOS app. */
export const HUMANS = 0;
export const AI_CROSSES = 1;
export const AI_NOUGHTS = 2;

export type GameStyle = typeof HUMANS | typeof AI_CROSSES | typeof AI_NOUGHTS;

export function isGameStyle(value: number): value is GameStyle {
  return value === HUMANS || value === AI_CROSSES || value === AI_NOUGHTS;
}

export class Game {
  private history: BoardState[] = [new BoardState()];

  constructor(readonly style: GameStyle = HUMANS) {}

  get current(): BoardState {
    return this.history[this.history.length - 1];
  }

  get moveCount(): number {
    return this.history.length - 1;
  }

  /** The side the AI plays, or null when two humans play. */
  get aiPlayer(): Player | null {
    if (this.style === AI_CROSSES) {
      return CROS;
    }
    if (this.style === AI_NOUGHTS) {
      return NOUG;
    }
    return null;
  }

  /** True when it is the AI's turn and the game is still running. */
  isAiTurn(): boolean {
    return !this.current.isTerminal() && this.current.player === this.aiPlayer;
  }

  /** Plays a move for the side to move. Returns false if the move is illegal. */
  play(x: number, y: number): boolean {
    const next = this.current.clone();
    if (!next.set(x, y)) {
      return false;
    }
    this.history.push(next);
    return true;
  }

  playMove(move: number): boolean {
    return this.play(move % 9, Math.floor(move / 9));
  }

  /**
   * Number of plies a single undo should take back: one against another human,
   * and normally two against the AI so that the human gets their own move back.
   */
  undoCount(): number {
    const last = this.current;
    let count = 0;

    if (this.style === HUMANS) {
      if (this.history.length > 1) {
        count = 1;
      }
    } else if (this.style === AI_CROSSES) {
      // the AI opened the game, so its first move is not undoable
      if (this.history.length > 2) {
        count = last.gameWon === OPEN || last.player === NOUG ? 2 : 1;
      }
    } else if (this.history.length > 1) {
      count = last.gameWon === OPEN || last.player === CROS ? 2 : 1;
    }

    // never unwind past the opening position
    return Math.min(count, this.history.length - 1);
  }

  canUndo(): boolean {
    return this.undoCount() > 0;
  }

  undo(): boolean {
    const count = this.undoCount();
    if (count === 0) {
      return false;
    }
    this.history.length -= count;
    return true;
  }

  /**
   * How many moves the human has played. Zero means the game has not really
   * started, even in a game the AI opened.
   */
  get humanMoveCount(): number {
    const ai = this.aiPlayer;
    if (ai === null) {
      return this.moveCount;
    }

    let count = 0;
    for (let ply = 0; ply < this.moveCount; ply++) {
      // Crosses play the even plies
      const player: Player = ply % 2 === 0 ? CROS : NOUG;
      if (player !== ai) {
        count++;
      }
    }
    return count;
  }

  /** The moves played so far, as cell indexes. Used to save and restore a game. */
  moves(): number[] {
    return this.history.slice(1).map((state) => state.mostRecent);
  }

  /** Replays a saved move list. Returns false and keeps the game empty if invalid. */
  static restore(style: GameStyle, moves: readonly number[]): Game | null {
    const game = new Game(style);

    for (const move of moves) {
      if (!Number.isInteger(move) || !game.playMove(move)) {
        return null;
      }
    }

    return game;
  }
}
