import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  Unique,
} from 'typeorm';
import {
  AreasEntity,
  DepartamentosEntity,
  EspecialidadPersonalEntity,
  SsaPuestosTrabajoEntity,
} from './index';

@Unique('PRS_UK', ['usuario'])

@Index('PRS_ESPPRS_FK_I', ['espprsCodigo'])

@Entity({ name: 'PERSONAL', schema: 'SIS' })
export class PersonalEntity {
  @PrimaryColumn({
    name: 'CODIGO',
    type: 'varchar',
    length: 4,
    comment: 'Código del personal',
  })
  codigo: string;

  @Column({
    name: 'ESPPRS_CODIGO',
    type: 'varchar',
    length: 3,
    comment: 'Código del cargo',
  })
  espprsCodigo: string;

  @Column({
    name: 'APELLIDOS',
    type: 'varchar',
    length: 30,
    comment: 'Apellidos',
  })
  apellidos: string;

  @Column({
    name: 'NOMBRES',
    type: 'varchar',
    length: 25,
    comment: 'Nombres',
  })
  nombres: string;

  @Column({
    name: 'ESTADO_DE_DISPONIBILIDAD',
    type: 'char',
    length: 1,
    default: 'D',
    comment: 'Si esta disponible, fuera de servicio, etc',
  })
  estadoDeDisponibilidad: string;

  @Column({
    name: 'CEDULA',
    type: 'varchar',
    length: 10,
    comment: 'Cédula de identidad',
  })
  cedula: string;

  @Column({
    name: 'CARGO',
    type: 'varchar',
    length: 3,
    comment:
      'Cárgo del personal EN CG_REF_CODES C WHERE C.RV_DOMAIN&#x3D;CARGO',
  })
  cargo: string;

  @Column({
    name: 'TELEFONO',
    type: 'varchar',
    length: 24,
    comment: 'Teléfonos del médico',
    nullable: true,
  })
  telefono: string | null;

  @Column({
    name: 'DIRECCION',
    type: 'varchar',
    length: 200,
    comment: 'Dirección domiciliaria',
    nullable: true,
  })
  direccion: string | null;

  @Column({
    name: 'NUMERO_CMA',
    type: 'varchar',
    length: 5,
    comment: 'Núm. Afil. Colegio Médico',
    nullable: true,
  })
  numeroCma: string | null;

  @Column({
    name: 'USUARIO',
    type: 'varchar',
    length: 30,
    comment: 'Nombre de usuario de la BD',
  })
  usuario: string;

  @Column({
    name: 'PERMITIR_TURNO',
    type: 'varchar',
    length: 1,
    default: 'F',
  })
  permitirTurno: string;

  @Column({
    name: 'PERSONAL_CIRUGIA',
    type: 'char',
    length: 1,
    default: 'F',
  })
  personalCirugia: string;

  @Column({
    name: 'BENEFICIARIO',
    type: 'char',
    length: 1,
    default: 'F',
  })
  beneficiario: string;

  @Column({
    name: 'LIBRO_MSP',
    type: 'varchar',
    length: 20,
    comment: 'POR ELIMINAR',
    nullable: true,
  })
  libroMsp: string | null;

  @Column({
    name: 'FOLIO_MSP',
    type: 'varchar',
    length: 20,
    comment: 'POR ELIMINAR',
    nullable: true,
  })
  folioMsp: string | null;

  @Column({
    name: 'NUMERO_MSP',
    type: 'varchar',
    length: 20,
    comment: 'POR ELIMINAR',
    nullable: true,
  })
  numeroMsp: string | null;

  @Column({
    name: 'AREA_FISICA_ASIGNADA',
    type: 'varchar',
    length: 1,
    comment: 'codigo de la tabla AREA',
  })
  areaFisicaAsignada: string;

  @Column({
    name: 'DEPARTAMENTO_FISICO_ASIGNADO',
    type: 'varchar',
    length: 2,
    comment: 'Codigo del Departamento',
  })
  departamentoFisicoAsignado: string;

