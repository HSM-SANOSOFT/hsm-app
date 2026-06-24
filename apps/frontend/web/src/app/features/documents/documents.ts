import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { DocumentStatusEnum, TemplateCategoriesEnum } from '@hsm/common/enums';
import { ButtonModule } from 'primeng/button';
import { FileUpload, type FileUploadHandlerEvent } from 'primeng/fileupload';
import { Message } from 'primeng/message';
import { Select } from 'primeng/select';
import { type TableLazyLoadEvent, TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { finalize } from 'rxjs';

import { ApiClient } from '../../core/api/api-client';
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
    Message,
    TagModule,
  ],
  template: `
    <section class="documents" data-testid="documents">
      <h1>Documents</h1>

      <!-- ── Generate (R18) ───────────────────────────────────────────── -->
      <section class="documents-generate" data-testid="generate-panel">
        <h2>Generate from template</h2>

        <p-select
          [options]="templates()"
          optionLabel="name"
          placeholder="Select a DOCS template"
          [ngModel]="selectedTemplate()"
          (onChange)="onTemplateChange($event.value)"
          data-testid="template-select"
        />

        @if (selectedTemplate(); as tpl) {
          <form class="generate-form" data-testid="generate-form">
            <label class="field">
              <span>Title</span>
              <input
                type="text"
                [ngModel]="title()"
                (ngModelChange)="title.set($event)"
                [ngModelOptions]="{ standalone: true }"
                data-testid="generate-title"
              />
            </label>

            @for (field of schemaFields(); track field.key) {
              <label class="field" [attr.data-testid]="'field-' + field.key">
                <span>{{ field.key }}{{ field.optional ? '' : ' *' }}</span>
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
                      [ngModel]="formData()[field.key]"
                      (ngModelChange)="setField(field.key, $event)"
                      [ngModelOptions]="{ standalone: true }"
                    />
                  }
                  @case ('date') {
                    <input
                      type="date"
                      [ngModel]="formData()[field.key]"
                      (ngModelChange)="setField(field.key, $event)"
                      [ngModelOptions]="{ standalone: true }"
                    />
                  }
                  @default {
                    <input
                      type="text"
                      [ngModel]="formData()[field.key]"
                      (ngModelChange)="setField(field.key, $event)"
                      [ngModelOptions]="{ standalone: true }"
                    />
                  }
                }
              </label>
            }

            <p-button
              label="Generate"
              [loading]="generating()"
              [disabled]="generating() || !title()"
              (onClick)="generate()"
              data-testid="generate-button"
            />
          </form>
        }

        @if (generateStatus(); as status) {
          <p data-testid="generate-status">Status: {{ status }}</p>
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
      <section class="documents-upload" data-testid="upload-panel">
        <h2>Upload</h2>
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
      <section class="documents-library" data-testid="library-panel">
        <h2>Library</h2>
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
              <th>Actions</th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-doc>
            <tr [attr.data-testid]="'doc-row-' + doc.id">
              <td>{{ doc.title }}</td>
              <td>{{ doc.type }}</td>
              <td>
                <p-tag
                  [value]="doc.status"
                  [severity]="statusSeverity(doc.status)"
                />
              </td>
              <td>
                <p-button
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
              <td colspan="4">No documents yet.</td>
            </tr>
          </ng-template>
        </p-table>
      </section>
    </section>
  `,
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
      .pipe(finalize(() => this.generating.set(false)))
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
      .subscribe({ next: res => this.triggerBrowserDownload(res.url) });
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
    this.api.post(`${DOCS_PATH}/upload`, form).subscribe({
      next: () => this.loadDocuments(),
      error: (err: { message?: string }) =>
        this.uploadError.set(err?.message ?? 'Upload failed.'),
    });
  }

  isCompleted(doc: DocumentRecord): boolean {
    return doc.status === DocumentStatusEnum.COMPLETED;
  }

  /** Maps a document status to a PrimeNG tag severity for the library. */
  statusSeverity(
    status: string,
  ): 'success' | 'danger' | 'info' | 'warn' | 'secondary' {
    switch (status) {
      case DocumentStatusEnum.COMPLETED:
        return 'success';
      case DocumentStatusEnum.FAILED:
        return 'danger';
      case DocumentStatusEnum.PROCESSING:
        return 'info';
      default:
        return 'warn';
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
