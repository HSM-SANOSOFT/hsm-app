import { EmailWebhookEventTypeEnum } from '@hsm/common/enums';
import { DatabasePostgresSchemasEnum } from '@hsm/database/sources/postgres';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { EmailRecipientEntity } from './email-recipient.entity';

@Index(['recipientEmail'])
@Index(['messageId'])
@Entity({ name: 'email_webhook_event', schema: DatabasePostgresSchemasEnum.COMS })
export class EmailWebhookEventEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  provider: string;

  @Column({ type: 'enum', enum: EmailWebhookEventTypeEnum })
  eventType: EmailWebhookEventTypeEnum;

  @Column({ type: 'jsonb' })
  rawPayload: object;

  @Column()
  recipientEmail: string;

  @Column({ nullable: true })
  messageId?: string;

  @ManyToOne(() => EmailRecipientEntity, { nullable: true })
  recipient?: EmailRecipientEntity;

  @Column({ nullable: true, type: 'timestamptz' })
  processedAt?: Date;

  @CreateDateColumn()
  createdAt: Date;
}
