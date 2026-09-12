import { BoardState } from '../src/game/boardState.js';
import { pack } from '../src/ai/packedState.js';
import { chooseMove } from '../src/ai/ai.js';

function timed(label: string, fn: () => void) {
  const t0 = performance.now();
  fn();
  console.log(`${label}: ${(performance.now() - t0).toFixed(0)} ms`);
}

// worst case: AI on a wide open board (81 candidate moves)
const opening = new BoardState();
timed('level 4 (1000 iter), open board', () => {
  console.log('  move =', chooseMove(pack(opening), 4));
});

// realistic: AI replying inside one 9-cell section
const mid = new BoardState();
mid.set(4, 4);
timed('level 4 (1000 iter), single section', () => {
  console.log('  move =', chooseMove(pack(mid), 4));
});
timed('level 2 (200 iter), single section', () => {
  console.log('  move =', chooseMove(pack(mid), 2));
});
