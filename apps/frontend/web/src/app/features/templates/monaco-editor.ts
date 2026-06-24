import {
  afterNextRender,
  Component,
  DestroyRef,
  ElementRef,
  effect,
  InjectionToken,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';

/** Minimal slice of the Monaco API this wrapper actually drives. */
export interface MonacoLike {
  editor: {
    create(
      host: HTMLElement,
      options: Record<string, unknown>,
    ): {
      getValue(): string;
      setValue(v: string): void;
      onDidChangeModelContent(cb: () => void): { dispose(): void };
      dispose(): void;
    };
  };
}

/**
 * Loads Monaco. Defaults to the lazy ESM import so Monaco stays out of the
 * initial bundle. Overridable in tests with a stub — the Angular unit-test
 * builder pre-bundles the dynamic import, so `vi.mock('monaco-editor')` cannot
 * intercept it; injecting the loader is the clean test seam that avoids the
 * real (worker-laden) module loading after the test environment tears down.
 */
export const MONACO_LOADER = new InjectionToken<() => Promise<MonacoLike>>(
  'MONACO_LOADER',
  {
    providedIn: 'root',
    factory: () => () =>
      import('monaco-editor') as unknown as Promise<MonacoLike>,
  },
);

/**
 * Reusable standalone Monaco editor wrapper (U13).
 *
 * We integrate `monaco-editor` directly — no third-party Angular wrapper (see
 * `apps/frontend/web/CLAUDE.md` for the rationale; worker resolution is set up
 * in `core/editor/monaco-setup.ts`, called from `main.ts`).
 *
 * - **Lazy import.** `monaco-editor` is `import()`-ed on first render so it stays
 *   out of the initial bundle.
 * - **Value binding.** `value` is an `input`; local edits flow out via the
 *   `valueChange` `output` (a model-like seam). External `value` changes are
 *   reflected back into the editor without re-emitting (guarded).
 * - **Disposal.** The editor and its change subscription are disposed on
 *   destroy via `DestroyRef`.
 *
 * The instance lives behind `import('monaco-editor')` typed loosely as `unknown`
 * shapes — the DOM-bound bits are intentionally thin so the editor's logic
 * (seed/compose/preview) stays in pure, separately-tested functions.
 */
@Component({
  selector: 'app-monaco-editor',
  template: `
    <div
      #host
      class="monaco-host"
      data-testid="monaco-host"
      [style.height]="height()"
    ></div>
  `,
  styles: [
    `
      .monaco-host {
        width: 100%;
        min-height: 200px;
        border: 1px solid var(--p-content-border-color, #ccc);
      }
    `,
  ],
})
export class MonacoEditor {
  /** Editor content. Two-way friendly: pair with `(valueChange)`. */
  readonly value = input<string>('');
  /** Monaco language id, e.g. `'handlebars'` (R14) or `'json'` (R15). */
  readonly language = input<string>('handlebars');
  /** CSS height for the editor host. */
  readonly height = input<string>('100%');
  /** Emitted on every local edit. */
  readonly valueChange = output<string>();

  private readonly host = viewChild.required<ElementRef<HTMLElement>>('host');
  private readonly destroyRef = inject(DestroyRef);
  private readonly loadMonaco = inject(MONACO_LOADER);

  /** The `monaco.editor.IStandaloneCodeEditor`, once created. */
  private editor: {
    getValue(): string;
    setValue(v: string): void;
    onDidChangeModelContent(cb: () => void): { dispose(): void };
    dispose(): void;
  } | null = null;
  private changeSub: { dispose(): void } | null = null;
  /** Guards the `value` input → editor sync from re-emitting `valueChange`. */
  private applyingExternal = false;
  /** Set on destroy so a chunk-load that resolves post-destroy is a no-op. */
  private destroyed = false;

  constructor() {
    afterNextRender(() => {
      void this.createEditor();
    });

    // Reflect external `value` changes into the editor (e.g. loading a
    // template). Guarded so we never echo back out as a local edit.
    effect(() => {
      const next = this.value();
      if (this.editor && this.editor.getValue() !== next) {
        this.applyingExternal = true;
        this.editor.setValue(next);
        this.applyingExternal = false;
      }
    });

    this.destroyRef.onDestroy(() => {
      this.destroyed = true;
      this.changeSub?.dispose();
      this.editor?.dispose();
      this.editor = null;
    });
  }

  private async createEditor(): Promise<void> {
    const monaco = await this.loadMonaco();
    // Component may have been destroyed while the chunk loaded.
    if (this.destroyed) {
      return;
    }
    this.editor = monaco.editor.create(this.host().nativeElement, {
      value: this.value(),
      language: this.language(),
      automaticLayout: true,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      fontSize: 13,
      tabSize: 2,
      wordWrap: 'on',
    });

    this.changeSub = this.editor.onDidChangeModelContent(() => {
      if (this.applyingExternal || !this.editor) {
        return;
      }
      this.valueChange.emit(this.editor.getValue());
    });
  }
}
