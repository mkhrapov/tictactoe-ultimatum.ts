import { describe, expect, it } from 'vitest';
import { BoardState, NO_RECENT_MOVE } from '../src/game/boardState.js';
import {
  CROS,
  DONE,
  NOUG,
  OPEN,
  SECTION_LOCATIONS,
  ownSection,
  targetSection,
} from '../src/game/constants.js';
import { CROSSES_WIN, DRAWN_GAME, NOUGHTS_WIN } from './testUtil.js';

function play(moves: readonly number[]): BoardState {
  const bs = new BoardState();
  for (const move of moves) {
    expect(bs.setMove(move)).toBe(true);
  }
  return bs;
}

describe('opening position', () => {
  it('starts empty with Crosses to move and the whole board open', () => {
    const bs = new BoardState();

    expect(bs.player).toBe(CROS);
    expect(bs.gameWon).toBe(OPEN);
    expect(bs.isTerminal()).toBe(false);
    expect(bs.mostRecent).toBe(NO_RECENT_MOVE);
    expect(Array.from(bs.cells).every((c) => c === OPEN)).toBe(true);
    expect(Array.from(bs.allowedSegments)).toEqual([1, 1, 1, 1, 1, 1, 1, 1, 1]);
    expect(bs.allLegalMoves()).toHaveLength(81);
  });
});

describe('legality', () => {
  it('rejects coordinates off the board', () => {
    const bs = new BoardState();

    expect(bs.legalPlay(-1, 0)).toBe(false);
    expect(bs.legalPlay(0, -1)).toBe(false);
    expect(bs.legalPlay(9, 0)).toBe(false);
    expect(bs.legalPlay(0, 9)).toBe(false);
  });

  it('rejects an occupied cell', () => {
    const bs = new BoardState();
    bs.set(4, 4);

    expect(bs.legalPlay(4, 4)).toBe(false);
    expect(bs.set(4, 4)).toBe(false);
  });

  it('rejects a move outside the section the opponent was sent to', () => {
    const bs = new BoardState();
    bs.set(0, 0); // sends the opponent to section 0

    expect(bs.legalPlay(4, 4)).toBe(false);
    expect(bs.legalPlay(1, 1)).toBe(true);
  });

  it('rejects any move once the game is over', () => {
    const bs = play(CROSSES_WIN);

    expect(bs.isTerminal()).toBe(true);
    expect(bs.allLegalMoves()).toHaveLength(0);
  });
});

describe('sending the opponent to a section', () => {
  it('confines the next move to the section matching the cell just played', () => {
    for (let move = 0; move < 81; move++) {
      const bs = new BoardState();
      const x = move % 9;
      const y = Math.floor(move / 9);
      bs.set(x, y);

      const expected = targetSection(x, y);
      for (let section = 0; section < 9; section++) {
        expect(bs.isSegmentAllowed(section)).toBe(section === expected);
      }
    }
  });

  it('alternates players and records the most recent cell', () => {
    const bs = new BoardState();
    bs.set(4, 4);

    expect(bs.player).toBe(NOUG);
    expect(bs.mostRecent).toBe(40);
    expect(bs.cellAt(4, 4)).toBe(CROS);

    bs.set(3, 3);

    expect(bs.player).toBe(CROS);
    expect(bs.mostRecent).toBe(30);
    expect(bs.cellAt(3, 3)).toBe(NOUG);
  });
});

