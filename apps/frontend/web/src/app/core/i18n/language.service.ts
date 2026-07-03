import { Injectable, signal } from '@angular/core';
import { type AppLocale, activeLocale } from './locale-init';

export const LANG_STORAGE_KEY = 'hsm.lang';
const SUPPORTED = ['es', 'en'] as const;

function isSupported(v: string | null | undefined): v is AppLocale {
  return v === 'es' || v === 'en';
}

/** Pure resolver used pre-bootstrap (no Angular DI). URL prefix wins, else storage, else es. */
export function resolveBootLocale(
  pathname: string,
  stored: string | null,
): AppLocale {
  const seg = pathname.split('/').filter(Boolean)[0];
  if (isSupported(seg)) return seg;
  return isSupported(stored) ? stored : 'es';
}

@Injectable({ providedIn: 'root' })
export class LanguageService {
  readonly SUPPORTED = SUPPORTED;
  private readonly _current = signal<AppLocale>(activeLocale());
  readonly current = this._current.asReadonly();

  /** Persist choice and reload into that locale's build, preserving the route. */
  switch(locale: AppLocale): void {
    if (!isSupported(locale)) return;
    localStorage.setItem(LANG_STORAGE_KEY, locale);
    const path = window.location.pathname.replace(/^\/(es|en)(?=\/|$)/, '');
    const target = `/${locale}${path || '/'}${window.location.search}`;
    window.location.assign(target);
  }
}
