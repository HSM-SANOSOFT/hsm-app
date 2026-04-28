import { Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { EspecialidadesEntity, PersonalEntity } from './index';

@Index('ESPMDC_ESP_FK_I', ['espCodigo'])
@Index('ESPMDC_PRS_FK_I', ['prsCodigo'])

@Entity({ name: 'ESPECIALIDADES_MEDICOS', schema: 'SIS' })
export class EspecialidadesMedicosEntity {
  @PrimaryColumn({
    name: 'ESP_CODIGO',
    type: 'varchar',
    length: 3,
    comment: 'Código de especialidad',
  })
  espCodigo: string;

  @PrimaryColumn({
    name: 'PRS_CODIGO',
    type: 'varchar',
    length: 4,
    comment: 'Código del personal',
  })
  prsCodigo: string;

  @ManyToOne(() => PersonalEntity)
  @JoinColumn([{ name: 'PRS_CODIGO', referencedColumnName: 'codigo' }])
  personal: PersonalEntity;

  @ManyToOne(() => EspecialidadesEntity)
  @JoinColumn([{ name: 'ESP_CODIGO', referencedColumnName: 'codigo' }])
  especialidades: EspecialidadesEntity;
}
