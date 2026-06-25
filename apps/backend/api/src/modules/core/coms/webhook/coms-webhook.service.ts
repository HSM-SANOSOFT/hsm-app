import type { NormalizedWebhookEvent } from '@hsm/common/types';
import { EmailWebhookEventEntity } from '@hsm/database/entities';
import { SettingsAccessorService } from '@hsm/database/settings';
import { DatabasesEnum } from '@hsm/database/sources';
import { QueueEnum } from '@hsm/queue';
import { InjectQueue } from '@nestjs/bullmq';
import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Queue } from 'bullmq';
import { Repository } from 'typeorm';
import { EmailWebhookAdapterFactory } from './email-webhook-adapter.factory';

@Injectable()
export class ComsWebhookService {
  private readonly logger = new Logger(ComsWebhookService.name);

  constructor(
    private readonly adapterFactory: EmailWebhookAdapterFactory,
    @InjectRepository(EmailWebhookEventEntity, DatabasesEnum.HsmDbPostgres)
    private readonly webhookEventRepo: Repository<EmailWebhookEventEntity>,
    @InjectQueue(QueueEnum.Coms) private readonly comsQueue: Queue,
    // Live config (U4): signing keys come from the store via the short-TTL
    // accessor, so a key change takes effect on the next request without a
    // restart — instead of the boot-frozen `getWebhookSigningKeys()` env read.
    private readonly settingsAccessor: SettingsAccessorService,
  ) {}

  async receiveWebhook(
    provider: string,
    headers: Record<string, string>,
    rawBody: Buffer,
  ): Promise<{ received: number }> {
    // Get adapter
    const adapter = this.adapterFactory.getAdapter(provider);
    if (!adapter) {
      this.logger.warn(`Unknown webhook provider: ${provider}`);
      return { received: 0 };
    }

    // Get signing key (live from the settings store, cached with a short TTL)
    const signingKeys = await this.settingsAccessor.getWebhookSigningKeys();
    const signingKey = signingKeys[provider];
    if (!signingKey) {
      throw new BadRequestException(
        `No signing key configured for provider: ${provider}`,
      );
    }

    // Verify signature
    const valid = adapter.verify(headers, rawBody, signingKey);
    if (!valid) {
      throw new UnauthorizedException('Webhook signature invalid');
    }

    // Parse body and normalize events
    let rawPayload: unknown;
    try {
      rawPayload = JSON.parse(rawBody.toString('utf-8'));
    } catch {
      throw new BadRequestException('Invalid webhook body: not valid JSON');
    }

    const events: NormalizedWebhookEvent[] = adapter.normalize(rawPayload);

    if (events.length === 0) {
      return { received: 0 };
    }

    // Persist + enqueue each event. Keep the save and the enqueue atomic per
    // event: if the enqueue fails, roll back the just-saved row so it isn't
    // left orphaned (persisted but never processed) — the provider will retry.
    let received = 0;
    for (const event of events) {
      const entity = this.webhookEventRepo.create({
        provider,
        eventType: event.eventType,
        rawPayload: rawPayload as object,
        recipientEmail: event.recipientEmail,
        messageId: event.providerMessageId,
      });
      const saved = await this.webhookEventRepo.save(entity);

      try {
        await this.comsQueue.add(
          'process-webhook-event',
          { webhookEventId: saved.id },
          { attempts: 5, backoff: { type: 'exponential', delay: 3000 } },
        );
        received += 1;
      } catch (error) {
        await this.webhookEventRepo.delete({ id: saved.id });
        this.logger.error(
          `Webhook event ${saved.id} saved but could not be enqueued; rolled back: ${(error as Error).message}`,
        );
      }
    }

    this.logger.log(`Received ${received} webhook events from ${provider}`);
    return { received };
  }
}
