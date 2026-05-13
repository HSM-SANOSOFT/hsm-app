export enum EmailBatchStatusEnum {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  SENT = 'SENT',
  PARTIAL = 'PARTIAL',
  FAILED = 'FAILED',
}

export enum EmailRecipientStatusEnum {
  PENDING = 'PENDING',
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  FAILED = 'FAILED',
}
