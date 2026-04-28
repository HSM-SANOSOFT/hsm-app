import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  Unique,
} from 'typeorm';
import { SgiIsonodoOrgEntity } from './index';

@Unique('UK_ORGRA', ['empresa', 'cargoOrg'])

@Entity({ name: 'SGI_ISOORGANIGRAMA', schema: 'SIS' })
export class SgiIsoorganigramaEntity {
  @PrimaryColumn({
    name: 'ID_NODO',
    type: 'number',
    precision: 10,
  })
  idNodo: number;

  @Column({
    name: 'EMPRESA',
    type: 'varchar',
    length: 3,
    nullable: true,
  })
  empresa: string | null;

  @Column({
    name: 'CARGO_ORG',
    type: 'varchar',
    length: 13,
    comment:
      'CARGO DEL ORGANIGRAMA ESTRUCTURAL, TIENE QUE VER CON LA FORMA DE GRAFICAR',
  })
  cargoOrg: string;

  @Column({
    name: 'NOMBRE',
    type: 'varchar',
    length: 200,
  })
  nombre: string;

  @Column({
    name: 'CODIGO_ORG_PADRE',
    type: 'varchar',
    length: 10,
    comment: 'A QUIE ESE REPORTA',
    nullable: true,
  })
  codigoOrgPadre: string | null;

  @Column({
    name: 'DESCRIPCION_FUNCIONES',
    type: 'varchar',
    length: 1000,
    nullable: true,
  })
  descripcionFunciones: string | null;

  @Column({
    name: 'TIPO_NODO',
    type: 'number',
    precision: 4,
    comment:
      'PARA DIBUJAR EL NODO O CUADRO DEBE SER DIFERENTE EN ADA TIPO DE NODO AL QUE PERTENECE',
    nullable: true,
  })
  tipoNodo: number | null;

  @Column({
    name: 'ESTADO',
    type: 'varchar',
    length: 1,
    default: 'A',
    nullable: true,
  })
  estado: string | null;

  @ManyToOne(() => SgiIsonodoOrgEntity)
  @JoinColumn([{ name: 'TIPO_NODO', referencedColumnName: 'isnodoid' }])
  sgiIsonodoOrg: SgiIsonodoOrgEntity;
}
