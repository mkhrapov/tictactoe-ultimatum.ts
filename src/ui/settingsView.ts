// The settings screen: ported from SettingsViewController.swift.
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

import { AI_CROSSES, AI_NOUGHTS, HUMANS, type GameStyle } from '../game/game.js';
import { AI_LEVEL_COUNT, settings } from '../settings.js';
import { html } from './dom.js';
import type { View } from './router.js';

const GAME_STYLES: { value: GameStyle; label: string; explanation: string }[] = [
  { value: HUMANS, label: 'Humans', explanation: 'Humans play both sides.' },
  { value: AI_CROSSES, label: 'AI Crosses', explanation: 'AI plays Crosses.' },
  { value: AI_NOUGHTS, label: 'AI Noughts', explanation: 'AI plays Noughts.' },
];

/** Level 1 answers at random; the rest search, with the playout counts rising. */
const LEVEL_EXPLANATIONS = [
  'Plays at random, apart from taking a win it can see.',
  'Thinks a little: 100 playouts for every move it considers.',
  'Thinks more: 200 playouts for every move it considers.',
  'Thinks harder: 400 playouts for every move it considers.',
  'Thinks hardest: 1000 playouts for every move it considers, and is slower to answer.',
];

export function createSettingsView(): View {
  const element = html<HTMLElement>(`
    <section class="settings">
      <h2>Settings</h2>

      <fieldset class="field">
        <legend>Select the game style</legend>
        <div class="segmented game-style"></div>
        <p class="explanation style-explanation"></p>
      </fieldset>

      <fieldset class="field">
        <legend>Select AI level</legend>
        <div class="segmented ai-level"></div>
        <p class="explanation level-explanation"></p>
      </fieldset>

      <p class="note">
        A change of game style applies to the next new game, so a game already
        under way is never interrupted.
      </p>
    </section>
  `);

  const styleGroup = element.querySelector<HTMLDivElement>('.game-style')!;
  const levelGroup = element.querySelector<HTMLDivElement>('.ai-level')!;
  const styleExplanation = element.querySelector<HTMLParagraphElement>('.style-explanation')!;
  const levelExplanation = element.querySelector<HTMLParagraphElement>('.level-explanation')!;

  for (const style of GAME_STYLES) {
    const button = html<HTMLButtonElement>(
      `<button type="button" role="radio" value="${style.value}">${style.label}</button>`,
    );
    button.addEventListener('click', () => {
      settings.gameStyle = style.value;
      refresh();
    });
    styleGroup.append(button);
  }

  for (let level = 0; level < AI_LEVEL_COUNT; level++) {
    const button = html<HTMLButtonElement>(
      `<button type="button" role="radio" value="${level}">${level + 1}</button>`,
    );
    button.addEventListener('click', () => {
      settings.aiLevel = level;
      refresh();
    });
    levelGroup.append(button);
  }

  styleGroup.setAttribute('role', 'radiogroup');
  styleGroup.setAttribute('aria-label', 'Game style');
  levelGroup.setAttribute('role', 'radiogroup');
  levelGroup.setAttribute('aria-label', 'AI level');

  function select(group: HTMLElement, value: number): void {
    for (const button of group.querySelectorAll<HTMLButtonElement>('button')) {
      const selected = Number(button.value) === value;
      button.classList.toggle('selected', selected);
      button.setAttribute('aria-checked', String(selected));
    }
  }

  function refresh(): void {
    const style = settings.gameStyle;
    const level = settings.aiLevel;

    select(styleGroup, style);
    select(levelGroup, level);

    styleExplanation.textContent =
      GAME_STYLES.find((s) => s.value === style)?.explanation ?? '';
    levelExplanation.textContent = LEVEL_EXPLANATIONS[level] ?? '';
  }

  return {
    element,
    mount: refresh,
  };
}
