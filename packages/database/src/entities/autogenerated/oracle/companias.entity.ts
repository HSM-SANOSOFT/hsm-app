import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  Unique,
} from 'typeorm';
import { ParroquiasEntity } from './index';

@Unique('CIA_NUM_UK', ['ccicias'])
@Unique('CIA_UK', ['nomcor'])

@Index('CIA_PRQ_FK_I', ['prqCodigo', 'prqCntCodigo', 'prqCntPrvCodigo'])

@Entity({ name: 'COMPANIAS', schema: 'SIS' })
export class CompaniasEntity {
  @PrimaryColumn({
    name: 'CODIGO',
    type: 'varchar',
    length: 3,
    comment: 'El código de la empresa de la que es el plan de cuentas',
  })
  codigo: string;

  @Column({
    name: 'PRQ_CNT_CODIGO',
    type: 'varchar',
    length: 2,
    comment: 'Código del cantón',
  })
  prqCntCodigo: string;

  @Column({
    name: 'PRQ_CNT_PRV_CODIGO',
    type: 'varchar',
    length: 2,
    comment: 'Código de la provincia',
  })
  prqCntPrvCodigo: string;

  @Column({
    name: 'PRQ_CODIGO',
    type: 'varchar',
    length: 2,
    comment: 'Código de la parroquia',
  })
  prqCodigo: string;

  @Column({
    name: 'DESCRIPCION',
    type: 'varchar',
    length: 120,
    comment: 'El nombre descriptivo de la empresa',
  })
  descripcion: string;

  @Column({
    name: 'RUC',
    type: 'varchar',
    length: 13,
    comment: 'El ruc de la empresa',
  })
  ruc: string;

  @Column({
    name: 'DIRECCION',
    type: 'varchar',
    length: 120,
    comment: 'La Dirección de la empresa',
  })
  direccion: string;

  @Column({
    name: 'CONTABILIDAD',
    type: 'char',
    length: 1,
    default: 'F',
    comment: 'Si la empresa tiene una cuentas de contabilidad asociadas',
  })
  contabilidad: string;

  @Column({
    name: 'NOMBRE_LEGAL',
    type: 'varchar',
    length: 120,
    comment: 'El nombre legal de la empresa',
    nullable: true,
  })
  nombreLegal: string | null;

  @Column({
    name: 'LOGO',
    type: 'varchar',
    length: 1000,
    comment: 'El logo de la empresa',
    nullable: true,
  })
  logo: string | null;

  @Column({
    name: 'TELEFONO',
    type: 'varchar',
    length: 120,
    comment: 'El teléfono de la empresa',
    nullable: true,
  })
  telefono: string | null;

  @Column({
    name: 'APELLIDO_MATERNO_RL',
    type: 'varchar',
    length: 40,
    nullable: true,
  })
  apellidoMaternoRl: string | null;

  @Column({
    name: 'APELLIDO_PATERNO_RL',
    type: 'varchar',
    length: 40,
    nullable: true,
  })
  apellidoPaternoRl: string | null;

  @Column({
    name: 'PRIMER_NOMBRE_RL',
    type: 'varchar',
    length: 40,
    nullable: true,
  })
  primerNombreRl: string | null;

  @Column({
    name: 'SEGUNDO_NOMBRE_RL',
    type: 'varchar',
    length: 40,
    nullable: true,
  })
  segundoNombreRl: string | null;

