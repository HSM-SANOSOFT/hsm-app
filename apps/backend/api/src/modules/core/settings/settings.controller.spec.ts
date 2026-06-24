import { RolesEnum, SettingsCategoryEnum } from '@hsm/common/enums';
import { Test, TestingModule } from '@nestjs/testing';
import { ROLES_KEY } from '../../security/roles/roles.decorator';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';

const mockSettingsService = {
  getByCategory: jest.fn(),
  update: jest.fn(),
};

describe('SettingsController', () => {
  let controller: SettingsController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SettingsController],
      providers: [{ provide: SettingsService, useValue: mockSettingsService }],
    }).compile();

    controller = module.get<SettingsController>(SettingsController);
  });

  it('restricts getSettings to System.Admin', () => {
    const roles = Reflect.getMetadata(ROLES_KEY, controller.getSettings);
    expect(roles).toContain(RolesEnum.System.Admin);
  });

  it('restricts updateSettings to System.Admin', () => {
    const roles = Reflect.getMetadata(ROLES_KEY, controller.updateSettings);
    expect(roles).toContain(RolesEnum.System.Admin);
  });

  it('delegates getSettings to the service with the queried category', async () => {
    mockSettingsService.getByCategory.mockResolvedValue({
      category: SettingsCategoryEnum.EMAIL,
      settings: [],
    });

    await controller.getSettings({ category: SettingsCategoryEnum.EMAIL });

    expect(mockSettingsService.getByCategory).toHaveBeenCalledWith(
      SettingsCategoryEnum.EMAIL,
    );
  });

  it('passes the authenticated user id to update', async () => {
    mockSettingsService.update.mockResolvedValue({
      category: SettingsCategoryEnum.EMAIL,
      settings: [],
    });

    const payload = {
      category: SettingsCategoryEnum.EMAIL,
      settings: [{ key: 'SMTP_ADDRESS', value: 'host' }],
    };
    await controller.updateSettings(payload, {
      user: { id: 'admin-id' },
    } as never);

    expect(mockSettingsService.update).toHaveBeenCalledWith(
      payload,
      'admin-id',
    );
  });
});
