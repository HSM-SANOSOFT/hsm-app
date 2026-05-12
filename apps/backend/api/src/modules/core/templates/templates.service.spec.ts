import { TemplateCategoriesEnum } from '@hsm/common/enums';
import {
  TemplateAlreadyExistsError,
  TemplateInUseError,
  TemplateInvalidHandlebarsError,
  TemplateInvalidShapeError,
  TemplateNotFoundError,
} from '@hsm/common/errors';
import {
  TemplateComEmailEntity,
  TemplateComSmsEntity,
  TemplateDocEntity,
  TemplatesEntity,
} from '@hsm/database/entities/modules/core/template';
import { DatabasesEnum } from '@hsm/database/sources';
import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken, getRepositoryToken } from '@nestjs/typeorm';
import { TemplatesService } from './templates.service';

const BASE_UUID = '11111111-1111-1111-1111-111111111111';

describe('TemplatesService', () => {
  let service: TemplatesService;
  let templatesRepo: { findOne: jest.Mock; count: jest.Mock };
  let managerSave: jest.Mock;
  let managerUpdate: jest.Mock;
  let managerDelete: jest.Mock;
  let managerCreate: jest.Mock;
  let dataSource: {
    transaction: (cb: (mgr: unknown) => Promise<unknown>) => Promise<unknown>;
  };

  beforeEach(async () => {
    templatesRepo = {
      findOne: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
    };
    managerSave = jest.fn(async (_entity, value) => value);
    managerUpdate = jest.fn().mockResolvedValue({ affected: 1 });
    managerDelete = jest.fn().mockResolvedValue({ affected: 1 });
    managerCreate = jest.fn((_entity, value) => value);
    const manager = {
      create: managerCreate,
      save: managerSave,
      update: managerUpdate,
      delete: managerDelete,
    };
    dataSource = {
      transaction: jest.fn(async cb => cb(manager)),
    };

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
          provide: getDataSourceToken(DatabasesEnum.HsmDbPostgres),
          useValue: dataSource,
        },
      ],
    }).compile();

    service = module.get<TemplatesService>(TemplatesService);
  });

  // ─── findByIdentifier ────────────────────────────────────────────────────────

  describe('findByIdentifier', () => {
    it('throws TemplateNotFoundError when missing', async () => {
      templatesRepo.findOne.mockResolvedValue(null);
      await expect(service.findByIdentifier('missing')).rejects.toBeInstanceOf(
        TemplateNotFoundError,
      );
    });

    it('returns {template, baseTemplate:null} for a BASE template', async () => {
      const entity = {
        id: 'id-1',
        name: 'a',
        category: TemplateCategoriesEnum.BASE,
        isActive: true,
        schema: {},
        content: '<html>{{{body}}}</html>',
        description: null,
        baseTemplate: null,
      };
      templatesRepo.findOne.mockResolvedValue(entity);
      const result = await service.findByIdentifier('a');
      expect(result.template.id).toBe('id-1');
      expect(result.template.metadata).toBeNull();
      expect(result.baseTemplate).toBeNull();
    });

    it('returns email metadata for EMAIL_INTERNAL template', async () => {
      const entity = {
        id: 'id-2',
        name: 'email-tmpl',
        category: TemplateCategoriesEnum.EMAIL_INTERNAL,
        isActive: true,
        schema: { patientName: 'string' },
        content: '<p>{{patientName}}</p>',
        description: null,
        comEmail: {
          subject: 'Hello',
          fromEmail: 'a@b.com',
          fromName: 'HSM',
          cc: null,
          bcc: null,
          hasAttachment: false,
        },
        baseTemplate: {
          id: 'base-1',
          name: 'layout',
          category: TemplateCategoriesEnum.BASE,
          isActive: true,
          schema: { body: 'string' },
          content: '<html>{{{body}}}</html>',
          description: null,
          baseTemplate: null,
        },
      };
      templatesRepo.findOne.mockResolvedValue(entity);
      const result = await service.findByIdentifier('email-tmpl', {
        withChildren: true,
        withBase: true,
      });
      expect(result.template.metadata).toMatchObject({
        subject: 'Hello',
        fromEmail: 'a@b.com',
        fromName: 'HSM',
        hasAttachment: false,
      });
      expect(result.baseTemplate?.id).toBe('base-1');
      expect(result.baseTemplate?.metadata).toBeNull();
    });

    it('returns doc metadata for DOCS template', async () => {
      const entity = {
        id: 'id-3',
        name: 'doc-tmpl',
        category: TemplateCategoriesEnum.DOCS,
        isActive: true,
        schema: {},
        content: '<p>doc</p>',
        description: null,
        doc: {
          documentCode: 'SOME_CODE',
          format: 'PDF',
          size: 'A4',
          orientation: 'PORTRAIT',
        },
        baseTemplate: {
          id: 'base-1',
          name: 'layout',
          category: TemplateCategoriesEnum.BASE,
          isActive: true,
          schema: {},
          content: '{{{body}}}',
          description: null,
          baseTemplate: null,
        },
      };
      templatesRepo.findOne.mockResolvedValue(entity);
      const result = await service.findByIdentifier('doc-tmpl', {
        withChildren: true,
        withBase: true,
      });
      expect(result.template.metadata).toMatchObject({
        documentCode: 'SOME_CODE',
        format: 'PDF',
      });
    });

    it('returns SMS metadata for SMS_INTERNAL template', async () => {
      const entity = {
        id: 'id-4',
        name: 'sms-tmpl',
        category: TemplateCategoriesEnum.SMS_INTERNAL,
        isActive: true,
        schema: { patientName: 'string' },
        content: 'Hello {{patientName}}',
        description: null,
        comSms: {
          provider: 'twilio',
          templateName: 'appt_reminder',
          from: '+15005550006',
        },
        baseTemplate: {
          id: 'base-1',
          name: 'layout',
          category: TemplateCategoriesEnum.BASE,
          isActive: true,
          schema: {},
          content: '{{{body}}}',
          description: null,
          baseTemplate: null,
        },
      };
      templatesRepo.findOne.mockResolvedValue(entity);
      const result = await service.findByIdentifier('sms-tmpl', {
        withChildren: true,
        withBase: true,
      });
      expect(result.template.metadata).toMatchObject({
        provider: 'twilio',
        templateName: 'appt_reminder',
        from: '+15005550006',
      });
      expect(result.baseTemplate?.metadata).toBeNull();
    });
  });

  // ─── create ──────────────────────────────────────────────────────────────────

  describe('create', () => {
    const baseDto = {
      category: TemplateCategoriesEnum.BASE,
      name: 'base-1',
      schema: {},
      content: '<html>{{{body}}}</html>',
    };

    it('rejects invalid Handlebars', async () => {
      templatesRepo.findOne.mockResolvedValue(null);
      await expect(
        service.create({ ...baseDto, content: '{{#if x}}' }),
      ).rejects.toBeInstanceOf(TemplateInvalidHandlebarsError);
    });

    it('rejects duplicate name', async () => {
      templatesRepo.findOne.mockResolvedValueOnce({ id: 'dup' });
      await expect(service.create(baseDto)).rejects.toBeInstanceOf(
        TemplateAlreadyExistsError,
      );
    });

    it('rejects EMAIL category without email block', async () => {
      await expect(
        service.create({
          category: TemplateCategoriesEnum.EMAIL_INTERNAL,
          name: 'x',
          schema: {},
          content: '<p>{{a}}</p>',
          baseTemplateId: BASE_UUID,
        }),
      ).rejects.toBeInstanceOf(TemplateInvalidShapeError);
    });

    it('rejects BASE with baseTemplateId', async () => {
      await expect(
        service.create({
          ...baseDto,
          baseTemplateId: BASE_UUID,
        }),
      ).rejects.toBeInstanceOf(TemplateInvalidShapeError);
    });

    it('rejects BASE with sms block', async () => {
      await expect(
        service.create({
          ...baseDto,
          sms: { provider: 'twilio', templateName: 'x', from: '+1' },
        } as Parameters<typeof service.create>[0]),
      ).rejects.toBeInstanceOf(TemplateInvalidShapeError);
    });

    it('rejects SMS_INTERNAL without sms block', async () => {
      await expect(
        service.create({
          category: TemplateCategoriesEnum.SMS_INTERNAL,
          name: 'sms-x',
          schema: {},
          content: 'Hello {{name}}',
          baseTemplateId: BASE_UUID,
        }),
      ).rejects.toBeInstanceOf(TemplateInvalidShapeError);
    });

    it('rejects SMS_INTERNAL without baseTemplateId', async () => {
      await expect(
        service.create({
          category: TemplateCategoriesEnum.SMS_INTERNAL,
          name: 'sms-x',
          schema: {},
          content: 'Hello {{name}}',
          sms: { provider: 'twilio', templateName: 'x', from: '+1' },
        } as Parameters<typeof service.create>[0]),
      ).rejects.toBeInstanceOf(TemplateInvalidShapeError);
    });

    it('happy path: BASE template returns {template:{metadata:null}, baseTemplate:null}', async () => {
      const savedEntity = {
        id: 'id-1',
        ...baseDto,
        category: TemplateCategoriesEnum.BASE,
        isActive: true,
        description: null,
        baseTemplate: null,
      };
      // findOne: no duplicate, then findByIdentifier reload
      templatesRepo.findOne
        .mockResolvedValueOnce(null)   // name uniqueness check
        .mockResolvedValueOnce(savedEntity); // findByIdentifier reload
      managerSave.mockResolvedValueOnce({ id: 'id-1' });

      const out = await service.create(baseDto);
      expect(out.template.id).toBe('id-1');
      expect(out.template.metadata).toBeNull();
      expect(out.baseTemplate).toBeNull();
      expect(dataSource.transaction).toHaveBeenCalled();
    });
  });

  // ─── delete ──────────────────────────────────────────────────────────────────

  describe('delete', () => {
    it('blocks when referenced as base', async () => {
      templatesRepo.findOne.mockResolvedValue({
        id: 'id-1',
        category: TemplateCategoriesEnum.BASE,
      });
      templatesRepo.count.mockResolvedValue(1);
      await expect(service.delete('id-1')).rejects.toBeInstanceOf(
        TemplateInUseError,
      );
    });

    it('throws not-found when missing', async () => {
      templatesRepo.findOne.mockResolvedValue(null);
      await expect(service.delete('id-1')).rejects.toBeInstanceOf(
        TemplateNotFoundError,
      );
    });

    it('hard-deletes a BASE template', async () => {
      templatesRepo.findOne.mockResolvedValue({
        id: 'id-1',
        category: TemplateCategoriesEnum.BASE,
      });
      templatesRepo.count.mockResolvedValue(0);
      await service.delete('id-1');
      expect(managerDelete).toHaveBeenCalledWith(TemplatesEntity, {
        id: 'id-1',
      });
    });

    it('deletes TemplateComEmailEntity child for EMAIL_INTERNAL', async () => {
      templatesRepo.findOne.mockResolvedValue({
        id: 'id-email',
        category: TemplateCategoriesEnum.EMAIL_INTERNAL,
      });
      templatesRepo.count.mockResolvedValue(0);
      await service.delete('id-email');
      expect(managerDelete).toHaveBeenCalledWith(TemplateComEmailEntity, {
        id: 'id-email',
      });
      expect(managerDelete).toHaveBeenCalledWith(TemplatesEntity, {
        id: 'id-email',
      });
    });

    it('deletes TemplateDocEntity child for DOCS', async () => {
      templatesRepo.findOne.mockResolvedValue({
        id: 'id-doc',
        category: TemplateCategoriesEnum.DOCS,
      });
      templatesRepo.count.mockResolvedValue(0);
      await service.delete('id-doc');
      expect(managerDelete).toHaveBeenCalledWith(TemplateDocEntity, {
        id: 'id-doc',
      });
    });

    it('deletes TemplateComSmsEntity child for SMS_INTERNAL', async () => {
      templatesRepo.findOne.mockResolvedValue({
        id: 'id-sms',
        category: TemplateCategoriesEnum.SMS_INTERNAL,
      });
      templatesRepo.count.mockResolvedValue(0);
      await service.delete('id-sms');
      expect(managerDelete).toHaveBeenCalledWith(TemplateComSmsEntity, {
        id: 'id-sms',
      });
      expect(managerDelete).toHaveBeenCalledWith(TemplatesEntity, {
        id: 'id-sms',
      });
    });

    it('deletes TemplateComSmsEntity child for SMS_EXTERNAL', async () => {
      templatesRepo.findOne.mockResolvedValue({
        id: 'id-sms-ext',
        category: TemplateCategoriesEnum.SMS_EXTERNAL,
      });
      templatesRepo.count.mockResolvedValue(0);
      await service.delete('id-sms-ext');
      expect(managerDelete).toHaveBeenCalledWith(TemplateComSmsEntity, {
        id: 'id-sms-ext',
      });
    });
  });

  // ─── validate ────────────────────────────────────────────────────────────────

  describe('validate', () => {
    const templateEntity = {
      id: 'tmpl-1',
      name: 'welcome',
      schema: { userName: 'string' },
      content: '<p>Hello {{userName}}</p>',
      category: TemplateCategoriesEnum.EMAIL_EXTERNAL,
      isActive: true,
      description: null,
      baseTemplate: null,
    };

    it('returns valid:true and templateId when schema and content are valid', async () => {
      templatesRepo.findOne.mockResolvedValue(templateEntity);
      const result = await service.validate({
        identifier: 'welcome',
        data: { userName: 'Ada' },
      });
      expect(result).toEqual({ valid: true, templateId: 'tmpl-1' });
    });

    it('throws TemplateNotFoundError when identifier is missing', async () => {
      templatesRepo.findOne.mockResolvedValue(null);
      await expect(
        service.validate({ identifier: 'ghost', data: {} }),
      ).rejects.toBeInstanceOf(TemplateNotFoundError);
    });

    it('returns valid:false with issues when data fails schema validation', async () => {
      templatesRepo.findOne.mockResolvedValue(templateEntity);
      const result = await service.validate({
        identifier: 'welcome',
        data: {},
      });
      expect(result.valid).toBe(false);
      expect(result.templateId).toBe('tmpl-1');
      expect(result.issues?.length).toBeGreaterThan(0);
    });

    it('returns valid:false with content issue when template has malformed Handlebars', async () => {
      templatesRepo.findOne.mockResolvedValue({
        ...templateEntity,
        schema: {},
        content: '{{#if x}}',
      });
      const result = await service.validate({
        identifier: 'welcome',
        data: {},
      });
      expect(result.valid).toBe(false);
      expect(result.issues?.[0]?.path).toBe('content');
    });

    it('does NOT write to parseLogs', async () => {
      templatesRepo.findOne.mockResolvedValue(templateEntity);
      await service.validate({
        identifier: 'welcome',
        data: { userName: 'X' },
      });
      expect(templatesRepo.findOne).toHaveBeenCalledTimes(1);
    });
  });
});
