import { DatabasePostgresSchemasEnum } from '@hsm/database/sources/postgres';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { DocumentsEntity } from './documents.entity';

@Entity({ name: 'document-link', schema: DatabasePostgresSchemasEnum.DOCS })
export class DocumentLinkEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(
    () => DocumentsEntity,
    document => document.links,
  )
  @JoinColumn()
  document: DocumentsEntity;

  @Column()
  entityId: string;

  @Column()
  entityType: string;
}
