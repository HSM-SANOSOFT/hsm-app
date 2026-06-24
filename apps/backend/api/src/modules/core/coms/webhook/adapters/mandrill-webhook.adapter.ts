import { createHmac } from 'node:crypto';
import { EmailWebhookEventTypeEnum } from '@hsm/common/enums';

import { IEmailWebhookAdapter } from '@hsm/common/interfaces';
import type { NormalizedWebhookEvent } from '@hsm/common/types';
import { Injectable } from '@nestjs/common';

@Injectable()
export class MandrillWebhookAdapter implements IEmailWebhookAdapter {
  verify(
    headers: Record<string, string>,
    rawBody: Buffer,
    signingKey: string,
  ): boolean {
    const signature = headers['x-mandrill-signature'];
    if (!signature) return false;

    // Mandrill signature: HMAC-SHA1 over the webhook URL + sorted POST params
    // For simplicity: verify over the raw body bytes with the signing key
    const computed = createHmac('sha1', signingKey)
      .update(rawBody)
      .digest('base64');
    return computed === signature;
  }

  normalize(rawPayload: unknown): NormalizedWebhookEvent[] {
    if (!rawPayload || !Array.isArray(rawPayload)) return [];
    return rawPayload.map((item: unknown) => this.normalizeEvent(item));
  }

  private normalizeEvent(item: unknown): NormalizedWebhookEvent {
    const event = item as Record<string, unknown>;
    const msg = (event['msg'] ?? {}) as Record<string, unknown>;

    return {
      eventType: this.mapEventType(String(event['event'] ?? '')),
      recipientEmail: String(msg['email'] ?? ''),
      providerMessageId: msg['_id'] ? String(msg['_id']) : undefined,
      timestamp: new Date(Number(event['ts'] ?? Date.now()) * 1000),
      reason: msg['diag'] ? String(msg['diag']) : undefined,
      rawPayload: item,
    };
  }

  private mapEventType(event: string): EmailWebhookEventTypeEnum {
    const map: Record<string, EmailWebhookEventTypeEnum> = {
      send: EmailWebhookEventTypeEnum.DELIVERED,
      hard_bounce: EmailWebhookEventTypeEnum.BOUNCED_HARD,
      soft_bounce: EmailWebhookEventTypeEnum.BOUNCED_SOFT,
      spam: EmailWebhookEventTypeEnum.SPAM,
      reject: EmailWebhookEventTypeEnum.BOUNCED_HARD,
      deferral: EmailWebhookEventTypeEnum.DEFERRED,
      open: EmailWebhookEventTypeEnum.OPEN,
      click: EmailWebhookEventTypeEnum.CLICK,
      unsub: EmailWebhookEventTypeEnum.UNSUBSCRIBED,
    };
    return map[event] ?? EmailWebhookEventTypeEnum.UNKNOWN;
  }
}
