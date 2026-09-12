// The how-to-play screen: the text and illustrations of www/how_to_play.html,
// which the iOS app showed in a web view.
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

import { html } from './dom.js';
import type { View } from './router.js';

/** Rule illustrations, served from the site root next to the bundle. */
const STEP_IMAGES = import.meta.env.BASE_URL + 'rules/img/';

function step(file: string, alt: string): string {
  return `
    <figure>
      <img src="${STEP_IMAGES}${file}" width="540" height="540" alt="${alt}" loading="lazy">
      <figcaption>${alt}</figcaption>
    </figure>
  `;
}

export function createRulesView(): View {
  const element = html<HTMLElement>(`
    <article class="rules">
      <h2>How to Play</h2>

      <p>
        TicTacToe Ultimatum implements the game of Ultimate Tic-Tac-Toe, an expanded version of
        the classic game of Tic-Tac-Toe. The rules are the standard rules of Ultimate
        Tic-Tac-Toe. The game is played on a 9x9 grid of cells that is further subdivided into
        nine 3x3 sections.
      </p>

      <p>
        The first player (Crosses) plays by placing crosses (X) on the board. The second player
        (Noughts) places noughts (O) on the board. To be considerate to our friends with colour
        blindness, the crosses and noughts are coloured in blue and yellow-orange, colours
        friendly to colour-blind people.
      </p>

      <p>
        For the Crosses first move the board is wide open and Crosses can place an X anywhere.
        The app helpfully highlights the legal moves in the lighter version of the player's
        colour, so at the beginning of the game, the entire board is highlighted in light blue.
      </p>

      ${step('step1.png', 'Initial board position')}

      <p>
        Subsequent moves must be made in the section determined by the opponent's previous move.
        For example, Crosses places the first cross in the central section, top left cell. Now
        Noughts must play in the top left section of the board. To help bring attention to this
        fact, the app highlights the top left section in light orange.
      </p>

      ${step('step2.png', 'After the first move by Crosses')}

      <p>
        Let's say, further, Noughts plays in the top left section top right cell. Now Crosses
        must play in the top right section of the board. The app will highlight this section
        with light blue. Furthermore, notice how the most recent move is also highlighted. This
        is especially useful when playing against the AI.
      </p>

      ${step('step3.png', 'After the first move by Noughts')}

      <h3>To win a section</h3>

      <p>
        Consider the board on the picture below. Crosses has just played in the top left section,
        middle right cell. You can see the background of this cell is highlighted in light blue.
        Now Noughts must play in the middle right section. This entire section is highlighted in
        light orange.
      </p>

      ${step('step4.png', 'Just before winning a section')}

      <p>
        If Noughts plays in the left bottom cell of its section, Noughts will have noughts in 3
        cells in this section arranged in a vertical row. Top left, middle left, and bottom left.
        This wins this section for Noughts. Instead of a play board there will be one big orange
        nought displayed in this section to indicate that this section has been won by Noughts.
        No player may place marks there anymore. The board will look as shown in the picture
        below. Notice that Crosses must play in the bottom left section.
      </p>

      ${step('step5.png', 'After winning a section')}

      <h3>Wildcard play</h3>

      <p>
        Consider the board below. Crosses is about to play in the middle left section, in the
        central cell. This would normally require Noughts to play in the central section of the
        board. But in this game the central section has already been won and no further play is
        possible.
      </p>

      ${step('step6.png', 'A move that points at a section already won')}

      <p>
        What happens in this case is wildcard play. Noughts cannot play in the section they would
        normally be required to play in, so they get the right to play in any section that has
        not been filled or won yet. The board will look like this.
      </p>

      ${step('step7.png', 'Wildcard play: every unfinished section is open')}

      <h3>To win the entire game</h3>

      <p>
        Now Noughts have an option to play in the bottom right section, top left cell. This move
        will win that section for Noughts, because they will have 3 noughts in a diagonal row in
        this section: top left, centre, bottom right. And now that this section has been won,
        Noughts will have 3 sections in a vertical row that they have won. Top right section,
        middle right section, and this bottom right section. This wins the entire game for
        Noughts. The board will look as shown below.
      </p>

      ${step('step8.png', 'Winning the entire game')}

      <h3>About</h3>

      <p>
        &copy; 2019 Max Khrapov<br>
        Licensed under the Apache License, Version 2.0 (the "License")<br>
        <a href="https://www.apache.org/licenses/LICENSE-2.0">https://www.apache.org/licenses/LICENSE-2.0</a><br>
        <a href="https://github.com/mkhrapov/tictactoe-ultimatum">The original iOS app</a><br>
        <a href="https://github.com/mkhrapov/tictactoe-ultimatum.ts">This web version</a>
      </p>
    </article>
  `);

  return { element };
}
