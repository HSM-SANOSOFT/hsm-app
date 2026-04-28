import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'SGI_ISODPTO', schema: 'SIS' })
export class SgiIsodptoEntity {
  @PrimaryColumn({
    name: 'ISDPID',
    type: 'number',
    precision: 4,
  })
  isdpid: number;

  @Column({
    name: 'ISDPDETA',
    type: 'char',
    length: 50,
    nullable: true,
  })
  isdpdeta: string | null;

  @Column({
    name: 'ISDPSIGLAS',
    type: 'char',
    length: 3,
    nullable: true,
  })
  isdpsiglas: string | null;

  @Column({
    name: 'STATUS',
    type: 'char',
    length: 1,
    nullable: true,
  })
  status: string | null;
}
