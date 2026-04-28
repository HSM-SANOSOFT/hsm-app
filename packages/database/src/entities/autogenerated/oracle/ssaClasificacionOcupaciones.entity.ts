import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'SSA_CLASIFICACION_OCUPACIONES', schema: 'SIS' })
export class SsaClasificacionOcupacionesEntity {
  @PrimaryColumn({
    name: 'CODIGO',
    type: 'varchar',
    length: 20,
    comment: 'Codigo de cargoSEGUN CIUO en formato completo',
  })
  codigo: string;

  @Column({
    name: 'DESCRIPCION',
    type: 'varchar',
    length: 300,
    nullable: true,
  })
  descripcion: string | null;

  @Column({
    name: 'NIVEL',
    type: 'varchar',
    length: 1,
    nullable: true,
  })
  nivel: string | null;

  @Column({
    name: 'CIUO_SUP',
    type: 'varchar',
    length: 20,
    comment: 'para sut',
    nullable: true,
  })
  ciuoSup: string | null;
}
