import { Module } from '@nestjs/common';
import { ComsService } from './coms.service';
import { EmailModule } from './email/email.module';
import { SmsModule } from './sms/sms.module';
import { TemplateModule } from './template/template.module';

@Module({
  imports: [EmailModule, SmsModule, TemplateModule],
  providers: [ComsService],
})
export class ComsModule {}
