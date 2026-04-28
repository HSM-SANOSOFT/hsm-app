import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { AreasEntity } from './index';

@Index('DPR_ARA_FK_I', ['araCodigo'])

@Entity({ name: 'DEPARTAMENTOS', schema: 'SIS' })
export class DepartamentosEntity {
  @PrimaryColumn({
    name: 'ARA_CODIGO',
    type: 'varchar',
    length: 1,
    comment: 'Código del área.',
  })
  araCodigo: string;

  @PrimaryColumn({
    name: 'CODIGO',
    type: 'varchar',
    length: 1,
    comment: 'Código del departamento',
  })
  codigo: string;

  @Column({
    name: 'NOMBRE',
    type: 'varchar',
    length: 30,
    comment: 'Nombre del departamento',
  })
  nombre: string;

  @Column({
    name: 'CARGABLE',
    type: 'char',
    length: 1,
    default: 'V',
    comment: 'Si el departamento puede generar cargos o no',
  })
  cargable: string;

  @Column({
    name: 'ESTADO_DE_DISPONIBILIDAD',
    type: 'char',
    length: 1,
    default: 'D',
    comment: 'Si esta disponible, fuera de servicio, etc',
  })
  estadoDeDisponibilidad: string;

  @Column({
    name: 'BODEGA',
    type: 'char',
    length: 1,
    default: 'F',
    comment:
      'Si el departamento es bodega (tiene un inventario local asociado)',
  })
  bodega: string;

  @Column({
    name: 'DIAS_CALCULO_STOCK',
    type: 'number',
    nullable: true,
  })
  diasCalculoStock: number | null;

  @Column({
    name: 'DIAS_STOCK_MINIMO',
    type: 'number',
    nullable: true,
  })
  diasStockMinimo: number | null;

  @Column({
    name: 'DIAS_STOCK_MAXIMO',
    type: 'number',
    nullable: true,
  })
  diasStockMaximo: number | null;

  @Column({
    name: 'PRD_CODIGO',
    type: 'number',
    nullable: true,
  })
  prdCodigo: number | null;

  @Column({
    name: 'ORIGEN',
    type: 'varchar',
    length: 1,
    nullable: true,
  })
  origen: string | null;

  @Column({
    name: 'CALCULAR_STOCK_TOTAL',
    type: 'varchar',
    length: 1,
    default: 'V',
    nullable: true,
  })
  calcularStockTotal: string | null;

  @Column({
    name: 'MTV_CODIGO',
    type: 'varchar',
    length: 2,
    nullable: true,
  })
  mtvCodigo: string | null;

  @Column({
    name: 'SOBRESTOCK',
    type: 'varchar',
    length: 2,
    default: 'F',
    comment: 'Indica si se puede solicitar insumos mayor al stock',
    nullable: true,
  })
  sobrestock: string | null;

  @Column({
    name: 'NOM_COR',
    type: 'varchar',
    length: 10,
    comment: 'NOMBRE CORTO',
  })
  nomCor: string;

  @Column({
    name: 'IMAGEN',
    type: 'varchar',
    length: 1,
    default: 'F',
    comment:
      'V Es un departamente del centro de diagnostico, un equipo de imagen',
    nullable: true,
  })
  imagen: string | null;

  @ManyToOne(() => AreasEntity)
  @JoinColumn([{ name: 'ARA_CODIGO', referencedColumnName: 'codigo' }])
  areas: AreasEntity;
}
