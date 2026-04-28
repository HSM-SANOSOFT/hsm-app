import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  Unique,
} from 'typeorm';
import { NomOrgDireccionEntity } from './index';

@Unique('UK_COORDINA', ['direccion', 'coordinacion'])

@Entity({ name: 'NOM_ORG_COORDINACION', schema: 'SIS' })
export class NomOrgCoordinacionEntity {
  @PrimaryColumn({
    name: 'ID',
    type: 'number',
  })
  id: number;

  @Column({
    name: 'DIRECCION',
    type: 'number',
    comment: 'La direccion a la que pertenece',
    nullable: true,
  })
  direccion: number | null;

  @Column({
    name: 'COORDINACION',
    type: 'number',
    comment: 'El código de la empresa de la que es el plan de cuentas',
  })
  coordinacion: number;

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
    default: 'D',
    comment: 'Si esta disponible, fuera de servicio, etc',
  })
  estadoDeDisponibilidad: string;

  @Column({
    name: 'DESCRIPCION_CARGO',
    type: 'varchar',
    length: 100,
    comment: 'Descripción del Cargo',
    nullable: true,
  })
  descripcionCargo: string | null;

  @ManyToOne(() => NomOrgDireccionEntity)
  @JoinColumn([{ name: 'DIRECCION', referencedColumnName: 'direccion' }])
  nomOrgDireccion: NomOrgDireccionEntity;
}
