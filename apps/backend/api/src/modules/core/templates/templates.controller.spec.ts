import { TemplateCategoriesEnum } from '@hsm/common/enums';
import { Test, TestingModule } from '@nestjs/testing';
import { ROLES_KEY } from '../../security/roles/roles.decorator';
import { TemplatesController } from './templates.controller';
import { TemplatesService } from './templates.service';

const baseTemplateFixture = {
  template: {
    id: 'id-1',
    category: TemplateCategoriesEnum.BASE,
    name: 'base_layout',
    isActive: true,
    schema: { body: 'string' },
    content: '<html>{{{body}}}</html>',
    description: null,
    metadata: null,
  },
  baseTemplate: null,
};

const emailTemplateFixture = {
  template: {
    id: 'id-2',
    category: TemplateCategoriesEnum.EMAIL_INTERNAL,
    name: 'appt_confirm',
    isActive: true,
    schema: { patientName: 'string' },
    content: '<p>{{patientName}}</p>',
    description: null,
    metadata: {
      subject: 'Confirmed',
      fromEmail: 'no-reply@hsm.org',
      fromName: 'HSM',
      hasAttachment: false,
    },
  },
  baseTemplate: baseTemplateFixture.template,
};

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
      draftRender: jest.fn(),
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

  it('GET returns {template, baseTemplate} shape from service', async () => {
    service.findByIdentifier.mockResolvedValue(baseTemplateFixture);
    const result = await controller.getTemplate({ identifier: 'base_layout' });
    expect(result.template.id).toBe('id-1');
    expect(result.baseTemplate).toBeNull();
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

  it('POST returns {template, baseTemplate} shape from service', async () => {
    service.create.mockResolvedValue(emailTemplateFixture);
    const dto = {
      category: TemplateCategoriesEnum.EMAIL_INTERNAL,
      name: 'appt_confirm',
      schema: { patientName: 'string' },
      content: '<p>{{patientName}}</p>',
      baseTemplateId: 'id-1',
      email: {
        subject: 'Confirmed',
        fromEmail: 'no-reply@hsm.org',
        fromName: 'HSM',
      },
    } as never;
    const result = await controller.addTemplate(dto);
    expect(result.template.id).toBe('id-2');
    expect(result.baseTemplate?.id).toBe('id-1');
    expect(result.template.metadata).toMatchObject({ subject: 'Confirmed' });
  });

  it('PUT forwards id and body', () => {
    const dto = { name: 'b' } as never;
    controller.updateTemplate('11111111-1111-1111-1111-111111111111', dto);
    expect(service.update).toHaveBeenCalledWith(
      '11111111-1111-1111-1111-111111111111',
      dto,
    );
  });

  it('PUT returns {template, baseTemplate} shape from service', async () => {
    service.update.mockResolvedValue(emailTemplateFixture);
    const result = await controller.updateTemplate('id-2', {
      name: 'renamed',
    } as never);
    expect(result.template.id).toBe('id-2');
    expect(result.baseTemplate?.id).toBe('id-1');
    expect(result.template.metadata).toMatchObject({ subject: 'Confirmed' });
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
    controller.validateTemplate({
      identifier: 'welcome',
      data: { userName: 'Ada' },
    });
    expect(service.validate).toHaveBeenCalledWith({
      identifier: 'welcome',
      data: { userName: 'Ada' },
    });
  });

  it('POST /draft-render forwards payload to service.draftRender', () => {
    const payload = {
      content: '<p>{{name}}</p>',
      baseTemplateId: 'id-1',
      sampleData: { name: 'Ada' },
    } as never;
    controller.draftRender(payload);
    expect(service.draftRender).toHaveBeenCalledWith(payload);
  });

  it('POST /draft-render returns the composed html from the service', async () => {
    service.draftRender.mockResolvedValue({ html: '<p>Ada</p>' });
    const result = await controller.draftRender({
      content: '<p>{{name}}</p>',
      sampleData: { name: 'Ada' },
    } as never);
    expect(result).toEqual({ html: '<p>Ada</p>' });
  });

  it('draft-render is auth/role guarded (not @Public())', () => {
    const roles = Reflect.getMetadata(
      ROLES_KEY,
      TemplatesController.prototype.draftRender,
    );
    // @Roles() sets the metadata key (empty array = any authenticated role);
    // its presence proves the endpoint is guarded and not @Public().
    expect(roles).toBeDefined();
    const isPublic = Reflect.getMetadata(
      'isPublic',
      TemplatesController.prototype.draftRender,
    );
    expect(isPublic).toBeUndefined();
  });
});
