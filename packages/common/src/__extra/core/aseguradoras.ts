import type { CodeOf } from '../helper/label-by-code';
import { labelOf } from '../helper/label-by-code';

const TIPO_SEGURO = {
  PUBLICA: { code: 'PUB', label: 'Pública' },
  PRIVADA: { code: 'PRI', label: 'Privada' },
} as const;
export type TipoSeguro = CodeOf<typeof TIPO_SEGURO>;
export const TipoSeguroLabel = labelOf(TIPO_SEGURO);

const ASEGURADORA = {
  IESS: { code: 'IESS', label: 'IESS', tipo: TIPO_SEGURO.PUBLICA },
  MSP: { code: 'MSP', label: 'MSP', tipo: TIPO_SEGURO.PUBLICA },
  PARTICULAR: { code: 'PAR', label: 'Particular', tipo: TIPO_SEGURO.PRIVADA },
  SPPAT: { code: 'SPPAT', label: 'SPPAT', tipo: TIPO_SEGURO.PUBLICA },
  ISPOL: { code: 'ISPOL', label: 'ISPOL', tipo: TIPO_SEGURO.PUBLICA },
  SALUD: { code: 'SALUD', label: 'SALUD', tipo: TIPO_SEGURO.PRIVADA },
  BMI: { code: 'BMI', label: 'BMI', tipo: TIPO_SEGURO.PRIVADA },
  NINGUNO: { code: 'NINGUNO', label: 'Ninguno', tipo: TIPO_SEGURO.PUBLICA },
} as const;
export type Aseguradora = CodeOf<typeof ASEGURADORA>;
export const AseguradoraLabel = labelOf(ASEGURADORA);

export interface AseguradoraItem {
  nombreAseguradora?: Aseguradora;
  tipoSeguro?: TipoSeguro;
  numeroPoliza?: string;
}
