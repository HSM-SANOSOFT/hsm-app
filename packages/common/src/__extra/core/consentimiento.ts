import type { CodeOf } from '../helper/label-by-code';
import { labelOf } from '../helper/label-by-code';

const CONSENTIMIENTO = {
  PRIVACIDAD: { code: 'PRIV', label: 'Privacidad del paciente' },
  TRATAMIENTO: { code: 'TRAT', label: 'Tratamiento' },
  INVESTIGACION: { code: 'INV', label: 'Investigación' },
} as const;
export type Consentimiento = CodeOf<typeof CONSENTIMIENTO>;
export const ConsentimientoLabel = labelOf(CONSENTIMIENTO);

export interface ConsentimientoItem {
  tipo: Consentimiento;
  status: 'active' | 'inactive';
  createdAt?: Date;
  validUntil?: Date;
}
