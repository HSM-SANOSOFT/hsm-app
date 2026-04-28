import type { RoleDomains, RolesType } from '@hsm/common/types';
import { UserEntity } from '@hsm/database/entities/modules/core/users/users.entity';
import { DatabasePostgresSchemasEnum } from '@hsm/database/sources/postgres';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'user_roles', schema: DatabasePostgresSchemasEnum.USERS })
@Unique(['user', 'domain', 'role'])
export class UserRoleEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(
    () => UserEntity,
    user => user.roles,
    { onDelete: 'CASCADE' },
  )
  @JoinColumn()
  user!: UserEntity;

  @Column({ type: 'varchar' })
  domain!: RoleDomains;

  @Column({ type: 'varchar' })
  role!: RolesType;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @DeleteDateColumn({ nullable: true })
  deletedAt?: Date;
}
