import { Column, Entity, PrimaryColumn, Unique } from 'typeorm';

@Unique('PS_CODIG_FK', ['codigo'])

@Entity({ name: 'SSA_PUESTOS_SUT', schema: 'SIS' })
export class SsaPuestosSutEntity {
  @PrimaryColumn({
    name: 'NUMERO',
    type: 'number',
    precision: 5,
    comment: 'SECUENCIAL',
  })
  numero: number;

  @Column({
    name: 'CODIGO',
    type: 'varchar',
    length: 20,
    comment: 'CODIGO DENTRO DEL AREA',
    nullable: true,
  })
  codigo: string | null;

  @Column({
    name: 'DESCRIPCION',
    type: 'varchar',
    length: 300,
    nullable: true,
  })
  descripcion: string | null;

  @Column({
    name: 'SECTOR',
    type: 'varchar',
    length: 20,
    comment: 'AREA DE UBICAICON DEL RIESP',
    nullable: true,
  })
  sector: string | null;

  @Column({
    name: 'GRUPO_CARGOS',
    type: 'varchar',
    length: 300,
    comment:
      'LOS GRUPOS DE CARGOS QUE PUEDEN ESTAR INCLUIDOS EN ESTA UBICACION',
    nullable: true,
  })
  grupoCargos: string | null;
}
