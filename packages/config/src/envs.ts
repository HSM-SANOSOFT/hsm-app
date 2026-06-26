import * as process from 'node:process';

import 'dotenv/config';
import * as joi from 'joi';

interface EnvVars {
  ENVIRONMENT: string;

  SWAGGER_FAVICON: string;
  SWAGGER_SITE_TITLE: string;

  SMTP_ADDRESS: string;
  SMTP_USERNAME: string;
  SMTP_PASSWORD: string;
  SMTP_PORT: number;
  SMTP_SECURE: boolean;

  JWT_AT_SECRET: string;
  JWT_RT_SECRET: string;

  DB_POSTGRES_HOST: string;
  DB_POSTGRES_PORT: number;
  DB_POSTGRES_USER: string;
  DB_POSTGRES_PASSWORD: string;
  DB_POSTGRES_DB: string;
  DB_POSTGRES_RUN_MIGRATIONS: boolean;

  DB_ORACLE_HOST: string;
  DB_ORACLE_PORT: number;
  DB_ORACLE_USER: string;
  DB_ORACLE_PASSWORD: string;
  DB_ORACLE_DB: string;

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

const EnvSchema = joi
  .object({
    ENVIRONMENT: joi.string().required(),

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
    // Defaults off so the spine ships dev-only (synchronize) with no standing
    // prod ops obligation.
    DB_POSTGRES_RUN_MIGRATIONS: joi.boolean().default(false),

    DB_ORACLE_HOST: joi.string().required(),
    DB_ORACLE_PORT: joi.number().default(1521),
    DB_ORACLE_USER: joi.string().required(),
    DB_ORACLE_PASSWORD: joi.string().required(),
    DB_ORACLE_DB: joi.string().required(),

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
  })
  .unknown()
  .required();

const validation = EnvSchema.validate(process.env);

if (validation.error) {
  throw new Error(`Config validation error: ${validation.error.message}`);
}

const envVars: EnvVars = validation.value as EnvVars;

export const envs = Object.freeze({
  ENVIRONMENT: envVars.ENVIRONMENT,

  SWAGGER_FAVICON: envVars.SWAGGER_FAVICON,
  SWAGGER_SITE_TITLE: envVars.SWAGGER_SITE_TITLE,

  SMTP_ADDRESS: envVars.SMTP_ADDRESS,
  SMTP_USERNAME: envVars.SMTP_USERNAME,
  SMTP_PASSWORD: envVars.SMTP_PASSWORD,
  SMTP_PORT: envVars.SMTP_PORT,
  SMTP_SECURE: envVars.SMTP_SECURE,

  JWT_AT_SECRET: envVars.JWT_AT_SECRET,
  JWT_RT_SECRET: envVars.JWT_RT_SECRET,

  DB_POSTGRES_HOST: envVars.DB_POSTGRES_HOST,
  DB_POSTGRES_PORT: envVars.DB_POSTGRES_PORT,
  DB_POSTGRES_USER: envVars.DB_POSTGRES_USER,
  DB_POSTGRES_PASSWORD: envVars.DB_POSTGRES_PASSWORD,
  DB_POSTGRES_DB: envVars.DB_POSTGRES_DB,
  DB_POSTGRES_RUN_MIGRATIONS: envVars.DB_POSTGRES_RUN_MIGRATIONS,

  DB_ORACLE_HOST: envVars.DB_ORACLE_HOST,
  DB_ORACLE_PORT: envVars.DB_ORACLE_PORT,
  DB_ORACLE_USER: envVars.DB_ORACLE_USER,
  DB_ORACLE_PASSWORD: envVars.DB_ORACLE_PASSWORD,
  DB_ORACLE_DB: envVars.DB_ORACLE_DB,

  DB_REDIS_HOST: envVars.DB_REDIS_HOST,
  DB_REDIS_PORT: envVars.DB_REDIS_PORT,
  DB_REDIS_USER: envVars.DB_REDIS_USER,
  DB_REDIS_PASSWORD: envVars.DB_REDIS_PASSWORD,

  STRG_S3_ACCESS_KEY: envVars.STRG_S3_ACCESS_KEY,
  STRG_S3_FORCE_PATH_STYLE: envVars.STRG_S3_FORCE_PATH_STYLE,
  STRG_S3_HOST: envVars.STRG_S3_HOST,
  STRG_S3_HOST_EXTERNAL: envVars.STRG_S3_HOST_EXTERNAL,
  STRG_S3_REGION: envVars.STRG_S3_REGION,
  STRG_S3_SECRET_KEY: envVars.STRG_S3_SECRET_KEY,

  COMS_WEBHOOK_SIGNING_KEYS: envVars.COMS_WEBHOOK_SIGNING_KEYS,
} as const);
export type Envs = Readonly<typeof envs>;

export function getWebhookSigningKeys(): Record<string, string> {
  try {
    return JSON.parse(envs.COMS_WEBHOOK_SIGNING_KEYS ?? '{}') as Record<string, string>;
  } catch {
    return {};
  }
}
