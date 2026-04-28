import type { CodeOf } from '../helper/label-by-code';
import { labelOf } from '../helper/label-by-code';
import type { Canton, Parroquia, Provincia } from './geografia';

const DOMICILIO = {
  CASA: { code: 'CASA', label: 'Casa' },
  DEPARTAMENTO: { code: 'DEP', label: 'Departamento' },
  QUINTA: { code: 'QUI', label: 'Quinta' },
  OTRO: { code: 'OTRO', label: 'Otro' },
} as const;
export type Domicilio = CodeOf<typeof DOMICILIO>;
export const DomicilioLabel = labelOf(DOMICILIO);

const TENENCIA_VIVIENDA = {
  PROPIA: { code: 'PRO', label: 'Propia' },
  ARRENDADA: { code: 'ARR', label: 'Arrendada' },
  FAMILIAR: { code: 'FAM', label: 'Familiar' },
  ANTICRESIS: { code: 'ANT', label: 'Anticresis' },
  OTRO: { code: 'OTR', label: 'Otro' },
} as const;
export type TenenciaVivienda = CodeOf<typeof TENENCIA_VIVIENDA>;
export const TenenciaViviendaLabel = labelOf(TENENCIA_VIVIENDA);

const DIRECCION_USO = {
  CASA: { code: 'CASA', label: 'Casa' },
  TRABAJO: { code: 'TRB', label: 'Trabajo' },
  TEMPORAL: { code: 'TEMP', label: 'Temporal' },
  ANTIGUA: { code: 'ANT', label: 'Antigua' },
} as const;
export type DireccionUso = CodeOf<typeof DIRECCION_USO>;
export const DireccionUsoLabel = labelOf(DIRECCION_USO);

const DIRECCION_TIPO = {
  POSTAL: { code: 'PST', label: 'Postal' },
  FISICA: { code: 'FSC', label: 'Física' },
  AMBAS: { code: 'AMB', label: 'Ambas' },
} as const;
export type DireccionTipo = CodeOf<typeof DIRECCION_TIPO>;
export const DireccionTipoLabel = labelOf(DIRECCION_TIPO);

export interface ResidenciaItem {
  direccion?: string;
  parroquia?: Parroquia;
  canton?: Canton;
  provincia?: Provincia;
}
