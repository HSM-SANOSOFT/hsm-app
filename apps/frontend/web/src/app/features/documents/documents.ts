import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { DocumentStatusEnum, TemplateCategoriesEnum } from '@hsm/common/enums';
import { ButtonModule } from 'primeng/button';
import { FileUpload, type FileUploadHandlerEvent } from 'primeng/fileupload';
import { InputTextModule } from 'primeng/inputtext';
import { Message } from 'primeng/message';
import { Select } from 'primeng/select';
import { type TableLazyLoadEvent, TableModule } from 'primeng/table';
import { finalize } from 'rxjs';

import { ApiClient } from '../../core/api/api-client';
import { toErrorMessage } from '../../core/api/api-error';
import { computePage, DEFAULT_PAGE_SIZE } from '../../core/api/pagination.util';
import {
  type DocsTemplate,
  type DocumentRecord,
  type DocumentUrlResponse,
  type GenerateDocumentRequest,
  type GenerateDocumentResponse,
  isTerminalStatus,
  pollDocumentStatus,
  type SchemaField,
  schemaToFields,
} from './document.types';

const DOCS_PATH = '/docs';
const TEMPLATES_PATH = '/templates';
/** Bucket used for browser uploads (the backend keys storage by bucket). */
const UPLOAD_BUCKET = 'documents';
const UPLOAD_FOLDER = 'uploads';

/**
 * Documents surface (U15, R18–R20).
 *
 * - **Generate (R18):** pick a DOCS template, fill in its `data` (driven by the
 *   template `schema`), `POST /v1/docs/generate`, then **poll**
 *   `GET /v1/docs/:id` until the status is COMPLETED or FAILED. Polling is
 *   delegated to {@link pollDocumentStatus}, which caps attempts (so a stuck
 *   PENDING job terminates) and stops immediately on a terminal status. On
 *   COMPLETED it fetches `GET /v1/docs/:id/url` and triggers a browser
 *   download; FAILED surfaces an error.
 * - **Library (R19):** PrimeNG `p-table` over `GET /v1/docs` with server
 *   pagination via `ApiClient.getPaginated` (the list is user-scoped by the
 *   API). A download action uses `GET /v1/docs/:id/url`.
 * - **Upload (R20):** PrimeNG `p-fileupload` (custom handler) POSTs multipart
 *   to `POST /v1/docs/upload`; on success the library list is refreshed.
 */
