import {
  DocumentsEntity,
  EmailBatchEntity,
  EmailRecipientEntity,
} from '@hsm/database/entities';
import { SettingsAccessorModule } from '@hsm/database/settings';
import { DatabasesEnum } from '@hsm/database/sources';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocsModule } from '../../docs/docs.module';
import { TemplatesModule } from '../../templates/templates.module';
import { EmailService } from './email.service';
import { SmtpTransportProvider } from './smtp-transport.provider';

@Module({
  imports: [
    TemplatesModule,
    DocsModule,
    // Live config (U4): the SMTP transport is rebuilt lazily on settings change.
    SettingsAccessorModule,
    TypeOrmModule.forFeature(
      [EmailBatchEntity, EmailRecipientEntity, DocumentsEntity],
      DatabasesEnum.HsmDbPostgres,
    ),
  ],
  providers: [EmailService, SmtpTransportProvider],
  exports: [EmailService],
})
export class EmailModule {}
