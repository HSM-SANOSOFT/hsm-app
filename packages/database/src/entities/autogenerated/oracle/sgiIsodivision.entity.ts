import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'SGI_ISODIVISION', schema: 'SIS' })
export class SgiIsodivisionEntity {
  @PrimaryColumn({
    name: 'ISDIRECID',
    type: 'number',
    precision: 4,
  })
  isdirecid: number;

  @Column({
    name: 'ISDIRECDETA',
    type: 'char',
    length: 50,
    nullable: true,
  })
  isdirecdeta: string | null;
}
