import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

/**
 * Root component. A thin `<router-outlet />` host: the authenticated chrome
 * (nav + content) lives in the `Shell` layout (`layout/shell.ts`), which all
 * guarded routes render inside; the public `/login` route renders standalone.
 */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {}
