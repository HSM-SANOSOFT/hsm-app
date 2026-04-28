import { UserEntity } from '@hsm/database/entities/modules/core/users';
import { DatabasePostgresSchemasEnum } from '@hsm/database/sources/postgres';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({
  name: 'refresh_token_users',
  schema: DatabasePostgresSchemasEnum.AUTH,
})
export class RefreshTokenUserEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(
    () => UserEntity,
    user => user.refreshToken,
    { onDelete: 'CASCADE' },
  )
  @JoinColumn()
  user!: UserEntity;

  @Column({ type: 'varchar' })
  @Index({ unique: true, where: '"deletedAt" IS NULL' })
  refreshToken!: string;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @DeleteDateColumn({ nullable: true })
  deletedAt?: Date;
}
