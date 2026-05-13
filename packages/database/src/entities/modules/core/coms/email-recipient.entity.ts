import { EmailRecipientStatusEnum } from '@hsm/common/enums';
import { DatabasePostgresSchemasEnum } from '@hsm/database/sources/postgres';
import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { EmailBatchEntity } from './email-batch.entity';

@Entity({ name: 'email_recipients', schema: DatabasePostgresSchemasEnum.COMS })
export class EmailRecipientEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => EmailBatchEntity, batch => batch.recipients, { onDelete: 'CASCADE' })
  batch: EmailBatchEntity;

  @Column()
  toEmail: string;

  @Column({
    type: 'enum',
    enum: EmailRecipientStatusEnum,
    default: EmailRecipientStatusEnum.PENDING,
  })
  status: EmailRecipientStatusEnum;

  @Column({ nullable: true })
  sentAt: Date | null;

  @Column({ type: 'text', nullable: true })
  errorMessage: string | null;

  @Column({ nullable: true })
  messageId: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
