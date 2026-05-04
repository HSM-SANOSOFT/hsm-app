import { TemplateCategoriesEnum } from '@hsm/common/enums';
import { Test, TestingModule } from '@nestjs/testing';
import { TemplatesController } from './templates.controller';
import { TemplatesService } from './templates.service';

describe('TemplatesController', () => {
  let controller: TemplatesController;
  let service: jest.Mocked<TemplatesService>;

  beforeEach(async () => {
    service = {
      findByIdentifier: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      validate: jest.fn(),
    } as unknown as jest.Mocked<TemplatesService>;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TemplatesController],
      providers: [{ provide: TemplatesService, useValue: service }],
    }).compile();

    controller = module.get<TemplatesController>(TemplatesController);
  });

  it('GET forwards identifier with relations', () => {
    controller.getTemplate({ identifier: 'foo' });
    expect(service.findByIdentifier).toHaveBeenCalledWith('foo', {
      withChildren: true,
      withBase: true,
    });
  });

  it('POST forwards body to create', () => {
    const dto = {
      category: TemplateCategoriesEnum.BASE,
      name: 'a',
      schema: {},
      content: '<x/>',
    } as never;
    controller.addTemplate(dto);
    expect(service.create).toHaveBeenCalledWith(dto);
  });

  it('PUT forwards id and body', () => {
    const dto = { name: 'b' } as never;
    controller.updateTemplate('11111111-1111-1111-1111-111111111111', dto);
    expect(service.update).toHaveBeenCalledWith(
      '11111111-1111-1111-1111-111111111111',
      dto,
    );
  });

  it('DELETE returns the id', async () => {
    service.delete.mockResolvedValue(undefined);
    const out = await controller.deleteTemplate(
      '11111111-1111-1111-1111-111111111111',
    );
    expect(service.delete).toHaveBeenCalledWith(
      '11111111-1111-1111-1111-111111111111',
    );
    expect(out).toEqual({ id: '11111111-1111-1111-1111-111111111111' });
  });

  it('POST /validate forwards identifier and data to service.validate', () => {
    controller.validateTemplate({ identifier: 'welcome', data: { userName: 'Ada' } });
    expect(service.validate).toHaveBeenCalledWith({
      identifier: 'welcome',
      data: { userName: 'Ada' },
    });
  });
});
