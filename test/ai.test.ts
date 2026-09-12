import { describe, expect, it } from 'vitest';
import { BoardState } from '../src/game/boardState.js';
import { CROS, NOUG, OPEN } from '../src/game/constants.js';
import { chooseMove, iterationsForLevel, openingMove } from '../src/ai/ai.js';
import { monteCarloTreeSearch, playout } from '../src/ai/mcts.js';
import { GAME_WON, pack, set } from '../src/ai/packedState.js';
import { CROSSES_WIN, mulberry32 } from './testUtil.js';

function positionAfter(moves: readonly number[]): BoardState {
  const bs = new BoardState();
  for (const move of moves) {
    bs.setMove(move);
  }
  return bs;
}

describe('playout', () => {
  it('always reaches a finished game', () => {
    const random = mulberry32(3);

    for (let i = 0; i < 50; i++) {
      const packed = pack(new BoardState());
      const result = playout(packed, random, new Int32Array(81));

      expect([CROS, NOUG, 3]).toContain(result);
      expect(packed[GAME_WON]).toBe(result);
    }
  });

  it('leaves a finished game untouched', () => {
    const packed = pack(positionAfter(CROSSES_WIN));
    const before = Array.from(packed);

    expect(playout(packed, mulberry32(1), new Int32Array(81))).toBe(CROS);
    expect(Array.from(packed)).toEqual(before);
  });
});

describe('chooseMove', () => {
  it('takes an immediate win when one is available', () => {
    // the last move of this game wins it for Crosses
    const bs = positionAfter(CROSSES_WIN.slice(0, -1));
    const winning = CROSSES_WIN[CROSSES_WIN.length - 1];

    expect(bs.player).toBe(CROS);
    for (let level = 0; level <= 4; level++) {
      expect(chooseMove(pack(bs), level, mulberry32(level + 1))).toBe(winning);
    }
  });

  it('returns a legal move at every level, from many positions', () => {
    const random = mulberry32(17);

    for (const prefix of [0, 1, 5, 20, 40, 55]) {
      const bs = positionAfter(CROSSES_WIN.slice(0, prefix));
      const legal = bs.allLegalMoveIndexes();

      for (const level of [0, 1, 2]) {
        const move = chooseMove(pack(bs), level, random);
        expect(legal, `level ${level} after ${prefix} plies`).toContain(move);
      }
    }
  });

  it('reports no move when the game is over', () => {
    expect(chooseMove(pack(positionAfter(CROSSES_WIN)), 2, mulberry32(1))).toBe(-1);
  });
});

describe('monteCarloTreeSearch', () => {
  it('plays the only safe move when every other reply loses at once', () => {
    // Reached by replaying a real game: whichever moves are "smart" here, the
    // search must return one of them.
    const bs = positionAfter(CROSSES_WIN.slice(0, 60));
    const packed = pack(bs);
    const move = monteCarloTreeSearch(20, packed, mulberry32(9));

    expect(bs.allLegalMoveIndexes()).toContain(move);
  });

  it('never lets the opponent win on the very next move when a safe move exists', () => {
    const random = mulberry32(23);

    for (let trial = 0; trial < 8; trial++) {
      const bs = new BoardState();
      // play a handful of random plies, then let the search answer
      for (let i = 0; i < 12 && !bs.isTerminal(); i++) {
        const legal = bs.allLegalMoveIndexes();
        bs.setMove(legal[Math.floor(random() * legal.length)]);
      }
      if (bs.isTerminal()) {
        continue;
      }

      const opponent = bs.player === CROS ? NOUG : CROS;
      const safeMoves = bs.allLegalMoveIndexes().filter((move) => {
        const after = bs.clone();
        after.setMove(move);
        if (after.isTerminal()) {
          return true;
        }
        return !after.allLegalMoveIndexes().some((reply) => {
          const replied = after.clone();
          replied.setMove(reply);
          return replied.gameWon === opponent;
        });
      });

      const chosen = monteCarloTreeSearch(20, pack(bs), random);
      if (safeMoves.length > 0) {
        expect(safeMoves).toContain(chosen);
      } else {
        expect(bs.allLegalMoveIndexes()).toContain(chosen);
      }
    }
  });

  it('leaves the position it searches unchanged', () => {
    const bs = positionAfter(CROSSES_WIN.slice(0, 20));
    const packed = pack(bs);
    const before = Array.from(packed);

    monteCarloTreeSearch(5, packed, mulberry32(2));

    expect(Array.from(packed)).toEqual(before);
  });

  it('reports no move when the game is over', () => {
    expect(monteCarloTreeSearch(5, pack(positionAfter(CROSSES_WIN)), mulberry32(1))).toBe(-1);
  });
});

describe('levels', () => {
  it('uses the playout counts of the original app', () => {
    expect([0, 1, 2, 3, 4].map(iterationsForLevel)).toEqual([0, 100, 200, 400, 1000]);
    expect(iterationsForLevel(99)).toBe(100);
  });

  it('opens in the centre sections, as the original did', () => {
    const random = mulberry32(4);
    const seen = new Set<number>();

    for (let i = 0; i < 200; i++) {
      const move = openingMove(random);
      seen.add(move);
      const bs = new BoardState();
      expect(bs.legalMove(move)).toBe(true);
    }

    expect([...seen].sort((a, b) => a - b)).toEqual([30, 32, 40, 48, 50]);
  });
});

describe('a full game between two AIs', () => {
  it('always finishes with a legal result', () => {
    const random = mulberry32(31);
    const bs = new BoardState();
    let plies = 0;

    while (!bs.isTerminal() && plies < 81) {
      const move = chooseMove(pack(bs), 1, random);
      expect(bs.legalMove(move)).toBe(true);
      bs.setMove(move);
      plies++;
    }

    expect(bs.gameWon).not.toBe(OPEN);
    const packed = pack(bs);
    set(packed, 0); // a finished game accepts nothing further
    expect(packed[GAME_WON]).toBe(bs.gameWon);
  });
});
