import { SendEmailJobDto } from '@hsm/common/dtos';

import { QueueWorkerHost } from '@hsm/queue';
import { Processor } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { EmailService } from './email/email.service';
import { EmailWebhookService } from './webhook/email-webhook.service';

@Processor('coms')
export class ComsService extends QueueWorkerHost {
  constructor(
    private readonly emailService: EmailService,
    private readonly webhookService: EmailWebhookService,
  ) {
    super();
  }

  protected async handle(job: Job) {
    switch (job.name) {
      case 'send-email': {
        const payload = job.data as SendEmailJobDto;
        return await this.emailService.sendEmail(payload);
      }
      case 'process-webhook-event': {
        const { webhookEventId } = job.data as { webhookEventId: string };
        return await this.webhookService.processWebhookEvent(webhookEventId);
      }
      default:
        throw new Error(`Unknown job name: ${job.name}`);
    }
  }
}
