import type { SeedDefinition } from '@hsm/common/interfaces';
import { TemplateComSmsEntity } from '@hsm/database/entities';
import { TEMPLATE_SMS_APPT_REMINDER_ID } from './templates.seed';

export const templateComSmsSeed: SeedDefinition<TemplateComSmsEntity> = {
  entity: TemplateComSmsEntity,
  rows: [
    {
      id: TEMPLATE_SMS_APPT_REMINDER_ID,
      provider: 'twilio',
      templateName: 'appt_reminder',
      from: '+15005550006',
    },
  ],
};
