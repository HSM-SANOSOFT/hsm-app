import { RolesEnum } from '@hsm/common/enums';
import { envs } from '@hsm/config';
import { DatabasesEnum } from '@hsm/database/sources';
import {
  Injectable,
  Logger,
  NotFoundException,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';
import { UsersService } from './users.service';

/**
 * Seeds a default administrator account on application bootstrap so there is an
 * initial way to log in. Controlled by the optional `DEFAULT_ADMIN_USERNAME` /
 * `DEFAULT_ADMIN_PASSWORD` env vars.
 *
 * Behaviour:
 * - If either env var is blank/unset → seeding is skipped.
 * - If a user with that username already exists → no-op (never overwritten).
 * - Otherwise → creates the user with a bcrypt-hashed password and the System
 *   Admin role inside a transaction.
 *
 * Runs on `OnApplicationBootstrap` (after the DB/schema is ready, not on module
 * init). A seeding failure is caught and logged — it must never block boot.
 */
@Injectable()
export class AdminSeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(AdminSeedService.name);

  constructor(
    private readonly usersService: UsersService,
    @InjectDataSource(DatabasesEnum.HsmDbPostgres)
    private readonly dataSource: DataSource,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const username = envs.DEFAULT_ADMIN_USERNAME?.trim();
    const password = envs.DEFAULT_ADMIN_PASSWORD?.trim();

    if (!username || !password) {
      this.logger.debug('Default admin seeding skipped (env not set)');
      return;
    }

    try {
      await this.usersService.findOneByUsername(username);
      this.logger.log('Default admin already exists');
      return;
    } catch (error) {
      if (!(error instanceof NotFoundException)) {
        this.logger.error(
          `Default admin seeding failed while checking for existing user: ${(error as Error).message}`,
        );
        return;
      }
      // NotFoundException → user is absent, proceed to create it below.
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      await this.usersService.createUser(
        {
          username,
          email: `${username}@localhost`,
          password: hashedPassword,
          firstName: 'System',
          firstLastName: 'Administrator',
          roles: [RolesEnum.System.Admin],
        },
        queryRunner,
      );
      await queryRunner.commitTransaction();
      this.logger.log(`Seeded default admin user "${username}"`);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(
        `Default admin seeding failed — app startup continues: ${(error as Error).message}`,
      );
    } finally {
      await queryRunner.release();
    }
  }
}
