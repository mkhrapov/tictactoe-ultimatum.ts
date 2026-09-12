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
import { chooseMove } from './ai.js';
import { pack } from './packedState.js';
import type { AiRequest, AiResponse } from './protocol.js';

/**
 * Runs the AI off the main thread, with a same-thread fallback for browsers
 * without module workers.
 *
 * Results of superseded requests are dropped: starting a new game or undoing
 * while the AI thinks must not drop a stale move onto the board.
 */
export class AiEngine {
  private worker: Worker | null = null;
  private nextId = 1;
  private pending = new Map<number, (move: number) => void>();

  private ensureWorker(): Worker | null {
    if (this.worker) {
      return this.worker;
    }

    if (typeof Worker === 'undefined') {
      return null;
    }

    try {
      const worker = new Worker(new URL('./worker.ts', import.meta.url), {
        type: 'module',
      });
      worker.onmessage = (event: MessageEvent<AiResponse>) => {
        const resolve = this.pending.get(event.data.id);
        if (resolve) {
          this.pending.delete(event.data.id);
          resolve(event.data.move);
        }
      };
      worker.onerror = () => {
        // fall back to the main thread for the rest of the session
        this.dropWorker();
      };
      this.worker = worker;
      return worker;
    } catch {
      return null;
    }
  }

  /** Resolves with the AI's move as a cell index 0..80, or -1 if it has none. */
  requestMove(boardState: BoardState, level: number): Promise<number> {
    const packed = pack(boardState);
    const worker = this.ensureWorker();

    if (!worker) {
      // No worker available: think on the main thread instead. A microtask hop
      // lets the caller paint its "thinking" state first.
      return Promise.resolve().then(() => chooseMove(packed, level));
    }

    const id = this.nextId++;
    return new Promise<number>((resolve) => {
      this.pending.set(id, resolve);
      const request: AiRequest = { id, state: packed.buffer as ArrayBuffer, level };
      worker.postMessage(request, [request.state]);
    });
  }

  /** Abandons any in-flight search; its result will never be delivered. */
  cancel(): void {
    if (this.pending.size === 0) {
      return;
    }
    // Tearing the worker down is the only way to stop a search already running.
    this.dropWorker();
  }

  dispose(): void {
    this.dropWorker();
  }

  private dropWorker(): void {
    this.pending.clear();
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }
}
