import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'NOM_ORG_DIRECCION', schema: 'SIS' })
export class NomOrgDireccionEntity {
  @PrimaryColumn({
    name: 'DIRECCION',
    type: 'number',
    comment: 'El código de la empresa de la que es el plan de cuentas',
  })
  direccion: number;

  @Column({
    name: 'DESCRIPCION_PUESTO',
    type: 'varchar',
    length: 100,
    comment: 'Descripción del Cargo',
  })
  descripcionPuesto: string;

  @Column({
    name: 'NOMCOR',
    type: 'varchar',
    length: 15,
    comment: 'Si esta disponible, fuera de servicio, etc',
  })
  nomcor: string;

  @Column({
    name: 'ESTADO_DE_DISPONIBILIDAD',
    type: 'char',
    length: 1,
    comment: 'Si esta disponible, fuera de servicio, etc',
  })
  estadoDeDisponibilidad: string;

  @Column({
    name: 'DESCRIPCION_CARGO',
    type: 'varchar',
    length: 100,
    comment: 'Descripción del puesto',
    nullable: true,
  })
  descripcionCargo: string | null;
}
