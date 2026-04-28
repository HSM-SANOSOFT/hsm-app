import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { CantonesEntity } from './index';

@Index('PRQ_CNN_FK_I', ['cntPrvCodigo', 'cntCodigo'])

@Entity({ name: 'PARROQUIAS', schema: 'SIS' })
export class ParroquiasEntity {
  @PrimaryColumn({
    name: 'CNT_PRV_CODIGO',
    type: 'varchar',
    length: 2,
    comment: 'Código de la provincia',
  })
  cntPrvCodigo: string;

  @PrimaryColumn({
    name: 'CNT_CODIGO',
    type: 'varchar',
    length: 2,
    comment: 'Código del cantón',
  })
  cntCodigo: string;

  @PrimaryColumn({
    name: 'CODIGO',
    type: 'varchar',
    length: 2,
    comment: 'Código de la parroquia',
  })
  codigo: string;

  @Column({
    name: 'PARROQUIA',
    type: 'varchar',
    length: 40,
    comment: 'Nombre de la parroquia',
  })
  parroquia: string;

  @ManyToOne(() => CantonesEntity)
  @JoinColumn([
    { name: 'CNT_PRV_CODIGO', referencedColumnName: 'prvCodigo' },
    { name: 'CNT_CODIGO', referencedColumnName: 'codigo' },
  ])
  cantones: CantonesEntity;
}
