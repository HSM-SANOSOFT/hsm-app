import { SettingsCategoryEnum } from '@hsm/common/enums';
import { envs } from '@hsm/config';

/**
 * One store-managed setting: its key, category, whether it is a secret (so the
 * API masks it on read / in the audit log), and the `@hsm/config` env value that
 * seeds it when no DB row exists.
 *
 * Lives in `@hsm/database` (not `@hsm/config`) because the category type comes
 * from `@hsm/common` and the accessor that reads these rows lives here too —
 * `@hsm/config` stays a lean, dependency-free env wrapper. Both the API settings
 * service (U3) and the runtime accessor (U4) import this single catalogue so the
 * env-seed fallback is never duplicated.
 *
 * Infra keys (DB/Redis/JWT, throttler limits) are intentionally absent — they
 * stay deploy-only and are never routed through the store (KTD4).
 */
export interface SettingDefinition {
  key: string;
  category: SettingsCategoryEnum;
  isSecret: boolean;
  /** Seed value sourced from the deploy-time env (defaults). */
  envValue: () => string | null;
}

export const SETTING_DEFINITIONS: SettingDefinition[] = [
  // EMAIL / SMTP
  {
    key: 'SMTP_ADDRESS',
    category: SettingsCategoryEnum.EMAIL,
    isSecret: false,
    envValue: () => envs.SMTP_ADDRESS ?? null,
  },
  {
    key: 'SMTP_USERNAME',
    category: SettingsCategoryEnum.EMAIL,
    isSecret: false,
    envValue: () => envs.SMTP_USERNAME ?? null,
  },
  {
    key: 'SMTP_PASSWORD',
    category: SettingsCategoryEnum.EMAIL,
    isSecret: true,
    envValue: () => envs.SMTP_PASSWORD ?? null,
  },
  {
    key: 'SMTP_PORT',
    category: SettingsCategoryEnum.EMAIL,
    isSecret: false,
    envValue: () => (envs.SMTP_PORT != null ? String(envs.SMTP_PORT) : null),
  },
  {
    key: 'SMTP_SECURE',
    category: SettingsCategoryEnum.EMAIL,
    isSecret: false,
    envValue: () =>
      envs.SMTP_SECURE != null ? String(envs.SMTP_SECURE) : null,
  },
  // WEBHOOK signing keys
  {
    key: 'COMS_WEBHOOK_SIGNING_KEYS',
    category: SettingsCategoryEnum.WEBHOOK,
    isSecret: true,
    envValue: () => envs.COMS_WEBHOOK_SIGNING_KEYS ?? null,
  },
  // STORAGE / S3
  {
    key: 'STRG_S3_ACCESS_KEY',
    category: SettingsCategoryEnum.STORAGE,
    isSecret: false,
    envValue: () => envs.STRG_S3_ACCESS_KEY ?? null,
  },
  {
    key: 'STRG_S3_SECRET_KEY',
    category: SettingsCategoryEnum.STORAGE,
    isSecret: true,
    envValue: () => envs.STRG_S3_SECRET_KEY ?? null,
  },
  {
    key: 'STRG_S3_HOST',
    category: SettingsCategoryEnum.STORAGE,
    isSecret: false,
    envValue: () => envs.STRG_S3_HOST ?? null,
  },
  {
    key: 'STRG_S3_HOST_EXTERNAL',
    category: SettingsCategoryEnum.STORAGE,
    isSecret: false,
    envValue: () => envs.STRG_S3_HOST_EXTERNAL ?? null,
  },
  {
    key: 'STRG_S3_REGION',
    category: SettingsCategoryEnum.STORAGE,
    isSecret: false,
    envValue: () => envs.STRG_S3_REGION ?? null,
  },
  {
    key: 'STRG_S3_FORCE_PATH_STYLE',
    category: SettingsCategoryEnum.STORAGE,
    isSecret: false,
    envValue: () =>
      envs.STRG_S3_FORCE_PATH_STYLE != null
        ? String(envs.STRG_S3_FORCE_PATH_STYLE)
        : null,
  },
  // APP_BEHAVIOR toggles
  {
    key: 'SWAGGER_SITE_TITLE',
    category: SettingsCategoryEnum.APP_BEHAVIOR,
    isSecret: false,
    envValue: () => envs.SWAGGER_SITE_TITLE ?? null,
  },
];

export function settingDefinitionsForCategory(
  category: SettingsCategoryEnum,
): SettingDefinition[] {
  return SETTING_DEFINITIONS.filter(def => def.category === category);
}

export function settingDefinitionForKey(
  key: string,
): SettingDefinition | undefined {
  return SETTING_DEFINITIONS.find(def => def.key === key);
}
