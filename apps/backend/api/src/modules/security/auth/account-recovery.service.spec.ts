import { createHash } from 'node:crypto';
import { PasswordResetTokenEntity, UserEntity } from '@hsm/database/entities';
import { DatabasesEnum } from '@hsm/database/sources';
import { QueueEnum } from '@hsm/queue';
import { getQueueToken } from '@nestjs/bullmq';
import { BadRequestException, HttpException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken, getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { AccountRecoveryService } from './account-recovery.service';

const sha256 = (v: string): string =>
  createHash('sha256').update(v).digest('hex');

const mockUserRepository = {
  findOne: jest.fn(),
};

const mockTokenRepository = {
  count: jest.fn(),
  create: jest.fn((v: unknown) => v),
  save: jest.fn(),
  findOne: jest.fn(),
};

const mockComsQueue = {
  add: jest.fn(),
};

// Transaction mock — runs the password update + token consume against a manager.
const mockManager = {
  update: jest.fn(),
};
const mockQueryRunner = {
  connect: jest.fn(),
  startTransaction: jest.fn(),
  commitTransaction: jest.fn(),
  rollbackTransaction: jest.fn(),
  release: jest.fn(),
  manager: mockManager,
};
const mockDataSource = {
  createQueryRunner: jest.fn(() => mockQueryRunner),
};

describe('AccountRecoveryService', () => {
  let service: AccountRecoveryService;

  beforeEach(async () => {
    jest.clearAllMocks();
    // The conditional token-consume update reports one affected row by default
    // (the happy path); single-use-race tests can override to { affected: 0 }.
    mockManager.update.mockResolvedValue({ affected: 1 });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccountRecoveryService,
        {
          provide: getRepositoryToken(UserEntity, DatabasesEnum.HsmDbPostgres),
          useValue: mockUserRepository,
        },
        {
          provide: getRepositoryToken(
            PasswordResetTokenEntity,
            DatabasesEnum.HsmDbPostgres,
          ),
          useValue: mockTokenRepository,
        },
        {
          provide: getQueueToken(QueueEnum.Coms),
          useValue: mockComsQueue,
        },
        {
          provide: getDataSourceToken(DatabasesEnum.HsmDbPostgres),
          useValue: mockDataSource,
        },
      ],
    }).compile();

    service = module.get<AccountRecoveryService>(AccountRecoveryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // -------------------------------------------------------------------------
  // forgotPassword
  // -------------------------------------------------------------------------
  describe('forgotPassword', () => {
    it('saves a HASHED (not plaintext) token row and enqueues a transactional email for an existing account', async () => {
      mockUserRepository.findOne.mockResolvedValue({
        id: 'u1',
        email: 'a@test.com',
      });
      mockTokenRepository.count.mockResolvedValue(0);
      mockTokenRepository.save.mockResolvedValue({});

      await service.forgotPassword('a@test.com');

      expect(mockTokenRepository.save).toHaveBeenCalledTimes(1);
      const saved = mockTokenRepository.save.mock.calls[0][0];
      // tokenHash is a 64-char hex sha256, never a raw 64-byte hex plaintext.
      expect(saved.tokenHash).toMatch(/^[a-f0-9]{64}$/);
      expect(saved.user).toEqual({ id: 'u1' });
      expect(saved.usedAt).toBeNull();
      expect(saved.expiresAt.getTime()).toBeGreaterThan(Date.now());

      expect(mockComsQueue.add).toHaveBeenCalledTimes(1);
      const [jobName, jobData] = mockComsQueue.add.mock.calls[0];
      expect(jobName).toBe('send-transactional-email');
      expect(jobData.toEmail).toBe('a@test.com');
      // The plaintext token is NOT the value stored in the DB.
      expect(jobData.html).not.toContain(saved.tokenHash);
      // The emailed link carries the token in the URL fragment.
      expect(jobData.html).toContain('/reset-password#token=');
    });

    it('does nothing (no token, no email) for a non-existent account — non-enumerating', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await service.forgotPassword('nobody@test.com');

      expect(mockTokenRepository.save).not.toHaveBeenCalled();
      expect(mockComsQueue.add).not.toHaveBeenCalled();
    });

    it('throws 429 once the per-account hourly threshold is reached', async () => {
      mockUserRepository.findOne.mockResolvedValue({
        id: 'u1',
        email: 'a@test.com',
      });
      mockTokenRepository.count.mockResolvedValue(5);

      await expect(service.forgotPassword('a@test.com')).rejects.toBeInstanceOf(
        HttpException,
      );
      await expect(service.forgotPassword('a@test.com')).rejects.toMatchObject({
        status: 429,
      });
      expect(mockTokenRepository.save).not.toHaveBeenCalled();
      expect(mockComsQueue.add).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // resetPassword
  // -------------------------------------------------------------------------
  describe('resetPassword', () => {
    it('hashes the new password, updates the user, and consumes the token for a valid token', async () => {
      const tokenRow = {
        id: 't1',
        user: { id: 'u1' },
        tokenHash: sha256('plain'),
        usedAt: null,
        expiresAt: new Date(Date.now() + 60_000),
      };
      mockTokenRepository.findOne.mockResolvedValue(tokenRow);

      await service.resetPassword('plain', 'NewPassw0rd@');

      // Password update — the persisted value is a bcrypt hash, never plaintext.
      const userUpdate = mockManager.update.mock.calls.find(
        c => c[0] === UserEntity,
      );
      expect(userUpdate).toBeDefined();
      const newHash = userUpdate![2].password;
      expect(newHash).not.toBe('NewPassw0rd@');
      expect(await bcrypt.compare('NewPassw0rd@', newHash)).toBe(true);

      // Token consumed.
      const tokenUpdate = mockManager.update.mock.calls.find(
        c => c[0] === PasswordResetTokenEntity,
      );
      expect(tokenUpdate).toBeDefined();
      expect(tokenUpdate![2].usedAt).toBeInstanceOf(Date);

      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('rejects an unknown token hash without touching the password', async () => {
      mockTokenRepository.findOne.mockResolvedValue(null);

      await expect(
        service.resetPassword('bogus', 'NewPassw0rd@'),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(mockManager.update).not.toHaveBeenCalled();
    });

    it('rejects when the token was consumed by a concurrent reset (race, affected=0) and leaves the password unchanged', async () => {
      const tokenRow = {
        id: 't1',
        user: { id: 'u1' },
        tokenHash: sha256('plain'),
        usedAt: null,
        expiresAt: new Date(Date.now() + 60_000),
      };
      mockTokenRepository.findOne.mockResolvedValue(tokenRow);
      // The conditional consume affects no row — another request already used it.
      mockManager.update.mockResolvedValueOnce({ affected: 0 });

      await expect(
        service.resetPassword('plain', 'NewPassw0rd@'),
      ).rejects.toBeInstanceOf(BadRequestException);

      // The user password update must NOT have run.
      const userUpdate = mockManager.update.mock.calls.find(
        c => c[0] === UserEntity,
      );
      expect(userUpdate).toBeUndefined();
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it('rejects an already-used token (same generic message) without changing the password', async () => {
      mockTokenRepository.findOne.mockResolvedValue({
        id: 't1',
        user: { id: 'u1' },
        tokenHash: sha256('plain'),
        usedAt: new Date(),
        expiresAt: new Date(Date.now() + 60_000),
      });

      await expect(
        service.resetPassword('plain', 'NewPassw0rd@'),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(mockManager.update).not.toHaveBeenCalled();
    });

    it('rejects an expired token without changing the password', async () => {
      mockTokenRepository.findOne.mockResolvedValue({
        id: 't1',
        user: { id: 'u1' },
        tokenHash: sha256('plain'),
        usedAt: null,
        expiresAt: new Date(Date.now() - 1),
      });

      await expect(
        service.resetPassword('plain', 'NewPassw0rd@'),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(mockManager.update).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // recoverUsername
  // -------------------------------------------------------------------------
  describe('recoverUsername', () => {
    it('enqueues an email containing the username for an existing account', async () => {
      mockUserRepository.findOne.mockResolvedValue({
        id: 'u1',
        email: 'a@test.com',
        username: 'janedoe',
      });

      await service.recoverUsername('a@test.com');

      expect(mockComsQueue.add).toHaveBeenCalledTimes(1);
      const [jobName, jobData] = mockComsQueue.add.mock.calls[0];
      expect(jobName).toBe('send-transactional-email');
      expect(jobData.toEmail).toBe('a@test.com');
      expect(jobData.html).toContain('janedoe');
    });

    it('does nothing for a non-existent account — non-enumerating', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await service.recoverUsername('nobody@test.com');

      expect(mockComsQueue.add).not.toHaveBeenCalled();
    });
  });
});
