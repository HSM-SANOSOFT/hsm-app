import { RolesEnum } from '@hsm/common/enums';
import { NotFoundException } from '@nestjs/common';
import type { DataSource } from 'typeorm';
import { AdminSeedService } from './admin-seed.service';
import type { UsersService } from './users.service';

// bcrypt.hash returns a value that is deterministically different from the
// plaintext so the test can assert the seeded password was hashed.
jest.mock('bcrypt', () => ({
  hash: jest.fn((data: string) => Promise.resolve(`hashed:${data}`)),
}));

// envs is frozen at import time from process.env (set in test-setup.ts).
// We override per-test by mutating the mock below.
const mockEnvs: {
  DEFAULT_ADMIN_USERNAME?: string;
  DEFAULT_ADMIN_PASSWORD?: string;
} = {
  DEFAULT_ADMIN_USERNAME: 'admin',
  DEFAULT_ADMIN_PASSWORD: 'super-secret',
};
jest.mock('@hsm/config', () => ({
  get envs() {
    return mockEnvs;
  },
}));

describe('AdminSeedService', () => {
  let service: AdminSeedService;
  let usersService: jest.Mocked<
    Pick<UsersService, 'findOneByUsername' | 'createUser'>
  >;
  let queryRunner: {
    connect: jest.Mock;
    startTransaction: jest.Mock;
    commitTransaction: jest.Mock;
    rollbackTransaction: jest.Mock;
    release: jest.Mock;
  };
  let dataSource: { createQueryRunner: jest.Mock };

  beforeEach(() => {
    mockEnvs.DEFAULT_ADMIN_USERNAME = 'admin';
    mockEnvs.DEFAULT_ADMIN_PASSWORD = 'super-secret';

    queryRunner = {
      connect: jest.fn().mockResolvedValue(undefined),
      startTransaction: jest.fn().mockResolvedValue(undefined),
      commitTransaction: jest.fn().mockResolvedValue(undefined),
      rollbackTransaction: jest.fn().mockResolvedValue(undefined),
      release: jest.fn().mockResolvedValue(undefined),
    };
    dataSource = {
      createQueryRunner: jest.fn().mockReturnValue(queryRunner),
    };
    usersService = {
      findOneByUsername: jest.fn(),
      createUser: jest.fn().mockResolvedValue({ id: 'admin-uuid' }),
    };

    service = new AdminSeedService(
      usersService as unknown as UsersService,
      dataSource as unknown as DataSource,
    );
  });

  it('skips seeding when the username env is blank', async () => {
    mockEnvs.DEFAULT_ADMIN_USERNAME = '';

    await service.onApplicationBootstrap();

    expect(usersService.findOneByUsername).not.toHaveBeenCalled();
    expect(usersService.createUser).not.toHaveBeenCalled();
    expect(dataSource.createQueryRunner).not.toHaveBeenCalled();
  });

  it('skips seeding when the password env is blank', async () => {
    mockEnvs.DEFAULT_ADMIN_PASSWORD = '';

    await service.onApplicationBootstrap();

    expect(usersService.findOneByUsername).not.toHaveBeenCalled();
    expect(usersService.createUser).not.toHaveBeenCalled();
  });

  it('does not create when the admin user already exists', async () => {
    usersService.findOneByUsername.mockResolvedValue({} as never);

    await service.onApplicationBootstrap();

    expect(usersService.findOneByUsername).toHaveBeenCalledWith('admin');
    expect(usersService.createUser).not.toHaveBeenCalled();
    expect(dataSource.createQueryRunner).not.toHaveBeenCalled();
  });

  it('creates the admin user with the admin role and a hashed password when absent', async () => {
    usersService.findOneByUsername.mockRejectedValue(
      new NotFoundException('not found'),
    );

    await service.onApplicationBootstrap();

    expect(usersService.createUser).toHaveBeenCalledTimes(1);
    const [dto, passedRunner] = usersService.createUser.mock.calls[0];

    expect(dto.username).toBe('admin');
    expect(dto.roles).toEqual([RolesEnum.System.Admin]);
    // password must be hashed, never the plaintext.
    expect(dto.password).not.toBe('super-secret');
    expect(dto.password).toBe('hashed:super-secret');
    // required non-null name fields are defaulted.
    expect(dto.firstName).toBeTruthy();
    expect(dto.firstLastName).toBeTruthy();
    expect(dto.email).toBeTruthy();

    expect(passedRunner).toBe(queryRunner);
    expect(queryRunner.startTransaction).toHaveBeenCalled();
    expect(queryRunner.commitTransaction).toHaveBeenCalled();
    expect(queryRunner.rollbackTransaction).not.toHaveBeenCalled();
    expect(queryRunner.release).toHaveBeenCalled();
  });

  it('rolls back and does not crash when createUser fails', async () => {
    usersService.findOneByUsername.mockRejectedValue(
      new NotFoundException('not found'),
    );
    usersService.createUser.mockRejectedValue(new Error('db down'));

    await expect(service.onApplicationBootstrap()).resolves.toBeUndefined();

    expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
    expect(queryRunner.commitTransaction).not.toHaveBeenCalled();
    expect(queryRunner.release).toHaveBeenCalled();
  });
});
