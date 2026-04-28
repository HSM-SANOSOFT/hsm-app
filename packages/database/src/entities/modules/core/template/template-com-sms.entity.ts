import { DatabasePostgresSchemasEnum } from '@hsm/database/sources/postgres';
import { Column, Entity, JoinColumn, OneToOne, PrimaryColumn } from 'typeorm';
import { TemplatesEntity } from './templates.entity';
@Entity({
  name: 'template_coms_sms',
  schema: DatabasePostgresSchemasEnum.TEMPLATES,
})
export class TemplateComSmsEntity {
  @PrimaryColumn({ type: 'uuid' })
  id: string;

  @Column()
  provider: string;

  @Column({ name: 'template_name' })
  templateName: string;

  @Column()
  from: string;

  @OneToOne(
    () => TemplatesEntity,
    template => template.comSms,
  )
  @JoinColumn({ name: 'id' })
  template: TemplatesEntity;
}
