import { DatabasePostgresSchemasEnum } from '@hsm/database/sources/postgres';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { EmailBatchEntity } from './email-batch.entity';

@Index(['email'])
@Entity({ name: 'email_recipient', schema: DatabasePostgresSchemasEnum.COMS })
export class EmailRecipientEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => EmailBatchEntity)
  batch: EmailBatchEntity;

  @Column()
  email: string;

  @Column({ nullable: true })
  messageId?: string;

  @CreateDateColumn()
  createdAt: Date;
}
