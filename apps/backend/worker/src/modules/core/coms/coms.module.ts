import { Module } from '@nestjs/common';
import { TemplatesModule } from '../templates/templates.module';
import { ComsService } from './coms.service';
import { EmailModule } from './email/email.module';
import { SmsModule } from './sms/sms.module';

@Module({
  imports: [EmailModule, SmsModule, TemplatesModule],
  providers: [ComsService],
})
export class ComsModule {}
