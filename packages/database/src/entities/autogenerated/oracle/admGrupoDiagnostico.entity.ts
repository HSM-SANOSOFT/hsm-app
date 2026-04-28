import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'ADM_GRUPO_DIAGNOSTICO', schema: 'SIS' })
export class AdmGrupoDiagnosticoEntity {
  @Column({
    name: 'SECUENCIAL',
    type: 'number',
    nullable: true,
  })
  secuencial: number | null;

  @PrimaryColumn({
    name: 'GRUPO_EXAMEN',
    type: 'varchar',
    length: 3,
  })
  grupoExamen: string;

  @Column({
    name: 'DESCRIPCION',
    type: 'varchar',
    length: 30,
    comment: 'MEDIO DE DIGANOSTICO QUE SE ASIGNA EL TURNO',
    nullable: true,
  })
  descripcion: string | null;
}
