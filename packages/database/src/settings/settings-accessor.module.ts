import { Module } from '@nestjs/common';
import { SettingsAccessorService } from './settings-accessor.service';

/**
 * Provides the runtime {@link SettingsAccessorService}. Importable by BOTH the
 * API and the worker (and by `@hsm/storage`'s S3 module) — every one of them
 * already imports the global `DatabaseModule`, so the `AppSettingEntity`
 * repository the accessor injects is resolvable wherever this module is imported.
 *
 * Not registered globally on purpose: only the three live-config consumers
 * (webhook, SMTP, S3) need it, so each imports this module explicitly.
 */
@Module({
  providers: [SettingsAccessorService],
  exports: [SettingsAccessorService],
})
export class SettingsAccessorModule {}
