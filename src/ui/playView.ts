// The board screen: ported from ViewController.swift and BoardView.swift.
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

import { AiEngine } from '../ai/engine.js';
import { openingMove } from '../ai/ai.js';
import { CROS, DONE, NOUG } from '../game/constants.js';
import { Game, type GameStyle } from '../game/game.js';
import { settings } from '../settings.js';
import { drawBoard } from './boardRenderer.js';
import type { View } from './router.js';
import { html } from './dom.js';

const MAX_BOARD_SIZE = 560;

export function createPlayView(): View {
  const element = html<HTMLElement>(`
    <section class="play">
      <p class="status" id="status" role="status" aria-live="polite"></p>
      <div class="board-wrap">
        <canvas
          class="board"
          width="400"
          height="400"
          tabindex="0"
          role="application"
          aria-describedby="status"
          aria-label="Ultimate Tic-Tac-Toe board, 9 by 9 cells"
        ></canvas>
        <div class="thinking" hidden aria-hidden="true"><span class="spinner"></span></div>
      </div>
      <div class="controls">
        <button type="button" class="btn undo" disabled>&laquo; Undo</button>
        <button type="button" class="btn new-game">New Game</button>
      </div>
      <dialog class="confirm">
        <form method="dialog">
          <h2>Abandon game?</h2>
          <p>Would you like to abandon the current game?</p>
          <div class="dialog-actions">
            <button type="submit" value="no" class="btn">No</button>
            <button type="submit" value="yes" class="btn primary">Yes</button>
          </div>
        </form>
      </dialog>
    </section>
  `);

  const canvas = element.querySelector<HTMLCanvasElement>('.board')!;
  const statusLine = element.querySelector<HTMLParagraphElement>('.status')!;
  const thinkingOverlay = element.querySelector<HTMLDivElement>('.thinking')!;
  const undoButton = element.querySelector<HTMLButtonElement>('.undo')!;
  const newGameButton = element.querySelector<HTMLButtonElement>('.new-game')!;
  const confirmDialog = element.querySelector<HTMLDialogElement>('.confirm')!;

  const engine = new AiEngine();
  let game = restoreGame();
  let thinking = false;
  /** Bumped whenever the position changes, so a stale AI reply is discarded. */
  let generation = 0;
  let hoverCell: number | null = null;
  let cursorCell: number | null = null;
  let boardSize = 0;

  function restoreGame(): Game {
    const saved = settings.savedGame;
    const restored = saved && Game.restore(saved.style, saved.moves);

    if (restored) {
      // A game already under way survives a change of game style; one nobody has
      // played yet simply adopts it, as the iOS app did on leaving its settings.
      if (restored.style === settings.gameStyle || restored.humanMoveCount > 0) {
        return restored;
      }
    }

    return new Game(settings.gameStyle);
  }

  function save(): void {
    settings.saveGame({ style: game.style, moves: game.moves() });
  }

  function statusText(): string {
    const state = game.current;

    if (state.gameWon === CROS) {
      return 'Crosses wins';
    }
    if (state.gameWon === NOUG) {
      return 'Noughts wins';
    }
    if (state.gameWon === DONE) {
      return 'A draw';
    }
    if (thinking) {
      return 'The computer is thinking…';
    }

    const side = state.player === CROS ? 'Crosses' : 'Noughts';
    if (game.aiPlayer === state.player) {
      return `${side} to move (computer)`;
    }
    if (game.aiPlayer !== null) {
      return `${side} to move (you)`;
    }
    return `${side} to move`;
  }

  function render(): void {
    const ctx = canvas.getContext('2d');
    if (ctx && boardSize > 0) {
      const dpr = window.devicePixelRatio || 1;
      const pixels = Math.round(boardSize * dpr);

      if (canvas.width !== pixels || canvas.height !== pixels) {
        canvas.width = pixels;
        canvas.height = pixels;
      }

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.scale(pixels / boardSize, pixels / boardSize);
      drawBoard(ctx, boardSize, game.current, { hoverCell, cursorCell });
    }

    statusLine.textContent = statusText();
    thinkingOverlay.hidden = !thinking;
    undoButton.disabled = thinking || !game.canUndo();
    newGameButton.disabled = game.moveCount === 0;
    canvas.classList.toggle('busy', thinking);
  }

  function resize(): void {
    const wrap = canvas.parentElement;
    if (!wrap) {
      return;
    }
    const size = Math.min(wrap.clientWidth, MAX_BOARD_SIZE);
    if (size > 0 && size !== boardSize) {
      boardSize = size;
      render();
    }
  }

  /** Hands the position to the AI when it is its turn, and plays the reply. */
  function runAiTurn(): void {
    if (thinking || !game.isAiTurn()) {
      return;
    }

    // The very first move of the game is not worth a search: the board is wide
    // open, and the original app answered with a fixed opening move too.
    if (game.moveCount === 0) {
      game.playMove(openingMove());
      save();
      render();
      return;
    }

    thinking = true;
    const mine = ++generation;
    render();

    void engine.requestMove(game.current, settings.aiLevel).then((move) => {
      if (mine !== generation) {
        return; // the position moved on: this answer is stale
      }
      thinking = false;
      if (move >= 0) {
        game.playMove(move);
      }
      save();
      render();
    });
  }

  function playHumanMove(cell: number): void {
    if (thinking || game.isAiTurn()) {
      return;
    }
    if (!game.playMove(cell)) {
      return;
    }

    generation++;
    cursorCell = null;
    hoverCell = null;
    save();
    render();
    runAiTurn();
  }

  function cellFromEvent(event: MouseEvent): number | null {
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0) {
      return null;
    }

    const size = rect.width / 9;
    const x = Math.floor((event.clientX - rect.left) / size);
    const y = Math.floor((event.clientY - rect.top) / size);

    if (x < 0 || x > 8 || y < 0 || y > 8) {
      return null;
    }
    return y * 9 + x;
  }

  function startNewGame(style: GameStyle = settings.gameStyle): void {
    generation++;
    engine.cancel();
    thinking = false;
    game = new Game(style);
    cursorCell = null;
    hoverCell = null;
    save();
    render();
    runAiTurn();
  }

  canvas.addEventListener('click', (event) => {
    const cell = cellFromEvent(event);
    if (cell !== null) {
      playHumanMove(cell);
    }
  });

  canvas.addEventListener('mousemove', (event) => {
    const cell = thinking ? null : cellFromEvent(event);
    if (cell !== hoverCell) {
      hoverCell = cell;
      canvas.classList.toggle(
        'playable',
        cell !== null && game.current.legalPlay(cell % 9, Math.floor(cell / 9)),
      );
      render();
    }
  });

  canvas.addEventListener('mouseleave', () => {
    if (hoverCell !== null) {
      hoverCell = null;
      canvas.classList.remove('playable');
      render();
    }
  });

  canvas.addEventListener('blur', () => {
    if (cursorCell !== null) {
      cursorCell = null;
      render();
    }
  });

  canvas.addEventListener('keydown', (event) => {
    const deltas: Record<string, [number, number]> = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
    };

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (cursorCell === null) {
        cursorCell = firstPlayableCell();
        render();
      } else {
        playHumanMove(cursorCell);
      }
      return;
    }

    const delta = deltas[event.key];
    if (!delta) {
      return;
    }
    event.preventDefault();

    if (cursorCell === null) {
      cursorCell = firstPlayableCell();
    } else {
      const x = Math.min(8, Math.max(0, (cursorCell % 9) + delta[0]));
      const y = Math.min(8, Math.max(0, Math.floor(cursorCell / 9) + delta[1]));
      cursorCell = y * 9 + x;
    }
    render();
  });

  function firstPlayableCell(): number {
    const legal = game.current.allLegalMoveIndexes();
    return legal.length > 0 ? legal[0] : 40;
  }

  undoButton.addEventListener('click', () => {
    if (thinking || !game.undo()) {
      return;
    }
    generation++;
    cursorCell = null;
    save();
    render();
  });

  newGameButton.addEventListener('click', () => {
    if (game.moveCount === 0) {
      return;
    }

    if (typeof confirmDialog.showModal !== 'function') {
      // very old browser: fall back to the platform prompt
      if (window.confirm('Would you like to abandon the current game?')) {
        startNewGame();
      }
      return;
    }

    confirmDialog.returnValue = 'no';
    confirmDialog.showModal();
  });

  confirmDialog.addEventListener('close', () => {
    if (confirmDialog.returnValue === 'yes') {
      startNewGame();
    }
  });

  const observer =
    typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => resize());

  const onWindowResize = () => resize();

  /**
   * Changing the game style is only allowed to restart a game nobody has played
   * yet, which is what the iOS app did when returning from its settings screen.
   */
  const unsubscribe = settings.subscribe(() => {
    if (game.style !== settings.gameStyle && game.humanMoveCount === 0) {
      startNewGame();
    }
  });

  return {
    element,
    mount() {
      observer?.observe(canvas.parentElement!);
      window.addEventListener('resize', onWindowResize);
      resize();
      render();
      runAiTurn();
    },
    unmount() {
      generation++;
      unsubscribe();
      observer?.disconnect();
      window.removeEventListener('resize', onWindowResize);
      engine.dispose();
    },
  };
}
