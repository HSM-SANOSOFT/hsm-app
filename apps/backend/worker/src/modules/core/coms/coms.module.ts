import {
  EmailRecipientEntity,
  EmailSuppressionEntity,
  EmailWebhookEventEntity,
} from '@hsm/database/entities';
import { DatabasesEnum } from '@hsm/database/sources';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TemplatesModule } from '../templates/templates.module';
import { ComsService } from './coms.service';
import { EmailModule } from './email/email.module';
import { SmsModule } from './sms/sms.module';
import { EmailWebhookService } from './webhook/email-webhook.service';

@Module({
  imports: [
    EmailModule,
    SmsModule,
    TemplatesModule,
    TypeOrmModule.forFeature(
      [EmailWebhookEventEntity, EmailRecipientEntity, EmailSuppressionEntity],
      DatabasesEnum.HsmDbPostgres,
    ),
  ],
  providers: [ComsService, EmailWebhookService],
})
export class ComsModule {}
