import { TemplateCategoriesEnum } from '@hsm/common/enums';
import type { SeedDefinition } from '@hsm/common/interfaces';
import { TemplatesEntity } from '@hsm/database/entities';
import { v5 as uuidv5 } from 'uuid';

const NS = uuidv5('hsm.seed.templates', uuidv5.DNS);

export const TEMPLATE_BASE_LAYOUT_ID = uuidv5('base_layout', NS);
export const TEMPLATE_APPT_CONFIRM_ID = uuidv5('appointment_confirmation', NS);
export const TEMPLATE_SMS_APPT_REMINDER_ID = uuidv5('sms_appointment_reminder', NS);

export const templatesSeed: SeedDefinition<TemplatesEntity> = {
  entity: TemplatesEntity,
  rows: [
    {
      id: TEMPLATE_BASE_LAYOUT_ID,
      category: TemplateCategoriesEnum.BASE,
      name: 'base_layout',
      isActive: true,
      schema: { body: 'string' },
      content: '<!doctype html><html><body>{{{body}}}</body></html>',
      description: 'Default base layout for emails',
      baseTemplate: null,
    },
    {
      id: TEMPLATE_APPT_CONFIRM_ID,
      category: TemplateCategoriesEnum.EMAIL_INTERNAL,
      name: 'appointment_confirmation',
      isActive: true,
      schema: { patientName: 'string', appointmentDate: 'string' },
      content:
        '<h1>Hello {{patientName}}</h1><p>Appointment: {{appointmentDate}}</p>',
      description: 'Internal appointment confirmation email',
      baseTemplate: { id: TEMPLATE_BASE_LAYOUT_ID } as TemplatesEntity,
    },
    {
      id: TEMPLATE_SMS_APPT_REMINDER_ID,
      category: TemplateCategoriesEnum.SMS_INTERNAL,
      name: 'sms_appointment_reminder',
      isActive: true,
      schema: { patientName: 'string', appointmentDate: 'string' },
      content: 'Hi {{patientName}}, reminder: appointment on {{appointmentDate}}.',
      description: 'Internal SMS appointment reminder',
      baseTemplate: { id: TEMPLATE_BASE_LAYOUT_ID } as TemplatesEntity,
    },
  ],
};
