import { DatabasePostgresSchemasEnum } from '@hsm/database/sources/postgres';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { DocumentsVersionEntity } from './document-version.entity';

@Entity({
  name: 'document-storage-object',
  schema: DatabasePostgresSchemasEnum.DOCS,
})
export class DocumentStorageObjectEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column()
  path: string;

  @Column()
  bucket: string;

  @Column({ nullable: true })
  region?: string;

  @Column({ nullable: true })
  etag?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToOne(() => DocumentsVersionEntity)
  @JoinColumn()
  version: DocumentsVersionEntity;
}
