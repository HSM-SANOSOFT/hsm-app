import type { CodeOf } from '../helper/label-by-code';
import { labelOf } from '../helper/label-by-code';
import type { Parentesco } from './parentesco';

export interface ContactoItem {
  tipo: TipoContacto;
  valor: string;
  uso?: UsoContacto;
  preferencia?: PreferenciaContacto;
}

export type ContactoReferencia = {
  nombre: string;
  parentesco?: Parentesco;
} & ContactoItem;

const TIPO_CONTACTO = {
  TELEFONO: { code: 'TEL', label: 'Teléfono' },
  CELULAR: { code: 'CEL', label: 'Celular' },
  EMAIL: { code: 'EMAIL', label: 'Email' },
  OTRO: { code: 'OTR', label: 'Otro' },
} as const;
export type TipoContacto = CodeOf<typeof TIPO_CONTACTO>;
export const TipoContactoLabel = labelOf(TIPO_CONTACTO);

const USO_CONTACTO = {
  TEMPORAL: { code: 'TEMP', label: 'Temporal' },
  TRABAJO: { code: 'TRB', label: 'Trabajo' },
  MOVIL: { code: 'MOV', label: 'Móvil' },
  OTRO: { code: 'OTR', label: 'Otro' },
  CASA: { code: 'CS', label: 'Casa' },
} as const;
export type UsoContacto = CodeOf<typeof USO_CONTACTO>;
export const UsoContactoLabel = labelOf(USO_CONTACTO);

const PREFERENCIA_CONTACTO = {
  PRINCIPAL: { code: 'PRI', label: 'Principal' },
  SECUNDARIO: { code: 'SEC', label: 'Secundario' },
  EMERGENCIA: { code: 'EME', label: 'Emergencia' },
} as const;
export type PreferenciaContacto = CodeOf<typeof PREFERENCIA_CONTACTO>;
export const PreferenciaContactoLabel = labelOf(PREFERENCIA_CONTACTO);
