import {
  DocumentCodesEnum,
  DocumentFormatsEnum,
  DocumentOrientationsEnum,
  DocumentSizesEnum,
} from '@hsm/common/enums';
import { DatabasePostgresSchemasEnum } from '@hsm/database/sources/postgres';
import { Column, Entity, JoinColumn, OneToOne, PrimaryColumn } from 'typeorm';
import { TemplatesEntity } from './templates.entity';

@Entity({
  name: 'template_docs',
  schema: DatabasePostgresSchemasEnum.TEMPLATES,
})
export class TemplateDocEntity {
  @PrimaryColumn({ type: 'uuid' })
  id: string;

  @Column({ name: 'document_code', type: 'enum', enum: DocumentCodesEnum })
  documentCode: DocumentCodesEnum;

  @Column({ type: 'enum', enum: DocumentFormatsEnum })
  format: DocumentFormatsEnum;

  @Column({ type: 'enum', enum: DocumentSizesEnum })
  size: DocumentSizesEnum;

  @Column({ type: 'enum', enum: DocumentOrientationsEnum })
  orientation: DocumentOrientationsEnum;

  @OneToOne(
    () => TemplatesEntity,
    template => template.doc,
  )
  @JoinColumn({ name: 'id' })
  template: TemplatesEntity;
}
