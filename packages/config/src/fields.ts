import * as process from 'node:process';

import 'dotenv/config';
import * as joi from 'joi';

/**
 * One Joi rule per environment variable — the single source of truth for each
 * var's type/default/required. The per-app configs (`base`, `api`, `worker`)
 * assemble the subset they need and validate it. STRG_S3_HOST[_EXTERNAL] cross-
 * reference STRG_S3_FORCE_PATH_STYLE, so any config that includes one must
 * include all three (the `base` set does).
 */
export const FIELDS = {
  ENVIRONMENT: joi.string().required(),

  // Web app base URL — used to build account-recovery links (reset password).
  APP_BASE_URL: joi.string().default('http://localhost:4200'),

  SWAGGER_FAVICON: joi.string().required(),
  SWAGGER_SITE_TITLE: joi.string().required(),

  SMTP_ADDRESS: joi.string().required(),
  SMTP_USERNAME: joi.string().required(),
  SMTP_PASSWORD: joi.string().required(),
  SMTP_PORT: joi.number().default(587),
  SMTP_SECURE: joi.boolean().default(true),

  JWT_AT_SECRET: joi.string().required(),
  JWT_RT_SECRET: joi.string().required(),

  DB_POSTGRES_HOST: joi.string().required(),
  DB_POSTGRES_PORT: joi.number().default(5432),
  DB_POSTGRES_USER: joi.string().required(),
  DB_POSTGRES_PASSWORD: joi.string().required(),
  DB_POSTGRES_DB: joi.string().required(),
  // KTD9: the non-dev TypeORM migration runner exists but stays INERT unless
  // this flag is explicitly enabled by the first prod-bound module's deploy.
  DB_POSTGRES_RUN_MIGRATIONS: joi.boolean().default(false),

  DB_REDIS_HOST: joi.string().required(),
  DB_REDIS_PORT: joi.number().default(6379),
  DB_REDIS_USER: joi.string().required(),
  DB_REDIS_PASSWORD: joi.string().required(),

  STRG_S3_ACCESS_KEY: joi.string().required(),
  STRG_S3_FORCE_PATH_STYLE: joi.boolean().default(false),
  STRG_S3_HOST: joi.when('STRG_S3_FORCE_PATH_STYLE', {
    is: true,
    then: joi.string().trim().min(1).required(),
    otherwise: joi.string().forbidden(),
  }),
  STRG_S3_HOST_EXTERNAL: joi.string().when('STRG_S3_FORCE_PATH_STYLE', {
    is: true,
    then: joi.string().trim().min(1).optional(),
    otherwise: joi.string().forbidden(),
  }),
  STRG_S3_REGION: joi.string().default('us-east-1'),
  STRG_S3_SECRET_KEY: joi.string().required(),

  COMS_WEBHOOK_SIGNING_KEYS: joi.string().optional(),

  DEFAULT_ADMIN_USERNAME: joi.string().allow('').optional(),
  DEFAULT_ADMIN_PASSWORD: joi.string().allow('').optional(),
} as const;

export type FieldName = keyof typeof FIELDS;

/**
 * Build a Joi schema from the named fields, validate `process.env` against it
 * (`.unknown()` tolerates unrelated vars, e.g. a stray DB_ORACLE_* in a .env),
 * and return the frozen, defaulted, coerced values. Throws at import time on a
 * missing/invalid var — scoped to exactly the vars the caller asked for.
 */
export function validateEnv<T>(keys: readonly FieldName[]): Readonly<T> {
  const shape = Object.fromEntries(keys.map(k => [k, FIELDS[k]]));
  const schema = joi.object(shape).unknown().required();
  const { error, value } = schema.validate(process.env);
  if (error) {
    throw new Error(`Config validation error: ${error.message}`);
  }
  const picked = Object.fromEntries(keys.map(k => [k, value[k]]));
  return Object.freeze(picked) as Readonly<T>;
}
