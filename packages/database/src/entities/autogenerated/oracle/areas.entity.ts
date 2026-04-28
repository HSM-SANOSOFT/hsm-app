import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { NomOrgCoordinacionEntity } from './index';

@Entity({ name: 'AREAS', schema: 'SIS' })
export class AreasEntity {
  @PrimaryColumn({
    name: 'CODIGO',
    type: 'varchar',
    length: 1,
    comment: 'Código del área.',
  })
  codigo: string;

  @Column({
    name: 'NOMBRE',
    type: 'varchar',
    length: 30,
    comment: 'Nombre definido para el área',
  })
  nombre: string;

  @Column({
    name: 'ESTADO_DE_DISPONIBILIDAD',
    type: 'char',
    length: 1,
    default: 'D',
    comment: 'Si esta disponible, fuera de servicio, etc',
  })
  estadoDeDisponibilidad: string;

  @Column({
    name: 'COORDINACION',
    type: 'number',
    default: 1,
    comment: 'DE LA TABLA NOM_COORDINACION',
  })
  coordinacion: number;

  @ManyToOne(() => NomOrgCoordinacionEntity)
  @JoinColumn([{ name: 'COORDINACION', referencedColumnName: 'id' }])
  nomOrgCoordinacion: NomOrgCoordinacionEntity;
}
