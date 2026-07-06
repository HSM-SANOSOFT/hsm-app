import {
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { TemplateCategoriesEnum } from '@hsm/common/enums';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { PanelModule } from 'primeng/panel';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';

import { ApiClient } from '../../../core/api/api-client';
import { MonacoEditor } from '../monaco-editor';
import type {
  BaseTemplateOption,
  CategoryOption,
  SaveRequest,
  TemplateDetail,
  TemplateWithBase,
} from '../template.types';
import {
  buildPreviewSrcdoc,
  renderPreview,
  seedSampleDataFromSchema,
} from '../template-preview.util';

/** ~300ms debounce for live preview re-render (KTD7). */
const PREVIEW_DEBOUNCE_MS = 300;

/**
 * Template authoring surface (U13, R12–R16):
 *
 * - **Foldable metadata bar** (R12): name, description, category select, and a
 *   base-template selector populated from `GET /v1/templates?category=BASE`.
 * - **Split layout** (R13): Monaco code editor on the left, live preview right.
 * - **Sample-data panel** (R15 / AE5): seeded from the template `schema` via
 *   {@link seedSampleDataFromSchema}, editable as JSON in a second Monaco.
 * - **Live preview** (R16 / KTD7): client-side Handlebars compose into a
 *   sandboxed `<iframe [srcdoc]>` (`allow-scripts` only), debounced ~300ms.
 * - **Save** (R17): a stubbed seam — emits a {@link DraftRenderPayload} on
 *   `(save)`; U14 wires draft-render + confirm + persist. No persistence here.
 *
 * All preview/seed logic lives in `template-preview.util.ts` as pure functions;
 * this component is the signal + DOM glue.
 */
@Component({
  selector: 'app-template-editor',
  imports: [
    FormsModule,
    PanelModule,
    SelectModule,
    InputTextModule,
    TextareaModule,
    ButtonModule,
    MessageModule,
    MonacoEditor,
  ],
  templateUrl: './template-editor.html',
  styleUrl: './template-editor.scss',
})
export class TemplateEditor {
  private readonly api = inject(ApiClient);
  private readonly destroyRef = inject(DestroyRef);

  /** Identifier (UUID or name) of an existing template to load, if editing. */
  readonly identifier = input<string | null>(null);

  /**
   * Save seam (R17). The routed host (`Templates`) listens here to run the
   * true-preview-on-save gate: POST `/v1/templates/draft-render`, show the
   * confirm dialog, and persist only on confirm. This component performs NO
   * persistence and NO draft-render itself — it just emits the captured state.
   */
  readonly save = output<SaveRequest>();

  // --- Metadata bar state (R12) ---
  protected readonly name = signal('');
  protected readonly description = signal('');
  protected readonly category = signal<TemplateCategoriesEnum>(
    TemplateCategoriesEnum.BASE,
  );
  protected readonly baseTemplateId = signal<string | null>(null);

  protected readonly categoryOptions: CategoryOption[] = Object.values(
    TemplateCategoriesEnum,
  ).map(value => ({ label: value, value }));

  /** BASE-category templates for the base selector (R12). */
  protected readonly baseTemplates = signal<BaseTemplateOption[]>([]);

  // --- Editor state (R14/R15) ---
  protected readonly content = signal('');
  protected readonly sampleDataJson = signal('{}');

  /** Loaded template (if editing); drives initial schema-seeding. */
  protected readonly loaded = signal<TemplateDetail | null>(null);
  protected readonly loadError = signal<string | null>(null);

  /** Resolved base content for client-side composition, keyed by selection. */
  private readonly baseContent = computed<string | null>(() => {
    const id = this.baseTemplateId();
    if (!id) {
      return null;
    }
    return this.baseTemplates().find(b => b.value === id)?.content ?? null;
  });

  // --- Live preview state (R16) ---
  /** The debounced `srcdoc` string for the sandboxed preview iframe. */
  protected readonly previewSrcdoc = signal('');
  private debounceHandle: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.loadBaseTemplates();

    // Load an existing template when an identifier is provided.
    effect(() => {
      const id = this.identifier();
      if (id) {
        this.loadTemplate(id);
      }
    });

    // Debounced live preview: re-renders whenever content, sample data, or the
    // selected base changes (R16 / KTD7).
    effect(() => {
      const content = this.content();
      const rawSampleData = this.sampleDataJson();
      const baseContent = this.baseContent();
      this.schedulePreview({ content, rawSampleData, baseContent });
    });

    // Clear any pending debounce timer when the component is destroyed.
    this.destroyRef.onDestroy(() => {
      if (this.debounceHandle) {
        clearTimeout(this.debounceHandle);
      }
    });
  }

  /** Re-render the preview after the debounce window. */
  private schedulePreview(input: {
    content: string;
    rawSampleData: string;
    baseContent: string | null;
  }): void {
    if (this.debounceHandle) {
      clearTimeout(this.debounceHandle);
    }
    this.debounceHandle = setTimeout(() => {
      const result = renderPreview(input);
      this.previewSrcdoc.set(buildPreviewSrcdoc(result));
    }, PREVIEW_DEBOUNCE_MS);
  }

  /** Populate the base-template selector from `GET /v1/templates?category=BASE`. */
  private loadBaseTemplates(): void {
    this.api
      .get<TemplateDetail[]>('/templates', {
        params: { category: TemplateCategoriesEnum.BASE },
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: templates => {
          this.baseTemplates.set(
            templates.map(t => ({
              label: t.name,
              value: t.id,
              content: t.content,
            })),
          );
        },
        error: () => {
          // Base selector is optional; a load failure leaves it empty.
          this.baseTemplates.set([]);
        },
      });
  }

  /** Load an existing template and seed the sample-data panel from its schema. */
  private loadTemplate(identifier: string): void {
    this.loadError.set(null);
    this.api
      .get<TemplateWithBase>(`/templates/${encodeURIComponent(identifier)}`)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ template, baseTemplate }) => {
          this.applyLoadedTemplate(template, baseTemplate);
        },
        error: (err: unknown) => {
          this.loadError.set(
            err instanceof Error
              ? err.message
              : $localize`:@@templates.editor.error.load:No se pudo cargar la plantilla.`,
          );
        },
      });
  }

  /** Apply a loaded template to the editor state (R15 / AE5). */
  protected applyLoadedTemplate(
    template: TemplateDetail,
    baseTemplate: TemplateDetail | null = null,
  ): void {
    this.loaded.set(template);
    this.name.set(template.name);
    this.description.set(template.description ?? '');
    this.category.set(template.category);
    this.content.set(template.content);
    this.baseTemplateId.set(baseTemplate?.id ?? null);

    // Seed an editable sample-data object from the template schema (AE5).
    const sample = seedSampleDataFromSchema(template.schema);
    this.sampleDataJson.set(JSON.stringify(sample, null, 2));
  }

  /**
   * Save (R17). Emits the full captured editor state as a {@link SaveRequest};
   * the host runs the draft-render → confirm → persist gate. No persistence and
   * no draft-render happen here — the editor stays a pure authoring surface.
   */
  protected onSave(): void {
    this.save.emit({
      loadedId: this.loaded()?.id ?? null,
      name: this.name(),
      description: this.description(),
      category: this.category(),
      content: this.content(),
      baseTemplateId: this.baseTemplateId() ?? undefined,
      sampleData: this.parseSampleData(),
    });
  }

  /**
   * Parse the editable sample-data JSON into a plain object, or `undefined` when
   * it is blank or not a JSON object. Mirrors the preview's lenient parsing so a
   * transient invalid edit never blocks Save (the server validates the draft).
   */
  private parseSampleData(): Record<string, unknown> | undefined {
    try {
      const raw = this.sampleDataJson().trim();
      if (!raw) {
        return undefined;
      }
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : undefined;
    } catch {
      return undefined;
    }
  }
}
