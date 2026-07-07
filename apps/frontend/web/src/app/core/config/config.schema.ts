import * as joi from 'joi';

/** Runtime app config, loaded from `/config.json` at bootstrap (from env). */
export interface AppConfig {
  /** API base URL, e.g. `http://localhost:4201/v1`. */
  apiBaseUrl: string;
  /** Build/version label shown in the UI. */
  appVersion: string;
  /** Production flag (enables the service worker, etc.). */
  production: boolean;
}

const schema = joi
  .object<AppConfig>({
    apiBaseUrl: joi.string().uri({ allowRelative: true }).required(),
    appVersion: joi.string().default('dev'),
    production: joi.boolean().default(false),
  })
  .required();

/** Validate a raw `/config.json` payload; throws on a missing/invalid field. */
export function validateConfig(raw: unknown): AppConfig {
  const { error, value } = schema.validate(raw, {
    convert: true,
    allowUnknown: true,
  });
  if (error) {
    throw new Error(`Invalid runtime config (/config.json): ${error.message}`);
  }
  return value as AppConfig;
}
