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

@Entity({ name: 'email_batches', schema: DatabasePostgresSchemasEnum.COMS })
export class EmailBatchEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  templateId: string;

  @Column({ type: 'varchar', nullable: true })
  fromEmail: string | null;

  @Column({ type: 'varchar', nullable: true })
  fromName: string | null;

  @Column({ type: 'jsonb' })
  data: object;

  @Column({ type: 'jsonb', nullable: true })
  documentIds: object[] | null;

  @Column({ type: 'varchar', nullable: true })
  jobId: string | null;

  @Column({ type: 'varchar', nullable: true })
  providerMessageId: string | null;

  @Column({
    type: 'enum',
    enum: EmailBatchStatusEnum,
    default: EmailBatchStatusEnum.PENDING,
  })
  overallStatus: EmailBatchStatusEnum;

  @Column({ type: 'varchar', nullable: true })
  createdBy: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => EmailRecipientEntity, recipient => recipient.batch, {
    cascade: true,
  })
  recipients: EmailRecipientEntity[];
}
