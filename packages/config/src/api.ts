import { type BaseEnvs, baseEnvs } from './base';
import { type FieldName, validateEnv } from './fields';

/** `@hsm/api` config: the shared base plus the API-only vars. */
export interface ApiEnvs extends BaseEnvs {
  APP_BASE_URL: string;
  SWAGGER_FAVICON: string;
  JWT_AT_SECRET: string;
  JWT_RT_SECRET: string;
  DEFAULT_ADMIN_USERNAME?: string;
  DEFAULT_ADMIN_PASSWORD?: string;
}

interface ApiOnly {
  APP_BASE_URL: string;
  SWAGGER_FAVICON: string;
  JWT_AT_SECRET: string;
  JWT_RT_SECRET: string;
  DEFAULT_ADMIN_USERNAME?: string;
  DEFAULT_ADMIN_PASSWORD?: string;
}

const API_KEYS: readonly FieldName[] = [
  'APP_BASE_URL',
  'SWAGGER_FAVICON',
  'JWT_AT_SECRET',
  'JWT_RT_SECRET',
  'DEFAULT_ADMIN_USERNAME',
  'DEFAULT_ADMIN_PASSWORD',
];

export const envs: Readonly<ApiEnvs> = Object.freeze({
  ...baseEnvs,
  ...validateEnv<ApiOnly>(API_KEYS),
});
export type Envs = typeof envs;

export { getWebhookSigningKeys } from './base';
