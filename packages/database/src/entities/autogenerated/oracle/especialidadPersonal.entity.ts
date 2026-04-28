import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'ESPECIALIDAD_PERSONAL', schema: 'SIS' })
export class EspecialidadPersonalEntity {
  @PrimaryColumn({
    name: 'CODIGO',
    type: 'varchar',
    length: 3,
    comment: 'Código del cargo',
  })
  codigo: string;

  @Column({
    name: 'ESPECIALIDAD',
    type: 'varchar',
    length: 30,
    comment: 'Especialidad del personal',
  })
  especialidad: string;

  @Column({
    name: 'ESTADO_DE_DISPONIBILIDAD',
    type: 'char',
    length: 1,
    default: 'D',
    comment: 'Si esta disponible, fuera de servicio, etc',
  })
  estadoDeDisponibilidad: string;

  @Column({
    name: 'NIVEL_CONSULTA',
    type: 'varchar',
    length: 3,
    nullable: true,
  })
  nivelConsulta: string | null;
}
