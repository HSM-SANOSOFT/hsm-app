import { DatabasePostgresSchemasEnum } from '@hsm/database/sources/postgres';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { DocumentsEntity } from './documents.entity';

@Entity({
  name: 'document-audit-log',
  schema: DatabasePostgresSchemasEnum.DOCS,
})
export class DocumentAuditLogEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(
    () => DocumentsEntity,
    document => document.audits,
  )
  @JoinColumn()
  document: DocumentsEntity;

  @Column()
  action: string;

  @CreateDateColumn()
  createdAt: Date;
}
