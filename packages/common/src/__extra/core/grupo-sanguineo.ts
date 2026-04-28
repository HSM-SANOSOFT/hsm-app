import type { CodeOf } from '../helper/label-by-code';
import { labelOf } from '../helper/label-by-code';

const GRUPO_SANGUINEO = {
  A_POSITIVO: { code: 'A+', label: 'A+' },
  A: { code: 'A', label: 'A' },
  B_POSITIVO: { code: 'B+', label: 'B+' },
  B: { code: 'B', label: 'B' },
  AB_POSITIVO: { code: 'AB+', label: 'AB+' },
  AB: { code: 'AB', label: 'AB' },
  O_POSITIVO: { code: 'O+', label: 'O+' },
  O: { code: 'O', label: 'O' },
} as const;
export type GrupoSanguineo = CodeOf<typeof GRUPO_SANGUINEO>;
export const GrupoSanguineoLabel = labelOf(GRUPO_SANGUINEO);
