import { SettingsAccessorModule } from '@hsm/database/settings';
import { Module } from '@nestjs/common';
import { TemplatesModule } from '../templates/templates.module';
import { ComsController } from './coms.controller';
import { ComsService } from './coms.service';
import { ComsWebhookController } from './webhook/coms-webhook.controller';
import { ComsWebhookService } from './webhook/coms-webhook.service';
import { EmailWebhookAdapterFactory } from './webhook/email-webhook-adapter.factory';

@Module({
  imports: [TemplatesModule, SettingsAccessorModule],
  controllers: [ComsController, ComsWebhookController],
  providers: [ComsService, ComsWebhookService, EmailWebhookAdapterFactory],
})
export class ComsModule {}
