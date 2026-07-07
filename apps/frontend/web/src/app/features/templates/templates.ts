import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { ButtonModule } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { MessageModule } from 'primeng/message';

import { toErrorMessage } from '../../core/api/api-error';
import { TemplateEditor } from './editor/template-editor';
import type { SaveRequest } from './template.types';
import { TemplateSaveFlow } from './template-save-flow';

/**
 * Routed host for the template authoring surface (U13 + U14).
 *
 * Reads an optional `?identifier=` query param (the template to edit) and hands
 * it to the {@link TemplateEditor}. Owns the **true-preview-on-save gate**
 * (R17; AE1, AE2): on the editor's `(save)`, it calls draft-render, shows the
 * TRUE server-composed HTML in a sandboxed-iframe confirm dialog, and persists
 * ONLY after the author confirms. Cancel persists nothing and keeps the editor
 * untouched. A draft-render error surfaces inline without opening the persist
 * path. The gate logic itself lives in {@link TemplateSaveFlow}.
 */
@Component({
  selector: 'app-templates',
  imports: [TemplateEditor, Dialog, ButtonModule, MessageModule, TranslocoPipe],
  template: `
    <app-template-editor
      [identifier]="identifier()"
      (save)="onSave($event)"
    />

    @if (saveError(); as err) {
      <p-message
        severity="error"
        [text]="err"
        data-testid="save-error"
      />
    }

    @if (savedMessage(); as msg) {
      <p-message
        severity="success"
        [text]="msg"
        data-testid="save-success"
      />
    }

    <!-- AE1/AE2: the gate — TRUE server HTML in a sandboxed iframe; persist only
         fires on confirm. -->
    <p-dialog
      [header]="'templates.confirm.header' | transloco"
      [(visible)]="confirmVisible"
      [modal]="true"
      [closable]="true"
      [style]="{ width: '60rem' }"
      (onHide)="onDialogHide()"
      data-testid="confirm-dialog"
    >
      <p class="confirm-hint">
        {{ 'templates.confirm.hint' | transloco }}
      </p>
      <div class="confirm-frame-wrap">
        <div class="confirm-frame-header">
          <span class="confirm-frame-label">{{ 'templates.confirm.frameLabel' | transloco }}</span>
        </div>
        <iframe
          class="confirm-frame"
          [title]="'templates.confirm.iframeTitle' | transloco"
          sandbox="allow-scripts"
          [srcdoc]="confirmHtml()"
          data-testid="confirm-iframe"
        ></iframe>
      </div>

      <ng-template pTemplate="footer">
        <p-button
          [label]="'templates.confirm.cancel' | transloco"
          severity="secondary"
          [text]="true"
          (onClick)="cancelSave()"
          data-testid="confirm-cancel"
        />
        <p-button
          [label]="'templates.confirm.confirm' | transloco"
          icon="pi pi-check"
          [loading]="persisting()"
          (onClick)="confirmSave()"
          data-testid="confirm-save"
        />
      </ng-template>
    </p-dialog>
  `,
  styles: [
    `
      .confirm-hint {
        margin: 0 0 1rem;
        color: var(--ink-muted);
        font-size: 0.9rem;
        max-width: 60ch;
      }

      .confirm-frame-wrap {
        border: 1px solid var(--line);
        border-radius: var(--r-lg);
        overflow: hidden;
        background: var(--surface);
      }

      .confirm-frame-header {
        padding: 0.55rem 0.85rem;
        background: var(--surface-sunk);
        border-bottom: 1px solid var(--line);
      }

      .confirm-frame-label {
        font-family: var(--font-mono);
        font-size: 0.66rem;
        font-weight: 500;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: var(--ink-muted);
      }

      .confirm-frame {
        display: block;
        width: 100%;
        height: 28rem;
        border: 0;
        background: #fff;
      }
    `,
  ],
})
export class Templates {
  private readonly route = inject(ActivatedRoute);
  private readonly saveFlow = inject(TemplateSaveFlow);
  private readonly transloco = inject(TranslocoService);

  protected readonly identifier = signal<string | null>(
    this.route.snapshot.queryParamMap.get('identifier'),
  );

  /** The pending save request, captured while the confirm dialog is open. */
  private readonly pending = signal<SaveRequest | null>(null);

  /** TRUE server-composed HTML shown in the confirm dialog (AE2). */
  protected readonly confirmHtml = signal('');
  protected confirmVisible = false;

  protected readonly persisting = signal(false);
  protected readonly saveError = signal<string | null>(null);
  protected readonly savedMessage = signal<string | null>(null);

  /**
   * Save handler (R17; AE1). Step 1 of the gate: draft-render only. On success
   * we open the confirm dialog with the TRUE HTML — NOTHING is persisted yet. On
   * a draft-render error we surface it inline and never open the persist path.
   */
  protected onSave(request: SaveRequest): void {
    this.saveError.set(null);
    this.savedMessage.set(null);

    this.saveFlow.draftRender(this.saveFlow.toDraftPayload(request)).subscribe({
      next: html => {
        this.pending.set(request);
        this.confirmHtml.set(html);
        this.confirmVisible = true;
      },
      error: (err: unknown) => {
        // Draft-render failed — do NOT open the dialog, do NOT persist.
        this.pending.set(null);
        this.confirmVisible = false;
        this.saveError.set(
          toErrorMessage(
            err,
            this.transloco.translate('templates.save.error.preview'),
          ),
        );
      },
    });
  }

  /**
   * Confirm (AE1). Only here does anything reach `/v1/templates`: persist the
   * pending request via create/update, then close the dialog.
   */
  protected confirmSave(): void {
    const request = this.pending();
    if (!request) {
      return;
    }
    this.persisting.set(true);
    this.saveFlow.persist(request).subscribe({
      next: () => {
        this.persisting.set(false);
        this.confirmVisible = false;
        this.pending.set(null);
        this.savedMessage.set(
          this.transloco.translate('templates.save.success'),
        );
      },
      error: (err: unknown) => {
        this.persisting.set(false);
        this.saveError.set(
          toErrorMessage(
            err,
            this.transloco.translate('templates.save.error.save'),
          ),
        );
      },
    });
  }

  /**
   * Cancel (AE1). Closes the dialog and persists NOTHING; the editor keeps its
   * state untouched (the host never mutates editor signals).
   */
  protected cancelSave(): void {
    this.confirmVisible = false;
    this.pending.set(null);
  }

  /** Keep `pending` cleared if the dialog is dismissed via the close icon. */
  protected onDialogHide(): void {
    this.pending.set(null);
  }
}
