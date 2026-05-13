import { DatabasePostgresSchemasEnum } from '@hsm/database/sources/postgres';
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'email_batch', schema: DatabasePostgresSchemasEnum.COMS })
export class EmailBatchEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  templateName: string;

  @Column({ type: 'jsonb' })
  data: object;

  @Column({ nullable: true })
  fromEmail?: string;

  @Column({ nullable: true })
  fromName?: string;

  @Column({ nullable: true })
  providerMessageId?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
