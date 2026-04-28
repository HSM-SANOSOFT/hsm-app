import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { DepartamentosEntity, PersonalEntity } from './index';

@Index('HRRMDC_DPR_FK_I', ['dprCodigo', 'dprAraCodigo'])
@Index('HRRMDC_PRS_FK_I', ['prsCodigo'])

@Entity({ name: 'HORARIOS_MEDICO', schema: 'SIS' })
export class HorariosMedicoEntity {
  @PrimaryColumn({
    name: 'PRS_CODIGO',
    type: 'varchar',
    length: 4,
    comment: 'Código del personal',
  })
  prsCodigo: string;

  @PrimaryColumn({
    name: 'NUMERO',
    type: 'number',
    precision: 6,
    comment: 'Número de horario',
  })
  numero: number;

  @Column({
    name: 'DPR_CODIGO',
    type: 'varchar',
    length: 1,
    comment: 'Código del departamento',
    nullable: true,
  })
  dprCodigo: string | null;

  @Column({
    name: 'DPR_ARA_CODIGO',
    type: 'varchar',
    length: 1,
    comment: 'Código del área.',
    nullable: true,
  })
  dprAraCodigo: string | null;

  @Column({
    name: 'DIA',
    type: 'varchar',
    length: 1,
    comment: 'Dia del horario',
  })
  dia: string;

  @Column({
    name: 'HORA_INICIAL',
    type: 'date',
    comment: 'Hora de inicio del horario',
    nullable: true,
  })
  horaInicial: Date | null;

  @Column({
    name: 'HORA_FINAL',
    type: 'date',
    comment: 'Hora final del horario',
    nullable: true,
  })
  horaFinal: Date | null;

  @Column({
    name: 'TURNOS_POSIBLES',
    type: 'number',
    precision: 3,
    comment: 'Número de turnos posibles en el horario',
    nullable: true,
  })
  turnosPosibles: number | null;

  @Column({
    name: 'TIEMPO',
    type: 'number',
    precision: 2,
    default: 0,
    comment: 'Tiempo promedio que se demora por cada consulta',
    nullable: true,
  })
  tiempo: number | null;

  @Column({
    name: 'DISPONIBILIDAD',
    type: 'char',
    length: 1,
    default: 'V',
    comment: 'Disponibilidad de turnos',
  })
  disponibilidad: string;

  @Column({
    name: 'PROMOCION',
    type: 'varchar',
    length: 2,
    default: '03',
    nullable: true,
  })
  promocion: string | null;

  @Column({
    name: 'TIPO_TURNO',
    type: 'varchar',
    length: 1,
    default: 'P',
    comment:
      '&#x27;I&#x27; iess call center y &#x27;Q&#x27; post quirurgico &#x27;P&#x27; Privado &#x27;R&#x27; RPIS  o   &#x27;O&#x27; en cualquier otro convenio incluso sanoser',
    nullable: true,
  })
  tipoTurno: string | null;

  @ManyToOne(() => PersonalEntity)
  @JoinColumn([{ name: 'PRS_CODIGO', referencedColumnName: 'codigo' }])
  personal: PersonalEntity;

  @ManyToOne(() => DepartamentosEntity)
  @JoinColumn([
    { name: 'DPR_ARA_CODIGO', referencedColumnName: 'araCodigo' },
    { name: 'DPR_CODIGO', referencedColumnName: 'codigo' },
  ])
  departamentos: DepartamentosEntity;
}
