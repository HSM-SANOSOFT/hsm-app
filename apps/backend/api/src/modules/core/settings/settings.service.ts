import type {
  GetSettingsResponseDto,
  SettingItemDto,
  UpdateSettingsPayloadDto,
} from '@hsm/common/dtos';
import { SettingsCategoryEnum } from '@hsm/common/enums';
import {
  AppSettingAuditEntity,
  AppSettingEntity,
} from '@hsm/database/entities';
import {
  resolveDefinitionValue,
  settingDefinitionForKey,
  settingDefinitionsForCategory,
} from '@hsm/database/settings';
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

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);

  constructor(
    @InjectRepository(AppSettingEntity, DatabasesEnum.HsmDbPostgres)
    private readonly settings: Repository<AppSettingEntity>,
    @InjectRepository(AppSettingAuditEntity, DatabasesEnum.HsmDbPostgres)
    private readonly audits: Repository<AppSettingAuditEntity>,
  ) {}

  async getByCategory(
    category: SettingsCategoryEnum,
  ): Promise<GetSettingsResponseDto> {
    const defs = settingDefinitionsForCategory(category);
    const keys = defs.map(d => d.key);
    const rows = keys.length
      ? await this.settings.find({ where: { key: In(keys) } })
      : [];
    const rowByKey = new Map(rows.map(r => [r.key, r]));

    const settings: SettingItemDto[] = defs.map(def => {
      const raw = resolveDefinitionValue(def, rowByKey.get(def.key));
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
    // Pre-fetch every existing row for the payload's keys in a single query
    // (avoids a per-key findOne in the loop below).
    const payloadKeys = payload.settings.map(item => item.key);
    const existingRows = payloadKeys.length
      ? await this.settings.find({ where: { key: In(payloadKeys) } })
      : [];
    const rowByKey = new Map(existingRows.map(r => [r.key, r]));

    // Wrap every per-key setting write AND the audit write in a single
    // transaction (R11): a failure must not leave settings changed with no
    // matching audit trail. The set of rows written and audit contents are
    // identical to the non-transactional version — only atomicity is added.
    await this.settings.manager.transaction(async manager => {
      const auditRows: AppSettingAuditEntity[] = [];

      for (const item of payload.settings) {
        const def = settingDefinitionForKey(item.key);
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

        const existingRow = rowByKey.get(def.key);
        const previousRaw = resolveDefinitionValue(
          def,
          existingRow ?? undefined,
        );
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
          await manager.save(AppSettingEntity, existingRow);
        } else {
          await manager.save(
            AppSettingEntity,
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
        const maskedOld = def.isSecret
          ? previousRaw != null && previousRaw !== ''
            ? SECRET_MASK
            : null
          : previousRaw;
        auditRows.push(
          this.audits.create({
            key: def.key,
            category: def.category,
            changedBy: actorId,
            oldValue: maskedOld,
            newValue: def.isSecret ? SECRET_MASK : newRaw,
          }),
        );
      }

      if (auditRows.length > 0) {
        await manager.save(AppSettingAuditEntity, auditRows);
      }
    });

    return this.getByCategory(payload.category);
  }
}
