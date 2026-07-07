import { effect, Injectable, inject, signal } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';

export const LANG_STORAGE_KEY = 'hsm.lang';
export type AppLang = 'es' | 'en';
const SUPPORTED = ['es', 'en'] as const;

function isSupported(v: string | null | undefined): v is AppLang {
  return v === 'es' || v === 'en';
}

/** Pure boot resolver: stored lang if supported, else the default 'es'. */
export function resolveBootLang(stored: string | null): AppLang {
  return isSupported(stored) ? stored : 'es';
}

@Injectable({ providedIn: 'root' })
export class LanguageService {
  readonly SUPPORTED = SUPPORTED;
  private readonly transloco = inject(TranslocoService);
  private readonly _current = signal<AppLang>(
    resolveBootLang(this.readStored()),
  );
  readonly current = this._current.asReadonly();

  constructor() {
    // Apply the persisted language at startup (Transloco default is 'es').
    this.transloco.setActiveLang(this._current());
    // Keep Transloco in sync if the signal is set elsewhere.
    effect(() => {
      const lang = this._current();
      if (this.transloco.getActiveLang() !== lang) {
        this.transloco.setActiveLang(lang);
      }
    });
  }

  /** Switch language in place — no reload. Persists the choice. */
  switch(lang: AppLang): void {
    if (!isSupported(lang)) return;
    try {
      localStorage.setItem(LANG_STORAGE_KEY, lang);
    } catch {
      /* storage blocked — still switch for this session */
    }
    this._current.set(lang);
    this.transloco.setActiveLang(lang);
  }

  private readStored(): string | null {
    try {
      return localStorage.getItem(LANG_STORAGE_KEY);
    } catch {
      return null;
    }
  }
}
