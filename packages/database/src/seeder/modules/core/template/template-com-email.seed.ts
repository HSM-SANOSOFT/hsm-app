import type { SeedDefinition } from '@hsm/common/interfaces';
import { TemplateComEmailEntity } from '@hsm/database/entities/modules/core/template';
import { TEMPLATE_APPT_CONFIRM_ID } from './templates.seed';

export const templateComEmailSeed: SeedDefinition<TemplateComEmailEntity> = {
  entity: TemplateComEmailEntity,
  rows: [
    {
      id: TEMPLATE_APPT_CONFIRM_ID,
      subject: 'Appointment Confirmed',
      fromEmail: 'no-reply@hsm.org',
      fromName: 'HSM',
      cc: null as unknown as string[],
      bcc: null as unknown as string[],
      hasAttachment: false,
    },
  ],
};
