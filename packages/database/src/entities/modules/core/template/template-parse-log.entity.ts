import {
  TemplateCategoriesEnum,
  TemplateParseTriggerEnum,
} from '@hsm/common/enums';
import { DatabasePostgresSchemasEnum } from '@hsm/database/sources/postgres';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { TemplatesEntity } from './templates.entity';

@Entity({
  name: 'template_parse_logs',
  schema: DatabasePostgresSchemasEnum.TEMPLATES,
})
@Index(['templateId', 'createdAt'])
@Index(['createdAt'])
export class TemplateParseLogEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'template_id', type: 'uuid', nullable: true })
  templateId: string | null;

  @ManyToOne(() => TemplatesEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'template_id' })
  template: TemplatesEntity | null;

  @Column({ name: 'template_name' })
  templateName: string;

  @Column({ type: 'enum', enum: TemplateCategoriesEnum })
  category: TemplateCategoriesEnum;

  @Column({ type: 'jsonb' })
  input: object;

  @Column({ name: 'output_length', type: 'int', nullable: true })
  outputLength: number | null;

  @Column({ default: false })
  success: boolean;

  @Column({ name: 'error_code', type: 'varchar', nullable: true })
  errorCode: string | null;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string | null;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId: string | null;

  @Column({
    name: 'triggered_by',
    type: 'enum',
    enum: TemplateParseTriggerEnum,
  })
  triggeredBy: TemplateParseTriggerEnum;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
