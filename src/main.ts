// Application shell: the nav bar of the iOS app, as a hash-routed page.
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

import './style.css';
import { html } from './ui/dom.js';
import { Router, type Route } from './ui/router.js';
import { createPlayView } from './ui/playView.js';
import { createRulesView } from './ui/rulesView.js';
import { createSettingsView } from './ui/settingsView.js';

const routes: Route[] = [
  { path: '/play', label: 'Play', title: 'Play', create: createPlayView },
  { path: '/settings', label: 'Settings', title: 'Settings', create: createSettingsView },
  { path: '/rules', label: 'How to Play', title: 'How to Play', create: createRulesView },
];

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) {
  throw new Error('#app is missing from the page');
}

const shell = html<HTMLElement>(`
  <div class="shell">
    <header class="app-bar">
      <a class="brand" href="#/play">TicTacToe&nbsp;Ultimatum</a>
      <nav class="tabs" aria-label="Main"></nav>
    </header>
    <main id="view" class="view"></main>
  </div>
`);

const nav = shell.querySelector<HTMLElement>('.tabs')!;
const view = shell.querySelector<HTMLElement>('.view')!;

const links = routes.map((route) => {
  const link = html<HTMLAnchorElement>(`<a href="#${route.path}">${route.label}</a>`);
  nav.append(link);
  return { route, link };
});

app.replaceChildren(shell);

new Router(view, routes, (active) => {
  for (const { route, link } of links) {
    const current = route.path === active.path;
    link.classList.toggle('active', current);
    if (current) {
      link.setAttribute('aria-current', 'page');
    } else {
      link.removeAttribute('aria-current');
    }
  }
  view.scrollTo?.({ top: 0 });
  window.scrollTo({ top: 0 });
}).start();
