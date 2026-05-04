import { TemplateCategoriesEnum } from '@hsm/common/enums';
import {
  TemplateAlreadyExistsError,
  TemplateInUseError,
  TemplateInvalidHandlebarsError,
  TemplateInvalidShapeError,
  TemplateNotFoundError,
} from '@hsm/common/errors';
import { TemplatesEntity } from '@hsm/database/entities/modules/core/template';
import { DatabasesEnum } from '@hsm/database/sources';
import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken, getRepositoryToken } from '@nestjs/typeorm';
import { TemplatesService } from './templates.service';

describe('TemplatesService', () => {
  let service: TemplatesService;
  let templatesRepo: { findOne: jest.Mock; count: jest.Mock };
  let managerSave: jest.Mock;
  let managerUpdate: jest.Mock;
  let managerDelete: jest.Mock;
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
    const manager = {
      create: <T>(_entity: unknown, value: T) => value,
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
          provide: getRepositoryToken(TemplatesEntity, DatabasesEnum.HsmDbPostgres),
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

  describe('findByIdentifier', () => {
    it('throws TemplateNotFoundError when missing', async () => {
      templatesRepo.findOne.mockResolvedValue(null);
      await expect(service.findByIdentifier('missing')).rejects.toBeInstanceOf(
        TemplateNotFoundError,
      );
    });

    it('returns the template when found', async () => {
      const t = { id: 'id-1', name: 'a' };
      templatesRepo.findOne.mockResolvedValue(t);
      await expect(service.findByIdentifier('a')).resolves.toBe(t);
    });
  });

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
          baseTemplateId: '11111111-1111-1111-1111-111111111111',
        }),
      ).rejects.toBeInstanceOf(TemplateInvalidShapeError);
    });

    it('rejects BASE with baseTemplateId', async () => {
      await expect(
        service.create({
          ...baseDto,
          baseTemplateId: '11111111-1111-1111-1111-111111111111',
        }),
      ).rejects.toBeInstanceOf(TemplateInvalidShapeError);
    });

    it('happy path: BASE template', async () => {
      templatesRepo.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce({
        id: 'id-1',
        name: baseDto.name,
        category: TemplateCategoriesEnum.BASE,
      });
      managerSave.mockResolvedValueOnce({ id: 'id-1', ...baseDto });
      const out = await service.create(baseDto);
      expect(out).toMatchObject({ id: 'id-1' });
      expect(dataSource.transaction).toHaveBeenCalled();
    });
  });

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

    it('hard-deletes when no references', async () => {
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
  });

  describe('validate', () => {
    const template = {
      id: 'tmpl-1',
      name: 'welcome',
      schema: { userName: 'string' },
      content: '<p>Hello {{userName}}</p>',
      category: TemplateCategoriesEnum.EMAIL_EXTERNAL,
    } as unknown as TemplatesEntity;

    it('returns valid:true when template exists, data matches schema, content compiles', async () => {
      templatesRepo.findOne.mockResolvedValue(template);
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
      templatesRepo.findOne.mockResolvedValue(template);
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
        ...template,
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
      templatesRepo.findOne.mockResolvedValue(template);
      await service.validate({ identifier: 'welcome', data: { userName: 'X' } });
      // No parseLogs repo injected — build-level proof. Verify no DB side-effects
      // by confirming only templatesRepo.findOne was called.
      expect(templatesRepo.findOne).toHaveBeenCalledTimes(1);
    });
  });
});
