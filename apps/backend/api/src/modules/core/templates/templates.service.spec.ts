import {
  TemplateCategoriesEnum,
  TemplateParseTriggerEnum,
} from '@hsm/common/enums';
import {
  TemplateAlreadyExistsError,
  TemplateInUseError,
  TemplateInvalidHandlebarsError,
  TemplateInvalidShapeError,
  TemplateNotFoundError,
  TemplateSchemaValidationError,
} from '@hsm/common/errors';
import {
  TemplateParseLogEntity,
  TemplatesEntity,
} from '@hsm/database/entities/modules/core/template';
import { DatabasesEnum } from '@hsm/database/sources';
import { getDataSourceToken, getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import { TemplatesService } from './templates.service';

describe('TemplatesService', () => {
  let service: TemplatesService;
  let templatesRepo: { findOne: jest.Mock; count: jest.Mock };
  let parseLogsRepo: { save: jest.Mock };
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
    parseLogsRepo = { save: jest.fn().mockResolvedValue(undefined) };
    managerSave = jest.fn(async (_entity, value) => value);
    managerUpdate = jest.fn().mockResolvedValue({ affected: 1 });
    managerDelete = jest.fn().mockResolvedValue({ affected: 1 });
    const manager = {
      create: <T,>(_entity: unknown, value: T) => value,
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
          provide: getRepositoryToken(
            TemplateParseLogEntity,
            DatabasesEnum.HsmDbPostgres,
          ),
          useValue: parseLogsRepo,
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
      templatesRepo.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
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

  describe('parse', () => {
    const baseTemplate = {
      id: 'base-id',
      name: 'base',
      category: TemplateCategoriesEnum.BASE,
      schema: {},
      content: '<wrap>{{{body}}}</wrap>',
      baseTemplate: null,
    } as unknown as TemplatesEntity;

    const childTemplate = {
      id: 'child-id',
      name: 'child',
      category: TemplateCategoriesEnum.EMAIL_INTERNAL,
      schema: { name: 'string' },
      content: '<p>Hi {{name}}</p>',
      baseTemplate,
    } as unknown as TemplatesEntity;

    it('renders BASE template alone and writes a success log', async () => {
      templatesRepo.findOne.mockResolvedValue({
        ...baseTemplate,
        schema: { greet: 'string' },
        content: '<x>{{greet}}</x>',
      });
      const result = await service.parse({
        identifier: 'base',
        data: { greet: 'hi' },
        context: { triggeredBy: TemplateParseTriggerEnum.Internal },
      });
      expect(result.html).toBe('<x>hi</x>');
      expect(parseLogsRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, outputLength: '<x>hi</x>'.length }),
      );
    });

    it('wraps child output inside BASE {{{body}}} for non-BASE', async () => {
      templatesRepo.findOne.mockResolvedValue(childTemplate);
      const result = await service.parse({
        identifier: 'child',
        data: { name: 'Ada' },
      });
      expect(result.html).toBe('<wrap><p>Hi Ada</p></wrap>');
      expect(parseLogsRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ success: true }),
      );
    });

    it('throws TemplateSchemaValidationError on schema mismatch and logs failure', async () => {
      templatesRepo.findOne.mockResolvedValue({
        ...childTemplate,
        baseTemplate: null,
        category: TemplateCategoriesEnum.BASE,
      });
      await expect(
        service.parse({ identifier: 'child', data: { name: 42 } }),
      ).rejects.toBeInstanceOf(TemplateSchemaValidationError);
      expect(parseLogsRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, errorCode: 'SCHEMA' }),
      );
    });

    it('does not crash when log write fails', async () => {
      templatesRepo.findOne.mockResolvedValue({
        ...baseTemplate,
        schema: { x: 'string' },
        content: '{{x}}',
      });
      parseLogsRepo.save.mockRejectedValue(new Error('db down'));
      const result = await service.parse({
        identifier: 'base',
        data: { x: 'ok' },
      });
      expect(result.html).toBe('ok');
    });
  });
});
