import { DatabasePostgresSchemasEnum } from '@hsm/database/sources/postgres';
import { Column, Entity, JoinColumn, OneToOne, PrimaryColumn } from 'typeorm';
import { TemplatesEntity } from './templates.entity';

@Entity({
  name: 'template_coms_email',
  schema: DatabasePostgresSchemasEnum.TEMPLATES,
})
export class TemplateComEmailEntity {
  @PrimaryColumn({ type: 'uuid' })
  id: string;

  @Column()
  subject: string;

  @Column({ name: 'from_email' })
  fromEmail: string;

  @Column({ name: 'from_name' })
  fromName: string;

  @Column({ type: 'text', array: true, nullable: true })
  cc: string[];

  @Column({ type: 'text', array: true, nullable: true })
  bcc: string[];

  @Column({ name: 'has_attachment', default: false })
  hasAttachment: boolean;

  @OneToOne(
    () => TemplatesEntity,
    template => template.comEmail,
  )
  @JoinColumn({ name: 'id' })
  template: TemplatesEntity;
}
