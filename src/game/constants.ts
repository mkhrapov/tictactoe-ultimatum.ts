// Ported from BoardState.swift / monte_carlo_tree_search.c
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

/** A cell that has not been played, or a section still open for play. */
export const OPEN = 0;
/** Crosses: the first player. */
export const CROS = 1;
/** Noughts: the second player. */
export const NOUG = 2;
/** A section that is full but won by nobody, or a game that ended in a draw. */
export const DONE = 3;

export type Mark = typeof OPEN | typeof CROS | typeof NOUG;
export type CellValue = Mark;
export type SectionValue = Mark | typeof DONE;
export type GameResult = Mark | typeof DONE;
export type Player = typeof CROS | typeof NOUG;

/** Board cell indexes (0..80, row major) belonging to each of the nine sections. */
export const SECTION_LOCATIONS: readonly (readonly number[])[] = [
  [0, 1, 2, 9, 10, 11, 18, 19, 20],
  [3, 4, 5, 12, 13, 14, 21, 22, 23],
  [6, 7, 8, 15, 16, 17, 24, 25, 26],
  [27, 28, 29, 36, 37, 38, 45, 46, 47],
  [30, 31, 32, 39, 40, 41, 48, 49, 50],
  [33, 34, 35, 42, 43, 44, 51, 52, 53],
  [54, 55, 56, 63, 64, 65, 72, 73, 74],
  [57, 58, 59, 66, 67, 68, 75, 76, 77],
  [60, 61, 62, 69, 70, 71, 78, 79, 80],
];

/** The eight three-in-a-row lines, in section-relative coordinates. */
export const LINES: readonly (readonly [number, number, number])[] = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

/** The section a move lands in. */
export function ownSection(x: number, y: number): number {
  return 3 * Math.floor(y / 3) + Math.floor(x / 3);
}

/** The section a move sends the opponent to. */
export function targetSection(x: number, y: number): number {
  return 3 * (y % 3) + (x % 3);
}

export function other(player: Player): Player {
  return player === CROS ? NOUG : CROS;
}
