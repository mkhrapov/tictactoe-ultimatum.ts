import { describe, expect, it } from 'vitest';
import { AI_CROSSES, AI_NOUGHTS, Game, HUMANS, isGameStyle } from '../src/game/game.js';
import { CROS, NOUG } from '../src/game/constants.js';
import { CROSSES_WIN } from './testUtil.js';

function gameAfter(style: 0 | 1 | 2, moves: readonly number[]): Game {
  const game = new Game(style);
  for (const move of moves) {
    expect(game.playMove(move)).toBe(true);
  }
  return game;
}

describe('playing', () => {
  it('starts at the opening position with nothing to undo', () => {
    const game = new Game();

    expect(game.moveCount).toBe(0);
    expect(game.current.player).toBe(CROS);
    expect(game.canUndo()).toBe(false);
    expect(game.moves()).toEqual([]);
  });

  it('refuses an illegal move and leaves the history alone', () => {
    const game = new Game();
    game.playMove(40);

    expect(game.playMove(40)).toBe(false);
    expect(game.playMove(0)).toBe(false);
    expect(game.moveCount).toBe(1);
  });

  it('records the moves played', () => {
    const moves = CROSSES_WIN.slice(0, 10);
    expect(gameAfter(HUMANS, moves).moves()).toEqual(moves);
  });
});

describe('who moves', () => {
  it('gives both sides to the humans in a two player game', () => {
    const game = new Game(HUMANS);

    expect(game.aiPlayer).toBeNull();
    expect(game.isAiTurn()).toBe(false);
    game.playMove(40);
    expect(game.isAiTurn()).toBe(false);
  });

  it('has the AI open when it plays Crosses', () => {
    const game = new Game(AI_CROSSES);

    expect(game.aiPlayer).toBe(CROS);
    expect(game.isAiTurn()).toBe(true);
    game.playMove(40);
    expect(game.isAiTurn()).toBe(false);
  });

  it('has the AI reply when it plays Noughts', () => {
    const game = new Game(AI_NOUGHTS);

    expect(game.aiPlayer).toBe(NOUG);
    expect(game.isAiTurn()).toBe(false);
    game.playMove(40);
    expect(game.isAiTurn()).toBe(true);
  });

  it('never asks the AI to move in a finished game', () => {
    const game = gameAfter(AI_NOUGHTS, CROSSES_WIN);

    expect(game.current.isTerminal()).toBe(true);
    expect(game.isAiTurn()).toBe(false);
  });
});

describe('undo against another human', () => {
  it('takes back a single move', () => {
    const game = gameAfter(HUMANS, [40, 30]);

    expect(game.undoCount()).toBe(1);
    expect(game.undo()).toBe(true);
    expect(game.moves()).toEqual([40]);
    expect(game.current.player).toBe(NOUG);
  });

  it('stops at the opening position', () => {
    const game = gameAfter(HUMANS, [40]);

    expect(game.undo()).toBe(true);
    expect(game.moveCount).toBe(0);
    expect(game.undo()).toBe(false);
  });
});

describe('undo against the AI playing Crosses', () => {
  it('does nothing while only the AI has moved', () => {
    const game = gameAfter(AI_CROSSES, [40]);

    expect(game.undoCount()).toBe(0);
    expect(game.undo()).toBe(false);
    expect(game.moves()).toEqual([40]);
  });

  it('takes back the human move and the AI reply', () => {
    const game = gameAfter(AI_CROSSES, [40, 30, 0]);

    expect(game.undoCount()).toBe(2);
    game.undo();
    expect(game.moves()).toEqual([40]);
    expect(game.current.player).toBe(NOUG);
  });

  it('takes back the AI win and the human move before it', () => {
    const game = gameAfter(AI_CROSSES, CROSSES_WIN);

    // Crosses, the AI here, played the winning move, so taking back that one
    // alone would just hand the same position back to the human.
    expect(game.current.gameWon).toBe(CROS);
    expect(game.undoCount()).toBe(2);
    game.undo();
    expect(game.current.isTerminal()).toBe(false);
    expect(game.current.player).toBe(NOUG);
  });
});

describe('undo against the AI playing Noughts', () => {
  it('takes back the human move and the AI reply', () => {
    const game = gameAfter(AI_NOUGHTS, [40, 30]);

    expect(game.undoCount()).toBe(2);
    game.undo();
    expect(game.moveCount).toBe(0);
    expect(game.current.player).toBe(CROS);
  });

  it('never unwinds past the opening position', () => {
    const game = gameAfter(AI_NOUGHTS, [40]);

    expect(game.undoCount()).toBe(1);
    game.undo();
    expect(game.moveCount).toBe(0);
    expect(game.canUndo()).toBe(false);
  });

  it('takes back only the human move that ended the game', () => {
    const game = gameAfter(AI_NOUGHTS, CROSSES_WIN);

    // Crosses, the human here, played the winning move, so only that ply comes
    // back and the human is on move again.
    expect(game.current.gameWon).toBe(CROS);
    expect(game.undoCount()).toBe(1);
    game.undo();
    expect(game.current.isTerminal()).toBe(false);
    expect(game.current.player).toBe(CROS);
  });
});

describe('restore', () => {
  it('replays a saved game', () => {
    const moves = CROSSES_WIN.slice(0, 25);
    const game = Game.restore(AI_NOUGHTS, moves);

    expect(game).not.toBeNull();
    expect(game!.moves()).toEqual(moves);
    expect(game!.style).toBe(AI_NOUGHTS);
  });

  it('rejects a move list that does not replay', () => {
    expect(Game.restore(HUMANS, [40, 40])).toBeNull();
    expect(Game.restore(HUMANS, [999])).toBeNull();
    expect(Game.restore(HUMANS, [1.5])).toBeNull();
  });

  it('accepts an empty move list', () => {
    expect(Game.restore(HUMANS, [])?.moveCount).toBe(0);
  });
});

describe('isGameStyle', () => {
  it('accepts only the three styles', () => {
    expect([0, 1, 2].every(isGameStyle)).toBe(true);
    expect([-1, 3, 1.5].some(isGameStyle)).toBe(false);
  });
});

describe('humanMoveCount', () => {
  it('counts every move in a two player game', () => {
    expect(gameAfter(HUMANS, [40, 30]).humanMoveCount).toBe(2);
  });

  it('ignores the opening move the AI makes for itself', () => {
    const game = gameAfter(AI_CROSSES, [40]);
    expect(game.humanMoveCount).toBe(0);

    game.playMove(30);
    expect(game.humanMoveCount).toBe(1);
  });

  it('counts the human moves when the AI plays second', () => {
    const game = gameAfter(AI_NOUGHTS, [40, 30]);
    expect(game.humanMoveCount).toBe(1);
  });
});
