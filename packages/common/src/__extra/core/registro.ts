import type { CodeOf } from '../helper/label-by-code';
import { labelOf } from '../helper/label-by-code';

const ESTADO_REGISTRO = {
  ACTIVO: { code: 'ACT', label: 'Activo' },
  INACTIVO: { code: 'INA', label: 'Inactivo' },
  BLOQUEADO: { code: 'BLQ', label: 'Bloqueado' },
  BORRADOR: { code: 'BOR', label: 'Borrador' },
} as const;
export type EstadoRegistro = CodeOf<typeof ESTADO_REGISTRO>;
export const EstadoRegistroLabel = labelOf(ESTADO_REGISTRO);
