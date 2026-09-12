/** Small deterministic PRNG so AI tests are reproducible. */
export function mulberry32(seed: number): () => number {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Complete random games, recorded with the engine itself, used as fixtures.
 * Each is a list of cell indexes played in order from the empty board.
 */
export const CROSSES_WIN = [
  0, 1, 23, 78, 64, 39, 37, 31, 13, 49, 59, 7, 21, 65, 34, 5, 15, 38, 42, 47, 61, 22, 58, 3, 9, 28,
  12, 45, 54, 20, 70, 41, 51, 74, 71, 53, 80, 60, 2, 16, 40, 30, 10, 50, 69, 29, 17, 52, 75, 72, 56,
  8, 6, 11, 44, 33, 18, 63, 32, 24, 73, 77, 57, 48, 55,
];

export const NOUGHTS_WIN = [
  59, 8, 15, 37, 49, 75, 64, 32, 25, 57, 19, 66, 36, 46, 43, 30, 11, 35, 26, 60, 20, 61, 4, 5, 6, 18,
  63, 38, 53, 69, 29, 16, 31, 14, 33, 0, 10, 50, 62, 24, 54, 9, 45, 56, 70, 39, 47, 80, 79, 40, 78,
  55, 22, 74, 72, 23,
];

export const DRAWN_GAME = [
  50, 60, 10, 49, 77, 69, 38, 51, 63, 47, 71, 42, 27, 9, 29, 7, 13, 30, 2, 25, 59, 8, 6, 11, 44, 52,
  66, 36, 45, 65, 43, 32, 24, 64, 41, 53, 62, 26, 61, 5, 16, 31, 4, 22, 68, 12, 28, 3, 19, 78, 55,
  23, 56, 15, 17, 54, 20, 74, 18, 21,
];
