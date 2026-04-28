import { SendEmailPayloadDto } from '@hsm/common/dtos';

import { QueueWorkerHost } from '@hsm/queue';
import { Processor } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { EmailService } from './email/email.service';

@Processor('coms')
export class ComsService extends QueueWorkerHost {
  constructor(private readonly emailService: EmailService) {
    super();
  }

  protected async handle(job: Job) {
    switch (job.name) {
      case 'send-email': {
        const payload = job.data as SendEmailPayloadDto;
        return await this.emailService.sendEmail(payload);
      }
      default:
        throw new Error(`Unknown job name: ${job.name}`);
    }
  }
}
