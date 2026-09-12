// Ported from BoardView.swift: the same drawing, on a 2D canvas.
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

import type { BoardState } from '../game/boardState.js';
import { CROS, DONE, NOUG, OPEN } from '../game/constants.js';

/** Colours from the iOS app: blue and orange, chosen to stay legible to
 *  colour-blind players, each with a lighter background shade. */
export const COLORS = {
  board: '#ffffff',
  crossBg: 'rgb(212, 229, 247)',
  cross: 'rgb(28, 134, 238)', // dodgerblue2
  noughtBg: 'rgb(255, 217, 179)',
  nought: 'rgb(255, 127, 0)', // darkorange1
  finalStrike: 'rgb(255, 0, 0)',
  lightLine: 'rgb(128, 128, 128)',
  heavyLine: 'rgb(0, 0, 0)',
  cursor: 'rgb(64, 64, 64)',
} as const;

/** Line widths in the original were tuned for a board of this size, in points. */
const REFERENCE_SIZE = 400;

export interface BoardDecorations {
  /** Cell under the pointer, shown as a faint preview of the move. */
  hoverCell?: number | null;
  /** Cell under the keyboard cursor. */
  cursorCell?: number | null;
}

export function drawBoard(
  ctx: CanvasRenderingContext2D,
  size: number,
  bs: BoardState,
  decorations: BoardDecorations = {},
): void {
  const d = new Draw(ctx, size, bs);

  d.fillBoard();
  d.allowedSegments();
  d.mostRecentCell();
  d.positions();
  d.lightLines();
  d.winners();
  d.heavyLines();
  d.finalStrike();
  d.hover(decorations.hoverCell ?? null);
  d.cursor(decorations.cursorCell ?? null);
}

class Draw {
  private readonly scale: number;
  private readonly cell: number;
  private readonly segment: number;

  constructor(
    private readonly ctx: CanvasRenderingContext2D,
    private readonly size: number,
    private readonly bs: BoardState,
  ) {
    this.scale = size / REFERENCE_SIZE;
    this.cell = size / 9;
    this.segment = size / 3;
  }

  private lineWidth(width: number): number {
    return Math.max(0.5, width * this.scale);
  }

  fillBoard(): void {
    this.ctx.fillStyle = COLORS.board;
    this.ctx.fillRect(0, 0, this.size, this.size);
  }

  /** Tints the sections the player to move may play in, in their colour. */
  allowedSegments(): void {
    this.ctx.fillStyle = this.bs.player === CROS ? COLORS.crossBg : COLORS.noughtBg;

    for (let section = 0; section < 9; section++) {
      if (this.bs.isSegmentAllowed(section)) {
        this.fillSegment(section % 3, Math.floor(section / 3));
      }
    }
  }

  /** Marks the cell just played, which matters most when the AI moved. */
  mostRecentCell(): void {
    const recent = this.bs.mostRecent;
    if (recent < 0 || recent > 80) {
      return;
    }

    this.ctx.fillStyle = this.bs.player === NOUG ? COLORS.crossBg : COLORS.noughtBg;
    this.ctx.fillRect(
      (recent % 9) * this.cell,
      Math.floor(recent / 9) * this.cell,
      this.cell,
      this.cell,
    );
  }

  private fillSegment(x: number, y: number): void {
    this.ctx.fillRect(x * this.segment, y * this.segment, this.segment, this.segment);
  }

  positions(): void {
    for (let y = 0; y < 9; y++) {
      for (let x = 0; x < 9; x++) {
        const value = this.bs.cellAt(x, y);
        if (value === CROS) {
          this.cross(x, y);
        } else if (value === NOUG) {
          this.nought(x, y);
        }
      }
    }
  }

  /** Replaces a decided section with one big mark. */
  winners(): void {
    for (let y = 0; y < 3; y++) {
      for (let x = 0; x < 3; x++) {
        const value = this.bs.sectionAt(y * 3 + x);
        if (value === CROS) {
          this.ctx.fillStyle = COLORS.board;
          this.fillSegment(x, y);
          this.bigCross(x, y);
        } else if (value === NOUG) {
          this.ctx.fillStyle = COLORS.board;
          this.fillSegment(x, y);
          this.bigNought(x, y);
        }
      }
    }
  }

