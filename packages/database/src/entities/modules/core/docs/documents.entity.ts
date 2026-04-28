import { DatabasePostgresSchemasEnum } from '@hsm/database/sources/postgres';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { DocumentAuditLogEntity } from './document-audit-log.entity';
import { DocumentLinkEntity } from './document-link.entity';
import { DocumentsVersionEntity } from './document-version.entity';

@Entity({ name: 'documents', schema: DatabasePostgresSchemasEnum.DOCS })
export class DocumentsEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ nullable: true })
  description?: string;

  @Column()
  type: string;

  @Column()
  status: string;

  @Column()
  source: string;

  @CreateDateColumn()
  createdAt: Date;

  @DeleteDateColumn({ nullable: true })
  deletedAt?: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(
    () => DocumentsVersionEntity,
    version => version.document,
    { cascade: true },
  )
  versions: DocumentsVersionEntity[];

  @OneToMany(
    () => DocumentLinkEntity,
    link => link.document,
    { cascade: true },
  )
  links: DocumentLinkEntity[];

  @OneToMany(
    () => DocumentAuditLogEntity,
    audit => audit.document,
    { cascade: true },
  )
  audits: DocumentAuditLogEntity[];
}
