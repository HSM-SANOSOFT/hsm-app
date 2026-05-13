import { EmailRecipientStatusEnum } from '@hsm/common/enums';
import { DatabasePostgresSchemasEnum } from '@hsm/database/sources/postgres';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { EmailBatchEntity } from './email-batch.entity';

@Entity({
  name: 'email_recipients',
  schema: DatabasePostgresSchemasEnum.COMS,
})
export class EmailRecipientEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => EmailBatchEntity, batch => batch.recipients, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'batch_id' })
  batch: EmailBatchEntity;

  @Column({ type: 'varchar' })
  toEmail: string;

  @Column({ type: 'varchar', nullable: true })
  messageId: string | null;

  @Column({
    type: 'enum',
    enum: EmailRecipientStatusEnum,
    default: EmailRecipientStatusEnum.PENDING,
  })
  status: EmailRecipientStatusEnum;

  @Column({ type: 'timestamptz', nullable: true })
  sentAt: Date | null;

  @Column({ type: 'text', nullable: true })
  errorMessage: string | null;
}