describe('winning a section', () => {
  it('closes the section for the winner and locks its empty cells', () => {
    const before = play(CROSSES_WIN.slice(0, 44));
    const after = play(CROSSES_WIN.slice(0, 45));

    const wonSections = (bs: BoardState) =>
      [0, 1, 2, 3, 4, 5, 6, 7, 8].filter(
        (i) => bs.sectionAt(i) === CROS || bs.sectionAt(i) === NOUG,
      );

    expect(wonSections(before)).toEqual([]);
    expect(wonSections(after)).toHaveLength(1);

    const section = wonSections(after)[0];
    expect(after.won(after.sectionAt(section) as number, section)).toBe(true);
    expect(after.segmentClosed(section)).toBe(true);
    expect(after.isSegmentAllowed(section)).toBe(false);

    // the cells still empty inside a won section are out of play for good
    for (const cell of SECTION_LOCATIONS[section]) {
      if (after.cells[cell] === OPEN) {
        expect(after.legalMove(cell)).toBe(false);
      }
    }
  });

  it('reports a section won by three in a row', () => {
    // three crosses down the left column of section 0
    const bs = new BoardState();
    bs.cells[0] = CROS;
    bs.cells[9] = CROS;
    bs.cells[18] = CROS;

    expect(bs.won(CROS, 0)).toBe(true);
    expect(bs.won(NOUG, 0)).toBe(false);
    expect(bs.won(CROS, 1)).toBe(false);
  });

  it('treats a section with no empty cell as full', () => {
    const bs = new BoardState();
    expect(bs.full(0)).toBe(false);

    for (const cell of [0, 1, 2, 9, 10, 11, 18, 19, 20]) {
      bs.cells[cell] = CROS;
    }

    expect(bs.full(0)).toBe(true);
    expect(bs.full(1)).toBe(false);
  });
});

describe('wildcard play', () => {
  it('opens every unfinished section when the target section is closed', () => {
    const bs = play(CROSSES_WIN.slice(0, 58));
    const allowed = Array.from(bs.allowedSegments).reduce((a, b) => a + b, 0);

    expect(allowed).toBeGreaterThan(1);
    // only sections that are still open may be played in
    for (let section = 0; section < 9; section++) {
      if (bs.isSegmentAllowed(section)) {
        expect(bs.segmentClosed(section)).toBe(false);
      }
    }
  });
});

describe('ending the game', () => {
  it('awards the game to Crosses and records the winning line', () => {
    const bs = play(CROSSES_WIN);

    expect(bs.gameWon).toBe(CROS);
    expect(bs.isTerminal()).toBe(true);
    expect(Array.from(bs.closedSegments)).toEqual([1, 0, 2, 2, 2, 0, 1, 1, 1]);
    expect(bs.finalStrikeStart).toBe(6);
    expect(bs.finalStrikeEnd).toBe(8);
  });

  it('awards the game to Noughts', () => {
    const bs = play(NOUGHTS_WIN);

    expect(bs.gameWon).toBe(NOUG);
    expect(bs.finalStrikeStart).toBe(0);
    expect(bs.finalStrikeEnd).toBe(2);
  });

  it('declares a draw when every section is closed with no line', () => {
    const bs = play(DRAWN_GAME);

    expect(bs.gameWon).toBe(DONE);
    expect(bs.entireBoardIsFull()).toBe(true);
    expect(bs.finalStrikeStart).toBe(-1);
    expect(Array.from(bs.allowedSegments)).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 0]);
  });

  it('leaves no legal move in a finished game', () => {
    for (const game of [CROSSES_WIN, NOUGHTS_WIN, DRAWN_GAME]) {
      expect(play(game).allLegalMoveIndexes()).toEqual([]);
    }
  });
});

describe('clone', () => {
  it('copies the position without sharing state', () => {
    const bs = play(CROSSES_WIN.slice(0, 20));
    const child = bs.clone();

    expect(Array.from(child.cells)).toEqual(Array.from(bs.cells));
    expect(Array.from(child.closedSegments)).toEqual(Array.from(bs.closedSegments));
    expect(Array.from(child.allowedSegments)).toEqual(Array.from(bs.allowedSegments));
    expect(child.player).toBe(bs.player);

    const move = child.allLegalMoveIndexes()[0];
    child.setMove(move);

    expect(bs.cells[move]).toBe(OPEN);
    expect(bs.player).not.toBe(child.player);
  });
});

describe('coordinate helpers', () => {
  it('maps a cell to the section that owns it', () => {
    expect(ownSection(0, 0)).toBe(0);
    expect(ownSection(8, 8)).toBe(8);
    expect(ownSection(4, 1)).toBe(1);
    expect(ownSection(1, 4)).toBe(3);
  });

  it('maps a cell to the section it sends the opponent to', () => {
    expect(targetSection(0, 0)).toBe(0);
    expect(targetSection(8, 8)).toBe(8);
    expect(targetSection(4, 4)).toBe(4);
    expect(targetSection(3, 5)).toBe(6);
  });
});