@Component({
  selector: 'app-documents',
  imports: [
    FormsModule,
    TableModule,
    Select,
    ButtonModule,
    FileUpload,
    InputTextModule,
    Message,
  ],
  template: `
    <div class="page documents" data-testid="documents">
      <header class="page-header">
        <div>
          <span class="page-eyebrow">DOCUMENTS</span>
          <h1 class="page-title">Documents</h1>
          <p class="page-subtitle">
            Generate documents from a template, browse your library, and upload
            files.
          </p>
        </div>
      </header>

      <!-- ── Generate (R18) ───────────────────────────────────────────── -->
      <section class="surface-card" data-testid="generate-panel">
        <h2 class="card-title">Generate from template</h2>
        <p class="card-hint">
          Pick a DOCS template, fill in its fields, and generate a document.
        </p>

        <div class="field">
          <label for="template-select">Template</label>
          <p-select
            inputId="template-select"
            [options]="templates()"
            optionLabel="name"
            placeholder="Select a DOCS template"
            [ngModel]="selectedTemplate()"
            (onChange)="onTemplateChange($event.value)"
            data-testid="template-select"
          />
        </div>

        @if (selectedTemplate(); as tpl) {
          <form class="generate-form" data-testid="generate-form">
            <div class="field-grid">
              <label class="field" data-testid="generate-title">
                <span>Title</span>
                <input
                  type="text"
                  pInputText
                  [ngModel]="title()"
                  (ngModelChange)="title.set($event)"
                  [ngModelOptions]="{ standalone: true }"
                />
              </label>

              @for (field of schemaFields(); track field.key) {
                <label
                  class="field"
                  [attr.data-testid]="'field-' + field.key"
                >
                  <span class="mono">
                    {{ field.key }}{{ field.optional ? '' : ' *' }}
                  </span>
                  @switch (field.kind) {
                    @case ('boolean') {
                      <input
                        type="checkbox"
                        [ngModel]="boolValue(field.key)"
                        (ngModelChange)="setField(field.key, $event)"
                        [ngModelOptions]="{ standalone: true }"
                      />
                    }
                    @case ('number') {
                      <input
                        type="number"
                        pInputText
                        [ngModel]="formData()[field.key]"
                        (ngModelChange)="setField(field.key, $event)"
                        [ngModelOptions]="{ standalone: true }"
                      />
                    }
                    @case ('date') {
                      <input
                        type="date"
                        pInputText
                        [ngModel]="formData()[field.key]"
                        (ngModelChange)="setField(field.key, $event)"
                        [ngModelOptions]="{ standalone: true }"
                      />
                    }
                    @default {
                      <input
                        type="text"
                        pInputText
                        [ngModel]="formData()[field.key]"
                        (ngModelChange)="setField(field.key, $event)"
                        [ngModelOptions]="{ standalone: true }"
                      />
                    }
                  }
                </label>
              }
            </div>

            <div class="generate-actions">
              <p-button
                label="Generate"
                [loading]="generating()"
                [disabled]="generating() || !title()"
                (onClick)="generate()"
                data-testid="generate-button"
              />

              @if (generateStatus(); as status) {
                <span
                  class="pill"
                  [class]="statusPill(status)"
                  data-testid="generate-status"
                >
                  {{ generating() ? 'generating' : status }}
                </span>
              }
            </div>
          </form>
        }

        @if (generateError(); as err) {
          <p-message
            severity="error"
            [text]="err"
            data-testid="generate-error"
          />
        }
      </section>

      <!-- ── Upload (R20) ─────────────────────────────────────────────── -->
      <section class="surface-card" data-testid="upload-panel">
        <h2 class="card-title">Upload</h2>
        <p class="card-hint">
          Upload an existing file straight into your library.
        </p>
        <p-fileupload
          mode="basic"
          name="files"
          [customUpload]="true"
          [auto]="true"
          [multiple]="true"
          chooseLabel="Choose file"
          (uploadHandler)="upload($event)"
          data-testid="file-upload"
        />
        @if (uploadError(); as err) {
          <p-message
            severity="error"
            [text]="err"
            data-testid="upload-error"
          />
        }
      </section>

      <!-- ── Library (R19) ────────────────────────────────────────────── -->
      <section class="surface-card" data-testid="library-panel">
        <h2 class="card-title">Library</h2>
        <p class="card-hint">Your generated and uploaded documents.</p>
        <p-table
          [value]="documents()"
          [lazy]="true"
          [paginator]="true"
          [rows]="pageSize()"
          [totalRecords]="totalRecords()"
          [loading]="loading()"
          [first]="first()"
          (onLazyLoad)="loadDocuments($event)"
          dataKey="id"
          data-testid="documents-table"
        >
          <ng-template pTemplate="header">
            <tr>
              <th>Title</th>
              <th>Type</th>
              <th>Status</th>
              <th>Document ID</th>
              <th>Actions</th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-doc>
            <tr [attr.data-testid]="'doc-row-' + doc.id">
              <td>{{ doc.title }}</td>
              <td class="muted">{{ doc.type }}</td>
              <td>
                <span class="pill" [class]="statusPill(doc.status)">
                  {{ doc.status }}
                </span>
              </td>
              <td class="mono">{{ doc.id }}</td>
              <td>
                <p-button
                  icon="pi pi-download"
                  label="Download"
                  size="small"
                  [text]="true"
                  [disabled]="!isCompleted(doc)"
                  (onClick)="download(doc.id)"
                  [attr.data-testid]="'download-' + doc.id"
                />
              </td>
            </tr>
          </ng-template>
          <ng-template pTemplate="emptymessage">
            <tr>
              <td colspan="5">
                <div class="empty-state">
                  <i class="pi pi-folder-open"></i>
                  No documents yet.
                </div>
              </td>
            </tr>
          </ng-template>
        </p-table>
      </section>
    </div>
  `,
  styles: [
    `
      .generate-actions {
        display: flex;
        align-items: center;
        gap: 1rem;
        margin-top: 0.5rem;
      }
    `,
  ],
})
export class Documents {
  private readonly api = inject(ApiClient);
  private readonly destroyRef = inject(DestroyRef);

