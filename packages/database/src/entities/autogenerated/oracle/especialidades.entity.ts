import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'ESPECIALIDADES', schema: 'SIS' })
export class EspecialidadesEntity {
  @PrimaryColumn({
    name: 'CODIGO',
    type: 'varchar',
    length: 3,
    comment: 'Código de especialidad',
  })
  codigo: string;

  @Column({
    name: 'ESPECIALIDAD',
    type: 'varchar',
    length: 40,
    comment: 'Descripción de la Especialidad',
  })
  especialidad: string;

  @Column({
    name: 'ESTADO_DE_DISPONIBILIDAD',
    type: 'char',
    length: 1,
    default: 'D',
    comment: 'Estado de Disponibilidad',
  })
  estadoDeDisponibilidad: string;

  @Column({
    name: 'NIVEL_CONSULTA',
    type: 'char',
    length: 2,
    comment: 'CG-CODE Tipos de consultas que da el medico para precios',
    nullable: true,
  })
  nivelConsulta: string | null;

  @Column({
    name: 'CODIGO_INEN',
    type: 'char',
    length: 2,
    comment: 'Codigo de la especialidad de egreso segun reporte inen',
    nullable: true,
  })
  codigoInen: string | null;

  @Column({
    name: 'AGRUPADOR',
    type: 'char',
    length: 2,
    default: null,
    comment:
      '1 Cirugia general 2 Ginecobstetrica 3 PEDIATRIA 4 MED.iNTERNA 9  E ESPECIALIDADDES 6 GASTRO 78NEURO 7 URO',
    nullable: true,
  })
  agrupador: string | null;

  @Column({
    name: 'QUIROFANO',
    type: 'varchar',
    length: 2,
    default: 'Q1',
    comment: 'PARA CREAR PARTES',
    nullable: true,
  })
  quirofano: string | null;

  @Column({
    name: 'CRG_CODIGO_PC',
    type: 'varchar',
    length: 10,
    default: '99202',
    comment: 'PRIMERA CONSULTA PC',
    nullable: true,
  })
  crgCodigoPc: string | null;

  @Column({
    name: 'CRG_CODIGO_CS',
    type: 'varchar',
    length: 10,
    default: '99213',
    comment: 'CONSULTA SUBSECUENTE CS',
    nullable: true,
  })
  crgCodigoCs: string | null;
}
