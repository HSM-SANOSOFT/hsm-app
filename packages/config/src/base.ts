import { type FieldName, validateEnv } from './fields';

/**
 * Config shared by the backend apps AND the shared packages both consume
 * (`@hsm/database`, `@hsm/queue`, `@hsm/storage`). Because those packages are
 * imported by BOTH `api` and `worker`, they read this base — never an
 * app-specific config. `api`/`worker` extend it with their own vars.
 */
export interface BaseEnvs {
  ENVIRONMENT: string;

  SWAGGER_SITE_TITLE: string;

  SMTP_ADDRESS: string;
  SMTP_USERNAME: string;
  SMTP_PASSWORD: string;
  SMTP_PORT: number;
  SMTP_SECURE: boolean;

  DB_POSTGRES_HOST: string;
  DB_POSTGRES_PORT: number;
  DB_POSTGRES_USER: string;
  DB_POSTGRES_PASSWORD: string;
  DB_POSTGRES_DB: string;
  DB_POSTGRES_RUN_MIGRATIONS: boolean;

  DB_REDIS_HOST: string;
  DB_REDIS_PORT: number;
  DB_REDIS_USER: string;
  DB_REDIS_PASSWORD: string;

  STRG_S3_ACCESS_KEY: string;
  STRG_S3_FORCE_PATH_STYLE: boolean;
  STRG_S3_HOST: string;
  STRG_S3_HOST_EXTERNAL: string;
  STRG_S3_REGION: string;
  STRG_S3_SECRET_KEY: string;

  COMS_WEBHOOK_SIGNING_KEYS?: string;
}

const BASE_KEYS: readonly FieldName[] = [
  'ENVIRONMENT',
  'SWAGGER_SITE_TITLE',
  'SMTP_ADDRESS',
  'SMTP_USERNAME',
  'SMTP_PASSWORD',
  'SMTP_PORT',
  'SMTP_SECURE',
  'DB_POSTGRES_HOST',
  'DB_POSTGRES_PORT',
  'DB_POSTGRES_USER',
  'DB_POSTGRES_PASSWORD',
  'DB_POSTGRES_DB',
  'DB_POSTGRES_RUN_MIGRATIONS',
  'DB_REDIS_HOST',
  'DB_REDIS_PORT',
  'DB_REDIS_USER',
  'DB_REDIS_PASSWORD',
  'STRG_S3_ACCESS_KEY',
  'STRG_S3_FORCE_PATH_STYLE',
  'STRG_S3_HOST',
  'STRG_S3_HOST_EXTERNAL',
  'STRG_S3_REGION',
  'STRG_S3_SECRET_KEY',
  'COMS_WEBHOOK_SIGNING_KEYS',
];

export const baseEnvs = validateEnv<BaseEnvs>(BASE_KEYS);

/** Parse the COMS webhook signing-keys map (JSON) — `{}` on absent/invalid. */
export function getWebhookSigningKeys(): Record<string, string> {
  try {
    return JSON.parse(baseEnvs.COMS_WEBHOOK_SIGNING_KEYS ?? '{}') as Record<
      string,
      string
    >;
  } catch {
    return {};
  }
}
