import {
  EmailRecipientStatusEnum,
  EmailSuppressionReasonEnum,
  EmailWebhookEventTypeEnum,
} from '@hsm/common/enums';
import {
  EmailRecipientEntity,
  EmailSuppressionEntity,
  EmailWebhookEventEntity,
} from '@hsm/database/entities';
import { DatabasesEnum } from '@hsm/database/sources';
import { QueueEnum } from '@hsm/queue';
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { Queue } from 'bullmq';
import { DataSource, Repository } from 'typeorm';

@Injectable()
export class EmailWebhookService {
  private readonly logger = new Logger(EmailWebhookService.name);

  constructor(
    @InjectRepository(EmailWebhookEventEntity, DatabasesEnum.HsmDbPostgres)
    private readonly webhookEventRepo: Repository<EmailWebhookEventEntity>,
    @InjectRepository(EmailRecipientEntity, DatabasesEnum.HsmDbPostgres)
    private readonly recipientRepo: Repository<EmailRecipientEntity>,
    @InjectRepository(EmailSuppressionEntity, DatabasesEnum.HsmDbPostgres)
    private readonly suppressionRepo: Repository<EmailSuppressionEntity>,
    @InjectDataSource(DatabasesEnum.HsmDbPostgres)
    private readonly dataSource: DataSource,
    @InjectQueue(QueueEnum.Coms) private readonly comsQueue: Queue,
  ) {}

  async processWebhookEvent(webhookEventId: string): Promise<void> {
    // Load event
    const event = await this.webhookEventRepo.findOne({
      where: { id: webhookEventId },
    });

    if (!event) {
      this.logger.error(`WebhookEvent ${webhookEventId} not found`);
      return;
    }

    // Idempotency guard — already processed
    if (event.processedAt) {
      this.logger.warn(
        `WebhookEvent ${webhookEventId} already processed, skipping`,
      );
      return;
    }

    // Find matching recipient (most recent one)
    const recipient = await this.recipientRepo.findOne({
      where: { toEmail: event.recipientEmail },
      order: { id: 'DESC' },
    });

    await this.dataSource.transaction(async manager => {
      // Update recipient status
      if (recipient) {
        const newStatus = this.mapEventTypeToRecipientStatus(event.eventType);
        if (newStatus) {
          await manager.update(EmailRecipientEntity, recipient.id, {
            status: newStatus,
          });
        }
        // Link event to recipient
        await manager.update(EmailWebhookEventEntity, event.id, {
          recipient: { id: recipient.id },
        });
      } else {
        this.logger.warn(
          `No recipient found for email: ${event.recipientEmail}`,
        );
      }

      // Suppression for hard bounce or spam
      if (
        event.eventType === EmailWebhookEventTypeEnum.BOUNCED_HARD ||
        event.eventType === EmailWebhookEventTypeEnum.SPAM
      ) {
        const reason =
          event.eventType === EmailWebhookEventTypeEnum.SPAM
            ? EmailSuppressionReasonEnum.SPAM_COMPLAINT
            : EmailSuppressionReasonEnum.HARD_BOUNCE;

        // Upsert — ignore if already suppressed
        await manager
          .createQueryBuilder()
          .insert()
          .into(EmailSuppressionEntity)
          .values({
            email: event.recipientEmail,
            reason,
            sourceWebhookEvent: { id: event.id },
          })
          .orIgnore()
          .execute();
      }

      // Mark as processed
      await manager.update(EmailWebhookEventEntity, event.id, {
        processedAt: new Date(),
      });
    });

    // Enqueue alert for bounces/failures (stub — notification module will handle it later)
    if (
      event.eventType === EmailWebhookEventTypeEnum.BOUNCED_HARD ||
      event.eventType === EmailWebhookEventTypeEnum.BOUNCED_SOFT ||
      event.eventType === EmailWebhookEventTypeEnum.SPAM
    ) {
      await this.comsQueue
        .add('send-alert', {
          type: 'email-bounce',
          eventId: event.id,
          recipientEmail: event.recipientEmail,
          eventType: event.eventType,
        })
        .catch(err => {
          // Non-critical — just log if alert enqueueing fails
          this.logger.error(
            `Failed to enqueue alert for event ${event.id}`,
            err,
          );
        });
    }

    this.logger.log(
      `Processed webhook event ${webhookEventId} (${event.eventType}) for ${event.recipientEmail}`,
    );
  }

  private mapEventTypeToRecipientStatus(
    eventType: EmailWebhookEventTypeEnum,
  ): EmailRecipientStatusEnum | null {
    const map: Partial<
      Record<EmailWebhookEventTypeEnum, EmailRecipientStatusEnum>
    > = {
      [EmailWebhookEventTypeEnum.DELIVERED]: EmailRecipientStatusEnum.DELIVERED,
      [EmailWebhookEventTypeEnum.BOUNCED_HARD]:
        EmailRecipientStatusEnum.BOUNCED_HARD,
      [EmailWebhookEventTypeEnum.BOUNCED_SOFT]:
        EmailRecipientStatusEnum.BOUNCED_SOFT,
      [EmailWebhookEventTypeEnum.SPAM]: EmailRecipientStatusEnum.SPAM,
    };
    return map[eventType] ?? null;
  }
}
