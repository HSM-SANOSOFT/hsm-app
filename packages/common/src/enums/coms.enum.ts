export enum EmailWebhookEventTypeEnum {
  DELIVERED = 'delivered',
  BOUNCED_HARD = 'bounced_hard',
  BOUNCED_SOFT = 'bounced_soft',
  SPAM = 'spam',
  DEFERRED = 'deferred',
  OPEN = 'open',
  CLICK = 'click',
  UNSUBSCRIBED = 'unsubscribed',
  UNKNOWN = 'unknown',
}
