import type { NormalizedWebhookEvent } from '@hsm/common/types';

export interface IEmailWebhookAdapter {
  verify(headers: Record<string, string>, rawBody: Buffer, signingKey: string): boolean;
  normalize(rawPayload: unknown): NormalizedWebhookEvent[];
}