  // ── Generate state ──────────────────────────────────────────────────
  readonly templates = signal<DocsTemplate[]>([]);
  readonly selectedTemplate = signal<DocsTemplate | null>(null);
  readonly title = signal('');
  readonly formData = signal<Record<string, unknown>>({});
  readonly generating = signal(false);
  readonly generateStatus = signal<string | null>(null);
  readonly generateError = signal<string | null>(null);

  /** Form fields derived from the selected template's `schema`. */
  readonly schemaFields = computed<SchemaField[]>(() => {
    const tpl = this.selectedTemplate();
    return tpl ? schemaToFields(tpl.schema) : [];
  });

  // ── Library state ───────────────────────────────────────────────────
  readonly documents = signal<DocumentRecord[]>([]);
  readonly totalRecords = signal(0);
  readonly pageSize = signal(DEFAULT_PAGE_SIZE);
  readonly first = signal(0);
  readonly loading = signal(false);

  // ── Upload state ────────────────────────────────────────────────────
  readonly uploadError = signal<string | null>(null);

  constructor() {
    this.loadTemplates();
  }

  /** Loads the DOCS templates for the picker (`GET /v1/templates?category=DOCS`). */
  loadTemplates(): void {
    this.api
      .get<DocsTemplate[]>(TEMPLATES_PATH, {
        params: { category: TemplateCategoriesEnum.DOCS },
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: list => this.templates.set(list ?? []),
      });
  }

  /** Resets the data-entry form to the newly picked template's schema. */
  onTemplateChange(template: DocsTemplate | null): void {
    this.selectedTemplate.set(template);
    this.formData.set({});
    this.title.set(template?.name ?? '');
    this.generateStatus.set(null);
    this.generateError.set(null);
  }

  setField(key: string, value: unknown): void {
    this.formData.update(data => ({ ...data, [key]: value }));
  }

  boolValue(key: string): boolean {
    return this.formData()[key] === true;
  }

