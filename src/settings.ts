// The web stand-in for UserDefaults: settings and the game in progress, kept in
// localStorage so a reload does not lose them.
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

import { HUMANS, isGameStyle, type GameStyle } from './game/game.js';

// The key names of the iOS app are kept, for no reason other than continuity.
const GAME_STYLE_KEY = 'gameStyleKey';
const AI_LEVEL_KEY = 'aiLevelKey';
const SAVED_GAME_KEY = 'savedGame';

/** Levels 1..5 in the interface; index 0 answers at random. */
export const AI_LEVEL_COUNT = 5;
export const MIN_AI_LEVEL = 0;
export const MAX_AI_LEVEL = AI_LEVEL_COUNT - 1;

export interface SavedGame {
  style: GameStyle;
  moves: number[];
}

/** localStorage is unavailable in some privacy modes; settings then last for the session. */
function readItem(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeItem(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // nothing to do: the game still runs, it just will not be remembered
  }
}

function removeItem(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

function readInt(key: string, fallback: number): number {
  const raw = readItem(key);
  if (raw === null) {
    return fallback;
  }
  const value = Number.parseInt(raw, 10);
  return Number.isFinite(value) ? value : fallback;
}

type Listener = () => void;

class Settings {
  private listeners = new Set<Listener>();

  get gameStyle(): GameStyle {
    const value = readInt(GAME_STYLE_KEY, HUMANS);
    return isGameStyle(value) ? value : HUMANS;
  }

  set gameStyle(style: GameStyle) {
    if (style === this.gameStyle) {
      return;
    }
    writeItem(GAME_STYLE_KEY, String(style));
    this.emit();
  }

  /** 0..4, matching the five level buttons of the iOS settings screen. */
  get aiLevel(): number {
    const value = readInt(AI_LEVEL_KEY, MIN_AI_LEVEL);
    return Math.min(MAX_AI_LEVEL, Math.max(MIN_AI_LEVEL, value));
  }

  set aiLevel(level: number) {
    if (level === this.aiLevel) {
      return;
    }
    writeItem(AI_LEVEL_KEY, String(level));
    this.emit();
  }

  /** The game in progress, or null when there is nothing worth restoring. */
  get savedGame(): SavedGame | null {
    const raw = readItem(SAVED_GAME_KEY);
    if (raw === null) {
      return null;
    }

    try {
      const parsed: unknown = JSON.parse(raw);
      if (typeof parsed !== 'object' || parsed === null) {
        return null;
      }

      const { style, moves } = parsed as { style?: unknown; moves?: unknown };
      if (typeof style !== 'number' || !isGameStyle(style)) {
        return null;
      }
      if (!Array.isArray(moves) || !moves.every((m) => typeof m === 'number')) {
        return null;
      }

      return { style, moves };
    } catch {
      return null;
    }
  }

  saveGame(game: SavedGame): void {
    writeItem(SAVED_GAME_KEY, JSON.stringify(game));
  }

  clearSavedGame(): void {
    removeItem(SAVED_GAME_KEY);
  }

  /** Notifies when a setting changes, so an open view can follow along. */
  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }
}

export const settings = new Settings();
