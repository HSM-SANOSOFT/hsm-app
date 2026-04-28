import { RoleFunctionalityEnum } from '@hsm/common/enums';
import { RefreshTokenUserIntegrationEntity } from '@hsm/database/entities/modules/security/auth';
import { DatabasePostgresSchemasEnum } from '@hsm/database/sources/postgres';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({
  name: 'users_integration',
  schema: DatabasePostgresSchemasEnum.USERS,
})
export class UserIntegrationEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'citext' })
  name!: string;

  @Column({ type: 'citext' })
  description!: string;

  @OneToMany(
    () => RefreshTokenUserIntegrationEntity,
    refreshToken => refreshToken.user,
  )
  refreshToken!: RefreshTokenUserIntegrationEntity[];

  @Column({ type: 'enum', enum: RoleFunctionalityEnum })
  functionality!: RoleFunctionalityEnum;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @DeleteDateColumn({ nullable: true })
  deletedAt?: Date;
}
