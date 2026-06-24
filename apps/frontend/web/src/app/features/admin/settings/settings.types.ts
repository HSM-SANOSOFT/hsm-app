import type { SettingsCategoryEnum } from '@hsm/common/enums';

/**
 * Frontend-local mirrors of the `@hsm/common` settings wire shapes.
 *
 * Per `apps/frontend/web/CLAUDE.md`, DTO *shapes* are mirrored locally rather
 * than imported from `@hsm/common/dtos` (the barrel drags `@nestjs/swagger` /
 * `class-validator` / Node types through the browser build). The runtime
 * `SettingsCategoryEnum`, by contrast, IS imported directly — it carries
 * values that must stay in lockstep with the backend.
 *
 * Keep these 1:1 with `packages/common/src/dtos/settings.dto.ts`.
 */

/** Mirror of `@hsm/common` `SettingItemDto`. */
export interface SettingItem {
  /** Unique setting key (e.g. `SMTP_ADDRESS`). */
  key: string;
  /** Category the setting belongs to. */
  category: SettingsCategoryEnum;
  /**
   * Setting value. For secret settings this is a MASKED placeholder
   * (`'********'`) when set, or `null` when unset — NEVER the real value.
   */
  value: string | null;
  /** Whether the value is secret (masked on read). */
  isSecret: boolean;
  /** For secrets: whether a stored/seeded value exists. */
  isSet: boolean;
}

/** Mirror of `@hsm/common` `GetSettingsResponseDto`. */
export interface GetSettingsResponse {
  category: SettingsCategoryEnum;
  settings: SettingItem[];
}

/** Mirror of `@hsm/common` `UpdateSettingItemDto`. */
export interface UpdateSettingItem {
  key: string;
  value?: string | null;
}

/** Mirror of `@hsm/common` `UpdateSettingsPayloadDto`. */
export interface UpdateSettingsPayload {
  category: SettingsCategoryEnum;
  settings: UpdateSettingItem[];
}
