import { Component } from '@angular/core';

/**
 * Placeholder for the documents surface (generate / poll / download, library,
 * upload). Replaced by the real UI in U15 (R18–R20).
 */
@Component({
  selector: 'app-documents',
  template: `
    <section class="feature-placeholder" data-testid="documents-placeholder">
      <h1>Documents</h1>
      <p>Document generation, library, and upload arrive in U15.</p>
    </section>
  `,
})
export class Documents {}
