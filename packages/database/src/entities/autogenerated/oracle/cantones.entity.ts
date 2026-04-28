import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { ProvinciasEntity } from './index';

@Entity({ name: 'CANTONES', schema: 'SIS' })
export class CantonesEntity {
  @PrimaryColumn({
    name: 'PRV_CODIGO',
    type: 'varchar',
    length: 2,
  })
  prvCodigo: string;

  @PrimaryColumn({
    name: 'CODIGO',
    type: 'varchar',
    length: 3,
  })
  codigo: string;

  @Column({
    name: 'CANTON',
    type: 'varchar',
    length: 40,
  })
  canton: string;

  @ManyToOne(() => ProvinciasEntity)
  @JoinColumn([{ name: 'PRV_CODIGO', referencedColumnName: 'codigo' }])
  provincias: ProvinciasEntity;
}
