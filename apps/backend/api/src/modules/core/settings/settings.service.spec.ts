import { SettingsCategoryEnum } from '@hsm/common/enums';
import { envs } from '@hsm/config/api';
import {
  AppSettingAuditEntity,
  AppSettingEntity,
} from '@hsm/database/entities';
import { DatabasesEnum } from '@hsm/database/sources';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SECRET_MASK, SettingsService } from './settings.service';

const mockAuditRepo = {
  create: jest.fn(),
  save: jest.fn(),
};

const mockSettingsRepo = {
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  // `update()` now wraps its writes in a single transaction. The mock manager
  // routes each `save(Entity, row)` to the matching repo's `save` so the
  // existing assertions (settings/audit saves were called) still hold.
  manager: {
    transaction: jest.fn(async (cb: (manager: unknown) => Promise<unknown>) =>
      cb({
        save: (entity: unknown, row: unknown) =>
          entity === AppSettingAuditEntity
            ? mockAuditRepo.save(row)
            : mockSettingsRepo.save(row),
      }),
    ),
  },
};

describe('SettingsService', () => {
  let service: SettingsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockSettingsRepo.find.mockResolvedValue([]);
    mockSettingsRepo.findOne.mockResolvedValue(null);
    mockSettingsRepo.create.mockImplementation(
      (e: Partial<AppSettingEntity>) => e,
    );
    mockSettingsRepo.save.mockImplementation((e: Partial<AppSettingEntity>) =>
      Promise.resolve(e),
    );
    mockAuditRepo.create.mockImplementation(
      (e: Partial<AppSettingAuditEntity>) => e,
    );
    mockAuditRepo.save.mockResolvedValue({});

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SettingsService,
        {
          provide: getRepositoryToken(
            AppSettingEntity,
            DatabasesEnum.HsmDbPostgres,
          ),
          useValue: mockSettingsRepo,
        },
        {
          provide: getRepositoryToken(
            AppSettingAuditEntity,
            DatabasesEnum.HsmDbPostgres,
          ),
          useValue: mockAuditRepo,
        },
      ],
    }).compile();

    service = module.get<SettingsService>(SettingsService);
  });

  describe('getByCategory', () => {
    it('returns env-seeded defaults when no DB rows exist', async () => {
      mockSettingsRepo.find.mockResolvedValue([]);

      const result = await service.getByCategory(SettingsCategoryEnum.EMAIL);

      const smtpAddress = result.settings.find(s => s.key === 'SMTP_ADDRESS');
      expect(smtpAddress).toBeDefined();
      expect(smtpAddress?.value).toBe(envs.SMTP_ADDRESS);
      expect(smtpAddress?.isSecret).toBe(false);
    });

    it('returns a masked placeholder for a secret, never the stored value', async () => {
      mockSettingsRepo.find.mockResolvedValue([
        {
          key: 'SMTP_PASSWORD',
          category: SettingsCategoryEnum.EMAIL,
          isSecret: true,
          value: 'super-secret-plaintext',
        } as AppSettingEntity,
      ]);

      const result = await service.getByCategory(SettingsCategoryEnum.EMAIL);
      const secret = result.settings.find(s => s.key === 'SMTP_PASSWORD');

      expect(secret?.isSecret).toBe(true);
      expect(secret?.value).toBe(SECRET_MASK);
      expect(secret?.value).not.toBe('super-secret-plaintext');
      expect(secret?.isSet).toBe(true);
    });
  });

  describe('update', () => {
    it('persists a real non-secret change and returns it on the next read', async () => {
      // First pass: update() pre-fetches existing rows for the payload keys
      // (none exist yet).
      mockSettingsRepo.find.mockResolvedValueOnce([]);
      // Second pass: getByCategory re-reads rows.
      mockSettingsRepo.find.mockResolvedValueOnce([
        {
          key: 'SMTP_ADDRESS',
          category: SettingsCategoryEnum.EMAIL,
          isSecret: false,
          value: 'new.smtp.host',
        } as AppSettingEntity,
      ]);

      const result = await service.update(
        {
          category: SettingsCategoryEnum.EMAIL,
          settings: [{ key: 'SMTP_ADDRESS', value: 'new.smtp.host' }],
        },
        'admin-id',
      );

      expect(mockSettingsRepo.save).toHaveBeenCalled();
      const stored = result.settings.find(s => s.key === 'SMTP_ADDRESS');
      expect(stored?.value).toBe('new.smtp.host');
    });

    it('leaves a stored secret unchanged when a blank secret is submitted', async () => {
      await service.update(
        {
          category: SettingsCategoryEnum.EMAIL,
          settings: [{ key: 'SMTP_PASSWORD', value: '' }],
        },
        'admin-id',
      );

      // No write to settings repo and no audit row for a blank secret.
      expect(mockSettingsRepo.save).not.toHaveBeenCalled();
      expect(mockAuditRepo.save).not.toHaveBeenCalled();
    });

    it('writes an audit row on every update without plaintext secrets', async () => {
      mockSettingsRepo.findOne.mockResolvedValue(null);

      await service.update(
        {
          category: SettingsCategoryEnum.EMAIL,
          settings: [{ key: 'SMTP_PASSWORD', value: 'brand-new-secret' }],
        },
        'admin-id',
      );

      expect(mockAuditRepo.save).toHaveBeenCalledTimes(1);
      const auditArg = mockAuditRepo.create.mock.calls[0][0];
      expect(auditArg.key).toBe('SMTP_PASSWORD');
      expect(auditArg.changedBy).toBe('admin-id');
      expect(auditArg.newValue).toBe(SECRET_MASK);
      expect(auditArg.newValue).not.toBe('brand-new-secret');
      expect(JSON.stringify(auditArg)).not.toContain('brand-new-secret');
    });

    it('records changedBy / updatedBy from the authenticated user', async () => {
      mockSettingsRepo.findOne.mockResolvedValue(null);

      await service.update(
        {
          category: SettingsCategoryEnum.STORAGE,
          settings: [{ key: 'STRG_S3_REGION', value: 'eu-west-1' }],
        },
        'actor-42',
      );

      const savedSetting = mockSettingsRepo.save.mock.calls[0][0];
      expect(savedSetting.updatedBy).toBe('actor-42');
      const auditArg = mockAuditRepo.create.mock.calls[0][0];
      expect(auditArg.changedBy).toBe('actor-42');
    });
  });
});
