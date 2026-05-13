import { EmailBatchStatusEnum } from '@hsm/common/enums';
import { DatabasePostgresSchemasEnum } from '@hsm/database/sources/postgres';
import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { EmailRecipientEntity } from './email-recipient.entity';

@Entity({ name: 'email_batches', schema: DatabasePostgresSchemasEnum.COMS })
export class EmailBatchEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  templateId: string | null;

  @Column({ type: 'jsonb', nullable: true })
  data: unknown;

  @Column({ type: 'text', array: true, nullable: true })
  documentIds: string[] | null;

  @Column()
  fromEmail: string;

  @Column({ nullable: true })
  fromName: string | null;

  @Column({ type: 'enum', enum: EmailBatchStatusEnum, default: EmailBatchStatusEnum.PENDING })
  overallStatus: EmailBatchStatusEnum;

  @Column({ nullable: true })
  providerMessageId: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => EmailRecipientEntity, recipient => recipient.batch, { cascade: true })
  recipients: EmailRecipientEntity[];
}
