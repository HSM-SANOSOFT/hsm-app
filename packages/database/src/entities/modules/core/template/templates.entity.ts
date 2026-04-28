import { TemplateCategoriesEnum } from '@hsm/common/enums';
import { DatabasePostgresSchemasEnum } from '@hsm/database/sources/postgres';
import {
  Check,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { TemplateComEmailEntity } from './template-com-email.entity';
import { TemplateComSmsEntity } from './template-com-sms.entity';
import { TemplateDocEntity } from './template-doc.entity';

@Check(
  `(category = '${TemplateCategoriesEnum.BASE}' AND base_template IS NULL) OR (category != '${TemplateCategoriesEnum.BASE}' AND base_template IS NOT NULL)`,
)
@Unique(['name'])
@Entity({ name: 'templates', schema: DatabasePostgresSchemasEnum.TEMPLATES })
export class TemplatesEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: TemplateCategoriesEnum })
  category: TemplateCategoriesEnum;

  @Column()
  name: string;

  @Column()
  isActive: boolean;

  @Column({ type: 'jsonb' })
  schema: object;

  @Column()
  content: string;

  @Column({ type: 'varchar', nullable: true })
  description: string | null;

  @ManyToOne(() => TemplatesEntity, { nullable: true })
  @JoinColumn({ name: 'base_template' })
  baseTemplate: TemplatesEntity | null;

  @OneToOne(
    () => TemplateComEmailEntity,
    templateComEmail => templateComEmail.template,
  )
  comEmail: TemplateComEmailEntity;

  @OneToOne(
    () => TemplateComSmsEntity,
    templateComSms => templateComSms.template,
  )
  comSms: TemplateComSmsEntity;

  @OneToOne(
    () => TemplateDocEntity,
    templateDoc => templateDoc.template,
  )
  doc: TemplateDocEntity;
}
