import type { CodeOf } from '../helper/label-by-code';
import { labelOf } from '../helper/label-by-code';

const ESCOLARIDAD = {
  NINGUNO: { code: 'NONE', label: 'Ninguno' },
  PRIMARIA: { code: 'PRIM', label: 'Primaria' },
  SECUNDARIA: { code: 'SEC', label: 'Secundaria' },
  TECNICO: { code: 'TEC', label: 'Técnico/tecnológico' },
  SUPERIOR: { code: 'SUP', label: 'Superior' },
  POSGRADO: { code: 'POS', label: 'Posgrado' },
  DOCTORADO: { code: 'PHD', label: 'Doctorado' },
  OTRO: { code: 'OTR', label: 'Otro' },
} as const;
export type Escolaridad = CodeOf<typeof ESCOLARIDAD>;
export const EscolaridadLabel = labelOf(ESCOLARIDAD);
