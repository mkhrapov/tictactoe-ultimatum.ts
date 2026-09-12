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

/** Message sent to the AI worker: a packed board plus the difficulty level. */
export interface AiRequest {
  id: number;
  /** A PackedState, transferred rather than copied. */
  state: ArrayBuffer;
  level: number;
}

/** Message returned by the AI worker: the chosen cell index, or -1 for none. */
export interface AiResponse {
  id: number;
  move: number;
}
