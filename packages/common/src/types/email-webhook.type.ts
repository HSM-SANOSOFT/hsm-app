import type { EmailWebhookEventTypeEnum } from '@hsm/common/enums';

export interface NormalizedWebhookEvent {
  eventType: EmailWebhookEventTypeEnum;
  recipientEmail: string;
  providerMessageId?: string;
  timestamp: Date;
  reason?: string;
  rawPayload: unknown;
}

export interface WebhookVerificationResult {
  valid: boolean;
  reason?: string;
}
