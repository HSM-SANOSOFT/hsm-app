import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  Unique,
} from 'typeorm';
import {
  CompaniasEntity,
  SgiIsoareasEntity,
  SgiIsocargoEntity,
  SgiIsodivisionEntity,
  SgiIsodptoEntity,
  SgiIsoorganigramaEntity,
  SsaClasificacionOcupacionesEntity,
  SsaPuestosSutEntity,
} from './index';

@Unique('UK_CARGOS_SSA', [
  'compania',
  'division',
  'unidadDpto',
  'servicioArea',
  'iscaid',
  'ciou',
  'cargosSut',
  'prSiglas',
  'cargoOrg',
])

@Entity({ name: 'SSA_PUESTOS_TRABAJO', schema: 'SIS' })
export class SsaPuestosTrabajoEntity {
  @PrimaryColumn({
    name: 'NUMERO',
    type: 'number',
    precision: 5,
  })
  numero: number;

  @Column({
    name: 'COMPANIA',
    type: 'varchar',
    length: 3,
    comment: 'Identificador',
  })
  compania: string;

  @Column({
    name: 'CIOU',
    type: 'varchar',
    length: 20,
    comment: 'Codigo de cargo',
  })
  ciou: string;

  @Column({
    name: 'PROCESO_SUT',
    type: 'varchar',
    length: 20,
    comment: 'Segun sut',
  })
  procesoSut: string;

  @Column({
    name: 'PR_SIGLAS',
    type: 'varchar',
    length: 3,
    comment: 'Segun sistema de gestion de calidad',
  })
  prSiglas: string;

  @Column({
    name: 'CARGOS_SUT',
    type: 'varchar',
    length: 2,
    comment: 'Cargo segun sut',
  })
  cargosSut: string;

  @Column({
    name: 'DETALLE_ACTIVIDADES',
    type: 'varchar',
    length: 500,
    comment: 'Del puesto',
  })
  detalleActividades: string;

  @Column({
    name: 'OTRO_NOMBRE_CARGO',
    type: 'varchar',
    length: 200,
  })
  otroNombreCargo: string;

  @Column({
    name: 'CARGO_ORG',
    type: 'varchar',
    length: 10,
    comment: 'CARGO EN ORGANIGRAMA ESTRUCTURAL',
  })
  cargoOrg: string;

  @Column({
    name: 'DIVISION',
    type: 'number',
    precision: 4,
    comment: 'DIVISION ORGANIGRAMA FUNCIONAL',
  })
  division: number;

  @Column({
    name: 'UNIDAD_DPTO',
    type: 'number',
    precision: 2,
    comment:
      'UNIDAD (MEDICO) O DEPATRMENTO (ADMINISTRA) DEL ORGANIGRAMA FUNCIONAL',
  })
  unidadDpto: number;

  @Column({
    name: 'SERVICIO_AREA',
    type: 'number',
    precision: 4,
    comment: 'SERVICIO(MEDICO)  O AREA (ADMINISTRATI) ORGANIGRAMA FUNCIONAL',
  })
  servicioArea: number;

  @Column({
    name: 'ISCAID',
    type: 'number',
    precision: 4,
    comment: 'ESTE ES EL CODIGO DEL CARGO EN EL ORGANIGRAMA FUNCIONAL',
  })
  iscaid: number;

  @ManyToOne(() => SgiIsoorganigramaEntity)
  @JoinColumn([
    { name: 'COMPANIA', referencedColumnName: 'empresa' },
    { name: 'CARGO_ORG', referencedColumnName: 'cargoOrg' },
  ])
  sgiIsoorganigrama: SgiIsoorganigramaEntity;

  @ManyToOne(() => SgiIsoareasEntity)
  @JoinColumn([{ name: 'SERVICIO_AREA', referencedColumnName: 'isarid' }])
  sgiIsoareas: SgiIsoareasEntity;

  @ManyToOne(() => SsaClasificacionOcupacionesEntity)
  @JoinColumn([{ name: 'CIOU', referencedColumnName: 'codigo' }])
  ssaClasificacionOcupaciones: SsaClasificacionOcupacionesEntity;

  @ManyToOne(() => CompaniasEntity)
  @JoinColumn([{ name: 'COMPANIA', referencedColumnName: 'codigo' }])
  companias: CompaniasEntity;

  @ManyToOne(() => SgiIsodptoEntity)
  @JoinColumn([{ name: 'UNIDAD_DPTO', referencedColumnName: 'isdpid' }])
  sgiIsodpto: SgiIsodptoEntity;

  @ManyToOne(() => SgiIsocargoEntity)
  @JoinColumn([{ name: 'ISCAID', referencedColumnName: 'iscaid' }])
  sgiIsocargo: SgiIsocargoEntity;

  @ManyToOne(() => SsaPuestosSutEntity)
  @JoinColumn([{ name: 'CARGOS_SUT', referencedColumnName: 'codigo' }])
  ssaPuestosSut: SsaPuestosSutEntity;

  @ManyToOne(() => SgiIsodivisionEntity)
  @JoinColumn([{ name: 'DIVISION', referencedColumnName: 'isdirecid' }])
  sgiIsodivision: SgiIsodivisionEntity;
}
