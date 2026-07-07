import {
  TemplateCategoriesEnum,
  TemplateParseErrorCodeEnum,
  TemplateParseTriggerEnum,
} from '@hsm/common/enums';
import {
  TemplateInvalidHandlebarsError,
  TemplateNotFoundError,
  TemplateSchemaValidationError,
} from '@hsm/common/errors';
import {
  TemplateParseLogEntity,
  TemplatesEntity,
} from '@hsm/database/entities/modules/core/template';
import { DatabasesEnum } from '@hsm/database/sources';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import Handlebars from 'handlebars';
import { TemplatesService } from './templates.service';

const VALID_UUID = '00000000-0000-0000-0000-000000000001';

const makeTemplate = (
  overrides: Partial<TemplatesEntity> = {},
): TemplatesEntity =>
  ({
    id: 'tmpl-id-1',
    name: 'welcome',
    category: TemplateCategoriesEnum.EMAIL_EXTERNAL,
    content: '<p>Hello {{userName}}</p>',
    schema: { userName: 'string' },
    baseTemplate: null,
    comEmail: null,
    comSms: null,
    doc: null,
    ...overrides,
  }) as unknown as TemplatesEntity;

describe('TemplatesService (worker)', () => {
  let service: TemplatesService;
  let templatesRepo: { findOne: jest.Mock };
  let parseLogsRepo: { save: jest.Mock };

  beforeEach(async () => {
    templatesRepo = { findOne: jest.fn() };
    parseLogsRepo = { save: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TemplatesService,
        {
          provide: getRepositoryToken(
            TemplatesEntity,
            DatabasesEnum.HsmDbPostgres,
          ),
          useValue: templatesRepo,
        },
        {
          provide: getRepositoryToken(
            TemplateParseLogEntity,
            DatabasesEnum.HsmDbPostgres,
          ),
          useValue: parseLogsRepo,
        },
      ],
    }).compile();

    service = module.get<TemplatesService>(TemplatesService);
  });

  describe('parse – happy paths', () => {
    it('renders EMAIL template wrapped in base and writes success log', async () => {
      const base = makeTemplate({
        id: 'base-id',
        name: 'base',
        category: TemplateCategoriesEnum.BASE,
        content: '<html>{{{body}}}</html>',
        schema: {},
      });
      const child = makeTemplate({
        baseTemplate: base,
        schema: { userName: 'string' },
      });
      templatesRepo.findOne.mockResolvedValue(child);

      const result = await service.parse({
        identifier: 'welcome',
        data: { userName: 'Ada' },
      });

      expect(result.html).toContain('<html>');
      expect(result.html).toContain('<p>Hello Ada</p>');
      expect(result.templateId).toBe('tmpl-id-1');
      expect(parseLogsRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          outputLength: result.html.length,
          errorCode: null,
          triggeredBy: TemplateParseTriggerEnum.Internal,
          userId: null,
        }),
      );
    });

    it('renders BASE template without wrapping', async () => {
      const base = makeTemplate({
        category: TemplateCategoriesEnum.BASE,
        content: '<html>{{{body}}}</html>',
        schema: {},
        baseTemplate: null,
      });
      templatesRepo.findOne.mockResolvedValue(base);

      const result = await service.parse({ identifier: 'tmpl-id-1', data: {} });

      expect(result.html).toBe('<html></html>');
      expect(parseLogsRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ success: true }),
      );
    });
  });

  describe('parse – edge cases', () => {
    it('resolves by name when identifier is not a UUID', async () => {
      const t = makeTemplate({ name: 'welcome' });
      templatesRepo.findOne.mockResolvedValue(t);

      await service.parse({ identifier: 'welcome', data: { userName: 'X' } });

      const whereArg = templatesRepo.findOne.mock.calls[0][0].where;
      expect(whereArg).toEqual([{ name: 'welcome' }]);
    });

    it('resolves by id or name when identifier is a UUID', async () => {
      const t = makeTemplate({ id: VALID_UUID });
      templatesRepo.findOne.mockResolvedValue(t);

      await service.parse({ identifier: VALID_UUID, data: { userName: 'X' } });

      const whereArg = templatesRepo.findOne.mock.calls[0][0].where;
      expect(whereArg).toEqual([{ id: VALID_UUID }, { name: VALID_UUID }]);
    });

    it('uses Internal trigger and null userId when context is absent', async () => {
      templatesRepo.findOne.mockResolvedValue(makeTemplate({ schema: {} }));

      await service.parse({ identifier: 'welcome', data: { userName: 'X' } });

      expect(parseLogsRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          triggeredBy: TemplateParseTriggerEnum.Internal,
          userId: null,
        }),
      );
    });
  });

  describe('parse – error paths', () => {
    it('throws TemplateNotFoundError when template is missing and writes no log', async () => {
      templatesRepo.findOne.mockResolvedValue(null);

      await expect(
        service.parse({ identifier: 'ghost', data: {} }),
      ).rejects.toBeInstanceOf(TemplateNotFoundError);

      expect(parseLogsRepo.save).not.toHaveBeenCalled();
    });

    it('throws TemplateSchemaValidationError on bad data and writes failure log', async () => {
      templatesRepo.findOne.mockResolvedValue(makeTemplate());

      await expect(
        service.parse({ identifier: 'welcome', data: {} }),
      ).rejects.toBeInstanceOf(TemplateSchemaValidationError);

      expect(parseLogsRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          errorCode: TemplateParseErrorCodeEnum.Schema,
          outputLength: null,
        }),
      );
    });

    it('throws TemplateInvalidHandlebarsError on runtime compile error and writes HBS_RUNTIME log', async () => {
      templatesRepo.findOne.mockResolvedValue(makeTemplate({ schema: {} }));
      const compileSpy = jest
        .spyOn(Handlebars, 'compile')
        .mockReturnValueOnce((() => {
          throw new Error('runtime failure');
        }) as unknown as HandlebarsTemplateDelegate);

      await expect(
        service.parse({ identifier: 'welcome', data: {} }),
      ).rejects.toBeInstanceOf(TemplateInvalidHandlebarsError);

      expect(parseLogsRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          errorCode: TemplateParseErrorCodeEnum.HbsRuntime,
          outputLength: null,
        }),
      );
      compileSpy.mockRestore();
    });
  });

  describe('parse – integration', () => {
    it('swallows writeLog DB errors without affecting parse success', async () => {
      templatesRepo.findOne.mockResolvedValue(
        makeTemplate({ schema: {}, content: '<p>ok</p>' }),
      );
      parseLogsRepo.save.mockRejectedValue(new Error('db timeout'));

      const result = await service.parse({
        identifier: 'welcome',
        data: { userName: 'X' },
      });

      expect(result.html).toBe('<p>ok</p>');
    });

    it('swallows writeLog DB errors without affecting parse errors', async () => {
      templatesRepo.findOne.mockResolvedValue(makeTemplate());
      parseLogsRepo.save.mockRejectedValue(new Error('db timeout'));

      await expect(
        service.parse({ identifier: 'welcome', data: {} }),
      ).rejects.toBeInstanceOf(TemplateSchemaValidationError);
    });
  });

  describe('parseSms', () => {
    it('returns provider, from, html and templateId for a valid SMS template', async () => {
      const smsTemplate = makeTemplate({
        category: TemplateCategoriesEnum.SMS_INTERNAL,
        content: 'Hello {{patientName}}',
        schema: { patientName: 'string' },
        comSms: {
          id: 'tmpl-id-1',
          provider: 'twilio',
          templateName: 'appt_reminder',
          from: '+15005550006',
        } as never,
        baseTemplate: null,
      });
      // parseSms calls findByIdentifier (once) then parse (which calls findByIdentifier again)
      templatesRepo.findOne
        .mockResolvedValueOnce(smsTemplate)
        .mockResolvedValueOnce(smsTemplate);

      const result = await service.parseSms('sms-tmpl', { patientName: 'Ada' });
      expect(result.provider).toBe('twilio');
      expect(result.from).toBe('+15005550006');
      expect(result.html).toContain('Ada');
      expect(result.templateId).toBe('tmpl-id-1');
    });

    it('throws TemplateInvalidHandlebarsError when template has no comSms relation', async () => {
      const nonSmsTemplate = makeTemplate({
        category: TemplateCategoriesEnum.EMAIL_INTERNAL,
        comSms: null,
      });
      templatesRepo.findOne.mockResolvedValue(nonSmsTemplate);

      await expect(service.parseSms('email-tmpl', {})).rejects.toBeInstanceOf(
        TemplateInvalidHandlebarsError,
      );
    });
  });

  describe('parseEmail', () => {
    const emailTemplate = makeTemplate({
      category: TemplateCategoriesEnum.EMAIL_INTERNAL,
      content: '<p>Hello {{patientName}}</p>',
      schema: { patientName: 'string' },
      comEmail: {
        id: 'tmpl-id-1',
        subject: 'Hello {{patientName}}',
        fromEmail: 'no-reply@hsm.org',
        fromName: 'HSM',
        cc: null,
        bcc: null,
        hasAttachment: false,
      } as never,
      baseTemplate: null,
    });

    it('returns subject, html and templateId for a valid email template', async () => {
      // parseEmail calls findByIdentifier once, then calls parse() which calls findByIdentifier again
      templatesRepo.findOne
        .mockResolvedValueOnce(emailTemplate) // parseEmail's own findByIdentifier
        .mockResolvedValueOnce({
          ...emailTemplate,
          schema: { patientName: 'string' },
        }); // parse's findByIdentifier

      const result = await service.parseEmail('welcome', {
        patientName: 'Ada',
      });
      expect(result.subject).toBe('Hello Ada');
      expect(result.html).toContain('Ada');
      expect(result.templateId).toBe('tmpl-id-1');
    });

    it('throws TemplateInvalidHandlebarsError when template has no comEmail relation', async () => {
      const nonEmailTemplate = makeTemplate({ comEmail: null });
      templatesRepo.findOne.mockResolvedValue(nonEmailTemplate);

      await expect(service.parseEmail('welcome', {})).rejects.toBeInstanceOf(
        TemplateInvalidHandlebarsError,
      );
    });

    it('throws TemplateInvalidHandlebarsError when subject template has malformed Handlebars', async () => {
      const badSubjectTemplate = makeTemplate({
        category: TemplateCategoriesEnum.EMAIL_INTERNAL,
        schema: {},
        comEmail: {
          id: 'tmpl-id-1',
          subject: '{{#if x}}',
          fromEmail: 'a@b.com',
          fromName: 'HSM',
          cc: null,
          bcc: null,
          hasAttachment: false,
        } as never,
      });
      templatesRepo.findOne.mockResolvedValue(badSubjectTemplate);

      await expect(service.parseEmail('welcome', {})).rejects.toBeInstanceOf(
        TemplateInvalidHandlebarsError,
      );
    });
  });
});
