import type { Translation } from 'primeng/api';
import { activeLocale } from './locale-init';

// Minimal, extend as components need. Spanish + English parity required.
const ES: Translation = {
  accept: 'Aceptar',
  reject: 'Rechazar',
  clear: 'Limpiar',
  emptyMessage: 'Sin resultados',
  emptyFilterMessage: 'Sin coincidencias',
};

const EN: Translation = {
  accept: 'Accept',
  reject: 'Reject',
  clear: 'Clear',
  emptyMessage: 'No results found',
  emptyFilterMessage: 'No matches found',
};

export function primeNgTranslationForActiveLocale(): Translation {
  return activeLocale() === 'en' ? EN : ES;
}
