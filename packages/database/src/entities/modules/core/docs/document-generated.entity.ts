import { DatabasePostgresSchemasEnum } from '@hsm/database/sources/postgres';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { DocumentsVersionEntity } from './document-version.entity';

@Entity({
  name: 'documents-generated',
  schema: DatabasePostgresSchemasEnum.DOCS,
})
export class DocumentsGeneratedEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  templateName: string;

  @Column({ type: 'jsonb' })
  data: object;

  @CreateDateColumn()
  createdAt: Date;

  @OneToOne(() => DocumentsVersionEntity)
  @JoinColumn()
  version: DocumentsVersionEntity;
}