  @Column({
    name: 'NO_PATRONAL_IESS',
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  noPatronalIess: string | null;

  @Column({
    name: 'CEDULA_RL',
    type: 'varchar',
    length: 10,
    nullable: true,
  })
  cedulaRl: string | null;

  @Column({
    name: 'FAX',
    type: 'varchar',
    length: 9,
    nullable: true,
  })
  fax: string | null;

  @Column({
    name: 'EMAIL',
    type: 'varchar',
    length: 60,
    nullable: true,
  })
  email: string | null;

  @Column({
    name: 'MENSAJE',
    type: 'varchar',
    length: 240,
    nullable: true,
  })
  mensaje: string | null;

  @Column({
    name: 'TIPOID_RL',
    type: 'varchar',
    length: 1,
    nullable: true,
  })
  tipoidRl: string | null;

  @Column({
    name: 'RUC_CONTADOR',
    type: 'varchar',
    length: 13,
    nullable: true,
  })
  rucContador: string | null;

  @Column({
    name: 'LOGO_IMAGEN',
    type: 'blob',
    nullable: true,
  })
  logoImagen: Buffer | null;

  @Column({
    name: 'CONTRIBUYENTE_ESPECIAL',
    type: 'varchar',
    length: 13,
    nullable: true,
  })
  contribuyenteEspecial: string | null;

  @Column({
    name: 'CODIGO_BARRAS',
    type: 'blob',
    nullable: true,
  })
  codigoBarras: Buffer | null;

  @Column({
    name: 'CCICIAS',
    type: 'varchar',
    length: 2,
    comment: 'CODIGO DE CIA EN EL SISTEMA PANACEA SOFT',
    nullable: true,
  })
  ccicias: string | null;

  @Column({
    name: 'NOMCOR',
    type: 'varchar',
    length: 10,
    comment: 'NOMBRE CORTO DE LAS EMPRESAS',
    nullable: true,
  })
  nomcor: string | null;

  @Column({
    name: 'USUARIO',
    type: 'varchar',
    length: 100,
    comment: 'USUARIO DEL TOKEN PARA FIRMAR ELECTRONICAMENTE',
    nullable: true,
  })
  usuario: string | null;

  @Column({
    name: 'PASSWORD',
    type: 'varchar',
    length: 100,
    comment: 'CONTRASEÑA DEL TOKEN PARA FIRMAR ELECTRONICAMENTE',
    nullable: true,
  })
  password: string | null;

  @Column({
    name: 'NOMBRE_EMPRESA_FIRMA',
    type: 'varchar',
    length: 100,
    comment: 'NOMBRE QUE SE UTILIZA PARA FIRMAE',
    nullable: true,
  })
  nombreEmpresaFirma: string | null;

  @Column({
    name: 'NOMBRE_LOGO',
    type: 'varchar',
    length: 100,
    comment: 'IMAGEN A USAR EN LA F/E',
    nullable: true,
  })
  nombreLogo: string | null;

  @Column({
    name: 'AGENTE_RETENCION',
    type: 'varchar',
    length: 250,
    nullable: true,
  })
  agenteRetencion: string | null;

  @Column({
    name: 'NOMBRE_BANCO',
    type: 'varchar',
    length: 250,
    nullable: true,
  })
  nombreBanco: string | null;

  @Column({
    name: 'NUMERO_CUENTA',
    type: 'varchar',
    length: 250,
    nullable: true,
  })
  numeroCuenta: string | null;

  @Column({
    name: 'CADUCA_BC',
    type: 'date',
    comment: 'FECHA QUE CADUCAN POR FIRMA ELECTRONICA DEL BANCO CENTRAL',
    nullable: true,
  })
  caducaBc: Date | null;

  @Column({
    name: 'CADUCA_SD',
    type: 'date',
    comment: 'FECHA QUE CADUCAN POR FIRMA ELECTRONICA DE SECURITY DATA',
    nullable: true,
  })
  caducaSd: Date | null;

  @Column({
    name: 'FIRMA',
    type: 'blob',
    nullable: true,
  })
  firma: Buffer | null;

  @Column({
    name: 'SELLO',
    type: 'blob',
    nullable: true,
  })
  sello: Buffer | null;

  @Column({
    name: 'FIRMA_SELLO',
    type: 'blob',
    nullable: true,
  })
  firmaSello: Buffer | null;

  @Column({
    name: 'CCI_CR',
    type: 'varchar',
    length: 13,
    comment: 'Auxiliar de cuenta para la compania en panacea',
    nullable: true,
  })
  cciCr: string | null;

  @ManyToOne(() => ParroquiasEntity)
  @JoinColumn([
    { name: 'PRQ_CNT_PRV_CODIGO', referencedColumnName: 'cntPrvCodigo' },
    { name: 'PRQ_CNT_CODIGO', referencedColumnName: 'cntCodigo' },
    { name: 'PRQ_CODIGO', referencedColumnName: 'codigo' },
  ])
  parroquias: ParroquiasEntity;
}
