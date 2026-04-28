import type { CodeOf } from '../helper/label-by-code';
import { labelOf } from '../helper/label-by-code';

const ESTADO_CIVIL = {
  SOLTERO: { code: 'SLT', label: 'Soltero' },
  CASADO: { code: 'CAS', label: 'Casado' },
  DIVORCIADO: { code: 'DIV', label: 'Divorciado' },
  VIUDO: { code: 'VIU', label: 'Viudo' },
  OTRO: { code: 'OTR', label: 'Otro' },
  NO_ESPECIFICADO: { code: 'NE', label: 'No Especificado' },
} as const;

export type EstadoCivil = CodeOf<typeof ESTADO_CIVIL>;
export const EstadoCivilLabel = labelOf(ESTADO_CIVIL);
