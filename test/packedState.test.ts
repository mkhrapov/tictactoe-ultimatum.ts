import { describe, expect, it } from 'vitest';
import { BoardState } from '../src/game/boardState.js';
import { CROS, NOUG, OPEN } from '../src/game/constants.js';
import {
  ALLOWED,
  CLOSED,
  GAME_WON,
  PLAYER,
  calcLegalMoves,
  calcLegalMovesUnordered,
  isTerminal,
  pack,
  set,
} from '../src/ai/packedState.js';
import { CROSSES_WIN, DRAWN_GAME, NOUGHTS_WIN, mulberry32 } from './testUtil.js';

/** The packed board the search runs on must stay in step with BoardState. */
function expectSameState(packed: Int8Array, bs: BoardState, at: string) {
  expect(Array.from(packed.subarray(0, 81)), `cells ${at}`).toEqual(Array.from(bs.cells));
  expect(Array.from(packed.subarray(ALLOWED, ALLOWED + 9)), `allowed ${at}`).toEqual(
    Array.from(bs.allowedSegments),
  );
  expect(Array.from(packed.subarray(CLOSED, CLOSED + 9)), `closed ${at}`).toEqual(
    Array.from(bs.closedSegments),
  );
  expect(packed[PLAYER], `player ${at}`).toBe(bs.player);
  expect(packed[GAME_WON], `gameWon ${at}`).toBe(bs.gameWon);
}

describe('packed state', () => {
  it('matches BoardState move for move through complete games', () => {
    for (const [name, moves] of Object.entries({ CROSSES_WIN, NOUGHTS_WIN, DRAWN_GAME })) {
      const bs = new BoardState();
      const packed = pack(bs);

      moves.forEach((move, i) => {
        bs.setMove(move);
        set(packed, move);
        expectSameState(packed, bs, `${name} after ply ${i + 1}`);
        expect(isTerminal(packed)).toBe(bs.isTerminal());
      });
    }
  });

  it('matches BoardState across random games', () => {
    const random = mulberry32(7);

    for (let game = 0; game < 25; game++) {
      const bs = new BoardState();
      const packed = pack(bs);

      while (!bs.isTerminal()) {
        const moves = bs.allLegalMoveIndexes();
        if (moves.length === 0) {
          break;
        }
        const move = moves[Math.floor(random() * moves.length)];
        bs.setMove(move);
        set(packed, move);
        expectSameState(packed, bs, `random game ${game}`);
      }
    }
  });

  it('lists the same legal moves as BoardState, in ascending order', () => {
    const bs = new BoardState();
    bs.setMove(40);
    const packed = pack(bs);
    const out = new Int32Array(81);

    const count = calcLegalMoves(packed, out);
    expect(Array.from(out.subarray(0, count))).toEqual(bs.allLegalMoveIndexes());
  });

  it('lists the same legal moves unordered, including during wildcard play', () => {
    const random = mulberry32(11);
    const bs = new BoardState();
    const packed = pack(bs);
    const out = new Int32Array(81);
    let sawWildcard = false;
    let ply = 0;

    while (!bs.isTerminal()) {
      const expected = bs.allLegalMoveIndexes();
      if (expected.length === 0) {
        break;
      }

      const count = calcLegalMovesUnordered(packed, out);
      expect(Array.from(out.subarray(0, count)).sort((a, b) => a - b)).toEqual(expected);

      if (ply > 0 && Array.from(bs.allowedSegments).reduce((a, b) => a + b, 0) > 1) {
        sawWildcard = true;
      }

      const move = expected[Math.floor(random() * expected.length)];
      bs.setMove(move);
      set(packed, move);
      ply++;
    }

    expect(sawWildcard).toBe(true);
    expect(calcLegalMovesUnordered(packed, out)).toBe(0);
  });

  it('ignores an illegal move, like the C original', () => {
    const bs = new BoardState();
    bs.setMove(40);
    const packed = pack(bs);
    const before = Array.from(packed);

    set(packed, 40); // occupied
    set(packed, 0); // outside the allowed section
    set(packed, -1);
    set(packed, 81);

    expect(Array.from(packed)).toEqual(before);
  });

  it('packs a position faithfully', () => {
    const bs = new BoardState();
    for (const move of CROSSES_WIN.slice(0, 30)) {
      bs.setMove(move);
    }
    const packed = pack(bs);

    expectSameState(packed, bs, 'after packing');
    expect([CROS, NOUG]).toContain(packed[PLAYER]);
    expect(packed[GAME_WON]).toBe(OPEN);
  });
});
