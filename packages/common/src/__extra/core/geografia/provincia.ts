interface Provincias {
  [key: string]: { code: string; label: string };
}

export const provincias: Provincias = {
  NACIONALIZADOS: { code: '30', label: 'Nacionalizados' },
  AZUAY: { code: '01', label: 'Azuay' },
  BOLIVAR: { code: '02', label: 'Bolivar' },
  CANAR: { code: '03', label: 'Cañar' },
  CARCHI: { code: '04', label: 'Carchi' },
  COTOPAXI: { code: '05', label: 'Cotopaxi' },
  CHIMBORAZO: { code: '06', label: 'Chimborazo' },
  EL_ORO: { code: '07', label: 'El Oro' },
  ESMERALDAS: { code: '08', label: 'Esmeraldas' },
  GUAYAS: { code: '09', label: 'Guayas' },
  IMBABURA: { code: '10', label: 'Imbabura' },
  LOJA: { code: '11', label: 'Loja' },
  LOS_RIOS: { code: '12', label: 'Los Rios' },
  MANABI: { code: '13', label: 'Manabi' },
  MORONA_SANTIAGO: { code: '14', label: 'Morona Santiago' },
  NAPO: { code: '15', label: 'Napo' },
  PASTAZA: { code: '16', label: 'Pastaza' },
  PICHINCHA: { code: '17', label: 'Pichincha' },
  TUNGURAHUA: { code: '18', label: 'Tungurahua' },
  ZAMORA_CHINCHIPE: { code: '19', label: 'Zamora Chinchipe' },
  GALAPAGOS: { code: '20', label: 'Galapagos' },
  SUCUMBIOS: { code: '21', label: 'Sucumbios' },
  ORELLANA: { code: '22', label: 'Orellana' },
  SANTO_DOMINGO_DE_LOS_TSACHILAS: {
    code: '23',
    label: 'Santo Domingo De Los Tsachilas',
  },
  SANTA_ELENA: { code: '24', label: 'Santa Elena' },
  ZONAS_NO_DELIMITADAS: { code: '90', label: 'Zonas No Delimitadas' },
} as const;

export function provincia(code: string) {
  const entry = Object.entries(provincias).find(([, v]) => v.code === code);
  if (!entry) return undefined;
  const [key, { label }] = entry as [string, { code: string; label: string }];
  return { key, label };
}

export type Provincia = string | Provincias[string];