  @Column({
    name: 'EMAIL',
    type: 'varchar',
    length: 360,
    comment: 'MAIL DEL MEDICO',
  })
  email: string;

  @Column({
    name: 'FIRMA_INICIALES',
    type: 'blob',
    comment: 'El visto bueno',
    nullable: true,
  })
  firmaIniciales: Buffer | null;

  @Column({
    name: 'FIRMA_RUBRICA',
    type: 'long',
    nullable: true,
  })
  firmaRubrica: string | null;

  @Column({
    name: 'SELLO',
    type: 'blob',
    nullable: true,
  })
  sello: Buffer | null;

  @Column({
    name: 'FIRMA_Y_SELLO',
    type: 'blob',
    nullable: true,
  })
  firmaYSello: Buffer | null;

  @Column({
    name: 'FIRMA_Y_SELLO_H',
    type: 'blob',
    nullable: true,
  })
  firmaYSelloH: Buffer | null;

  @Column({
    name: 'SEXO',
    type: 'varchar',
    length: 1,
  })
  sexo: string;

  @Column({
    name: 'SENESCYT',
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  senescyt: string | null;

  @Column({
    name: 'MIEMBRO_STAFF',
    type: 'char',
    length: 1,
    default: 'N',
  })
  miembroStaff: string;

  @Column({
    name: 'PASS_CERT',
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  passCert: string | null;

  @Column({
    name: 'UBICACION',
    type: 'varchar',
    length: 3,
    default: 'C01',
    comment: 'Cubiculo de atencion donde atiende',
    nullable: true,
  })
  ubicacion: string | null;

  @Column({
    name: 'ATENCION_HOSPITALARIA',
    type: 'varchar',
    length: 1,
    default: 'F',
    comment: 'V DISPONIBLE Y F NO DISPONIBLE',
  })
  atencionHospitalaria: string;

  @Column({
    name: 'PASSWORD_HASH',
    type: 'clob',
    comment:
      'hash de contraseña para migracion a postgresql, uso metodo bcrypt, funcion password_hash(pass) php, password_verify($inputPassword, $hashedPassword)',
    nullable: true,
  })
  passwordHash: string | null;

  @Column({
    name: 'NOMINA',
    type: 'varchar',
    length: 1,
    default: 'N',
    comment:
      'Si constan en la nomina de las empresas, n si tiene la hc activa o certificados significa que son servicios prestado',
  })
  nomina: string;

  @Column({
    name: 'NUMERO_SSA',
    type: 'number',
    default: 1,
  })
  numeroSsa: number;

  @Column({
    name: 'FECHA',
    type: 'date',
    comment: 'FECHA DE CUANDO SE CREO EL USUARIO',
    nullable: true,
  })
  fecha: Date | null;

  @Column({
    name: 'CLASE_MEDICO',
    type: 'varchar',
    length: 1,
    default: 'N',
    comment:
      'P PODEMOS COMPARTIR HONORARIOS, N NO PODEMOS MEDICO ES INDEPENDIENTE',
    nullable: true,
  })
  claseMedico: string | null;

  @ManyToOne(() => DepartamentosEntity)
  @JoinColumn([
    { name: 'AREA_FISICA_ASIGNADA', referencedColumnName: 'araCodigo' },
    { name: 'DEPARTAMENTO_FISICO_ASIGNADO', referencedColumnName: 'codigo' },
  ])
  departamentos: DepartamentosEntity;

  @ManyToOne(() => SsaPuestosTrabajoEntity)
  @JoinColumn([{ name: 'NUMERO_SSA', referencedColumnName: 'numero' }])
  ssaPuestosTrabajo: SsaPuestosTrabajoEntity;

  @ManyToOne(() => AreasEntity)
  @JoinColumn([
    { name: 'AREA_FISICA_ASIGNADA', referencedColumnName: 'codigo' },
  ])
  areas: AreasEntity;

  @ManyToOne(() => EspecialidadPersonalEntity)
  @JoinColumn([{ name: 'ESPPRS_CODIGO', referencedColumnName: 'codigo' }])
  especialidadPersonal: EspecialidadPersonalEntity;
}
