// A hash router, so the whole app stays static files with no server rewrites.
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

export interface View {
  readonly element: HTMLElement;
  /** Called after the view is placed in the document. */
  mount?(): void;
  /** Called before the view is removed; release timers, observers and workers here. */
  unmount?(): void;
}

export interface Route {
  path: string;
  label: string;
  title: string;
  create: () => View;
}

export class Router {
  private current: View | null = null;
  private currentPath = '';

  constructor(
    private readonly container: HTMLElement,
    private readonly routes: Route[],
    private readonly onNavigate: (route: Route) => void,
  ) {}

  start(): void {
    window.addEventListener('hashchange', () => this.render());
    this.render();
  }

  private routeFor(path: string): Route {
    return this.routes.find((route) => route.path === path) ?? this.routes[0];
  }

  private render(): void {
    const path = window.location.hash.replace(/^#/, '') || this.routes[0].path;
    const route = this.routeFor(path);

    if (route.path !== path) {
      // unknown route: settle on the default one
      window.location.replace(`#${route.path}`);
      return;
    }

    if (this.currentPath === route.path && this.current) {
      return;
    }

    this.current?.unmount?.();
    this.container.replaceChildren();

    const view = route.create();
    this.container.append(view.element);
    this.current = view;
    this.currentPath = route.path;
    view.mount?.();

    document.title = `${route.title} — TicTacToe Ultimatum`;
    this.onNavigate(route);
  }
}