  /**
   * Generates a document, then polls until terminal (KTD6). On COMPLETED the
   * download URL is fetched and the browser download triggered; FAILED (or a
   * timed-out poll that never reached a terminal state) surfaces an error.
   * The library is refreshed once generation finishes so the new row appears.
   */
  generate(): void {
    const tpl = this.selectedTemplate();
    if (!tpl || !this.title()) {
      return;
    }

    const body: GenerateDocumentRequest = {
      templateIdentifier: tpl.id,
      title: this.title(),
      data: this.formData(),
    };

    this.generating.set(true);
    this.generateError.set(null);
    this.generateStatus.set(DocumentStatusEnum.PENDING);

    this.api
      .post<GenerateDocumentResponse>(`${DOCS_PATH}/generate`, body)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: res => this.pollGeneration(res.documentId),
        error: (err: { message?: string }) => {
          this.generating.set(false);
          this.generateError.set(err?.message ?? 'Failed to start generation.');
        },
      });
  }

  /** Polls `GET /v1/docs/:id` until terminal, then resolves the outcome. */
  private pollGeneration(documentId: string): void {
    let last: DocumentRecord | null = null;

    pollDocumentStatus(() =>
      this.api.get<DocumentRecord>(`${DOCS_PATH}/${documentId}`),
    )
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.generating.set(false)),
      )
      .subscribe({
        next: doc => {
          last = doc;
          this.generateStatus.set(doc.status);
          if (doc.status === DocumentStatusEnum.FAILED) {
            this.generateError.set('Document generation failed.');
          }
        },
        error: (err: { message?: string }) => {
          this.generateError.set(err?.message ?? 'Polling failed.');
        },
        complete: () => {
          if (last?.status === DocumentStatusEnum.COMPLETED) {
            this.download(documentId);
          } else if (last && !isTerminalStatus(last.status)) {
            // Attempt cap reached without a terminal status.
            this.generateError.set(
              'Generation is taking too long. Please check the library later.',
            );
          }
          this.loadDocuments();
        },
      });
  }

  /**
   * `p-table` lazy-load handler. Translates the table's `first`/`rows` offset
   * into the backend's 1-based `page`/`limit` query and fetches that page via
   * `getPaginated` (the API scopes the list to the signed-in user).
   */
  loadDocuments(event?: TableLazyLoadEvent): void {
    const rows = event?.rows ?? this.pageSize();
    const offset = event?.first ?? this.first();
    const { page, limit } = computePage(offset, rows);

    this.pageSize.set(rows);
    this.first.set(offset);
    this.loading.set(true);

    this.api
      .getPaginated<DocumentRecord>(DOCS_PATH, {
        params: { page, limit },
      })
      .subscribe({
        next: result => {
          this.documents.set(result.data);
          if (result.pagination) {
            this.totalRecords.set(result.pagination.totalItems);
          }
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  /** Fetches a presigned URL and triggers the browser download. */
  download(id: string): void {
    this.api
      .get<DocumentUrlResponse>(`${DOCS_PATH}/${id}/url`)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: res => this.triggerBrowserDownload(res.url),
        error: err =>
          this.generateError.set(
            toErrorMessage(err, 'Failed to fetch download URL.'),
          ),
      });
  }

  /**
   * Custom file-upload handler (R20). Builds the multipart body the backend
   * expects — a `payload` JSON field (`UploadDocumentPayloadDto`) plus the
   * `files` field (matching `FilesInterceptor('files')`) — POSTs it, then
   * refreshes the library list so the uploaded doc appears.
   */
  upload(event: FileUploadHandlerEvent): void {
    const files = event.files ?? [];
    if (files.length === 0) {
      return;
    }

    const form = new FormData();
    for (const file of files) {
      form.append('files', file, file.name);
    }
    form.append(
      'payload',
      JSON.stringify([
        {
          bucket: UPLOAD_BUCKET,
          files: files.map(file => ({
            folderName: UPLOAD_FOLDER,
            fileInfo: { fileName: file.name },
          })),
        },
      ]),
    );

    this.uploadError.set(null);
    this.api
      .post(`${DOCS_PATH}/upload`, form)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.loadDocuments(),
        error: (err: { message?: string }) =>
          this.uploadError.set(err?.message ?? 'Upload failed.'),
      });
  }

  isCompleted(doc: DocumentRecord): boolean {
    return doc.status === DocumentStatusEnum.COMPLETED;
  }

  /**
   * Maps a {@link DocumentStatusEnum} value to a brand status-pill
   * modifier class for the library and generate status line:
   * - COMPLETED → `pill--ok`
   * - FAILED → `pill--failed`
   * - PENDING / PROCESSING (in-flight) → `pill--pending`
   */
  statusPill(status: string): string {
    switch (status) {
      case DocumentStatusEnum.COMPLETED:
        return 'pill--ok';
      case DocumentStatusEnum.FAILED:
        return 'pill--failed';
      case DocumentStatusEnum.PENDING:
      case DocumentStatusEnum.PROCESSING:
        return 'pill--pending';
      default:
        return 'pill--neutral';
    }
  }

  /** Opens the presigned URL via a synthetic anchor click to start a download. */
  private triggerBrowserDownload(url: string): void {
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.target = '_blank';
    anchor.rel = 'noopener';
    anchor.click();
  }
}
