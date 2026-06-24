import { SettingsCategoryEnum } from '@hsm/common/enums';
import { envs } from '@hsm/config';
import { AppSettingEntity } from '@hsm/database/entities';
import {
  SETTING_DEFINITIONS,
  SETTINGS_CACHE_TTL_MS,
  SettingsAccessorService,
} from '@hsm/database/settings';
import { DatabasesEnum } from '@hsm/database/sources';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

const mockSettingsRepo = {
  find: jest.fn(),
};

describe('SettingsAccessorService', () => {
  let service: SettingsAccessorService;

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.useRealTimers();
    mockSettingsRepo.find.mockResolvedValue([]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SettingsAccessorService,
        {
          provide: getRepositoryToken(
            AppSettingEntity,
            DatabasesEnum.HsmDbPostgres,
          ),
          useValue: mockSettingsRepo,
        },
      ],
    }).compile();

    service = module.get<SettingsAccessorService>(SettingsAccessorService);
  });

  it('returns the env seed value when no DB row exists', async () => {
    mockSettingsRepo.find.mockResolvedValue([]);

    const value = await service.getValue('SMTP_ADDRESS');

    expect(value).toBe(envs.SMTP_ADDRESS);
  });

  it('returns the RAW (unmasked) DB value for a secret key', async () => {
    mockSettingsRepo.find.mockResolvedValue([
      {
        key: 'STRG_S3_SECRET_KEY',
        category: SettingsCategoryEnum.STORAGE,
        isSecret: true,
        value: 'real-secret-value',
      } as AppSettingEntity,
    ]);

    const value = await service.getValue('STRG_S3_SECRET_KEY');

    // The accessor is for internal consumers — secrets are NOT masked here.
    expect(value).toBe('real-secret-value');
  });

  it('caches within the TTL: a second read in the window does not re-query', async () => {
    await service.getValue('SMTP_ADDRESS');
    await service.getValue('SMTP_USERNAME');

    expect(mockSettingsRepo.find).toHaveBeenCalledTimes(1);
  });

  it('re-queries the DB after the cache TTL expires (toggle reflected on next read)', async () => {
    jest.useFakeTimers();
    const base = Date.now();
    jest.setSystemTime(base);

    mockSettingsRepo.find.mockResolvedValueOnce([]);
    const first = await service.getValue('SWAGGER_SITE_TITLE');
    expect(first).toBe(envs.SWAGGER_SITE_TITLE);

    // A new value is stored after the first snapshot was taken.
    mockSettingsRepo.find.mockResolvedValueOnce([
      {
        key: 'SWAGGER_SITE_TITLE',
        category: SettingsCategoryEnum.APP_BEHAVIOR,
        isSecret: false,
        value: 'Updated Title',
      } as AppSettingEntity,
    ]);

    // Within the TTL: still the cached value.
    jest.setSystemTime(base + SETTINGS_CACHE_TTL_MS - 1);
    expect(await service.getValue('SWAGGER_SITE_TITLE')).toBe(
      envs.SWAGGER_SITE_TITLE,
    );
    expect(mockSettingsRepo.find).toHaveBeenCalledTimes(1);

    // After the TTL: the new value is observed without a restart.
    jest.setSystemTime(base + SETTINGS_CACHE_TTL_MS + 1);
    expect(await service.getValue('SWAGGER_SITE_TITLE')).toBe('Updated Title');
    expect(mockSettingsRepo.find).toHaveBeenCalledTimes(2);
  });

  it('invalidate() forces an immediate re-query on the next read', async () => {
    await service.getValue('SMTP_ADDRESS');
    expect(mockSettingsRepo.find).toHaveBeenCalledTimes(1);

    service.invalidate();
    await service.getValue('SMTP_ADDRESS');
    expect(mockSettingsRepo.find).toHaveBeenCalledTimes(2);
  });

  it('parses webhook signing keys from the effective JSON value', async () => {
    mockSettingsRepo.find.mockResolvedValue([
      {
        key: 'COMS_WEBHOOK_SIGNING_KEYS',
        category: SettingsCategoryEnum.WEBHOOK,
        isSecret: true,
        value: JSON.stringify({ mandrill: 'new-key' }),
      } as AppSettingEntity,
    ]);

    const keys = await service.getWebhookSigningKeys();

    expect(keys).toEqual({ mandrill: 'new-key' });
  });

  it('getVersionHash changes when an underlying value changes', async () => {
    jest.useFakeTimers();
    const base = Date.now();
    jest.setSystemTime(base);

    mockSettingsRepo.find.mockResolvedValueOnce([]);
    const hashBefore = await service.getVersionHash(['SMTP_ADDRESS']);

    mockSettingsRepo.find.mockResolvedValueOnce([
      {
        key: 'SMTP_ADDRESS',
        category: SettingsCategoryEnum.EMAIL,
        isSecret: false,
        value: 'smtp.new-host.test',
      } as AppSettingEntity,
    ]);
    service.invalidate();
    jest.setSystemTime(base + SETTINGS_CACHE_TTL_MS + 1);
    const hashAfter = await service.getVersionHash(['SMTP_ADDRESS']);

    expect(hashAfter).not.toBe(hashBefore);
  });

  it('on a first-boot DB error, serves the env seed (not null)', async () => {
    // The very first refresh fails with the cache still empty: instead of
    // leaving it empty (which would make getValue return null), it is seeded
    // from the env defaults so consumers get the effective env value.
    mockSettingsRepo.find.mockRejectedValueOnce(new Error('db down'));

    const value = await service.getValue('SMTP_ADDRESS');

    expect(value).toBe(envs.SMTP_ADDRESS);
    expect(value).not.toBeNull();
  });

  it('keeps serving the prior good snapshot on a later transient DB error', async () => {
    jest.useFakeTimers();
    const base = Date.now();
    jest.setSystemTime(base);

    mockSettingsRepo.find.mockResolvedValueOnce([
      {
        key: 'SMTP_ADDRESS',
        category: SettingsCategoryEnum.EMAIL,
        isSecret: false,
        value: 'smtp.good-snapshot.test',
      } as AppSettingEntity,
    ]);
    expect(await service.getValue('SMTP_ADDRESS')).toBe(
      'smtp.good-snapshot.test',
    );

    // A later refresh fails transiently — the populated cache must NOT be
    // clobbered with env defaults; the prior good snapshot keeps serving.
    service.invalidate();
    mockSettingsRepo.find.mockRejectedValueOnce(new Error('transient'));
    jest.setSystemTime(base + SETTINGS_CACHE_TTL_MS + 1);

    expect(await service.getValue('SMTP_ADDRESS')).toBe(
      'smtp.good-snapshot.test',
    );
  });

  it('does NOT expose infra keys (DB/Redis/JWT, throttler) — they stay env-only', () => {
    const keys = SETTING_DEFINITIONS.map(d => d.key);

    for (const infraKey of [
      'JWT_AT_SECRET',
      'JWT_RT_SECRET',
      'DB_POSTGRES_HOST',
      'DB_POSTGRES_PASSWORD',
      'DB_REDIS_HOST',
      'DB_REDIS_PASSWORD',
    ]) {
      expect(keys).not.toContain(infraKey);
    }
  });
});
