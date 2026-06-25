import { createHmac, timingSafeEqual } from 'node:crypto';
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

    // This service receives the events as a JSON body (see ComsWebhookService),
    // so the signature is HMAC-SHA1 of the raw body bytes with the signing key.
    // (A native Mandrill form-post integration would instead sign the webhook
    // URL + sorted POST params — switch the input here if that format is added.)
    const computed = createHmac('sha1', signingKey)
      .update(rawBody)
      .digest('base64');

    // Constant-time comparison so a mismatch can't be probed by timing. Buffers
    // of differing length make timingSafeEqual throw, so guard on length first.
    const computedBuf = Buffer.from(computed);
    const signatureBuf = Buffer.from(signature);
    if (computedBuf.length !== signatureBuf.length) return false;
    return timingSafeEqual(computedBuf, signatureBuf);
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
