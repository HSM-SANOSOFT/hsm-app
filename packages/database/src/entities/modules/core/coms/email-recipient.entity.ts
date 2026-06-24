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

@Entity({ name: 'email_recipient', schema: DatabasePostgresSchemasEnum.COMS })
export class EmailRecipientEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => EmailBatchEntity, batch => batch.recipients)
  @JoinColumn()
  batch: EmailBatchEntity;

  @Column()
  toEmail: string;

  @Column({ nullable: true })
  messageId?: string;

  @Column({
    type: 'enum',
    enum: EmailRecipientStatusEnum,
    default: EmailRecipientStatusEnum.PENDING,
  })
  status: EmailRecipientStatusEnum;

  @Column({ nullable: true, type: 'timestamptz' })
  sentAt?: Date;

  @Column({ nullable: true, type: 'text' })
  errorMessage?: string;
}
