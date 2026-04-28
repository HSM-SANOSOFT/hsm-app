import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'PROVINCIAS', schema: 'SIS' })
export class ProvinciasEntity {
  @PrimaryColumn({
    name: 'CODIGO',
    type: 'varchar',
    length: 2,
    comment: 'Código de la provincia',
  })
  codigo: string;

  @Column({
    name: 'PROVINCIA',
    type: 'varchar',
    length: 40,
    comment: 'Nombre de la provincia',
  })
  provincia: string;
}
