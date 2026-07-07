import type { Provider } from '@angular/core';
import type { AppConfig } from './config.schema';
import { ConfigService } from './config.service';

/** The API base URL specs assert against (matches the dev config). */
export const TEST_API_BASE_URL = 'http://localhost:4201/v1';

/**
 * Seeds `ConfigService` with a fixed config for specs, so no `/config.json`
 * fetch happens. Spread into a TestBed `providers` array.
 */
export function provideTestConfig(
  overrides: Partial<AppConfig> = {},
): Provider {
  const config: AppConfig = {
    apiBaseUrl: TEST_API_BASE_URL,
    appVersion: 'test',
    production: false,
    ...overrides,
  };
  return {
    provide: ConfigService,
    useFactory: () => {
      const service = new ConfigService();
      service.set(config);
      return service;
    },
  };
}
