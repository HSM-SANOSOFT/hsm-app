import { UserEntity } from '@hsm/database/entities/modules/core/users';
import { DatabasePostgresSchemasEnum } from '@hsm/database/sources/postgres';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * A single-use, expiring password-reset token. Only the SHA-256 hash of the
 * 256-bit plaintext token is persisted (`tokenHash`); the plaintext reset link
 * is emailed and never stored, so a DB read cannot reveal a valid link.
 *
 * Lookup is by `tokenHash` (deterministic hash → a plain, non-unique index is
 * enough). A token is spent by stamping `usedAt`; it is invalid once `usedAt`
 * is set or `expiresAt` has passed.
 */
@Entity({
  name: 'password_reset_tokens',
  schema: DatabasePostgresSchemasEnum.AUTH,
})
export class PasswordResetTokenEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn()
  user!: UserEntity;

  @Column({ type: 'varchar' })
  @Index()
  tokenHash!: string;

  @Column({ type: 'timestamptz' })
  expiresAt!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  usedAt?: Date | null;

  @CreateDateColumn()
  createdAt!: Date;
}
