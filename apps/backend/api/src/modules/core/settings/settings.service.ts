import type {
  GetSettingsResponseDto,
  SettingItemDto,
  UpdateSettingsPayloadDto,
} from '@hsm/common/dtos';
import { SettingsCategoryEnum } from '@hsm/common/enums';
import { envs } from '@hsm/config';
import {
  AppSettingAuditEntity,
  AppSettingEntity,
} from '@hsm/database/entities';
import { DatabasesEnum } from '@hsm/database/sources';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

/**
 * Placeholder returned for any secret-valued setting on read, and stored in the
 * audit log in place of the real plaintext. The real secret value is NEVER sent
 * back to a client nor written to the audit table.
 */
export const SECRET_MASK = '********';

interface SettingDefinition {
  key: string;
  category: SettingsCategoryEnum;
  isSecret: boolean;
  /** Seed value sourced from the deploy-time env (defaults). */
  envValue: () => string | null;
}

/**
 * The catalogue of store-managed settings. Each entry maps a setting key to its
 * category and to the `@hsm/config` env value that seeds it when no DB row
 * exists. Infra keys (DB/Redis/JWT, throttler) are intentionally absent — they
 * stay deploy-only (KTD4).
 */
const SETTING_DEFINITIONS: SettingDefinition[] = [
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

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);

  constructor(
    @InjectRepository(AppSettingEntity, DatabasesEnum.HsmDbPostgres)
    private readonly settings: Repository<AppSettingEntity>,
    @InjectRepository(AppSettingAuditEntity, DatabasesEnum.HsmDbPostgres)
    private readonly audits: Repository<AppSettingAuditEntity>,
  ) {}

  private definitionsForCategory(
    category: SettingsCategoryEnum,
  ): SettingDefinition[] {
    return SETTING_DEFINITIONS.filter(def => def.category === category);
  }

  private definitionForKey(key: string): SettingDefinition | undefined {
    return SETTING_DEFINITIONS.find(def => def.key === key);
  }

  /**
   * Resolves the effective stored/seed value for a definition: the DB row value
   * if present, otherwise the env seed. Returns the RAW value (never masked) —
   * callers are responsible for masking secrets before returning to clients.
   */
  private resolveRawValue(
    def: SettingDefinition,
    row: AppSettingEntity | undefined,
  ): string | null {
    if (row) return row.value;
    return def.envValue();
  }

  async getByCategory(
    category: SettingsCategoryEnum,
  ): Promise<GetSettingsResponseDto> {
    const defs = this.definitionsForCategory(category);
    const keys = defs.map(d => d.key);
    const rows = keys.length
      ? await this.settings.find({ where: { key: In(keys) } })
      : [];
    const rowByKey = new Map(rows.map(r => [r.key, r]));

    const settings: SettingItemDto[] = defs.map(def => {
      const raw = this.resolveRawValue(def, rowByKey.get(def.key));
      const isSet = raw != null && raw !== '';
      return {
        key: def.key,
        category: def.category,
        isSecret: def.isSecret,
        isSet,
        // Secrets are never read back — masked when a value exists, null otherwise.
        value: def.isSecret ? (isSet ? SECRET_MASK : null) : raw,
      };
    });

    return { category, settings };
  }

  async update(
    payload: UpdateSettingsPayloadDto,
    actorId: string | null,
  ): Promise<GetSettingsResponseDto> {
    for (const item of payload.settings) {
      const def = this.definitionForKey(item.key);
      if (!def || def.category !== payload.category) {
        // Ignore unknown keys / keys outside the declared category rather than
        // creating arbitrary rows.
        this.logger.warn(
          `Ignoring update for unknown or mismatched setting key '${item.key}'`,
        );
        continue;
      }

      const incoming = item.value ?? '';
      const isBlank = incoming.trim() === '';

      // A blank secret leaves the stored value unchanged (never overwrite a
      // secret with an empty value).
      if (def.isSecret && isBlank) {
        continue;
      }

      const existingRow = await this.settings.findOne({
        where: { key: def.key },
      });
      const previousRaw = this.resolveRawValue(def, existingRow ?? undefined);
      const newRaw = incoming;

      // Skip when the effective value is unchanged.
      if (previousRaw === newRaw) {
        continue;
      }

      if (existingRow) {
        existingRow.value = newRaw;
        existingRow.updatedBy = actorId;
        existingRow.category = def.category;
        existingRow.isSecret = def.isSecret;
        await this.settings.save(existingRow);
      } else {
        await this.settings.save(
          this.settings.create({
            key: def.key,
            category: def.category,
            isSecret: def.isSecret,
            value: newRaw,
            updatedBy: actorId,
          }),
        );
      }

      // Audit: secret old/new values are masked, never plaintext.
      await this.audits.save(
        this.audits.create({
          key: def.key,
          category: def.category,
          changedBy: actorId,
          oldValue: def.isSecret
            ? previousRaw != null && previousRaw !== ''
              ? SECRET_MASK
              : null
            : previousRaw,
          newValue: def.isSecret ? SECRET_MASK : newRaw,
        }),
      );
    }

    return this.getByCategory(payload.category);
  }
}