  private strokeCross(x: number, y: number, cellSize: number, width: number, alpha = 1): void {
    const dx = cellSize / 5;
    const x1 = x * cellSize + dx;
    const x2 = x * cellSize + cellSize - dx;
    const y1 = y * cellSize + dx;
    const y2 = y * cellSize + cellSize - dx;

    this.ctx.save();
    this.ctx.globalAlpha = alpha;
    this.ctx.strokeStyle = COLORS.cross;
    this.ctx.lineWidth = this.lineWidth(width);
    this.ctx.beginPath();
    this.ctx.moveTo(x1, y1);
    this.ctx.lineTo(x2, y2);
    this.ctx.moveTo(x2, y1);
    this.ctx.lineTo(x1, y2);
    this.ctx.stroke();
    this.ctx.restore();
  }

  private strokeNought(
    x: number,
    y: number,
    cellSize: number,
    width: number,
    inset: number,
    alpha = 1,
  ): void {
    const cx = x * cellSize + cellSize / 2;
    const cy = y * cellSize + cellSize / 2;
    const radius = Math.max(1, cellSize / 2 - inset * this.scale);

    this.ctx.save();
    this.ctx.globalAlpha = alpha;
    this.ctx.strokeStyle = COLORS.nought;
    this.ctx.lineWidth = this.lineWidth(width);
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
    this.ctx.stroke();
    this.ctx.restore();
  }

  cross(x: number, y: number, alpha = 1): void {
    this.strokeCross(x, y, this.cell, 6, alpha);
  }

  nought(x: number, y: number, alpha = 1): void {
    this.strokeNought(x, y, this.cell, 6, 8, alpha);
  }

  bigCross(x: number, y: number): void {
    this.strokeCross(x, y, this.segment, 12);
  }

  bigNought(x: number, y: number): void {
    this.strokeNought(x, y, this.segment, 12, 16);
  }

  /** The thin grid inside each section. */
  lightLines(): void {
    this.ctx.strokeStyle = COLORS.lightLine;
    this.ctx.lineWidth = this.lineWidth(1);
    this.ctx.beginPath();

    for (const i of [1, 2, 4, 5, 7, 8]) {
      const at = (i * this.size) / 9;
      this.ctx.moveTo(0, at);
      this.ctx.lineTo(this.size, at);
      this.ctx.moveTo(at, 0);
      this.ctx.lineTo(at, this.size);
    }

    this.ctx.stroke();
  }

  /** The heavy grid separating the nine sections, plus the outer border. */
  heavyLines(): void {
    const inset = 2 * this.scale;

    this.ctx.strokeStyle = COLORS.heavyLine;
    this.ctx.lineWidth = this.lineWidth(4);
    this.ctx.beginPath();

    for (const y of [inset, this.segment, 2 * this.segment, this.size - inset]) {
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.size, y);
    }

    for (const x of [inset, this.segment, 2 * this.segment, this.size - inset]) {
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.size);
    }

    this.ctx.stroke();
  }

  /** Strikes through the three sections that won the game. */
  finalStrike(): void {
    if (this.bs.gameWon === OPEN || this.bs.gameWon === DONE) {
      return;
    }

    const centre = (section: number): [number, number] => [
      this.segment * ((section % 3) + 0.5),
      this.segment * (Math.floor(section / 3) + 0.5),
    ];

    const [x1, y1] = centre(this.bs.finalStrikeStart);
    const [x2, y2] = centre(this.bs.finalStrikeEnd);

    this.ctx.strokeStyle = COLORS.finalStrike;
    this.ctx.lineWidth = this.lineWidth(24);
    this.ctx.beginPath();
    this.ctx.moveTo(x1, y1);
    this.ctx.lineTo(x2, y2);
    this.ctx.stroke();
  }

  /** A pale preview of the move under the pointer. Not in the iOS app. */
  hover(cell: number | null): void {
    if (cell === null) {
      return;
    }

    const x = cell % 9;
    const y = Math.floor(cell / 9);

    if (!this.bs.legalPlay(x, y)) {
      return;
    }

    if (this.bs.player === CROS) {
      this.cross(x, y, 0.4);
    } else {
      this.nought(x, y, 0.4);
    }
  }

  /** The keyboard cursor. Not in the iOS app. */
  cursor(cell: number | null): void {
    if (cell === null) {
      return;
    }

    const inset = this.lineWidth(2);

    this.ctx.save();
    this.ctx.strokeStyle = COLORS.cursor;
    this.ctx.lineWidth = this.lineWidth(3);
    this.ctx.setLineDash([this.cell / 8, this.cell / 8]);
    this.ctx.strokeRect(
      (cell % 9) * this.cell + inset,
      Math.floor(cell / 9) * this.cell + inset,
      this.cell - 2 * inset,
      this.cell - 2 * inset,
    );
    this.ctx.restore();
  }
}
