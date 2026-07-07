import { Injectable } from '@angular/core';
import type { AppConfig } from './config.schema';

/**
 * Holds the runtime config loaded from `/config.json` at bootstrap. Seeded once
 * by the config app-initializer (`app.config.ts`) before anything reads it; in
 * tests, seeded by `provideTestConfig()`. Reading before it is loaded throws.
 */
@Injectable({ providedIn: 'root' })
export class ConfigService {
  private config: AppConfig | null = null;

  set(config: AppConfig): void {
    this.config = config;
  }

  private get value(): AppConfig {
    if (!this.config) {
      throw new Error('ConfigService read before /config.json was loaded');
    }
    return this.config;
  }

  get apiBaseUrl(): string {
    return this.value.apiBaseUrl;
  }
  get appVersion(): string {
    return this.value.appVersion;
  }
  get production(): boolean {
    return this.value.production;
  }
}
