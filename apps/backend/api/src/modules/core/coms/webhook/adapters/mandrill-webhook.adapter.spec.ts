import { createHmac } from 'node:crypto';

import { EmailWebhookEventTypeEnum } from '@hsm/common/enums';

import { MandrillWebhookAdapter } from './mandrill-webhook.adapter';

describe('MandrillWebhookAdapter', () => {
  let adapter: MandrillWebhookAdapter;

  beforeEach(() => {
    adapter = new MandrillWebhookAdapter();
  });

  // ---------------------------------------------------------------------------
  // verify
  // ---------------------------------------------------------------------------

  describe('verify', () => {
    const signingKey = 'my-test-signing-key';
    const rawBody = Buffer.from('event=send&ts=1700000000');

    function makeSignature(body: Buffer, key: string): string {
      return createHmac('sha1', key).update(body).digest('base64');
    }

    it('returns true when the HMAC-SHA1 signature matches', () => {
      const sig = makeSignature(rawBody, signingKey);
      const headers = { 'x-mandrill-signature': sig };

      expect(adapter.verify(headers, rawBody, signingKey)).toBe(true);
    });

    it('returns false when the signing key is wrong', () => {
      const sig = makeSignature(rawBody, signingKey);
      const headers = { 'x-mandrill-signature': sig };

      expect(adapter.verify(headers, rawBody, 'wrong-key')).toBe(false);
    });

    it('returns false when the x-mandrill-signature header is missing', () => {
      expect(adapter.verify({}, rawBody, signingKey)).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // normalize
  // ---------------------------------------------------------------------------

  describe('normalize', () => {
    it('maps hard_bounce event to BOUNCED_HARD with all fields', () => {
      const ts = 1700000000;
      const payload = [
        {
          event: 'hard_bounce',
          ts,
          msg: {
            email: 'user@example.com',
            _id: 'msg-abc-123',
            diag: '550 user not found',
          },
        },
      ];

      const [result] = adapter.normalize(payload);

      expect(result.eventType).toBe(EmailWebhookEventTypeEnum.BOUNCED_HARD);
      expect(result.recipientEmail).toBe('user@example.com');
      expect(result.providerMessageId).toBe('msg-abc-123');
      expect(result.timestamp).toEqual(new Date(ts * 1000));
      expect(result.reason).toBe('550 user not found');
      expect(result.rawPayload).toBe(payload[0]);
    });

    it('maps send event to DELIVERED', () => {
      const payload = [
        { event: 'send', ts: 1700000001, msg: { email: 'a@b.com' } },
      ];
      const [result] = adapter.normalize(payload);
      expect(result.eventType).toBe(EmailWebhookEventTypeEnum.DELIVERED);
    });

    it('maps spam event to SPAM', () => {
      const payload = [
        { event: 'spam', ts: 1700000002, msg: { email: 'c@d.com' } },
      ];
      const [result] = adapter.normalize(payload);
      expect(result.eventType).toBe(EmailWebhookEventTypeEnum.SPAM);
    });

    it('maps soft_bounce event to BOUNCED_SOFT', () => {
      const payload = [
        { event: 'soft_bounce', ts: 1700000003, msg: { email: 'e@f.com' } },
      ];
      const [result] = adapter.normalize(payload);
      expect(result.eventType).toBe(EmailWebhookEventTypeEnum.BOUNCED_SOFT);
    });

    it('maps open event to OPEN', () => {
      const payload = [
        { event: 'open', ts: 1700000004, msg: { email: 'g@h.com' } },
      ];
      const [result] = adapter.normalize(payload);
      expect(result.eventType).toBe(EmailWebhookEventTypeEnum.OPEN);
    });

    it('maps click event to CLICK', () => {
      const payload = [
        { event: 'click', ts: 1700000005, msg: { email: 'i@j.com' } },
      ];
      const [result] = adapter.normalize(payload);
      expect(result.eventType).toBe(EmailWebhookEventTypeEnum.CLICK);
    });

    it('maps unsub event to UNSUBSCRIBED', () => {
      const payload = [
        { event: 'unsub', ts: 1700000006, msg: { email: 'k@l.com' } },
      ];
      const [result] = adapter.normalize(payload);
      expect(result.eventType).toBe(EmailWebhookEventTypeEnum.UNSUBSCRIBED);
    });

    it('maps unknown event type to UNKNOWN without throwing', () => {
      const payload = [
        {
          event: 'totally_unknown_event',
          ts: 1700000007,
          msg: { email: 'm@n.com' },
        },
      ];
      expect(() => adapter.normalize(payload)).not.toThrow();
      const [result] = adapter.normalize(payload);
      expect(result.eventType).toBe(EmailWebhookEventTypeEnum.UNKNOWN);
    });

    it('returns empty array for empty array input', () => {
      expect(adapter.normalize([])).toEqual([]);
    });

    it('returns empty array for non-array input', () => {
      expect(adapter.normalize(null)).toEqual([]);
      expect(adapter.normalize(undefined)).toEqual([]);
      expect(adapter.normalize({ event: 'send' })).toEqual([]);
      expect(adapter.normalize('string-payload')).toEqual([]);
    });

    it('sets providerMessageId to undefined when _id is absent', () => {
      const payload = [
        { event: 'send', ts: 1700000008, msg: { email: 'o@p.com' } },
      ];
      const [result] = adapter.normalize(payload);
      expect(result.providerMessageId).toBeUndefined();
    });

    it('sets reason to undefined when diag is absent', () => {
      const payload = [
        { event: 'hard_bounce', ts: 1700000009, msg: { email: 'q@r.com' } },
      ];
      const [result] = adapter.normalize(payload);
      expect(result.reason).toBeUndefined();
    });
  });
});
