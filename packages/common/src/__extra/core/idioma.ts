import type { CodeOf } from '../helper/label-by-code';
import { labelOf } from '../helper/label-by-code';

const IDIOMA = {
  SPANISH: { code: 'es', label: 'Español' },
  ENGLISH: { code: 'en', label: 'Inglés' },
  PORTUGUESE: { code: 'pt', label: 'Portugués' },
  FRENCH: { code: 'fr', label: 'Francés' },
  GERMAN: { code: 'de', label: 'Alemán' },
  ITALIAN: { code: 'it', label: 'Italiano' },
  CHINESE: { code: 'zh', label: 'Chino' },
  JAPANESE: { code: 'ja', label: 'Japonés' },
  ARABIC: { code: 'ar', label: 'Árabe' },
  RUSSIAN: { code: 'ru', label: 'Ruso' },
  KOREAN: { code: 'ko', label: 'Coreano' },
  HINDI: { code: 'hi', label: 'Hindi' },
  BENGALI: { code: 'bn', label: 'Bengalí' },
  DUTCH: { code: 'nl', label: 'Neerlandés' },
  SWEDISH: { code: 'sv', label: 'Sueco' },
  NORWEGIAN: { code: 'no', label: 'Noruego' },
  DANISH: { code: 'da', label: 'Danés' },
  FINNISH: { code: 'fi', label: 'Finlandés' },
  POLISH: { code: 'pl', label: 'Polaco' },
  CZECH: { code: 'cs', label: 'Checo' },
  HUNGARIAN: { code: 'hu', label: 'Húngaro' },
  ROMANIAN: { code: 'ro', label: 'Rumano' },
  BULGARIAN: { code: 'bg', label: 'Búlgaro' },
  GREEK: { code: 'el', label: 'Griego' },
  HEBREW: { code: 'he', label: 'Hebreo' },
  TURKISH: { code: 'tr', label: 'Turco' },
  PERSIAN: { code: 'fa', label: 'Persa' },
  URDU: { code: 'ur', label: 'Urdu' },
  THAI: { code: 'th', label: 'Tailandés' },
  VIETNAMESE: { code: 'vi', label: 'Vietnamita' },
  INDONESIAN: { code: 'id', label: 'Indonesio' },
  MALAY: { code: 'ms', label: 'Malayo' },
  TAGALOG: { code: 'tl', label: 'Tagalo' },
  SWAHILI: { code: 'sw', label: 'Suajili' },
  CATALAN: { code: 'ca', label: 'Catalán' },
  BASQUE: { code: 'eu', label: 'Vasco' },
  GALICIAN: { code: 'gl', label: 'Gallego' },
} as const;
export type Idioma = CodeOf<typeof IDIOMA>;
export const IdiomaLabel = labelOf(IDIOMA);

const IDIOMA_PREFERENCIA = {
  PREFERIDO: { code: 'PREF', label: 'Preferido' },
  PRIMARIO: { code: 'PRI', label: 'Primario' },
  SECUNDARIO: { code: 'SEC', label: 'Secundario' },
} as const;
export type IdiomaPreferencia = CodeOf<typeof IDIOMA_PREFERENCIA>;
export const IdiomaPreferenciaLabel = labelOf(IDIOMA_PREFERENCIA);

const IDIOMA_NIVEL = {
  BASICO: { code: 'BAS', label: 'Básico' },
  INTERMEDIO: { code: 'INT', label: 'Intermedio' },
  PROFESIONAL: { code: 'PRO', label: 'Profesional' },
  AVANZADO: { code: 'AVA', label: 'Avanzado' },
} as const;
export type IdiomaNivel = CodeOf<typeof IDIOMA_NIVEL>;
export const IdiomaNivelLabel = labelOf(IDIOMA_NIVEL);
