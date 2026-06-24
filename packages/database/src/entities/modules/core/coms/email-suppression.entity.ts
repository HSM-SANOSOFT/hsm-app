import { EmailSuppressionReasonEnum } from '@hsm/common/enums';
import { DatabasePostgresSchemasEnum } from '@hsm/database/sources/postgres';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { EmailWebhookEventEntity } from './email-webhook-event.entity';

@Unique(['email'])
@Entity({ name: 'email_suppression', schema: DatabasePostgresSchemasEnum.COMS })
export class EmailSuppressionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  email: string;

  @Column({ type: 'enum', enum: EmailSuppressionReasonEnum })
  reason: EmailSuppressionReasonEnum;

  @ManyToOne(() => EmailWebhookEventEntity, { nullable: true })
  @JoinColumn()
  sourceWebhookEvent?: EmailWebhookEventEntity;

  @CreateDateColumn()
  createdAt: Date;
}
