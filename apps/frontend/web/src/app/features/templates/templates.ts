import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { TemplateEditor } from './editor/template-editor';
import type { DraftRenderPayload } from './template.types';

/**
 * Routed host for the template authoring surface (U13). Reads an optional
 * `?identifier=` query param (the template to edit) and hands it to the
 * {@link TemplateEditor}. The editor's Save seam is stubbed here — U14 replaces
 * {@link onSave} with the draft-render + confirm + persist flow.
 */
@Component({
  selector: 'app-templates',
  imports: [TemplateEditor],
  template: `
    <app-template-editor
      [identifier]="identifier()"
      (save)="onSave($event)"
    />
  `,
})
export class Templates {
  private readonly route = inject(ActivatedRoute);

  protected readonly identifier = signal<string | null>(
    this.route.snapshot.queryParamMap.get('identifier'),
  );

  /**
   * Stubbed Save handler (R17). U14 fills this with the true-preview-on-save
   * gate: POST `/v1/templates/draft-render`, confirm dialog, then create/update.
   * Today it only surfaces the draft payload the editor assembled.
   */
  protected onSave(_payload: DraftRenderPayload): void {
    // U14: draft-render + confirm + persist. Intentionally a no-op for now.
  }
}
