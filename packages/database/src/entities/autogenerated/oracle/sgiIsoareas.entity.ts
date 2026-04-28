import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'SGI_ISOAREAS', schema: 'SIS' })
export class SgiIsoareasEntity {
  @PrimaryColumn({
    name: 'ISARID',
    type: 'number',
    precision: 4,
  })
  isarid: number;

  @Column({
    name: 'ISARDETA',
    type: 'char',
    length: 50,
    nullable: true,
  })
  isardeta: string | null;
}
