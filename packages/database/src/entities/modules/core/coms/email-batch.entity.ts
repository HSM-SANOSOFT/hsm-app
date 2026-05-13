import { EmailBatchStatusEnum } from '@hsm/common/enums';
import { DatabasePostgresSchemasEnum } from '@hsm/database/sources/postgres';
import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { EmailRecipientEntity } from './email-recipient.entity';

@Entity({ name: 'email_batch', schema: DatabasePostgresSchemasEnum.COMS })
export class EmailBatchEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  templateId?: string;

  @Column({ nullable: true })
  fromEmail?: string;

  @Column({ nullable: true })
  fromName?: string;

  @Column({ type: 'jsonb' })
  data: object;

  @Column({ type: 'text', array: true, nullable: true })
  documentIds?: string[];

  @Column({ nullable: true })
  jobId?: string;

  @Column({ nullable: true })
  providerMessageId?: string;

  @Column({
    type: 'enum',
    enum: EmailBatchStatusEnum,
    default: EmailBatchStatusEnum.PENDING,
  })
  overallStatus: EmailBatchStatusEnum;

  @Column({ nullable: true })
  createdBy?: string;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => EmailRecipientEntity, recipient => recipient.batch, {
    cascade: true,
  })
  recipients: EmailRecipientEntity[];
}
