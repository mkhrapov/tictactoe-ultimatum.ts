// The Monte Carlo search runs here so that a thinking AI never blocks the UI,
// which is what the main thread's DispatchQueue hop did in the iOS app.
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

import { chooseMove } from './ai.js';
import type { AiRequest, AiResponse } from './protocol.js';

self.onmessage = (event: MessageEvent<AiRequest>) => {
  const { id, state, level } = event.data;
  const move = chooseMove(new Int8Array(state), level);
  const response: AiResponse = { id, move };
  self.postMessage(response);
};
