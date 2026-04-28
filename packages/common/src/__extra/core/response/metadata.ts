import type { CodeOf } from '../../helper/label-by-code';
import { labelOf } from '../../helper/label-by-code';

export interface Metadata {
  createdAt?: Date;
  updatedAt?: Date;
  status?: MetadataStatus;
  source?: string;
  tags?: string[];
  version?: string;
}

const METADATA_STATUS = {
  BORRADOR: { code: 'BOR', label: 'Borrador' },
  ACTIVO: { code: 'ACT', label: 'Activo' },
  INACTIVO: { code: 'INA', label: 'Inactivo' },
  RECHAZADO: { code: 'REC', label: 'Rechazado' },
  ARCHIVADO: { code: 'ARC', label: 'Archivado' },
} as const;

export type MetadataStatus = CodeOf<typeof METADATA_STATUS>;
export const MetadataStatusLabel = labelOf(METADATA_STATUS);
