import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { AdmGrupoDiagnosticoEntity, PersonalEntity } from './index';

@Entity({ name: 'ADM_SERVIDORES_DIAGNOSTICO', schema: 'SIS' })
export class AdmServidoresDiagnosticoEntity {
  @PrimaryColumn({
    name: 'SECUENCIAL',
    type: 'number',
  })
  secuencial: number;

  @Column({
    name: 'GRUPO_EXAMEN',
    type: 'varchar',
    length: 3,
    nullable: true,
  })
  grupoExamen: string | null;

  @Column({
    name: 'PRS_CODIGO',
    type: 'varchar',
    length: 4,
    comment: 'PERSONAL MEDICO CONTRATADO',
    nullable: true,
  })
  prsCodigo: string | null;

  @Column({
    name: 'SERVICIOID',
    type: 'varchar',
    length: 3,
    comment: 'IMG,LAB',
    nullable: true,
  })
  servicioid: string | null;

  @Column({
    name: 'MODALITY',
    type: 'varchar',
    length: 3,
    comment: 'EJ: CT, RX, EC,DX,US',
    nullable: true,
  })
  modality: string | null;

  @Column({
    name: 'CARGO',
    type: 'varchar',
    length: 3,
    comment: '&#x27;RDL&#x27; ES RADIOLOGOS &#x27;TLA&#x27; LABORAR',
    nullable: true,
  })
  cargo: string | null;

  @Column({
    name: 'AETITLE',
    type: 'varchar',
    length: 30,
    comment: 'ScheduledStationAETitle',
    nullable: true,
  })
  aetitle: string | null;

  @Column({
    name: 'PRS_INFORMA',
    type: 'varchar',
    length: 4,
    comment: 'MEDICO QUE INFORMA RESULTADOS // RESPONSABLE DEL AREA',
    nullable: true,
  })
  prsInforma: string | null;

  @Column({
    name: 'CONSULTORIO',
    type: 'number',
    comment: 'NUMERO CONSULTORIO',
    nullable: true,
  })
  consultorio: number | null;

  @ManyToOne(() => PersonalEntity)
  @JoinColumn([{ name: 'PRS_CODIGO', referencedColumnName: 'codigo' }])
  personal: PersonalEntity;

  @ManyToOne(() => PersonalEntity)
  @JoinColumn([{ name: 'PRS_INFORMA', referencedColumnName: 'codigo' }])
  personalPrsInforma: PersonalEntity;

  @ManyToOne(() => AdmGrupoDiagnosticoEntity)
  @JoinColumn([{ name: 'GRUPO_EXAMEN', referencedColumnName: 'grupoExamen' }])
  admGrupoDiagnostico: AdmGrupoDiagnosticoEntity;
}
