import { SendEmailPayloadDto } from '@hsm/common/dtos';

import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';

@Injectable()
export class ComsService {
  constructor(@InjectQueue('coms') private readonly comsQueue: Queue) {}
  async sendEmail(payload: SendEmailPayloadDto) {
    const job = await this.comsQueue.add('send-email', payload);
    return 'sending email job queued with id ' + job.id;
  }

  async resendEmail() {
    // Implementation for resending email
  }

  async sendSms() {
    // Implementation for sending SMS
  }
}
