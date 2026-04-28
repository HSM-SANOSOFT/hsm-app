import { canton } from './canton';
import { provincia } from './provincia';

interface Parroquias {
  [key: string]: {
    [key: string]: { [key: string]: { code: string; label: string } };
  };
}

export const parroquias: Parroquias = {
  NACIONALIZADOS: {},
  AZUAY: {
    CUENCA: {
      MOLLETURO: { code: '57', label: 'Molleturo' },
      LLACAO: { code: '56', label: 'Llacao' },
      CHIQUINTAD: { code: '55', label: 'Chiquintad' },
      PACCHA: { code: '60', label: 'Paccha' },
      OCTAVIO_CORDERO_PALACIOS_SANTA_ROSA: {
        code: '59',
        label: 'Octavio Cordero Palacios (Santa Rosa)',
      },
      NULTI: { code: '58', label: 'Nulti' },
      BANOS: { code: '51', label: 'Baños' },
      CUENCA_CABECERA_CANTONAL_Y_CAPITAL_PROV: {
        code: '50',
        label: 'Cuenca, Cabecera Cantonal Y Capital Prov',
      },
      BELLAVISTA: { code: '01', label: 'Bellavista' },
      CHECA_JIDCAY: { code: '54', label: 'Checa (Jidcay)' },
      CHAUCHA: { code: '53', label: 'Chaucha' },
      CUMBE: { code: '52', label: 'Cumbe' },
      QUINGEO: { code: '61', label: 'Quingeo' },
      VALLE: { code: '70', label: 'Valle' },
      TURI: { code: '69', label: 'Turi' },
      TARQUI: { code: '68', label: 'Tarqui' },
      VICTORIA_DEL_PORTETE_IRQUIS: {
        code: '71',
        label: 'Victoria Del Portete (Irquis)',
      },
      SANTA_ANA: { code: '64', label: 'Santa Ana' },
      SAN_JOAQUIN: { code: '63', label: 'San Joaquin' },
      RICAURTE: { code: '62', label: 'Ricaurte' },
      SININCAY: { code: '67', label: 'Sinincay' },
      SIDCAY: { code: '66', label: 'Sidcay' },
      SAYAUSI: { code: '65', label: 'Sayausi' },
      SUCRE: { code: '12', label: 'Sucre' },
      SAN_SEBASTIAN: { code: '11', label: 'San Sebastian' },
      SAN_BLAS: { code: '10', label: 'San Blas' },
      YANUNCAY: { code: '14', label: 'Yanuncay' },
      TOTORACOCHA: { code: '13', label: 'Totoracocha' },
      HERMANO_MIGUEL: { code: '15', label: 'Hermano Miguel' },
      MONAY: { code: '09', label: 'Monay' },
      EL_VECINO: { code: '05', label: 'El Vecino' },
      EL_SAGRARIO: { code: '04', label: 'El Sagrario' },
      EL_BATAN: { code: '03', label: 'El Batan' },
      MACHANGARA: { code: '08', label: 'Machangara' },
      HUAYNACAPAC: { code: '07', label: 'Huaynacapac' },
      GIL_RAMIREZ_DAVALOS: { code: '06', label: 'Gil Ramirez Davalos' },
      CANARIBAMBA: { code: '02', label: 'Cañaribamba' },
    },
    GIRON: {
      SAN_GERARDO: { code: '52', label: 'San Gerardo' },
      ASUNCION: { code: '51', label: 'Asuncion' },
      GIRON_CABECERA_CANTONAL: {
        code: '50',
        label: 'Giron, Cabecera Cantonal',
      },
    },
    GUALACEO: {
      ZHIDMAD: { code: '58', label: 'Zhidmad' },
      SAN_JUAN: { code: '57', label: 'San Juan' },
      REMIGIO_CRESPO_TORAL_GULAG: {
        code: '56',
        label: 'Remigio Crespo Toral (Gulag)',
      },
      DANIEL_CORDOVA_TORAL_EL_ORIENTE: {
        code: '52',
        label: 'Daniel Cordova Toral (El Oriente)',
      },
      CHORDELEG: { code: '51', label: 'Chordeleg' },
      GUALACEO_CABECERA_CANTONAL: {
        code: '50',
        label: 'Gualaceo, Cabecera Cantonal',
      },
      PRINCIPAL: { code: '55', label: 'Principal' },
      MARIANO_MORENO: { code: '54', label: 'Mariano Moreno' },
      JADAN: { code: '53', label: 'Jadan' },
      LUIS_CORDERO_VEGA: { code: '59', label: 'Luis Cordero Vega' },
      SIMON_BOLIVAR_CAB_EN_GANANZOL: {
        code: '60',
        label: 'Simon Bolivar (Cab. En Gañanzol)',
      },
    },
    NABON: {
      EL_PROGRESO_CAB_EN_ZHOTA: {
        code: '52',
        label: 'El Progreso (Cab. En Zhota)',
      },
      COCHAPATA: { code: '51', label: 'Cochapata' },
      NABON_CABECERA_CANTONAL: {
        code: '50',
        label: 'Nabon, Cabecera Cantonal',
      },
      LAS_NIEVES_CHAYA: { code: '53', label: 'Las Nieves (Chaya)' },
      ONA: { code: '54', label: 'Ona' },
      LA_PAZ: { code: '55', label: 'La Paz' },
    },
    PAUTE: {
      PALMAS: { code: '57', label: 'Palmas' },
      GUARAINAG: { code: '56', label: 'Guarainag' },
      GUACHAPALA: { code: '55', label: 'Guachapala' },
      SEVILLA_DE_ORO: { code: '60', label: 'Sevilla De Oro' },
      SAN_CRISTOBAL_CARLOS_ORDONEZ_LAZO: {
        code: '59',
        label: 'San Cristobal (Carlos Ordoñez Lazo)',
      },
      PAN: { code: '58', label: 'Pan' },
      AMALUZA: { code: '51', label: 'Amaluza' },
      PAUTE_CABECERA_CANTONAL: {
        code: '50',
        label: 'Paute, Cabecera Cantonal',
      },
      EL_CABO: { code: '54', label: 'El Cabo' },
      CHICAN_GUILLERMO_ORTEGA: {
        code: '53',
        label: 'Chican (Guillermo Ortega)',
      },
      BULAN_JOSE_VICTOR_IZQUIERDO: {
        code: '52',
        label: 'Bulan (Jose Victor Izquierdo)',
      },
      TOMEBAMBA: { code: '61', label: 'Tomebamba' },
      DUG_DUG: { code: '62', label: 'Dug-Dug' },
    },
    PUCARA: {
      SAN_RAFAEL_DE_SHARUG: { code: '52', label: 'San Rafael De Sharug' },
      CAMILO_PONCE_ENRIQUEZ_CABRIO_7_DE_MOLL: {
        code: '51',
        label: 'Camilo Ponce Enriquez (Cab.Rio 7 De Moll',
      },
      PUCARA_CABECERA_CANTONAL: {
        code: '50',
        label: 'Pucara, Cabecera Cantonal',
      },
    },
    SAN_FERNANDO: {
      CHUMBLIN: { code: '51', label: 'Chumblin' },
      SAN_FERNANDO_CABECERA_CANTONAL: {
        code: '50',
        label: 'San Fernando, Cabecera Cantonal',
      },
    },
    SANTA_ISABEL: {
      ZHAGLLI_SHAGLLI: { code: '53', label: 'Zhaglli (Shaglli)' },
      EL_CARMEN_DE_PIJILI: { code: '52', label: 'El Carmen De Pijili' },
      ABDON_CALDERON_LA_UNION: {
        code: '51',
        label: 'Abdon Calderon (La Union)',
      },
      SANTA_ISABEL_CABECERA_CANTONAL: {
        code: '50',
        label: 'Santa Isabel, Cabecera Cantonal',
      },
    },
    SIGSIG: {
      GIMA: { code: '52', label: 'Gima' },
      CUCHIL_CUTCHIL: { code: '51', label: 'Cuchil (Cutchil)' },
      SIGSIG_CABECERA_CANTONAL: {
        code: '50',
        label: 'Sigsig, Cabecera Cantonal',
      },
      GÜEL: { code: '53', label: 'Güel' },
      SAN_JOSE_DE_RARANGA: { code: '56', label: 'San Jose De Raranga' },
      SAN_BARTOLOME: { code: '55', label: 'San Bartolome' },
      LUDO: { code: '54', label: 'Ludo' },
    },
    ONA: {
      SAN_FELIPE_DE_ONA_CABECERA_CANTONAL: {
        code: '50',
        label: 'San Felipe De Oña, Cabecera Cantonal',
      },
      SUSUDEL: { code: '51', label: 'Susudel' },
    },
    CHORDELEG: {
      CHORDELEG_CABECERA_CANTONAL: {
        code: '50',
        label: 'Chordeleg, Cabecera Cantonal',
      },
      LUIS_GALARZA_ORELLANA_CABEN_DELEGSOL: {
        code: '53',
        label: 'Luis Galarza Orellana (Cab.En Delegsol)',
      },
      LA_UNION: { code: '52', label: 'La Union' },
      PRINCIPAL: { code: '51', label: 'Principal' },
      SAN_MARTIN_DE_PUZHIO: { code: '54', label: 'San Martin De Puzhio' },
    },
    EL_PAN: {
      PALMAS: { code: '52', label: 'Palmas' },
      AMALUZA: { code: '51', label: 'Amaluza' },
      EL_PAN_CABECERA_CANTONAL: {
        code: '50',
        label: 'El Pan, Cabecera Cantonal',
      },
      SAN_VICENTE: { code: '53', label: 'San Vicente' },
    },
    SEVILLA_DE_ORO: {
      PALMAS: { code: '52', label: 'Palmas' },
      AMALUZA: { code: '51', label: 'Amaluza' },
      SEVILLA_DE_ORO_CABECERA_CANTONAL: {
        code: '50',
        label: 'Sevilla De Oro, Cabecera Cantonal',
      },
    },
    GUACHAPALA: {
      GUACHAPALA_CABECERA_CANTONAL: {
        code: '50',
        label: 'Guachapala, Cabecera Cantonal',
      },
    },
    CAMILO_PONCE_ENRIQUEZ: {
      EL_CARMEN_DE_PIJILI: { code: '51', label: 'El Carmen De Pijili' },
      CAMILO_PONCE_ENRIQUEZ: { code: '50', label: 'Camilo Ponce Enriquez' },
    },
  },
  BOLIVAR: {
    GUARANDA: {
      SAN_LUIS_DE_PAMBIL: { code: '60', label: 'San Luis De Pambil' },
      SAMIATUG: { code: '59', label: 'Samiatug' },
      SAN_SIMON_YACOTO: { code: '57', label: 'San Simon (Yacoto)' },
      SANTAFE_SANTA_FE: { code: '58', label: 'Santafe (Santa Fe)' },
      GUANUJO: { code: '03', label: 'Guanujo' },
      FACUNDO_VELA: { code: '51', label: 'Facundo Vela' },
      GUARANDA_CABECERA_CANTONAL_Y_CAPITAL: {
        code: '50',
        label: 'Guaranda, Cabecera Cantonal Y Capital',
      },
      ANGEL_POLIBIO_CHAVES: { code: '01', label: 'Angel Polibio Chaves' },
      GABRIEL_IGNACIO_VEINTIMILLA: {
        code: '02',
        label: 'Gabriel Ignacio Veintimilla',
      },
      SAN_LORENZO: { code: '56', label: 'San Lorenzo' },
      SALINAS: { code: '55', label: 'Salinas' },
      JULIO_E_MORENO_CATANAHUAN_GRANDE: {
        code: '53',
        label: 'Julio E. Moreno (Catanahuan Grande)',
      },
      LAS_NAVES: { code: '54', label: 'Las Naves' },
    },
    CHILLANES: {
      SAN_JOSE_DEL_TAMBO_TAMBOPAMBA: {
        code: '51',
        label: 'San Jose Del Tambo (Tambopamba)',
      },
      CHILLANES_CABECERA_CANTONAL: {
        code: '50',
        label: 'Chillanes Cabecera Cantonal',
      },
    },
    CHIMBO: {
      MAGDALENA_CHAPACOTO: { code: '53', label: 'Magdalena (Chapacoto)' },
      SAN_SEBASTIAN: { code: '54', label: 'San Sebastian' },
      CALUMA: { code: '52', label: 'Caluma' },
      SAN_JOSE_DE_CHIMBO_CABECERA_CANTONAL: {
        code: '50',
        label: 'San Jose De Chimbo, Cabecera Cantonal',
      },
      ASUNCION_ASANCOTO: { code: '51', label: 'Asuncion (Asancoto)' },
      TELIMBELA: { code: '55', label: 'Telimbela' },
    },
    ECHEANDIA: {
      ECHEANDIA_CABECERA_CANTONAL: {
        code: '50',
        label: 'Echeandia, Cabecera Cantonal',
      },
    },
    SAN_MIGUEL: {
      SAN_VICENTE: { code: '56', label: 'San Vicente' },
      SANTIAGO: { code: '55', label: 'Santiago' },
      SAN_MIGUEL_CABECERA_CANTONAL: {
        code: '50',
        label: 'San Miguel, Cabecera Cantonal',
      },
      BALSAPAMBA: { code: '51', label: 'Balsapamba' },
      SAN_PABLO_SAN_PABLO_DE_ATENAS: {
        code: '54',
        label: 'San Pablo (San Pablo De Atenas)',
      },
      REGULO_DE_MORA: { code: '53', label: 'Regulo De Mora' },
      BILOVAN: { code: '52', label: 'Bilovan' },
    },
    CALUMA: {
      CALUMA_CABECEA_CANTONAL: {
        code: '50',
        label: 'Caluma, Cabecea Cantonal',
      },
    },
    LAS_NAVES: {
      LAS_NAVES_CABECERA_CANTONAL: {
        code: '50',
        label: 'Las Naves, Cabecera Cantonal',
      },
      LAS_NAVES: { code: '02', label: 'Las Naves' },
      LAS_MERCEDES: { code: '01', label: 'Las Mercedes' },
    },
  },
  CANAR: {
    AZOGUES: {
      SOLANO: { code: '59', label: 'Solano' },
      TADAY: { code: '60', label: 'Taday' },
      SAN_MIGUEL: { code: '58', label: 'San Miguel' },
      PINDILIG: { code: '56', label: 'Pindilig' },
      RIVERA: { code: '57', label: 'Rivera' },
      SAN_FRANCISCO: { code: '04', label: 'San Francisco' },
      AZOGUES_CABECERA_CANTONAL_Y_CAPITAL_PRO: {
        code: '50',
        label: 'Azogues, Cabecera Cantonal Y Capital Pro',
      },
      BORRERO: { code: '03', label: 'Borrero' },
      AURELIO_BAYAS_MARTINEZ: { code: '01', label: 'Aurelio Bayas Martinez' },
      AZOGUES: { code: '02', label: 'Azogues' },
      JAVIER_LOYOLA_CHUQUIPATA: {
        code: '54',
        label: 'Javier Loyola (Chuquipata)',
      },
      LUIS_CORDERO: { code: '55', label: 'Luis Cordero' },
      GUAPAN: { code: '53', label: 'Guapan' },
      COJITAMBO: { code: '51', label: 'Cojitambo' },
      DELEG: { code: '52', label: 'Deleg' },
    },
    BIBLIAN: {
      TURUPAMBA: { code: '53', label: 'Turupamba' },
      JERUSALEN: { code: '54', label: 'Jerusalen' },
      SAN_FRANCISCO_DE_SAGEO: { code: '52', label: 'San Francisco De Sageo' },
      BIBLIAN_CABECERA_CANTONAL: {
        code: '50',
        label: 'Biblian, Cabecera Cantonal',
      },
      NAZON_CAB_EN_PAMPA_DE_DOMINGUEZ: {
        code: '51',
        label: 'Nazon (Cab. En Pampa De Dominguez)',
      },
    },
    CANAR: {
      CANAR_CABECERA_CANTONAL: {
        code: '50',
        label: 'Cañar, Cabecera Cantonal',
      },
      ZHUD: { code: '61', label: 'Zhud' },
      DUCUR: { code: '63', label: 'Ducur' },
      VENTURA: { code: '62', label: 'Ventura' },
      GUALLETURO: { code: '54', label: 'Gualleturo' },
      HONORATO_VASQUEZ_TAMBO_VIEJO: {
        code: '55',
        label: 'Honorato Vasquez (Tambo Viejo)',
      },
      GENERAL_MORALES_SOCARTE: {
        code: '53',
        label: 'General Morales (Socarte)',
      },
      CHONTAMARCA: { code: '51', label: 'Chontamarca' },
      CHOROCOPTE: { code: '52', label: 'Chorocopte' },
      SUSCAL: { code: '59', label: 'Suscal' },
      TAMBO: { code: '60', label: 'Tambo' },
      SAN_ANTONIO: { code: '58', label: 'San Antonio' },
      INGAPIRCA: { code: '56', label: 'Ingapirca' },
      JUNCAL: { code: '57', label: 'Juncal' },
    },
    LA_TRONCAL: {
      PANCHO_NEGRO: { code: '52', label: 'Pancho Negro' },
      MANUEL_J_CALLE: { code: '51', label: 'Manuel J. Calle' },
      LA_TRONCAL_CABECERA_CANTONAL: {
        code: '50',
        label: 'La Troncal, Cabecera Cantonal',
      },
    },
    EL_TAMBO: {
      EL_TAMBO_CABECERA_CANTONAL: {
        code: '50',
        label: 'El Tambo, Cabecera Cantonal',
      },
    },
    DELEG: {
      SOLANO: { code: '51', label: 'Solano' },
      DELEG_CABECERA_CANTONAL: {
        code: '50',
        label: 'Deleg, Cabecera Cantonal',
      },
    },
    SUSCAL: {
      SUSCAL_CABECERA_CANTONAL: {
        code: '50',
        label: 'Suscal, Cabecera Cantonal',
      },
    },
  },
  CARCHI: {
    TULCAN: {
      MALDONADO: { code: '54', label: 'Maldonado' },
      JULIO_ANDRADE_OREJUELA: { code: '53', label: 'Julio Andrade (Orejuela)' },
      TOBAR_DONOSO_LA_BOCANA_DE_CAMUNBI: {
        code: '56',
        label: 'Tobar Donoso (La Bocana De Camunbi)',
      },
      PIOTER: { code: '55', label: 'Pioter' },
      HUACA: { code: '52', label: 'Huaca' },
      GONZALEZ_SUAREZ: { code: '01', label: 'Gonzalez Suarez' },
      TULCAN: { code: '02', label: 'Tulcan' },
      EL_CARMELO_EL_PUN_: { code: '51', label: 'El Carmelo (El Pun )' },
      TULCAN_CABECERA_CANTONAL_Y_CAPITAL: {
        code: '50',
        label: 'Tulcan, Cabecera Cantonal Y Capital',
      },
      SANTA_MARTA_DE_CUBA: { code: '61', label: 'Santa Marta De Cuba' },
      URBINA_TAYA: { code: '58', label: 'Urbina (Taya)' },
      TUFINO: { code: '57', label: 'Tufiño' },
      MARISCAL_SUCRE: { code: '60', label: 'Mariscal Sucre' },
      EL_CHICAL: { code: '59', label: 'El Chical' },
    },
    BOLIVAR: {
      SAN_RAFAEL: { code: '55', label: 'San Rafael' },
      SAN_VICENTE_DE_PUSIR: { code: '54', label: 'San Vicente De Pusir' },
      GARCIA_MORENO: { code: '51', label: 'Garcia Moreno' },
      BOLIVAR_CABECERA_CANTONAL: {
        code: '50',
        label: 'Bolivar, Cabecera Cantonal',
      },
      MONTE_OLIVO: { code: '53', label: 'Monte Olivo' },
      LOS_ANDES: { code: '52', label: 'Los Andes' },
    },
    ESPEJO: {
      SAN_ISIDRO: { code: '53', label: 'San Isidro' },
      LA_LIBERTAD_ALIZO: { code: '52', label: 'La Libertad (Alizo)' },
      EL_GOALTAL: { code: '51', label: 'El Goaltal' },
      EL_ANGEL_CABECERA_CANTONAL: {
        code: '50',
        label: 'El Angel, Cabecera Cantonal',
      },
      '27_DE_SEPTIEMBRE': { code: '02', label: '27 De Septiembre' },
      EL_ANGEL: { code: '01', label: 'El Angel' },
    },
    MIRA: {
      MIRA_CHONTAHUASI_CABECERA_CANTONAL: {
        code: '50',
        label: 'Mira (Chontahuasi), Cabecera Cantonal',
      },
      JIJON_Y_CAAMANO_CAB_EN_RIO_BLANCO: {
        code: '52',
        label: 'Jijon Y Caamaño (Cab. En Rio Blanco)',
      },
      CONCEPCION: { code: '51', label: 'Concepcion' },
      JUAN_MONTALVO_SAN_IGNACIO_DE_QUIL: {
        code: '53',
        label: 'Juan Montalvo (San Ignacio De Quil)',
      },
    },
    MONTUFAR: {
      LA_PAZ: { code: '54', label: 'La Paz' },
      FERNANDEZ_SALVADOR: { code: '53', label: 'Fernandez Salvador' },
      PIARTAL: { code: '55', label: 'Piartal' },
      SAN_JOSE: { code: '02', label: 'San Jose' },
      SAN_GABRIEL_CABECERA_CANTONAL: {
        code: '50',
        label: 'San Gabriel, Cabecera Cantonal',
      },
      GONZALEZ_SUAREZ: { code: '01', label: 'Gonzalez Suarez' },
      CHITAN_DE_NAVARRETE: { code: '52', label: 'Chitan De Navarrete' },
      CRISTOBAL_COLON: { code: '51', label: 'Cristobal Colon' },
    },
    SAN_PEDRO_DE_HUACA: {
      MARISCAL_SUCRE: { code: '51', label: 'Mariscal Sucre' },
      HUACA_CABECERA_CANTONAL: {
        code: '50',
        label: 'Huaca, Cabecera Cantonal',
      },
    },
  },
  COTOPAXI: {
    LATACUNGA: {
      LATACUNGA_CABECERA_CANTONAL_Y_CAPITAL: {
        code: '50',
        label: 'Latacunga, Cabecera Cantonal Y Capital',
      },
      ELOY_ALFARO_SAN_FELIPE: { code: '01', label: 'Eloy Alfaro (San Felipe)' },
      PALO_QUEMADO: { code: '63', label: 'Palo Quemado' },
      TOACASO: { code: '62', label: 'Toacaso' },
      LAS_PAMPAS: { code: '55', label: 'Las Pampas' },
      MULALO: { code: '56', label: 'Mulalo' },
      JOSEGUANGO_BAJO: { code: '54', label: 'Joseguango Bajo' },
      BELISARIO_QUEVEDO_GUANAILIN: {
        code: '52',
        label: 'Belisario Quevedo (Guanailin)',
      },
      GUAITACAMA_GUAYTACAMA: { code: '53', label: 'Guaitacama (Guaytacama)' },
      SIGCHOS: { code: '60', label: 'Sigchos' },
      TANICUCHI: { code: '61', label: 'Tanicuchi' },
      SAN_JUAN_DE_PASTOCALLE: { code: '59', label: 'San Juan De Pastocalle' },
      '11_DE_NOVIEMBRE_ILINCHISI': {
        code: '57',
        label: '11 De Noviembre (Ilinchisi)',
      },
      POALO: { code: '58', label: 'Poalo' },
      SAN_BUENAVENTURA: { code: '05', label: 'San Buenaventura' },
      LA_MATRIS: { code: '04', label: 'La Matris' },
      JUAN_MONTALVO_SAN_SEBASTIAN: {
        code: '03',
        label: 'Juan Montalvo (San Sebastian)',
      },
      ALAQUE_ALAQUEZ: { code: '51', label: 'Alaque (Alaquez)' },
      IGNACIO_FLORES_PARQUE_FLORES: {
        code: '02',
        label: 'Ignacio Flores (Parque Flores)',
      },
    },
    LA_MANA: {
      EL_CARMEN: { code: '01', label: 'El Carmen' },
      LA_MANA: { code: '02', label: 'La Mana' },
      PUCAYACU: { code: '52', label: 'Pucayacu' },
      GUASAGANDA_CAB_EN_GUASAGANDA_CENTRO_: {
        code: '51',
        label: 'Guasaganda (Cab. En Guasaganda Centro )',
      },
      LA_MANA_CABECERA_CANTONAL: {
        code: '50',
        label: 'La Mana, Cabecera Cantonal',
      },
      EL_TRIUNFO: { code: '03', label: 'El Triunfo' },
    },
    PANGUA: {
      EL_CORAZON_CABECERA_CANTONAL: {
        code: '50',
        label: 'El Corazon, Cabecera Cantonal',
      },
      RAMON_CAMPANA: { code: '53', label: 'Ramon Campaña' },
      MORASPUNGO: { code: '51', label: 'Moraspungo' },
      PINLLOPATA: { code: '52', label: 'Pinllopata' },
    },
    PUJILI: {
      PUJILI_CABECERA_CANTONAL: {
        code: '50',
        label: 'Pujili, Cabecera Cantonal',
      },
      ANGAMARCA: { code: '51', label: 'Angamarca' },
      ZUMBAHUA: { code: '58', label: 'Zumbahua' },
      ISINLIBI_ISINLIVI: { code: '54', label: 'Isinlibi (Isinlivi)' },
      GUANGAJE: { code: '53', label: 'Guangaje' },
      CUCCHILAN_CHUGCHILAN: { code: '52', label: 'Cucchilan (Chugchilan)' },
      LA_VICTORIA: { code: '55', label: 'La Victoria' },
      TINGO: { code: '57', label: 'Tingo' },
      PILALO: { code: '56', label: 'Pilalo' },
    },
    SALCEDO: {
      MULALILLO: { code: '53', label: 'Mulalillo' },
      CUSUBAMBA: { code: '52', label: 'Cusubamba' },
      SAN_MIGUEL_CABECERA_CANTONAL: {
        code: '50',
        label: 'San Miguel, Cabecera Cantonal',
      },
      ANTONIO_JOSE_HOLGUIN_SANTA_LUCIA: {
        code: '51',
        label: 'Antonio Jose Holguin (Santa Lucia)',
      },
      PANSALEO: { code: '55', label: 'Pansaleo' },
      MULLIQUINDIL_SANTA_ANA: { code: '54', label: 'Mulliquindil (Santa Ana)' },
    },
    SAQUISILI: {
      SAQUISILI_CABECERA_CANTONAL: {
        code: '50',
        label: 'Saquisili, Cabecera Cantonal',
      },
      CANCHAGUA: { code: '51', label: 'Canchagua' },
      CHANTILIN: { code: '52', label: 'Chantilin' },
      COCHAPAMBA: { code: '53', label: 'Cochapamba' },
    },
    SIGCHOS: {
      CHUGCHILAN: { code: '51', label: 'Chugchilan' },
      ISINLIVI: { code: '52', label: 'Isinlivi' },
      LAS_PAMPAS: { code: '53', label: 'Las Pampas' },
      SIGCHOS_CABECERA_CANTONAL: {
        code: '50',
        label: 'Sigchos, Cabecera Cantonal',
      },
      PALO_QUEMADO: { code: '54', label: 'Palo Quemado' },
    },
  },
  CHIMBORAZO: {
    RIOBAMBA: {
      PUNGALA: { code: '57', label: 'Pungala' },
      SAN_JUAN: { code: '60', label: 'San Juan' },
      QUIMIAG: { code: '59', label: 'Quimiag' },
      PUNIN: { code: '58', label: 'Punin' },
      SAN_LUIS: { code: '61', label: 'San Luis' },
      CUBIJIES: { code: '53', label: 'Cubijies' },
      CALPI: { code: '52', label: 'Calpi' },
      CACHA_CAB_EN_MACHANGARA: {
        code: '51',
        label: 'Cacha (Cab. En Machangara)',
      },
      LICTO: { code: '56', label: 'Licto' },
      LICAN: { code: '06', label: 'Lican' },
      FLORES: { code: '54', label: 'Flores' },
      YANUQUIES: { code: '05', label: 'Yanuquies' },
      LIZARZABURU: { code: '01', label: 'Lizarzaburu' },
      RIOBAMBA_CABECERA_CANTONAL_Y_CAPITAL: {
        code: '50',
        label: 'Riobamba, Cabecera Cantonal Y Capital',
      },
      VELOZ: { code: '04', label: 'Veloz' },
      VELASCO: { code: '03', label: 'Velasco' },
      MALDONADO: { code: '02', label: 'Maldonado' },
    },
    ALAUSI: {
      TIXAN: { code: '60', label: 'Tixan' },
      MULTITUD: { code: '55', label: 'Multitud' },
      HUIGRA: { code: '54', label: 'Huigra' },
      GUASUNTOS: { code: '53', label: 'Guasuntos' },
      PISTISHI_NARIZ_DEL_DIABLO: {
        code: '56',
        label: 'Pistishi (Nariz Del Diablo)',
      },
      SIMBABE: { code: '59', label: 'Simbabe' },
      SEVILLA: { code: '58', label: 'Sevilla' },
      PUMALLACTA: { code: '57', label: 'Pumallacta' },
      CUMANDA: { code: '52', label: 'Cumanda' },
      ACHUPALLAS: { code: '51', label: 'Achupallas' },
      ALAUSI_CABECERA_CANTONAL: {
        code: '50',
        label: 'Alausi, Cabecera Cantonal',
      },
    },
    COLTA: {
      CAJABAMBA: { code: '01', label: 'Cajabamba' },
      VILLA_LA_UNION_CAJABAMBA_CAB_CANTON: {
        code: '50',
        label: 'Villa La Union (Cajabamba), Cab. Canton.',
      },
      COLUMBE: { code: '52', label: 'Columbe' },
      CANI: { code: '51', label: 'Cañi' },
      SICALPA: { code: '02', label: 'Sicalpa' },
      SANTIAGO_DE_QUITO_CAB_EN_SAN_ANTONIO: {
        code: '54',
        label: 'Santiago De Quito (Cab. En San Antonio',
      },
      JUAN_DE_VELASCO_PANGOR: { code: '53', label: 'Juan De Velasco (Pangor)' },
    },
    CHAMBO: {
      CHAMBO_CABECERA_CANTONAL: {
        code: '50',
        label: 'Chambo, Cabecera Cantonal',
      },
    },
    CHUNCHI: {
      COMPUD: { code: '52', label: 'Compud' },
      CAPZOL: { code: '51', label: 'Capzol' },
      LLAGOS: { code: '54', label: 'Llagos' },
      GONZOL: { code: '53', label: 'Gonzol' },
      CHUNCHI_CABECERA_CANTONAL: {
        code: '50',
        label: 'Chunchi, Cabecera Cantonal',
      },
    },
    GUAMOTE: {
      CEBADAS: { code: '51', label: 'Cebadas' },
      GUAMOTE_CABECERA_CANTONAL: {
        code: '50',
        label: 'Guamote, Cabecera Cantonal',
      },
      PALMIRA: { code: '52', label: 'Palmira' },
    },
    GUANO: {
      SANTA_FE_DE_GALAN: { code: '58', label: 'Santa Fe De Galan' },
      SAN_JOSE_DEL_CHAZO: { code: '57', label: 'San Jose Del Chazo' },
      VALPARAISO: { code: '59', label: 'Valparaiso' },
      SAN_ANDRES: { code: '54', label: 'San Andres' },
      LA_PROVIDENCIA: { code: '53', label: 'La Providencia' },
      SAN_ISIDRO_DE_PATULU: { code: '56', label: 'San Isidro De Patulu' },
      SAN_GERARDO_DE_PACAICAGUAN: {
        code: '55',
        label: 'San Gerardo De Pacaicaguan',
      },
      LA_MATRIZ: { code: '02', label: 'La Matriz' },
      EL_ROSARIO: { code: '01', label: 'El Rosario' },
      ILAPO: { code: '52', label: 'Ilapo' },
      GUANANDO: { code: '51', label: 'Guanando' },
      GUANO_CABECERA_CANTONAL: {
        code: '50',
        label: 'Guano, Cabecera Cantonal',
      },
    },
    PALLATANGA: {
      PALLATANGA_CABECERA_CANTONAL: {
        code: '50',
        label: 'Pallatanga, Cabecera Cantonal',
      },
    },
    PENIPE: {
      LA_CANDELARIA: { code: '55', label: 'La Candelaria' },
      SAN_ANTONIO_DE_BAYUSHIG: { code: '54', label: 'San Antonio De Bayushig' },
      BILBAO: { code: '56', label: 'Bilbao' },
      EL_ALTAR: { code: '51', label: 'El Altar' },
      PENIPE_CABECERA_CANTONAL: {
        code: '50',
        label: 'Penipe, Cabecera Cantonal',
      },
      PUEBLA: { code: '53', label: 'Puebla' },
      MATUS: { code: '52', label: 'Matus' },
    },
    CUMANDA: {
      CUMANDA_CABECERA_CANTONAL: {
        code: '50',
        label: 'Cumanda, Cabecera Cantonal',
      },
    },
  },
  EL_ORO: {
    MACHALA: {
      EL_CAMBIO: { code: '05', label: 'El Cambio' },
      EL_RETIRO: { code: '52', label: 'El Retiro' },
      MACHALA_CABECERA_CANTONAL: {
        code: '50',
        label: 'Machala, Cabecera Cantonal',
      },
      LA_PROVIDENCIA: { code: '01', label: 'La Providencia' },
      MACHALA: { code: '02', label: 'Machala' },
      PUERTO_BOLIVAR: { code: '03', label: 'Puerto Bolivar' },
      NUEVE_DE_MAYO: { code: '04', label: 'Nueve De Mayo' },
    },
    ARENILLAS: {
      CARCABON: { code: '55', label: 'Carcabon' },
      LAS_LAJAS_CAB_EN_LA_VICTORIA: {
        code: '53',
        label: 'Las Lajas (Cab. En La Victoria)',
      },
      PALMALES: { code: '54', label: 'Palmales' },
      ARENILLAS_CABECERA_CANTONAL: {
        code: '50',
        label: 'Arenillas, Cabecera Cantonal',
      },
      LA_LIBERTAD: { code: '52', label: 'La Libertad' },
      CHACRAS: { code: '51', label: 'Chacras' },
    },
    ATAHUALPA: {
      CORDONCILLO: { code: '52', label: 'Cordoncillo' },
      MILAGRO: { code: '53', label: 'Milagro' },
      SAN_JOSE: { code: '54', label: 'San Jose' },
      AYAPAMBA: { code: '51', label: 'Ayapamba' },
      PACCHA_CABECERA_CANTONAL: {
        code: '50',
        label: 'Paccha, Cabecera Cantonal',
      },
      SAN_JUAN_DE_CERRO_AZUL: { code: '55', label: 'San Juan De Cerro Azul' },
    },
    BALSAS: {
      BALSAS_CABECERA_CANTONAL: {
        code: '50',
        label: 'Balsas, Cabecera Cantonal',
      },
      BELLAMARIA: { code: '51', label: 'Bellamaria' },
    },
    CHILLA: {
      CHILLA_CABECERA_CANTONAL: {
        code: '50',
        label: 'Chilla, Cabecera Cantonal',
      },
    },
    EL_GUABO: {
      BARBONES_SUCRE: { code: '51', label: 'Barbones (Sucre)' },
      EL_GUABO_CABECERA_CANTONAL: {
        code: '50',
        label: 'El Guabo, Cabecera Cantonal',
      },
      TENDALES_CAB_EN_PUERTO_TENDALES: {
        code: '53',
        label: 'Tendales (Cab. En Puerto Tendales)',
      },
      LA_IBERIA: { code: '52', label: 'La Iberia' },
      RIO_BONITO: { code: '54', label: 'Rio Bonito' },
    },
    HUAQUILLAS: {
      UNION_LOJANA: { code: '05', label: 'Union Lojana' },
      EL_PARAISO: { code: '02', label: 'El Paraiso' },
      HUALTACO: { code: '03', label: 'Hualtaco' },
      MILTON_REYES: { code: '04', label: 'Milton Reyes' },
      HUAQUILLAS_CABECERA_CANTONAL: {
        code: '50',
        label: 'Huaquillas, Cabecera Cantonal',
      },
      ECUADOR: { code: '01', label: 'Ecuador' },
    },
    MARCABELI: {
      MARCABELI_CABECERA_CANTONAL: {
        code: '50',
        label: 'Marcabeli, Cabecera Cantonal',
      },
      EL_INGENIO: { code: '51', label: 'El Ingenio' },
    },
    PASAJE: {
      OCHOA_LEON_MATRIZ: { code: '03', label: 'Ochoa Leon (Matriz)' },
      TRES_CERRITOS: { code: '04', label: 'Tres Cerritos' },
      BUENAVISTA: { code: '51', label: 'Buenavista' },
      PASAJE_CABECERA_CANTONAL: {
        code: '50',
        label: 'Pasaje, Cabecera Cantonal',
      },
      BOLIVAR: { code: '01', label: 'Bolivar' },
      LOMA_DE_FRANCO: { code: '02', label: 'Loma De Franco' },
      CANAQUEMADA: { code: '56', label: 'Cañaquemada' },
      UZHCURRUMI: { code: '55', label: 'Uzhcurrumi' },
      PROGRESO: { code: '54', label: 'Progreso' },
      LA_PEANA: { code: '53', label: 'La Peaña' },
      CASACAY: { code: '52', label: 'Casacay' },
    },
    PINAS: {
      MOROMORO_CAB_EN_EL_VADO: {
        code: '53',
        label: 'Moromoro (Cab. En El Vado)',
      },
      LA_BOCANA: { code: '52', label: 'La Bocana' },
      CAPIRO_CAB_EN_LA_CAPILLA_DE_CAPIRO: {
        code: '51',
        label: 'Capiro (Cab. En La Capilla De Capiro)',
      },
      PINAS_GRANDE: { code: '03', label: 'Piñas Grande' },
      PIEDRAS: { code: '54', label: 'Piedras' },
      LA_SUSAYA: { code: '02', label: 'La Susaya' },
      LA_MATRIZ: { code: '01', label: 'La Matriz' },
      PINAS_CABECERA_CANTONAL: {
        code: '50',
        label: 'Piñas, Cabecera Cantonal',
      },
      SAN_ROQUE_AMBROSIO_MALDONADO: {
        code: '55',
        label: 'San Roque (Ambrosio Maldonado)',
      },
      SARACAY: { code: '56', label: 'Saracay' },
    },
    PORTOVELO: {
      MORALES: { code: '52', label: 'Morales' },
      CURTINCAPA: { code: '51', label: 'Curtincapa' },
      PORTOVELO_CABECERA_CANTONAL: {
        code: '50',
        label: 'Portovelo, Cabecera Cantonal',
      },
      SALATI: { code: '53', label: 'Salati' },
    },
    SANTA_ROSA: {
      JAMBELI_SATELITE: { code: '03', label: 'Jambeli (Satelite)' },
      NUEVO_SANTA_ROSA: { code: '05', label: 'Nuevo Santa Rosa' },
      BELLAMARIA: { code: '57', label: 'Bellamaria' },
      VICTORIA: { code: '56', label: 'Victoria' },
      BELLAVISTA: { code: '51', label: 'Bellavista' },
      SANTA_ROSA: { code: '01', label: 'Santa Rosa' },
      SANTA_ROSA_CABECERA_CANTONAL: {
        code: '50',
        label: 'Santa Rosa, Cabecera Cantonal',
      },
      JAMBELI: { code: '52', label: 'Jambeli' },
      TORATA: { code: '55', label: 'Torata' },
      SAN_ANTONIO: { code: '54', label: 'San Antonio' },
      LA_AVANZADA: { code: '53', label: 'La Avanzada' },
      JUMON_SATELITE: { code: '04', label: 'Jumon (Satelite)' },
      PUERTO_JELI: { code: '02', label: 'Puerto Jeli' },
    },
    ZARUMA: {
      HUERTAS: { code: '55', label: 'Huertas' },
      MALVAS: { code: '56', label: 'Malvas' },
      MULUCAY_GRANDE: { code: '57', label: 'Mulucay Grande' },
      SINSAO: { code: '58', label: 'Sinsao' },
      SALVIAS: { code: '59', label: 'Salvias' },
      ZARUMA_CABECERA_CANTONAL: {
        code: '50',
        label: 'Zaruma, Cabecera Cantonal',
      },
      ABANIN: { code: '51', label: 'Abañin' },
      GUIZHAGUINA: { code: '54', label: 'Guizhaguiña' },
      GUANAZAN: { code: '53', label: 'Guanazan' },
      ARCAPAMBA: { code: '52', label: 'Arcapamba' },
    },
    LAS_LAJAS: {
      PLATANILLOS: { code: '02', label: 'Platanillos' },
      VALLE_HERMOSO: { code: '03', label: 'Valle Hermoso' },
      LA_VICTORIA: { code: '01', label: 'La Victoria' },
      LA_LIBERTAD: { code: '51', label: 'La Libertad' },
      EL_PARAISO: { code: '52', label: 'El Paraiso' },
      SAN_ISIDRO: { code: '53', label: 'San Isidro' },
      LA_VICTORIA_CABECERACANTONAL: {
        code: '50',
        label: 'La Victoria, Cabeceracantonal',
      },
    },
  },
  ESMERALDAS: {
    LA_CONCORDIA: {
      LA_CONCORDIA_CABECERA_CANTONAL: {
        code: '50',
        label: 'La Concordia, Cabecera Cantonal',
      },
    },
    ESMERALDAS: {
      '5_DE_AGOSTO': { code: '02', label: '5 De Agosto' },
      ESMERALDAS: { code: '03', label: 'Esmeraldas' },
      ESMERALDAS_CABECERA_CANTONAL_Y_CAPITAL: {
        code: '50',
        label: 'Esmeraldas, Cabecera Cantonal Y Capital',
      },
      BARTOLOME_RUIZ_CESAR_FRANCO_CARRION: {
        code: '01',
        label: 'Bartolome Ruiz (Cesar Franco Carrion',
      },
      CAMARONES_CAB_EN_SAN_VICENTE: {
        code: '52',
        label: 'Camarones (Cab. En San Vicente)',
      },
      CRNEL_CARLOS_CONCHA_TORRES_CAB_EN_HUE: {
        code: '53',
        label: 'Crnel. Carlos Concha Torres (Cab. En Hue',
      },
      LUIS_TELLO_LAS_PALMAS: { code: '04', label: 'Luis Tello (Las Palmas)' },
      ATACAMES: { code: '51', label: 'Atacames' },
      SIMON_PLATA_TORRES: { code: '05', label: 'Simon Plata Torres' },
      CHINCA: { code: '54', label: 'Chinca' },
      TIBIAZO: { code: '65', label: 'Tibiazo' },
      TACHINA: { code: '66', label: 'Tachina' },
      SAN_MATEO: { code: '63', label: 'San Mateo' },
      SUA_CAN_EN_LA_BOCANA: { code: '64', label: 'Sua (Can En La Bocana)' },
      TONCHIGÜE: { code: '67', label: 'Tonchigüe' },
      VUELTA_LARGA: { code: '68', label: 'Vuelta Larga' },
      RIO_VERDE: { code: '61', label: 'Rio Verde' },
      ROCAFUERTE: { code: '62', label: 'Rocafuerte' },
      MAJUA: { code: '59', label: 'Majua' },
      MONTALVO_CAB_EN_HORQUETA: {
        code: '60',
        label: 'Montalvo (Cab. En Horqueta)',
      },
      CHUMUNDE: { code: '56', label: 'Chumunde' },
      CHONTADURO: { code: '55', label: 'Chontaduro' },
      LA_UNION: { code: '58', label: 'La Union' },
      LAGARTO: { code: '57', label: 'Lagarto' },
    },
    ELOY_ALFARO: {
      MALDONADO: { code: '56', label: 'Maldonado' },
      PAMPANAL_DE_BOLIVAR: { code: '57', label: 'Pampanal De Bolivar' },
      SAN_FRANCISCO_DE_ONZOLE: { code: '58', label: 'San Francisco De Onzole' },
      BORBON: { code: '53', label: 'Borbon' },
      LA_TOLA: { code: '54', label: 'La Tola' },
      LUIS_VARGAS_TORRES_CAB_EN_PLAYA_DE_ORO: {
        code: '55',
        label: 'Luis Vargas Torres (Cab. En Playa De Oro',
      },
      COLON_ELOY_DE_MARIA: { code: '62', label: 'Colon Eloy De Maria' },
      SAN_JOSE_DE_CAYAPAS: { code: '63', label: 'San Jose De Cayapas' },
      TIMBIRE: { code: '64', label: 'Timbire' },
      SANTO_DOMINGO_DE_ONZOLE: { code: '59', label: 'Santo Domingo De Onzole' },
      SELVA_ALEGRE: { code: '60', label: 'Selva Alegre' },
      TELEMBI: { code: '61', label: 'Telembi' },
      ATAHUALPA_CAB_EN_CAMARAONES: {
        code: '52',
        label: 'Atahualpa (Cab. En Camaraones)',
      },
      VALDEZ_LIMONES_CABECERA_CANTONAL: {
        code: '50',
        label: 'Valdez (Limones), Cabecera Cantonal',
      },
      ANCHAYACU: { code: '51', label: 'Anchayacu' },
    },
    MUSINE: {
      GALERA: { code: '53', label: 'Galera' },
      MUSINE_CABECERA_CANTONAL: {
        code: '50',
        label: 'Musine, Cabecera Cantonal',
      },
      BOLIVAR: { code: '51', label: 'Bolivar' },
      DAULE: { code: '52', label: 'Daule' },
      SAN_GREGORIO: { code: '57', label: 'San Gregorio' },
      SAN_JOSE_DE_CHAMANGA_CAB_EN_CHAMANGA: {
        code: '58',
        label: 'San Jose De Chamanga (Cab. En Chamanga)',
      },
      QUINGUE_OLMEDO_PERDOMO_FRANCO: {
        code: '54',
        label: 'Quingue (Olmedo Perdomo Franco)',
      },
      SALIMA: { code: '55', label: 'Salima' },
      SAN_FRANCISCO: { code: '56', label: 'San Francisco' },
    },
    QUININDE: {
      ROSA_ZARATE_QUININDE_CABECERA_CANTONA: {
        code: '50',
        label: 'Rosa Zarate (Quininde), Cabecera Cantona',
      },
      CUBE: { code: '51', label: 'Cube' },
      LA_UNION: { code: '55', label: 'La Union' },
      VICHE: { code: '54', label: 'Viche' },
      CHURA_CHANCAMA_CAB_EN_EL_YERBERO: {
        code: '52',
        label: 'Chura (Chancama) (Cab. En El Yerbero)',
      },
      MALIMPIA: { code: '53', label: 'Malimpia' },
    },
    SAN_LORENZO: {
      SANTA_RITA: { code: '59', label: 'Santa Rita' },
      SAN_JAVIER_DE_CACHAVI_CAB_EN_SAN_JAVIE: {
        code: '58',
        label: 'San Javier De Cachavi (Cab. En San Javie',
      },
      TAMBILLO: { code: '60', label: 'Tambillo' },
      URBINA: { code: '62', label: 'Urbina' },
      TULULBI_CAB_EN_RICAURTE: {
        code: '61',
        label: 'Tululbi (Cab. En Ricaurte)',
      },
      MATAJE_CAB_EN_SANTANDER: {
        code: '57',
        label: 'Mataje (Cab. En Santander)',
      },
      CALDERON: { code: '53', label: 'Calderon' },
      ANCON_PICHANGAL_CAB_EN_PALMA_REAL: {
        code: '52',
        label: 'Ancon (Pichangal) (Cab. En Palma Real)',
      },
      CARONDELET: { code: '54', label: 'Carondelet' },
      CONCEPCION: { code: '56', label: 'Concepcion' },
      '5_DE_JUNIO_CAB_EN_UIMBI': {
        code: '55',
        label: '5 De Junio (Cab. En Uimbi)',
      },
      SAN_LORENZO_CABECERA_CANTONAL: {
        code: '50',
        label: 'San Lorenzo, Cabecera Cantonal',
      },
      ALTO_TAMBO_CAB_EN_GUADAL: {
        code: '51',
        label: 'Alto Tambo (Cab. En Guadal)',
      },
    },
    ATACAMES: {
      LA_UNION: { code: '51', label: 'La Union' },
      ATACAMES_CABECERA_CANTONAL: {
        code: '50',
        label: 'Atacames, Cabecera Cantonal',
      },
      SUA_CAB_EN_LA_BOCANA: { code: '52', label: 'Sua (Cab. En La Bocana)' },
      TONSUPA: { code: '54', label: 'Tonsupa' },
      TONCHIGÜE: { code: '53', label: 'Tonchigüe' },
    },
    RIOVERDE: {
      LAGARTO: { code: '53', label: 'Lagarto' },
      ROCAFUERTE: { code: '55', label: 'Rocafuerte' },
      MONTALVO: { code: '54', label: 'Montalvo' },
      CHONTADURO: { code: '51', label: 'Chontaduro' },
      RIOVERDE_CABECERA_CANTONAL: {
        code: '50',
        label: 'Rioverde, Cabecera Cantonal',
      },
      CHUMUNDE: { code: '52', label: 'Chumunde' },
    },
  },
  GUAYAS: {
    GUAYAQUIL: {
      CARBO_CONCEPCION: { code: '03', label: 'Carbo (Concepcion)' },
      BOLIVAR_SAGRARIO: { code: '02', label: 'Bolivar (Sagrario)' },
      AYACUCHO: { code: '01', label: 'Ayacucho' },
      ROCA: { code: '09', label: 'Roca' },
      OLMEDO_SAN_ALEJO: { code: '08', label: 'Olmedo (San Alejo)' },
      SUCRE: { code: '11', label: 'Sucre' },
      ROCAFUERTE: { code: '10', label: 'Rocafuerte' },
      GARCIA_MORENO: { code: '05', label: 'Garcia Moreno' },
      FEBRES_CORDERO: { code: '04', label: 'Febres Cordero' },
      NUEVE_DE_OCTUBRE: { code: '07', label: 'Nueve De Octubre' },
      LETAMENDI: { code: '06', label: 'Letamendi' },
      TENGUEL: { code: '58', label: 'Tenguel' },
      PASCUALES: { code: '16', label: 'Pascuales' },
      MORRO: { code: '53', label: 'Morro' },
      PLAYAS_GRAL_VILLAMIL: { code: '55', label: 'Playas (Gral. Villamil)' },
      PUNA: { code: '57', label: 'Puna' },
      POSORJA: { code: '56', label: 'Posorja' },
      CHONGON: { code: '51', label: 'Chongon' },
      XIMENA: { code: '14', label: 'Ximena' },
      JUAN_GOMEZ_RENDON_PROGRESO: {
        code: '52',
        label: 'Juan Gomez Rendon (Progreso)',
      },
      URDANETA: { code: '13', label: 'Urdaneta' },
      TARQUI: { code: '12', label: 'Tarqui' },
      GUAYAQUIL_CABECERA_CANTONAL_Y_CAPITAL: {
        code: '50',
        label: 'Guayaquil, Cabecera Cantonal Y Capital',
      },
    },
    ALFREDO_BAQUERIZO_MORENO_JUJAN: {
      ALFREDO_BAUERIZO_MORENO_JUJAN_CAB_CA: {
        code: '50',
        label: 'Alfredo Bauerizo Moreno (Jujan), Cab. Ca',
      },
    },
    BALAO: {
      BALAO_CABECERA_CANTONAL: {
        code: '50',
        label: 'Balao, Cabecera Cantonal',
      },
    },
    BALZAR: {
      BALZAR_CABECERA_CANTONAL: {
        code: '50',
        label: 'Balzar, Cabecera Cantonal',
      },
    },
    COLIMES: {
      SAN_JACINTO: { code: '51', label: 'San Jacinto' },
      COLIMES_CABECERA_CANTONAL: {
        code: '50',
        label: 'Colimes, Cabecera Cantonal',
      },
    },
    DAULE: {
      VICENTE_PIEDREHITA: { code: '08', label: 'Vicente Piedrehita' },
      SANTA_CLARA: { code: '07', label: 'Santa Clara' },
      BANIFE: { code: '03', label: 'Banife' },
      PADRE_JUAN_BAUTISTA_AGUIRRE: {
        code: '06',
        label: 'Padre Juan Bautista Aguirre',
      },
      MAGRO: { code: '05', label: 'Magro' },
      EMILIANO_CAICEDO_MARCOS: { code: '04', label: 'Emiliano Caicedo Marcos' },
      PIEDRAHITA_NOBOL: { code: '57', label: 'Piedrahita (Nobol)' },
      LOS_LOJAS_ENRIQUE_BAQUERIZO_MORENO: {
        code: '56',
        label: 'Los Lojas (Enrique Baquerizo Moreno)',
      },
      LOMAS_DE_SARGENTILLO: { code: '55', label: 'Lomas De Sargentillo' },
      JUAN_BAUTISTA_AGUIRRE_LOS_TINTOS: {
        code: '52',
        label: 'Juan Bautista Aguirre (Los Tintos)',
      },
      LAUREL: { code: '53', label: 'Laurel' },
      LIMONAL: { code: '54', label: 'Limonal' },
      LA_AURORA: { code: '02', label: 'La Aurora' },
      DAULE: { code: '01', label: 'Daule' },
      ISIDRO_AYORA_SOLEDAD: { code: '51', label: 'Isidro Ayora (Soledad)' },
      DAULE_CABECERA_CANOTNAL: {
        code: '50',
        label: 'Daule, Cabecera Canotnal',
      },
    },
    DURAN: {
      ELOY_ALFARO_DURAN: { code: '01', label: 'Eloy Alfaro (Duran)' },
      EL_RECREO: { code: '02', label: 'El Recreo' },
      ELOY_ALFARO_DURAN_CABECERA_CANTONAL: {
        code: '50',
        label: 'Eloy Alfaro (Duran), Cabecera Cantonal',
      },
    },
    EL_EMPALME: {
      GUAYAS_PUEBLO_NUEVO: { code: '51', label: 'Guayas (Pueblo Nuevo)' },
      EL_ROSARIO: { code: '52', label: 'El Rosario' },
      VELASCO_IBARRA_CAB_EN_EL_EMPALME_CAB: {
        code: '50',
        label: 'Velasco Ibarra (Cab. En El Empalme), Cab',
      },
    },
    EL_TRIUNFO: {
      EL_TRIUNFO_CABECERA_CANTONAL: {
        code: '50',
        label: 'El Triunfo, Cabecera Cantonal',
      },
    },
    MILAGRO: {
      MILAGRO_CABECERA_CANTONAL: {
        code: '50',
        label: 'Milagro, Cabecera Cantonal',
      },
      CHOBO: { code: '51', label: 'Chobo' },
      GENERAL_ELIZALDE_BUCAY: { code: '52', label: 'General Elizalde (Bucay)' },
      MARISCAL_SUCRE_HUAQUES: { code: '53', label: 'Mariscal Sucre (Huaques)' },
      ROBERTO_ASTUDILLO: { code: '54', label: 'Roberto Astudillo' },
    },
    NARANJAL: {
      TAURA: { code: '54', label: 'Taura' },
      SANTA_ROSA_DE_FLANDES: { code: '53', label: 'Santa Rosa De Flandes' },
      JESUS_MARIA: { code: '51', label: 'Jesus Maria' },
      SAN_CARLOS: { code: '52', label: 'San Carlos' },
      NARANJAL_CABECERA_CANTONAL: {
        code: '50',
        label: 'Naranjal, Cabecera Cantonal',
      },
    },
    NARANJITO: {
      NARANJITO_CABECERA_CANTONAL: {
        code: '50',
        label: 'Naranjito, Cabecera Cantonal',
      },
    },
    PALESTINA: {
      PALESTINA_CABECERA_CANTONAL: {
        code: '50',
        label: 'Palestina, Cabecera Cantonal',
      },
    },
    PEDRO_CARBO: {
      PEDRO_CARBO_CABECERA_CANTONAL: {
        code: '50',
        label: 'Pedro Carbo, Cabecera Cantonal',
      },
      VALLE_DE_LA_VIRGEN: { code: '51', label: 'Valle De La Virgen' },
      SABANILLA: { code: '52', label: 'Sabanilla' },
    },
    SALINAS: {
      VICENTE_ROCAFUERTE: { code: '03', label: 'Vicente Rocafuerte' },
      GRA_ALBERTO_ENRIQUEZ_GALLO: {
        code: '02',
        label: 'Gra. Alberto Enriquez Gallo',
      },
      ANCONCITO: { code: '51', label: 'Anconcito' },
      CARLOS_ESPINOZA_LARREA: { code: '01', label: 'Carlos Espinoza Larrea' },
      SALINAS_CABECERA_CANTONAL: {
        code: '50',
        label: 'Salinas, Cabecera Cantonal',
      },
      SANTA_ROSA: { code: '04', label: 'Santa Rosa' },
      LA_LIBERTAD: { code: '53', label: 'La Libertad' },
      JOSE_LUIS_TAMAYO_MUEY: { code: '52', label: 'Jose Luis Tamayo (Muey)' },
    },
    SANBORONDON: {
      LA_PUNTILLA_SATELITE: { code: '02', label: 'La Puntilla (Satelite)' },
      SAMBORONDON: { code: '01', label: 'Samborondon' },
      SAMBORONDON_CABECERA_CANTONAL: {
        code: '50',
        label: 'Samborondon, Cabecera Cantonal',
      },
      TARIFA: { code: '51', label: 'Tarifa' },
    },
    SANTA_ELENA: {
      SIMON_BOLIVAR_JULIO_MORENO: {
        code: '55',
        label: 'Simon Bolivar (Julio Moreno)',
      },
      MANGLARALTO: { code: '54', label: 'Manglaralto' },
      COLONCHE: { code: '52', label: 'Colonche' },
      CHANDUY: { code: '53', label: 'Chanduy' },
      ATAHUALPA: { code: '51', label: 'Atahualpa' },
      SANTA_ELENA_CABECERA_CANTONAL: {
        code: '50',
        label: 'Santa Elena, Cabecera Cantonal',
      },
      SANTA_ELENA: { code: '02', label: 'Santa Elena' },
      BALLENITA: { code: '01', label: 'Ballenita' },
    },
    SANTA_LUCIA: {
      SANTA_LUCIA_CABECERA_CANTONAL: {
        code: '50',
        label: 'Santa Lucia, Cabecera Cantonal',
      },
    },
    URBINA_JADO: {
      BOCANA: { code: '01', label: 'Bocana' },
      CANDILEJOS: { code: '02', label: 'Candilejos' },
      EL_SALITRE_LAS_RAMAS_CABECERA_CANTONA: {
        code: '50',
        label: 'El Salitre (Las Ramas), Cabecera Cantona',
      },
      CENTRAL: { code: '03', label: 'Central' },
      LA_VICTORIA_NAUZA: { code: '52', label: 'La Victoria (Ñauza' },
      JUNQUILLAL: { code: '53', label: 'Junquillal' },
      GRAL_VERNAZA_DOS_ESTEROS: {
        code: '51',
        label: 'Gral. Vernaza (Dos Esteros)',
      },
      PARAISO: { code: '04', label: 'Paraiso' },
      SAN_MATEO: { code: '05', label: 'San Mateo' },
    },
    YAGUACHI: {
      VIRGEN_DE_FATIMA: { code: '56', label: 'Virgen De Fatima' },
      GRAL_PEDRO_J_MONTERO_BOLICHE: {
        code: '53',
        label: 'Gral. Pedro J. Montero (Boliche)',
      },
      SIMON_BOLIVAR: { code: '54', label: 'Simon Bolivar' },
      CRNEL_MARCELINO_MARIDUENA_SAN_CARLOS: {
        code: '52',
        label: 'Crnel. Marcelino Maridueña (San Carlos)',
      },
      YAGUACHI_NUEVO_CABECERA_CANTONAL: {
        code: '50',
        label: 'Yaguachi Nuevo, Cabecera Cantonal',
      },
      CRNEL_LORENZO_DE_GARAICOA_PEDREGAL: {
        code: '51',
        label: 'Crnel. Lorenzo De Garaicoa (Pedregal)',
      },
      YAGUACHI_VIEJO_CONE: { code: '55', label: 'Yaguachi Viejo (Cone)' },
    },
    PLAYAS: {
      GENERAL_VILLAMIL_PLAYAS_CABECERA_CANT: {
        code: '50',
        label: 'General Villamil (Playas), Cabecera Cant',
      },
    },
    SIMON_BOLIVAR: {
      CRNEL_LORENZO_DE_GARAICOA_PEDREGAL: {
        code: '51',
        label: 'Crnel. Lorenzo De Garaicoa (Pedregal)',
      },
      SIMON_BOLIVAR_CABECERA_CANTONAL: {
        code: '50',
        label: 'Simon Bolivar, Cabecera Cantonal',
      },
    },
    CORONEL_MARCELINO_MARIDUENA: {
      CORONEL_MARCELINO_MARIDUENA_CAB_CANTON: {
        code: '50',
        label: 'Coronel Marcelino Maridueña, Cab. Canton',
      },
    },
    LOMAS_DE_SARGENTILLO: {
      ISIDRO_AYORA_SOLEDAD: { code: '51', label: 'Isidro Ayora (Soledad)' },
      LOMAS_DE_SARGENTILLO_CABECERA_CANTONAL: {
        code: '50',
        label: 'Lomas De Sargentillo, Cabecera Cantonal',
      },
    },
    NOBOL: {
      NARCISA_DE_JESUS_CABECERA_CANTONAL: {
        code: '50',
        label: 'Narcisa De Jesus, Cabecera Cantonal',
      },
    },
    LA_LIBERTAD: {
      LA_LIBERTAD_CABECERA_CANTONAL: {
        code: '50',
        label: 'La Libertad, Cabecera Cantonal',
      },
    },
    GENERAL_ANTONIO_ELIZALDE: {
      GENERAL_ANTONIO_ELIZALDE_BUCAY_CAB_C: {
        code: '50',
        label: 'General Antonio Elizalde (Bucay), Cab. C',
      },
    },
    ISIDRO_AYORA: {
      ISIDRO_AYORA_CAB_CANTONAL: {
        code: '50',
        label: 'Isidro Ayora Cab. Cantonal',
      },
    },
    SALITRE: {
      SALITRE_CABECERA_CANTONAL: {
        code: '50',
        label: 'Salitre, Cabecera Cantonal',
      },
    },
  },
  IMBABURA: {
    IBARRA: {
      SALINAS: { code: '56', label: 'Salinas' },
      SAN_ANTONIO: { code: '57', label: 'San Antonio' },
      IBARRA_CABECERA_CANTONAL_Y_CAPITAL_PROV: {
        code: '50',
        label: 'Ibarra, Cabecera Cantonal Y Capital Prov',
      },
      CARANQUI: { code: '01', label: 'Caranqui' },
      SAN_FRANCISCO: { code: '04', label: 'San Francisco' },
      SAGRARIO: { code: '03', label: 'Sagrario' },
      LA_DOLOROSA_DEL_PRIORATO: {
        code: '05',
        label: 'La Dolorosa Del Priorato',
      },
      GUAYAQUIL_DE_ALPACHACA: { code: '02', label: 'Guayaquil De Alpachaca' },
      LA_ESPERANZA: { code: '54', label: 'La Esperanza' },
      LITA: { code: '55', label: 'Lita' },
      CAROLINA: { code: '53', label: 'Carolina' },
      AMBUQUI: { code: '51', label: 'Ambuqui' },
      ANGOCHAGUA: { code: '52', label: 'Angochagua' },
    },
    ANTONIO_ANTE: {
      ANDRADE_MARIN_LOURDES: { code: '01', label: 'Andrade Marin (Lourdes)' },
      ATUNTAQUI: { code: '02', label: 'Atuntaqui' },
      ATUNTAQUI_CABECEREA_CANTONAL: {
        code: '50',
        label: 'Atuntaqui, Cabecerea Cantonal',
      },
      IMBAYA_SAN_LUIS_DE_COBUENDO: {
        code: '51',
        label: 'Imbaya (San Luis De Cobuendo)',
      },
      SAN_ROQUE: { code: '54', label: 'San Roque' },
      SAN_FRANCISCO_DE_NATABUELA: {
        code: '52',
        label: 'San Francisco De Natabuela',
      },
      SAN_JOSE_DE_CHALTURA: { code: '53', label: 'San Jose De Chaltura' },
    },
    COTACACHI: {
      COTACACHI_CABECERA_CANTONAL: {
        code: '50',
        label: 'Cotacachi, Cabecera Cantonal',
      },
      SAGRARIO: { code: '01', label: 'Sagrario' },
      SAN_FRANCISCO: { code: '02', label: 'San Francisco' },
      PENAHERRERA: { code: '54', label: 'Peñaherrera' },
      PLAZA_GUTIERREZ_CALVARIO: {
        code: '55',
        label: 'Plaza Gutierrez (Calvario)',
      },
      IMANTAG: { code: '53', label: 'Imantag' },
      APUELA: { code: '51', label: 'Apuela' },
      GARCIA_MORENO_LLURIMAGUA: {
        code: '52',
        label: 'Garcia Moreno (Llurimagua)',
      },
      QUIROGA: { code: '56', label: 'Quiroga' },
      '6_DE_JULIO_DE_CUELLAJE_CAB_EN_CUELLAJE': {
        code: '57',
        label: '6 De Julio De Cuellaje (Cab. En Cuellaje',
      },
      VACAS_GALINDO_EL_CHURO_CAB_EN_SAN_MI: {
        code: '58',
        label: 'Vacas Galindo (El Churo) (Cab. En San Mi',
      },
    },
    OTAVALO: {
      PATAQUI: { code: '54', label: 'Pataqui' },
      SAN_JOSE_DE_QUICHINCHE: { code: '55', label: 'San Jose De Quichinche' },
      GONZALEZ_SUAREZ: { code: '53', label: 'Gonzalez Suarez' },
      DR_MIGUEL_EGAS_CABEZAS_PEGUCHE: {
        code: '51',
        label: 'Dr. Miguel Egas Cabezas (Peguche)',
      },
      EUGENIO_ESPEJO_CALPAQUI: {
        code: '52',
        label: 'Eugenio Espejo (Calpaqui)',
      },
      SAN_JUAN_DE_ILUMAN: { code: '56', label: 'San Juan De Iluman' },
      SELVA_ALEGRE_CAB_EN_SAN_MIGUEL_DE_PAM: {
        code: '59',
        label: 'Selva Alegre (Cab. En San Miguel De Pam',
      },
      SAN_PABLO: { code: '57', label: 'San Pablo' },
      SAN_RAFAEL: { code: '58', label: 'San Rafael' },
      JORDAN: { code: '01', label: 'Jordan' },
      SAN_LUIS: { code: '02', label: 'San Luis' },
      OTAVALO_CABECERA_CANTONAL: {
        code: '50',
        label: 'Otavalo, Cabecera Cantonal',
      },
    },
    PIMAMPIRO: {
      SAN_FRANCISCO_DE_SIGSIPAMBA: {
        code: '53',
        label: 'San Francisco De Sigsipamba',
      },
      MARIANO_ACOSTA: { code: '52', label: 'Mariano Acosta' },
      PIMAMPIRO_CABECEA_CANTONAL: {
        code: '50',
        label: 'Pimampiro, Cabecea Cantonal',
      },
      CHUGA: { code: '51', label: 'Chuga' },
    },
    SAN_MIGUEL_DE_URCUQUI: {
      CAHUASQUI: { code: '51', label: 'Cahuasqui' },
      URCUQUI_CABECERA_CANTONAL: {
        code: '50',
        label: 'Urcuqui, Cabecera Cantonal',
      },
      LA_MERCED_DE_BUENOS_AIRES: {
        code: '52',
        label: 'La Merced De Buenos Aires',
      },
      TUMBABIRO: { code: '55', label: 'Tumbabiro' },
      SAN_BLAS: { code: '54', label: 'San Blas' },
      PABLO_ARENAS: { code: '53', label: 'Pablo Arenas' },
    },
  },
  LOJA: {
    LOJA: {
      VILCABAMBA_VICTORIA: { code: '61', label: 'Vilcabamba (Victoria)' },
      YANGANA_ARSENIO_CASTILLO: {
        code: '62',
        label: 'Yangana (Arsenio Castillo)',
      },
      QUINARA: { code: '63', label: 'Quinara' },
      SAN_SEBASTIAN: { code: '02', label: 'San Sebastian' },
      EL_SAGRARIO: { code: '01', label: 'El Sagrario' },
      LOJA_CABECERA_CANTONAL_Y_CAPITAL_PROVIN: {
        code: '50',
        label: 'Loja, Cabecera Cantonal Y Capital Provin',
      },
      SUCRE: { code: '03', label: 'Sucre' },
      CHANTACO: { code: '51', label: 'Chantaco' },
      VALLE: { code: '04', label: 'Valle' },
      CHUQUIRIBAMBA: { code: '52', label: 'Chuquiribamba' },
      EL_CISNE: { code: '53', label: 'El Cisne' },
      SAN_PEDRO_DE_VILCABAMBA: { code: '58', label: 'San Pedro De Vilcabamba' },
      SANTIAGO: { code: '59', label: 'Santiago' },
      TAQUIL_MIGUEL_RIOFRIO: { code: '60', label: 'Taquil (Miguel Riofrio)' },
      SAN_LUCAS: { code: '57', label: 'San Lucas' },
      GUALEL: { code: '54', label: 'Gualel' },
      JIMBILA: { code: '55', label: 'Jimbila' },
      MALACATOS_VALLADOLID: { code: '56', label: 'Malacatos (Valladolid)' },
    },
    CALVAS: {
      SANGUILLIN: { code: '54', label: 'Sanguillin' },
      COLAISACA: { code: '51', label: 'Colaisaca' },
      SAN_VICENTE: { code: '03', label: 'San Vicente' },
      UTUANA: { code: '53', label: 'Utuana' },
      EL_LUCERO: { code: '52', label: 'El Lucero' },
      CARIAMANGA: { code: '01', label: 'Cariamanga' },
      CHILE: { code: '02', label: 'Chile' },
      CARIAMANGA_CABECERA_CANTONAL: {
        code: '50',
        label: 'Cariamanga, Cabecera Cantonal',
      },
    },
    CATAMAYO: {
      SAN_PEDRO_DE_LA_BENDITA: { code: '53', label: 'San Pedro De La Bendita' },
      ZAMBI: { code: '54', label: 'Zambi' },
      EL_TAMBO: { code: '51', label: 'El Tambo' },
      GUAYQUICHUMBA: { code: '52', label: 'Guayquichumba' },
      CATAMAYO: { code: '01', label: 'Catamayo' },
      CATAMAYO_LA_TOMA_CABECERA_CANTONAL: {
        code: '50',
        label: 'Catamayo (La Toma), Cabecera Cantonal',
      },
      SAN_JOSE: { code: '02', label: 'San Jose' },
    },
    CELICA: {
      SABANILLA: { code: '56', label: 'Sabanilla' },
      TNTE_MAXIMILIANO_RODRIGUEZ_LOAIZA: {
        code: '57',
        label: 'Tnte. Maximiliano Rodriguez Loaiza',
      },
      POZUL_SAN_JUAN_DE_POZUL: {
        code: '55',
        label: 'Pozul (San Juan De Pozul)',
      },
      CELICA_CABECERA_CANTONAL: {
        code: '50',
        label: 'Celica, Cabecera Cantonal',
      },
      '12_DE_DICEMBRE_CAB_EN_ACHIOTES': {
        code: '53',
        label: '12 De Dicembre (Cab. En Achiotes)',
      },
      PINDAL_FEDERICO_PAEZ: { code: '54', label: 'Pindal (Federico Paez)' },
      CRUZPAMBA_CAB_EN_CARLOS_BUSTAMANTE: {
        code: '51',
        label: 'Cruzpamba (Cab. En Carlos Bustamante)',
      },
      CHAQUINAL: { code: '52', label: 'Chaquinal' },
    },
    CHAGUARPAMBA: {
      CHAGUARPAMBA_CABECERA_CANTONAL: {
        code: '50',
        label: 'Chaguarpamba, Cabecera Cantonal',
      },
      BUENAVISTA: { code: '51', label: 'Buenavista' },
      EL_ROSARIO: { code: '52', label: 'El Rosario' },
      SANTA_RUFINA: { code: '53', label: 'Santa Rufina' },
      AMARILLOS: { code: '54', label: 'Amarillos' },
    },
    ESPINDOLA: {
      AMALUZA_CABECERA_CANTONAL: {
        code: '50',
        label: 'Amaluza, Cabecera Cantonal',
      },
      BELLAVISTA: { code: '51', label: 'Bellavista' },
      JIMBURA: { code: '52', label: 'Jimbura' },
      EL_INGENIO: { code: '55', label: 'El Ingenio' },
      EL_AIRO: { code: '56', label: 'El Airo' },
      SANTA_TERESITA: { code: '53', label: 'Santa Teresita' },
      '27_DE_ABRIL_CAB_EN_LA_NARANJA': {
        code: '54',
        label: '27 De Abril (Cab. En La Naranja)',
      },
    },
    GONZANAMA: {
      SACAPALCA: { code: '56', label: 'Sacapalca' },
      SAN_ANTONIO_DE_LAS_ARADAS_CAB_EN_LAS_A: {
        code: '57',
        label: 'San Antonio De Las Aradas (Cab. En Las A',
      },
      QUILANGA_LA_PAZ: { code: '55', label: 'Quilanga (La Paz)' },
      GONZANAMA_CABECERA_CANTONAL: {
        code: '50',
        label: 'Gonzanama, Cabecera Cantonal',
      },
      NAMBACOLA: { code: '53', label: 'Nambacola' },
      PURUNUMA_EGUIGUREN: { code: '54', label: 'Purunuma (Eguiguren)' },
      CHANGAIMINA_LA_LIBERTAD: {
        code: '51',
        label: 'Changaimina (La Libertad)',
      },
      FUNDOCHAMBA: { code: '52', label: 'Fundochamba' },
    },
    MACARA: {
      SABIANGO_LA_CAPILLA: { code: '53', label: 'Sabiango (La Capilla)' },
      LAMARA: { code: '51', label: 'Lamara' },
      LA_VICTORIA: { code: '52', label: 'La Victoria' },
      MACARA_MANUEL_ENRIQUE_RENGEL_SUQUILANDA: {
        code: '02',
        label: 'Macara (Manuel Enrique Rengel Suquilanda',
      },
      GENERAL_ELOY_ALFARO_SAN_SEBASTIAN: {
        code: '01',
        label: 'General Eloy Alfaro (San Sebastian)',
      },
      MACARA_CABECERA_CANTONAL: {
        code: '50',
        label: 'Macara, Cabecera Cantonal',
      },
    },
    PALTAS: {
      CATACHOCHA_CABECERA_CANTONAL: {
        code: '50',
        label: 'Catachocha, Cabecera Cantonal',
      },
      CATACOCHA: { code: '01', label: 'Catacocha' },
      GUACHANAMA: { code: '52', label: 'Guachanama' },
      LA_TINGUE: { code: '53', label: 'La Tingue' },
      LOURDES: { code: '02', label: 'Lourdes' },
      CANGONAMA: { code: '51', label: 'Cangonama' },
      LAURO_GUERRERO: { code: '54', label: 'Lauro Guerrero' },
      SAN_ANTONIO: { code: '57', label: 'San Antonio' },
      CASANGA: { code: '58', label: 'Casanga' },
      OLMEDO_SANTA_BARBARA: { code: '55', label: 'Olmedo (Santa Barbara)' },
      ORIANGA: { code: '56', label: 'Orianga' },
      YAMANA: { code: '59', label: 'Yamana' },
    },
    PUYANGO: {
      VICENTINO: { code: '55', label: 'Vicentino' },
      MERCADILLO: { code: '54', label: 'Mercadillo' },
      EL_ARENAL: { code: '52', label: 'El Arenal' },
      EL_LIMO_MARIANA_DE_JESUS: {
        code: '53',
        label: 'El Limo (Mariana De Jesus)',
      },
      ALAMOR_CABECERA_CANTONAL: {
        code: '50',
        label: 'Alamor, Cabecera Cantonal',
      },
      CIANO: { code: '51', label: 'Ciano' },
    },
    SARAGURO: {
      SUMAYPAMBA: { code: '60', label: 'Sumaypamba' },
      SELVA_ALEGRE: { code: '58', label: 'Selva Alegre' },
      URDANETA_PAQUISHAPA: { code: '59', label: 'Urdaneta (Paquishapa)' },
      EL_PARAISO_DE_CELEN: { code: '51', label: 'El Paraiso De Celen' },
      EL_TABLON: { code: '52', label: 'El Tablon' },
      SARAGURO_CABECERA_CANTONAL: {
        code: '50',
        label: 'Saraguro, Cabecera Cantonal',
      },
      LLUZHAPA: { code: '53', label: 'Lluzhapa' },
      SAN_PABLO_DE_TENTA: { code: '56', label: 'San Pablo De Tenta' },
      SAN_SEBASTIAN_DE_YULUC: { code: '57', label: 'San Sebastian De Yuluc' },
      MANU: { code: '54', label: 'Manu' },
      SAN_ANTONIO_DE_QUMBE_CUMBE: {
        code: '55',
        label: 'San Antonio De Qumbe (Cumbe)',
      },
    },
    SOZORANGA: {
      NUEVA_FATIMA: { code: '51', label: 'Nueva Fatima' },
      SOZORANGA_CABECERA_CANTONAL: {
        code: '50',
        label: 'Sozoranga, Cabecera Cantonal',
      },
      TACAMOROS: { code: '52', label: 'Tacamoros' },
    },
    ZAPOTILLO: {
      ZAPOTILLO_CABECERA_CANTONAL: {
        code: '50',
        label: 'Zapotillo, Cabecera Cantonal',
      },
      PALETILLAS: { code: '54', label: 'Paletillas' },
      CAZADEROS_CAB_EN_MANGAURCO: {
        code: '51',
        label: 'Cazaderos (Cab. En Mangaurco)',
      },
      GARZAREAL: { code: '52', label: 'Garzareal' },
      LIMONES: { code: '53', label: 'Limones' },
      BOLASPAMBA: { code: '55', label: 'Bolaspamba' },
    },
    PINDAL: {
      PINDAL_CABECERA_CANTONAL: {
        code: '50',
        label: 'Pindal, Cabecera Cantonal',
      },
      CHAQUINAL: { code: '51', label: 'Chaquinal' },
      '12_DE_DICEMBRE_CAB_EN_ACHIOTES': {
        code: '52',
        label: '12 De Dicembre (Cab. En Achiotes)',
      },
    },
    QUILANGA: {
      SAN_ANTONIO_DE_LAS_ARADAS_CAB_EN_LAS_A: {
        code: '52',
        label: 'San Antonio De Las Aradas (Cab. En Las A',
      },
      QUILANGA_CABECERA_CANTONAL: {
        code: '50',
        label: 'Quilanga, Cabecera Cantonal',
      },
      FUNDOCHAMBA: { code: '51', label: 'Fundochamba' },
    },
    OLMEDO: {
      LA_TINGUE: { code: '51', label: 'La Tingue' },
      OLMEDO_CAB_CANTONAL: { code: '50', label: 'Olmedo, Cab. Cantonal' },
    },
  },
  LOS_RIOS: {
    QUINSALOMA: {
      QUINSALOMA_CABECERA_CANTONAL: {
        code: '50',
        label: 'Quinsaloma, Cabecera Cantonal',
      },
    },
    BABAHOYO: {
      LA_UNION: { code: '55', label: 'La Union' },
      DR_CAMILO_PONCE: { code: '02', label: 'Dr. Camilo Ponce' },
      CLEMENTE_BAQUERIZO: { code: '01', label: 'Clemente Baquerizo' },
      BABAHOYO_CABECERA_CANTONAL_Y_CAPITAL_PR: {
        code: '50',
        label: 'Babahoyo, Cabecera Cantonal Y Capital Pr',
      },
      CARACOL: { code: '52', label: 'Caracol' },
      BARRERO_SANTA_RITA: { code: '51', label: 'Barrero (Santa Rita)' },
      EL_SALTO: { code: '04', label: 'El Salto' },
      PIMOCHA: { code: '54', label: 'Pimocha' },
      FEBRES_CORDERO_LAS_JUNTAS_CAB_EN_MAT: {
        code: '53',
        label: 'Febres Cordero (Las Juntas) (Cab. En Mat',
      },
      BARREIRO: { code: '03', label: 'Barreiro' },
    },
    BABA: {
      ISLA_DE_BEJUCAL: { code: '52', label: 'Isla De Bejucal' },
      GUARE: { code: '51', label: 'Guare' },
      BABA_CABECERA_CANTONAL: { code: '50', label: 'Baba, Cabecera Cantonal' },
    },
    MONTALVO: {
      MONTALVO_CABECERA_CANTONAL: {
        code: '50',
        label: 'Montalvo, Cabecera Cantonal',
      },
    },
    PUEBLOVIEJO: {
      SAN_JUAN: { code: '52', label: 'San Juan' },
      PUEBLOVIEJO_CABECERA_CANTONAL: {
        code: '50',
        label: 'Puebloviejo, Cabecera Cantonal',
      },
      PUERTO_PECHICHE: { code: '51', label: 'Puerto Pechiche' },
    },
    QUEVEDO: {
      LA_ESPERANZA: { code: '55', label: 'La Esperanza' },
      SAN_CAMILO: { code: '02', label: 'San Camilo' },
      SAN_JOSE: { code: '03', label: 'San Jose' },
      GUAYACAN: { code: '04', label: 'Guayacan' },
      QUEVEDO_CABECERA_CANTONAL: {
        code: '50',
        label: 'Quevedo, Cabecera Cantonal',
      },
      QUEVEDO: { code: '01', label: 'Quevedo' },
      NICOLAS_INFANTE_DIAZ: { code: '05', label: 'Nicolas Infante Diaz' },
      BUENA_FE: { code: '51', label: 'Buena Fe' },
      VIVA_ALFARO: { code: '10', label: 'Viva Alfaro' },
      MOCACHE: { code: '52', label: 'Mocache' },
      SIETE_DE_OCTUBRE: { code: '07', label: 'Siete De Octubre' },
      VENUS_DEL_RIO_QUEVEDO: { code: '09', label: 'Venus Del Rio Quevedo' },
      '24_DE_MAYO': { code: '08', label: '24 De Mayo' },
      SAN_CRISTOBAL: { code: '06', label: 'San Cristobal' },
      SAN_CARLOS: { code: '53', label: 'San Carlos' },
      VALENCIA: { code: '54', label: 'Valencia' },
    },
    URDANETA: {
      RICAURTE: { code: '51', label: 'Ricaurte' },
      CATARAMA_CABECERA_CANTONAL: {
        code: '50',
        label: 'Catarama, Cabecera Cantonal',
      },
    },
    VENTANAS: {
      ZAPOTAL: { code: '52', label: 'Zapotal' },
      QUINSALOMA: { code: '51', label: 'Quinsaloma' },
      VENTANAS_CABECERA_CANTONAL: {
        code: '50',
        label: 'Ventanas, Cabecera Cantonal',
      },
    },
    VINCES: {
      VINCES_CABECERA_CANTONAL: {
        code: '50',
        label: 'Vinces, Cabecera Cantonal',
      },
      ANTONIO_SOTOMAYOR_CAB_EN_PLAYAS_DE_VIN: {
        code: '51',
        label: 'Antonio Sotomayor (Cab. En Playas De Vin',
      },
      PALENQUE: { code: '52', label: 'Palenque' },
    },
    PALENQUE: {
      PALENQUE_CABECERA_CANTONAL: {
        code: '50',
        label: 'Palenque, Cabecera Cantonal',
      },
    },
    BUENA_FE: {
      SAN_JACINTO_DE_BUENA_FE: { code: '01', label: 'San Jacinto De Buena Fe' },
      '7_DE_AGOSTO': { code: '02', label: '7 De Agosto' },
      '11_DE_OCTUBRE': { code: '03', label: '11 De Octubre' },
      PATRICIA_PILAR: { code: '51', label: 'Patricia Pilar' },
      SAN_JACINTO_DE_BUENA_FE_CABECERA_CANTON: {
        code: '50',
        label: 'San Jacinto De Buena Fe, Cabecera Canton',
      },
    },
    VALENCIA: {
      VALENCIA_CABECERA_CANTONAL: {
        code: '50',
        label: 'Valencia, Cabecera Cantonal',
      },
    },
    MOCACHE: {
      MOCACHE_CAB_CANTONAL: { code: '50', label: 'Mocache, Cab. Cantonal' },
    },
  },
  MANABI: {
    PORTOVIEJO: {
      FRANCISCO_PACHECO: { code: '07', label: 'Francisco Pacheco' },
      SIMON_BOLIVAR: { code: '09', label: 'Simon Bolivar' },
      '18_DE_OCTUBRE': { code: '08', label: '18 De Octubre' },
      CHIRIJOS: { code: '27', label: 'Chirijos' },
      ALHAJUELA_BAJO_GRANDE: { code: '52', label: 'Alhajuela (Bajo Grande)' },
      ABDON_CALDERON_SAN_FRANCISCO: {
        code: '51',
        label: 'Abdon Calderon (San Francisco)',
      },
      SAN_PABLO: { code: '06', label: 'San Pablo' },
      RIOCHICO_RIO_CHICO: { code: '55', label: 'Riochico (Rio Chico)' },
      PUEBLO_NUEVO: { code: '54', label: 'Pueblo Nuevo' },
      CRUCITA: { code: '53', label: 'Crucita' },
      COLON: { code: '02', label: 'Colon' },
      ANDRES_DE_VERA: { code: '01', label: 'Andres De Vera' },
      PORTOVIEJO_CABECERA_CANTONAL_Y_CAPITAL: {
        code: '50',
        label: 'Portoviejo, Cabecera Cantonal Y Capital',
      },
      PORTOVIEJO: { code: '05', label: 'Portoviejo' },
      POCOAZA: { code: '04', label: 'Pocoaza' },
      '12_DE_MARZO': { code: '03', label: '12 De Marzo' },
      SAN_PLACIDO: { code: '56', label: 'San Placido' },
    },
    BOLIVAR: {
      MEMBRILLO: { code: '51', label: 'Membrillo' },
      CALCETA_CABECERA_CANTONAL: {
        code: '50',
        label: 'Calceta, Cabecera Cantonal',
      },
      QUIROGA: { code: '52', label: 'Quiroga' },
    },
    CHONE: {
      SAN_ANTONIO: { code: '57', label: 'San Antonio' },
      RICAURTE: { code: '56', label: 'Ricaurte' },
      CANUTO: { code: '52', label: 'Canuto' },
      BOYACA: { code: '51', label: 'Boyaca' },
      SANTA_RITA: { code: '02', label: 'Santa Rita' },
      ELOY_ALFARO: { code: '55', label: 'Eloy Alfaro' },
      CHIBUNGA: { code: '54', label: 'Chibunga' },
      CONVENTO: { code: '53', label: 'Convento' },
      CHONE: { code: '01', label: 'Chone' },
      CHONE_CABECERA_CANTONAL: {
        code: '50',
        label: 'Chone, Cabecera Cantonal',
      },
    },
    EL_CARMEN: {
      SAN_PEDRO_DE_SUMA: { code: '52', label: 'San Pedro De Suma' },
      EL_CARMEN_CABECERA_CANTONAL: {
        code: '50',
        label: 'El Carmen, Cabecera Cantonal',
      },
      WILFRIDO_LA_MOREIRA_MAICITO: {
        code: '51',
        label: 'Wilfrido La Moreira (Maicito)',
      },
      '4_DE_DICEMBRE': { code: '02', label: '4 De Dicembre' },
      EL_CARMEN: { code: '01', label: 'El Carmen' },
    },
    FLAVIO_ALFARO: {
      ZAPALLO: { code: '52', label: 'Zapallo' },
      SAN_FRANCISCO_DE_NOVILLO_CAB_EN_NOVILL: {
        code: '51',
        label: 'San Francisco De Novillo (Cab. En Novill',
      },
      FLAVIO_ALFARO_CABECERA_CANTONAL: {
        code: '50',
        label: 'Flavio Alfaro, Cabecera Cantonal',
      },
    },
    JIPIJAPA: {
      SAN_LORENZO_DE_JIPIJAPA: { code: '03', label: 'San Lorenzo De Jipijapa' },
      MANUEL_INOCENCIO_PARRALES_Y_GUALE: {
        code: '02',
        label: 'Manuel Inocencio Parrales Y Guale',
      },
      DR_MIGUEL_MORAN_LUCIO: { code: '01', label: 'Dr. Miguel Moran Lucio' },
      JIPIJAPA_CABECERA_CANTONAL: {
        code: '50',
        label: 'Jipijapa, Cabecera Cantonal',
      },
      PUERTO_LOPEZ: { code: '59', label: 'Puerto Lopez' },
      PUERTO_DE_CAYO: { code: '58', label: 'Puerto De Cayo' },
      PEDRO_PABLO_GOMEZ: { code: '57', label: 'Pedro Pablo Gomez' },
      JULCUY: { code: '53', label: 'Julcuy' },
      EL_ANEGADO_CAB_EN_ELOY_ALFARO: {
        code: '52',
        label: 'El Anegado (Cab. En Eloy Alfaro)',
      },
      AMERICA: { code: '51', label: 'America' },
      MEMBRILLAL: { code: '56', label: 'Membrillal' },
      MACHALILLA: { code: '55', label: 'Machalilla' },
      LA_UNION: { code: '54', label: 'La Union' },
    },
    JUNIN: {
      JUNIN_CABECERA_CANTONAL: {
        code: '50',
        label: 'Junin, Cabecera Cantonal',
      },
    },
    MANTA: {
      ELOY_ALFARO: { code: '05', label: 'Eloy Alfaro' },
      LOS_ESTEROS: { code: '01', label: 'Los Esteros' },
      MANTA_CABECERA_CANTONAL: {
        code: '50',
        label: 'Manta, Cabecera Cantonal',
      },
      MANTA: { code: '02', label: 'Manta' },
      TARQUI: { code: '04', label: 'Tarqui' },
      SAN_MATEO: { code: '03', label: 'San Mateo' },
      SAN_LORENZO: { code: '51', label: 'San Lorenzo' },
      SANTA_MARIANITA_BOCA_DE_PACHOCHE: {
        code: '52',
        label: 'Santa Marianita (Boca De Pachoche)',
      },
    },
    MONTECRISTI: {
      LA_PILA: { code: '52', label: 'La Pila' },
      MONTECRISTI: { code: '02', label: 'Montecristi' },
      ANIBAL_SAN_ANDRES: { code: '01', label: 'Anibal San Andres' },
      JARAMIJO: { code: '51', label: 'Jaramijo' },
      MONTECRISTI_CABECERA_CANTONAL: {
        code: '50',
        label: 'Montecristi, Cabecera Cantonal',
      },
    },
    PAJAN: {
      LASCANO: { code: '54', label: 'Lascano' },
      CAMPOZANO_LA_PALMA_DE_PAJAN: {
        code: '51',
        label: 'Campozano (La Palma De Pajan)',
      },
      PAJAN_CABECERA_CANTONAL: {
        code: '50',
        label: 'Pajan, Cabecera Cantonal',
      },
      CASCOL: { code: '52', label: 'Cascol' },
      GUALE: { code: '53', label: 'Guale' },
    },
    PICHINCHA: {
      PICHINCHA_CABECERA_CANTONAL: {
        code: '50',
        label: 'Pichincha, Cabecera Cantonal',
      },
      SAN_SEBASTIAN: { code: '52', label: 'San Sebastian' },
      BARRAGANETE: { code: '51', label: 'Barraganete' },
    },
    ROCAFUERTE: {
      ROCAFUERTE_CABECERA_CANTONAL: {
        code: '50',
        label: 'Rocafuerte, Cabecera Cantonal',
      },
    },
    SANTA_ANA: {
      AYACUCHO: { code: '51', label: 'Ayacucho' },
      LODANA: { code: '02', label: 'Lodana' },
      SANTA_ANA: { code: '01', label: 'Santa Ana' },
      HONORATO_VASQUEZ_CAB_EN_VASQUEZ: {
        code: '52',
        label: 'Honorato Vasquez (Cab. En Vasquez)',
      },
      SAN_PABLO_CAB_EN_PUEBLO_NUEVO: {
        code: '55',
        label: 'San Pablo (Cab. En Pueblo Nuevo)',
      },
      OLMEDO: { code: '54', label: 'Olmedo' },
      LA_UNION: { code: '53', label: 'La Union' },
      SANTA_ANA_DE_VUELTA_LARGA_CABECERA_CANT: {
        code: '50',
        label: 'Santa Ana De Vuelta Larga, Cabecera Cant',
      },
    },
    SUCRE: {
      BAHIA_DE_CARAQUEZ_CABECERA_CANTONAL: {
        code: '50',
        label: 'Bahia De Caraquez, Cabecera Cantonal',
      },
      COJIMIES: { code: '52', label: 'Cojimies' },
      CHARAPOTO: { code: '53', label: 'Charapoto' },
      CANOA: { code: '51', label: 'Canoa' },
      BAHIA_DE_CARAQUEZ: { code: '01', label: 'Bahia De Caraquez' },
      LEONIDAS_PLAZA_GUTIERREZ: {
        code: '02',
        label: 'Leonidas Plaza Gutierrez',
      },
      SAN_ISIDRO: { code: '57', label: 'San Isidro' },
      SAN_VICENTE: { code: '58', label: 'San Vicente' },
      PEDEMALES: { code: '56', label: 'Pedemales' },
      '10_DE_AGOSTO': { code: '54', label: '10 De Agosto' },
      JAMA: { code: '55', label: 'Jama' },
    },
    TOSAGUA: {
      BACHILLERO: { code: '51', label: 'Bachillero' },
      LA_ESTANCIA: { code: '52', label: 'La Estancia' },
      TOSAGUA_CABECERA_CANTONAL: {
        code: '50',
        label: 'Tosagua, Cabecera Cantonal',
      },
    },
    '24_DE_MAYO': {
      ARQ_SIXTO_DURAN_BALLEN: { code: '53', label: 'Arq. Sixto Duran Ballen' },
      BELLAVISTA: { code: '51', label: 'Bellavista' },
      NOBOA: { code: '52', label: 'Noboa' },
      SUCRE_CABECERA_CANTONAL: {
        code: '50',
        label: 'Sucre, Cabecera Cantonal',
      },
    },
    PEDERNALES: {
      ATAHUALPA: { code: '53', label: 'Atahualpa' },
      '10_DE_AGOSTO': { code: '52', label: '10 De Agosto' },
      PEDERNALES_CABECERA_CANTONAL: {
        code: '50',
        label: 'Pedernales, Cabecera Cantonal',
      },
      COJIMIES: { code: '51', label: 'Cojimies' },
    },
    OLMEDO: {
      OLMEDO_CABECERA_CANTONAL: {
        code: '50',
        label: 'Olmedo, Cabecera Cantonal',
      },
    },
    PUERTO_LOPEZ: {
      SALANGO: { code: '52', label: 'Salango' },
      PUERTO_LOPEZ_CABECERA_CANTONAL: {
        code: '50',
        label: 'Puerto Lopez, Cabecera Cantonal',
      },
      MACHALILLA: { code: '51', label: 'Machalilla' },
    },
    JAMA: { JAMA_CAB_CANTONAL: { code: '50', label: 'Jama, Cab. Cantonal' } },
    JARAMIJO: {
      JARAMIJO_CAB_CANTONAL: { code: '50', label: 'Jaramijo, Cab. Cantonal' },
    },
    SAN_VICENTE: {
      SAN_VICENTE_CAB_CANTONAL: {
        code: '50',
        label: 'San Vicente, Cab. Cantonal',
      },
      CANOA: { code: '51', label: 'Canoa' },
    },
  },
  MORONA_SANTIAGO: {
    MORONA: {
      SAN_ISIDRO: { code: '56', label: 'San Isidro' },
      MACUMA: { code: '55', label: 'Macuma' },
      SEVILLA_DON_BOSCO: { code: '57', label: 'Sevilla Don Bosco' },
      TAISHA: { code: '59', label: 'Taisha' },
      SINAI: { code: '58', label: 'Sinai' },
      ALSHI_CAB_EN_9_DE_OCTUBRE: {
        code: '51',
        label: 'Alshi (Cab. En 9 De Octubre)',
      },
      MACAS_CABECERA_CANTONAL: {
        code: '50',
        label: 'Macas, Cabecera Cantonal',
      },
      CHIGUAZA: { code: '52', label: 'Chiguaza' },
      HUASAGA_CAB_EN_WAMPUK: { code: '54', label: 'Huasaga (Cab. En Wampuk)' },
      GENERAL_PROANO: { code: '53', label: 'General Proaño' },
      TUUTINENTZA: { code: '61', label: 'Tuutinentza' },
      ZUNA_ZUNAC: { code: '60', label: 'Zuña (Zuñac)' },
      SAN_JOSE_DE_MORONA: { code: '63', label: 'San Jose De Morona' },
      CUCHAENTZA: { code: '62', label: 'Cuchaentza' },
      RIO_BLANCO: { code: '64', label: 'Rio Blanco' },
    },
    GUALAQUIZA: {
      CHIGÜINDA: { code: '54', label: 'Chigüinda' },
      BOMBOIZA: { code: '53', label: 'Bomboiza' },
      EL_ROSARIO: { code: '55', label: 'El Rosario' },
      SAN_MIGUEL_DE_CUYES: { code: '57', label: 'San Miguel De Cuyes' },
      NUEVA_TARQUI: { code: '56', label: 'Nueva Tarqui' },
      GUALAQUIZA_CABECERA_CANTONAL: {
        code: '50',
        label: 'Gualaquiza, Cabecera Cantonal',
      },
      BERMEJOS: { code: '52', label: 'Bermejos' },
      AMAZONAS_ROSARIO_DE_CUYES: {
        code: '51',
        label: 'Amazonas (Rosario De Cuyes)',
      },
      EL_IDEAL: { code: '58', label: 'El Ideal' },
      MERCEDES_MOLINA: { code: '02', label: 'Mercedes Molina' },
      GUALAQUIZA: { code: '01', label: 'Gualaquiza' },
    },
    LIMON_INDANZA: {
      SAN_ANTONIO_CAB_EN_SAN_ANTONIO_CENTRO: {
        code: '53',
        label: 'San Antonio (Cab. En San Antonio Centro)',
      },
      SAN_MIGUEL_DE_CONCHAY: { code: '56', label: 'San Miguel De Conchay' },
      SAN_JUAN_BOSCO: { code: '55', label: 'San Juan Bosco' },
      GENERAL_LEONIDAS_PLAZA_G_LIMON_CABEC: {
        code: '50',
        label: 'General Leonidas Plaza G. (Limon), Cabec',
      },
      SAN_CARLOS_DE_LIMON_SAN_CARLOS_DEL_ZAMO: {
        code: '54',
        label: 'San Carlos De Limon (San Carlos Del Zamo',
      },
      YUNGANZA_CAB_EN_EL_ROSARIO: {
        code: '58',
        label: 'Yunganza (Cab. En El Rosario)',
      },
      SANTA_SUSANA_DE_CHIVIAZA_CAB_EN_CHIVIA: {
        code: '57',
        label: 'Santa Susana De Chiviaza (Cab. En Chivia',
      },
      PAN_DE_AZUCAR: { code: '52', label: 'Pan De Azucar' },
      INDANZA: { code: '51', label: 'Indanza' },
    },
    PALORA: {
      SANGAY_CAB_EN_NAYAMANACA: {
        code: '54',
        label: 'Sangay (Cab. En Nayamanaca)',
      },
      HUAMBOYA: { code: '53', label: 'Huamboya' },
      '16_DE_AGOSTO': { code: '55', label: '16 De Agosto' },
      PALORA_METZERA_CABECERA_CANTONAL: {
        code: '50',
        label: 'Palora (Metzera), Cabecera Cantonal',
      },
      CUMANDA_CAB_EN_COLONIA_AGRICOLA_SEVILL: {
        code: '52',
        label: 'Cumanda (Cab. En Colonia Agricola Sevill',
      },
      ARAPICOS: { code: '51', label: 'Arapicos' },
    },
    SANTIAGO: {
      SAN_LUIS_DE_EL_ACHO_CAB_EN_EL_ACHO: {
        code: '54',
        label: 'San Luis De El Acho (Cab. En El Acho)',
      },
      PATUCA: { code: '53', label: 'Patuca' },
      SANTIAGO: { code: '55', label: 'Santiago' },
      TAYUZA: { code: '56', label: 'Tayuza' },
      SANTIAGO_DE_MENDEZ_CABECERA_CANTONAL: {
        code: '50',
        label: 'Santiago De Mendez, Cabecera Cantonal',
      },
      CHUPIANZA: { code: '52', label: 'Chupianza' },
      COPAL: { code: '51', label: 'Copal' },
      SAN_FRANCISCO_DE_CHINIMBIMI: {
        code: '57',
        label: 'San Francisco De Chinimbimi',
      },
    },
    SUCUA: {
      SUCUA_CABECERA_CANTONAL: {
        code: '50',
        label: 'Sucua, Cabecera Cantonal',
      },
      ASUNCION: { code: '51', label: 'Asuncion' },
      YAUPI: { code: '54', label: 'Yaupi' },
      SANTA_MARIANITA_DE_JESUS: {
        code: '55',
        label: 'Santa Marianita De Jesus',
      },
      HUAMBI: { code: '52', label: 'Huambi' },
      LOGRONO: { code: '53', label: 'Logroño' },
    },
    HUAMBOYA: {
      HUAMBOYA_CABECERA_CANTONAL: {
        code: '50',
        label: 'Huamboya, Cabecera Cantonal',
      },
      CHIGUAZA: { code: '51', label: 'Chiguaza' },
      PABLO_VI: { code: '52', label: 'Pablo Vi' },
    },
    SAN_JUAN_BOSCO: {
      SAN_CARLOS_DE_LIMON: { code: '52', label: 'San Carlos De Limon' },
      SAN_JACINTO_DE_WAKAMBEIS: {
        code: '53',
        label: 'San Jacinto De Wakambeis',
      },
      SAN_JUAN_BOSCO_CABECERA_CANTONAL: {
        code: '50',
        label: 'San Juan Bosco, Cabecera Cantonal',
      },
      PAN_DE_AZUCAR: { code: '51', label: 'Pan De Azucar' },
      SANTIAGO_DE_PANANZA: { code: '54', label: 'Santiago De Pananza' },
    },
    TAISHA: {
      MACUMA: { code: '52', label: 'Macuma' },
      TUUTINENTZA: { code: '53', label: 'Tuutinentza' },
      TAISHA_CAB_CANTONAL: { code: '50', label: 'Taisha. Cab. Cantonal' },
      HUASAGA: { code: '51', label: 'Huasaga' },
    },
    LOGRONO: {
      LOGRONO_CAB_CANTONAL: { code: '50', label: 'Logroño, Cab. Cantonal' },
      YAUPI: { code: '51', label: 'Yaupi' },
      SHIMPIS: { code: '52', label: 'Shimpis' },
    },
    PABLO_VI: {
      PABLO_VI_CAB_CANTONAL: { code: '50', label: 'Pablo Vi, Cab. Cantonal.' },
    },
    TIWINTZA: {
      SANTIAGO_CAB_CANTONAL: { code: '50', label: 'Santiago, Cab. Cantonal' },
      SAN_JOSE_DE_MORONA: { code: '51', label: 'San Jose De Morona' },
    },
  },
  NAPO: {
    TENA: {
      CARLOS_JULIO_AROSEMENA_TOLA_ZATZA_YACU: {
        code: '52',
        label: 'Carlos Julio Arosemena Tola (Zatza-Yacu)',
      },
      CHONTAPUNTA: { code: '53', label: 'Chontapunta' },
      PANO: { code: '54', label: 'Pano' },
      TENA_CABECERA_CANTONAL_Y_CAPITAL_PROVIN: {
        code: '50',
        label: 'Tena, Cabecera Cantonal Y Capital Provin',
      },
      AHUANO: { code: '51', label: 'Ahuano' },
      PUERTO_MISAHUALLI: { code: '55', label: 'Puerto Misahualli' },
      PUERTO_NAPO: { code: '56', label: 'Puerto Napo' },
      TALAG: { code: '57', label: 'Talag' },
    },
    AGUARICO: {
      CAPITAN_AUGUSTO_RIVADENEYRA: {
        code: '51',
        label: 'Capitan Augusto Rivadeneyra',
      },
      CONONACO: { code: '52', label: 'Cononaco' },
      SANTA_MARIA_DE_HUIRIRIMA: {
        code: '53',
        label: 'Santa Maria De Huiririma',
      },
      NUEVO_ROCAFUERTE_CABECERA_CANTONAL: {
        code: '50',
        label: 'Nuevo Rocafuerte, Cabecera Cantonal',
      },
      TIPUTINI: { code: '54', label: 'Tiputini' },
      YASUNI: { code: '55', label: 'Yasuni' },
    },
    ARCHIDONA: {
      AVILA: { code: '51', label: 'Avila' },
      COTUNDO: { code: '52', label: 'Cotundo' },
      LORETO: { code: '53', label: 'Loreto' },
      ARCHIDONA_CABECERA_CANTONAL: {
        code: '50',
        label: 'Archidona, Cabecera Cantonal',
      },
      SAN_PABLO_DE_USHPAYACU: { code: '54', label: 'San Pablo De Ushpayacu' },
      PUERTO_MURIALDO: { code: '55', label: 'Puerto Murialdo' },
    },
    EL_CHACO: {
      SANTA_ROSA: { code: '54', label: 'Santa Rosa' },
      SARDINAS: { code: '55', label: 'Sardinas' },
      GONZALO_DIAZ_DE_PINEDA_EL_BOMBON: {
        code: '51',
        label: 'Gonzalo Diaz De Pineda (El Bombon)',
      },
      LINARES: { code: '52', label: 'Linares' },
      OYACACHI: { code: '53', label: 'Oyacachi' },
      EL_CHACO_CABECERA_CANTONAL: {
        code: '50',
        label: 'El Chaco, Cabecera Cantonal',
      },
    },
    LA_JOYA_DE_LOS_SACHAS: {
      ENOKANQUI: { code: '51', label: 'Enokanqui' },
      POMPEYA: { code: '52', label: 'Pompeya' },
      SAN_CARLOS: { code: '53', label: 'San Carlos' },
      LA_JOYA_DE_LOS_SACHAS_CABECERA_CANTONAL: {
        code: '50',
        label: 'La Joya De Los Sachas, Cabecera Cantonal',
      },
      SAN_SEBASTIAN_DEL_COCA: { code: '54', label: 'San Sebastian Del Coca' },
    },
    ORELLANA: {
      'TARACOA_CAB_EN_NUEVA_ESPERANZA:_YUCA': {
        code: '52',
        label: 'Taracoa (Cab. En Nueva Esperanza: Yuca)',
      },
      PUERTO_FRANCISCO_DE_ORELLANA_COCA_CAB: {
        code: '50',
        label: 'Puerto Francisco De Orellana (Coca), Cab',
      },
      DAYUMA: { code: '51', label: 'Dayuma' },
    },
    QUIJOS: {
      PAPALLACTA: { code: '53', label: 'Papallacta' },
      CUYJA: { code: '52', label: 'Cuyja' },
      SUMACO: { code: '56', label: 'Sumaco' },
      SAN_JOSE_DEL_PAYAMINO: { code: '55', label: 'San Jose Del Payamino' },
      SAN_FRANCISCO_DE_BORJA_VIRGILIO_DAVILA: {
        code: '54',
        label: 'San Francisco De Borja (Virgilio Davila)',
      },
      BAEZA_CABECERA_CANTONAL: {
        code: '50',
        label: 'Baeza, Cabecera Cantonal',
      },
      COSANGA: { code: '51', label: 'Cosanga' },
    },
    LORETO: {
      PUERTO_MURIALDO: { code: '52', label: 'Puerto Murialdo' },
      AVILA_CAB_EN_HUIRUNO: { code: '51', label: 'Avila (Cab. En Huiruno)' },
      LORETO_CABECERA_CANTONAL: {
        code: '50',
        label: 'Loreto, Cabecera Cantonal',
      },
      SAN_VICENTE_DE_HUATICOCHA: {
        code: '55',
        label: 'San Vicente De Huaticocha',
      },
      SAN_JOSE_DE_DAHUANO: { code: '54', label: 'San Jose De Dahuano' },
      SAN_JOSE_DEL_PAYAMINO: { code: '53', label: 'San Jose Del Payamino' },
    },
    CARLOS_JULIO_ARESEMENA_TOLA: {
      CARLOS_JULIO_AROSEMENA_T_CAB_CANTONAL: {
        code: '50',
        label: 'Carlos Julio Arosemena T. Cab. Cantonal',
      },
    },
  },
  PASTAZA: {
    PASTAZA: {
      SIMON_BOLIVAR_CAB_EN_MUSHULLACTA: {
        code: '62',
        label: 'Simon Bolivar (Cab. En Mushullacta)',
      },
      TARQUI: { code: '63', label: 'Tarqui' },
      TENIENTE_HUGO_ORTIZ: { code: '64', label: 'Teniente Hugo Ortiz' },
      RIO_TIGRE: { code: '59', label: 'Rio Tigre' },
      SANTA_CLARA: { code: '60', label: 'Santa Clara' },
      SARAYACU: { code: '61', label: 'Sarayacu' },
      VERACRUZ_INDILAMA_CAB_EN_INDILAMA: {
        code: '65',
        label: 'Veracruz (Indilama) (Cab. En Indilama)',
      },
      EL_TRIUNFO: { code: '66', label: 'El Triunfo' },
      PUYO_CABECERA_CANTONAL_Y_CAPITAL_PROVIN: {
        code: '50',
        label: 'Puyo, Cabecera Cantonal Y Capital Provin',
      },
      ARAJUNO: { code: '51', label: 'Arajuno' },
      CANELOS: { code: '52', label: 'Canelos' },
      MONTALVO_ANDOAS: { code: '56', label: 'Montalvo (Andoas)' },
      POMONA: { code: '57', label: 'Pomona' },
      RIO_CORRIENTES: { code: '58', label: 'Rio Corrientes' },
      CURARAY: { code: '53', label: 'Curaray' },
      DIEZ_DE_AGOSTO: { code: '54', label: 'Diez De Agosto' },
      FATIMA: { code: '55', label: 'Fatima' },
    },
    MERA: {
      MADRE_TIERRA: { code: '51', label: 'Madre Tierra' },
      SHELL: { code: '52', label: 'Shell' },
      MERA_CABECERA_CANTONAL: { code: '50', label: 'Mera, Cabecera Cantonal' },
    },
    SANTA_CLARA: {
      SANTA_CLARA_CABECERA_CANTONAL: {
        code: '50',
        label: 'Santa Clara, Cabecera Cantonal',
      },
      SAN_JOSE: { code: '51', label: 'San Jose' },
    },
    ARAJUNO: {
      CURARAY: { code: '51', label: 'Curaray' },
      ARAJUNO_CAB_CANTONAL: { code: '50', label: 'Arajuno, Cab. Cantonal' },
    },
  },
  PICHINCHA: {
    QUITO: {
      PUERTO_QUITO: { code: '87', label: 'Puerto Quito' },
      ZAMBIZA: { code: '86', label: 'Zambiza' },
      TABACELA: { code: '83', label: 'Tabacela' },
      TUMBACO: { code: '84', label: 'Tumbaco' },
      YARUQUI: { code: '85', label: 'Yaruqui' },
      PACTO: { code: '72', label: 'Pacto' },
      PEDRO_VICENTE_MALDONADO: { code: '73', label: 'Pedro Vicente Maldonado' },
      PERUCHO: { code: '74', label: 'Perucho' },
      PIFO: { code: '75', label: 'Pifo' },
      SAN_ANTONIO: { code: '80', label: 'San Antonio' },
      SAN_JOSE_DE_MINAS: { code: '81', label: 'San Jose De Minas' },
      SAN_MIGUEL_DE_LOS_BANCOS: {
        code: '82',
        label: 'San Miguel De Los Bancos',
      },
      PUEMBO: { code: '79', label: 'Puembo' },
      PINTAG: { code: '76', label: 'Pintag' },
      POMASQUI: { code: '77', label: 'Pomasqui' },
      PUELLARO: { code: '78', label: 'Puellaro' },
      LA_MAGDALENA: { code: '11', label: 'La Magdalena' },
      LA_VICENTINA: { code: '12', label: 'La Vicentina' },
      LA_LIBERTAD: { code: '10', label: 'La Libertad' },
      GUAPULO: { code: '08', label: 'Guapulo' },
      LA_FLORESTA: { code: '09', label: 'La Floresta' },
      SAN_SEBASTIAN: { code: '16', label: 'San Sebastian' },
      SANTA_BARBARA: { code: '17', label: 'Santa Barbara' },
      SAN_ROQUE: { code: '15', label: 'San Roque' },
      SAN_BLAS: { code: '13', label: 'San Blas' },
      SAN_MARCOS: { code: '14', label: 'San Marcos' },
      GONZALEZ_SUAREZ: { code: '07', label: 'Gonzalez Suarez' },
      QUITO_CABECERA_CANTONAL_CAPITAL_PROV: {
        code: '50',
        label: 'Quito, Cabecera Cantonal Capital Prov.',
      },
      ALFARO_CHIMBACALLE: { code: '01', label: 'Alfaro (Chimbacalle)' },
      GUALEA: { code: '61', label: 'Gualea' },
      GUAYLLABAMBA: { code: '63', label: 'Guayllabamba' },
      GUANGOPOLO: { code: '62', label: 'Guangopolo' },
      CHILLOGALLO: { code: '05', label: 'Chillogallo' },
      EL_SALVADOR: { code: '06', label: 'El Salvador' },
      CHAUPICRUZ_LA_CONCEPCION: {
        code: '04',
        label: 'Chaupicruz (La Concepcion)',
      },
      BENALCAZAR: { code: '02', label: 'Benalcazar' },
      COTOCOLLAO: { code: '03', label: 'Cotocollao' },
      CALACALI: { code: '54', label: 'Calacali' },
      CALDERON_CARAPUNGO: { code: '55', label: 'Calderon (Carapungo)' },
      ATAHUALPA_HABASPAMBA: { code: '53', label: 'Atahualpa (Habaspamba)' },
      ALANGASI: { code: '51', label: 'Alangasi' },
      AMAGUANA: { code: '52', label: 'Amaguaña' },
      CHECA_CHILPA: { code: '59', label: 'Checa (Chilpa)' },
      EL_QUINCHE: { code: '60', label: 'El Quinche' },
      CHAVEZPAMBA: { code: '58', label: 'Chavezpamba' },
      CONOCOTO: { code: '56', label: 'Conocoto' },
      CUMBAYA: { code: '57', label: 'Cumbaya' },
      LAS_CUADRAS: { code: '28', label: 'Las Cuadras' },
      CHIMBACALLE: { code: '21', label: 'Chimbacalle' },
      EL_BATAN: { code: '22', label: 'El Batan' },
      CARCELEN: { code: '20', label: 'Carcelen' },
      SANTA_PRISCA: { code: '18', label: 'Santa Prisca' },
      VILLA_FLORA: { code: '19', label: 'Villa Flora' },
      GUAMANI: { code: '26', label: 'Guamani' },
      LA_CONCEPCION: { code: '27', label: 'La Concepcion' },
      ELOY_ALFARO: { code: '25', label: 'Eloy Alfaro' },
      EL_BEATERIO: { code: '23', label: 'El Beaterio' },
      EL_INCA: { code: '24', label: 'El Inca' },
      LA_MERCED: { code: '64', label: 'La Merced' },
      SAN_ISIDRO_DEL_INCA: { code: '29', label: 'San Isidro Del Inca' },
      NONO: { code: '71', label: 'Nono' },
      SANJUAN: { code: '30', label: 'Sanjuan' },
      TURUBAMBA: { code: '32', label: 'Turubamba' },
      SOLANDA: { code: '31', label: 'Solanda' },
      NAYON: { code: '70', label: 'Nayon' },
      LLOA: { code: '66', label: 'Lloa' },
      LLANO_CHICO: { code: '65', label: 'Llano Chico' },
      MINDO: { code: '67', label: 'Mindo' },
      NANEGALITO: { code: '69', label: 'Nanegalito' },
      NANEGAL: { code: '68', label: 'Nanegal' },
    },
    CAYAMBE: {
      CAYAMBE_CABECERA_CANTONAL: {
        code: '50',
        label: 'Cayambe, Cabecera Cantonal',
      },
      AYORA: { code: '01', label: 'Ayora' },
      CAYAMBE: { code: '02', label: 'Cayambe' },
      JUAN_MONTALVO: { code: '03', label: 'Juan Montalvo' },
      ASCAZUBI: { code: '51', label: 'Ascazubi' },
      CANGAHUA: { code: '52', label: 'Cangahua' },
      OLMEDO_PESILLO: { code: '53', label: 'Olmedo (Pesillo)' },
      OTON: { code: '54', label: 'Oton' },
      SANTA_ROSA_DE_CUZUBAMBA: { code: '55', label: 'Santa Rosa De Cuzubamba' },
    },
    MEJIA: {
      ALOAG: { code: '51', label: 'Aloag' },
      ALOASI: { code: '52', label: 'Aloasi' },
      CUTUGLAHUA: { code: '53', label: 'Cutuglahua' },
      MACHACHI_CABECERA_CANTONAL: {
        code: '50',
        label: 'Machachi, Cabecera Cantonal',
      },
      EL_CHAUPI: { code: '54', label: 'El Chaupi' },
      MANUEL_CORNEJO_ASTORGA_TANDAPI: {
        code: '55',
        label: 'Manuel Cornejo Astorga (Tandapi)',
      },
      TAMBILLO: { code: '56', label: 'Tambillo' },
      UYUMBICHO: { code: '57', label: 'Uyumbicho' },
    },
    PEDRO_MONCAYO: {
      LA_ESPERANZA: { code: '51', label: 'La Esperanza' },
      MALCHINGUI: { code: '52', label: 'Malchingui' },
      TOCACHI: { code: '53', label: 'Tocachi' },
      TABACUNDO_CABECERA_CANTONAL: {
        code: '50',
        label: 'Tabacundo, Cabecera Cantonal',
      },
      TUPIGACHI: { code: '54', label: 'Tupigachi' },
    },
    RUMINAHUI: {
      SAN_PEDRO_DE_TABOADA: { code: '02', label: 'San Pedro De Taboada' },
      SANGOLQUI: { code: '01', label: 'Sangolqui' },
      SANGOLQUI_CABECERA_CANTONAL: {
        code: '50',
        label: 'Sangolqui, Cabecera Cantonal',
      },
      SAN_RAFAEL: { code: '03', label: 'San Rafael' },
      RIMIPAMBA: { code: '52', label: 'Rimipamba' },
      COTOGCHOA: { code: '51', label: 'Cotogchoa' },
    },
    SANTO_DOMINGO: {
      LUZ_DE_AMERICA: { code: '53', label: 'Luz De America' },
      VALLE_HERMOSO: { code: '55', label: 'Valle Hermoso' },
      SAN_JACINTO_DEL_BUA: { code: '54', label: 'San Jacinto Del  Bua' },
      PUERTO_LIMON: { code: '52', label: 'Puerto Limon' },
      RIO_TOACHI: { code: '04', label: 'Rio Toachi' },
      CHIGUILPE: { code: '03', label: 'Chiguilpe' },
      BOMBOLI: { code: '02', label: 'Bomboli' },
      RIO_VERDE: { code: '05', label: 'Rio Verde' },
      ALLURIQUIN: { code: '51', label: 'Alluriquin' },
      ZARACAY: { code: '07', label: 'Zaracay' },
      SANTO_DOMINGO_DE_LOS_COLORADOS: {
        code: '06',
        label: 'Santo Domingo De Los Colorados',
      },
      ABRAHAM_CALAZACON: { code: '01', label: 'Abraham Calazacon' },
      SANTO_DOMINGO_DE_LOS_COLORADOS_CABECERA: {
        code: '50',
        label: 'Santo Domingo De Los Colorados, Cabecera',
      },
    },
    SAN_MIGUEL_DE_LOS_BANCOS: {
      MINDO: { code: '51', label: 'Mindo' },
      SAN_MIGUEL_DE_LOS_BANCOS_CABECERA_CANTO: {
        code: '50',
        label: 'San Miguel De Los Bancos, Cabecera Canto',
      },
      PUERTO_QUITO: { code: '53', label: 'Puerto Quito' },
      PEDRO_VICENTE_MALDONADO: { code: '52', label: 'Pedro Vicente Maldonado' },
    },
    PEDRO_VICENTE_MALDONADO: {
      PEDRO_VICENTE_MALDONADO_CABECERA_CANTON: {
        code: '50',
        label: 'Pedro Vicente Maldonado, Cabecera Canton',
      },
    },
    PUERTO_QUITO: {
      PUERTO_QUITO_CABECERA_CANTONAL: {
        code: '50',
        label: 'Puerto Quito, Cabecera Cantonal',
      },
    },
  },
  TUNGURAHUA: {
    AMBATO: {
      AMBATO_CABECERA_CANTONAL_Y_CAPITAL_PROV: {
        code: '50',
        label: 'Ambato Cabecera Cantonal Y Capital Prov.',
      },
      CUNCHIBAMBA: { code: '67', label: 'Cunchibamba' },
      UNAMUNCHO: { code: '68', label: 'Unamuncho' },
      AMBATILLO: { code: '51', label: 'Ambatillo' },
      ATAHUALPA_CHISALATA: { code: '52', label: 'Atahualpa (Chisalata)' },
      PISHILATA: { code: '08', label: 'Pishilata' },
      SAN_FRANCISCO: { code: '09', label: 'San Francisco' },
      AUGUSTO_N_MARTINEZ_MUNDUGLEO: {
        code: '53',
        label: 'Augusto N. Martinez (Mundugleo)',
      },
      IZAMBA: { code: '56', label: 'Izamba' },
      JUAN_BENIGNO_VELA: { code: '57', label: 'Juan Benigno Vela' },
      CONSTANTINO_FERNANDEZ_CAB_EN_CULLITAHU: {
        code: '54',
        label: 'Constantino Fernandez (Cab. En Cullitahu',
      },
      HUACHI_GRANDE: { code: '55', label: 'Huachi Grande' },
      ATOCHA_FICOA: { code: '01', label: 'Atocha-Ficoa' },
      CELIANO_MONGE: { code: '02', label: 'Celiano Monge' },
      HUACHI_CHICO: { code: '03', label: 'Huachi Chico' },
      LA_PENINSULA: { code: '06', label: 'La Peninsula' },
      MATRIZ: { code: '07', label: 'Matriz' },
      HUACHI_LORETO: { code: '04', label: 'Huachi Loreto' },
      LA_MERCED: { code: '05', label: 'La Merced' },
      PILAGÜIN_PILAHUIN: { code: '61', label: 'Pilagüin (Pilahuin)' },
      QUISAPINCHA_QUIZAPINCHA: {
        code: '62',
        label: 'Quisapincha (Quizapincha)',
      },
      SANTA_ROSA: { code: '65', label: 'Santa Rosa' },
      TOTORAS: { code: '66', label: 'Totoras' },
      SAN_BARTOLOME_DE_PINLLOG: {
        code: '63',
        label: 'San Bartolome De Pinllog',
      },
      SAN_FERNANDO_PASA_SAN_FERNANDO: {
        code: '64',
        label: 'San Fernando (Pasa San Fernando)',
      },
      PICAIGUA: { code: '60', label: 'Picaigua' },
      MONTALVO: { code: '58', label: 'Montalvo' },
      PASA: { code: '59', label: 'Pasa' },
    },
    BANOS: {
      RIO_VERDE: { code: '53', label: 'Rio Verde' },
      ULBA: { code: '54', label: 'Ulba' },
      BANOS_CABECERA_CANTONAL: {
        code: '50',
        label: 'Baños, Cabecera Cantonal',
      },
      LLIGUA: { code: '51', label: 'Lligua' },
      RIO_NEGRO: { code: '52', label: 'Rio Negro' },
    },
    CEVALLOS: {
      CEVALLOS_CABECERA_CANTONAL: {
        code: '50',
        label: 'Cevallos, Cabecera Cantonal',
      },
    },
    MOCHA: {
      MOCHA_CABECERA_CANTONAL: {
        code: '50',
        label: 'Mocha, Cabecera Cantonal',
      },
      PINGUILI: { code: '51', label: 'Pinguili' },
    },
    PATATE: {
      PATATE_CABECERA_CANTONAL: {
        code: '50',
        label: 'Patate, Cabecera Cantonal',
      },
      SUCRE_CAB_EN_SUCRE_PATATE_URCU: {
        code: '53',
        label: 'Sucre (Cab. En Sucre-Patate-Urcu)',
      },
      EL_TRIUNFO: { code: '51', label: 'El Triunfo' },
      LOS_ANDES_CAB_EN_POATUG: {
        code: '52',
        label: 'Los Andes (Cab. En Poatug)',
      },
    },
    QUERO: {
      QUERO_CABECERA_CANTONAL: {
        code: '50',
        label: 'Quero, Cabecera Cantonal',
      },
      RIMIPAMBA: { code: '51', label: 'Rimipamba' },
      YANAYACU_MOCHAPATA_CAB_EN_YANAYACU: {
        code: '52',
        label: 'Yanayacu-Mochapata (Cab. En Yanayacu)',
      },
    },
    SAN_PEDRO_DE_PELILEO: {
      QHIQUICHA_CAB_EN_CHIQUICHA_GRANDE: {
        code: '54',
        label: 'Qhiquicha (Cab. En Chiquicha Grande)',
      },
      BOLIVAR: { code: '52', label: 'Bolivar' },
      COTALO: { code: '53', label: 'Cotalo' },
      GARCIA_MORENO_CHUMAQUI: { code: '56', label: 'Garcia Moreno (Chumaqui)' },
      EL_ROSARIO_RUMICHACA: { code: '55', label: 'El Rosario (Rumichaca' },
      SALASACA: { code: '58', label: 'Salasaca' },
      GUAMBALO_HUAMBALO: { code: '57', label: 'Guambalo (Huambalo)' },
      BENITEZ_PACHANLICA: { code: '51', label: 'Benitez (Pachanlica)' },
      PELILEO: { code: '01', label: 'Pelileo' },
      PELILEO_GRANDE: { code: '02', label: 'Pelileo Grande' },
      PELILEO_CABECERA_CANTONAL: {
        code: '50',
        label: 'Pelileo, Cabecera Cantonal',
      },
    },
    TISALEO: {
      QUINCHICOTO: { code: '51', label: 'Quinchicoto' },
      TISALEO_CABECERA_CANTONAL: {
        code: '50',
        label: 'Tisaleo, Cabecera Cantonal',
      },
      PILLARO: { code: '02', label: 'Pillaro' },
      CIUDAD_NUEVA: { code: '01', label: 'Ciudad Nueva' },
      EMILIO_MARIA_TERAN_RUMIPAMBA: {
        code: '52',
        label: 'Emilio Maria Teran (Rumipamba)',
      },
      MARCOS_ESPINEL_CHACATA: { code: '53', label: 'Marcos Espinel (Chacata)' },
      SAN_JOSE_DE_POALO: { code: '56', label: 'San Jose De Poalo' },
      SAN_MIGUELITO: { code: '57', label: 'San Miguelito' },
      PRESIDENTE_URBINA_CHAGRAPAMBA_PATZUCUL: {
        code: '54',
        label: 'Presidente Urbina (Chagrapamba -Patzucul',
      },
      SAN_ANDRES: { code: '55', label: 'San Andres' },
    },
    SANTIAGO_DE_PILLARO: {
      BAQUERIZO_MORENO: { code: '51', label: 'Baquerizo Moreno' },
      EMILIO_MARIA_TERAN_RUMIPAMBA: {
        code: '52',
        label: 'Emilio Maria Teran (Rumipamba)',
      },
      MARCOS_ESPINEL_CHACATA: { code: '53', label: 'Marcos Espinel (Chacata)' },
      SAN_ANDRES: { code: '55', label: 'San Andres' },
      PRESIDENTE_URBINA_CHAGRAPAMBA_PATZUCUI: {
        code: '54',
        label: 'Presidente Urbina (Chagrapamba-Patzucui)',
      },
      SAN_MIGUELITO: { code: '57', label: 'San Miguelito' },
      SAN_JOSE_DE_POALO: { code: '56', label: 'San Jose  De Poalo' },
      CIUDAD_NUEVA: { code: '01', label: 'Ciudad Nueva' },
      PILLARO: { code: '02', label: 'Pillaro' },
      PILLARO_CAB_CANTONAL: { code: '50', label: 'Pillaro, Cab Cantonal' },
      QUINCHICOTO: { code: '81', label: 'Quinchicoto' },
    },
  },
  ZAMORA_CHINCHIPE: {
    ZAMORA: {
      TIMBARA: { code: '56', label: 'Timbara' },
      SABANILLA: { code: '55', label: 'Sabanilla' },
      PAQUISHA: { code: '54', label: 'Paquisha' },
      SAN_CARLOS_DE_LAS_MINAS: { code: '58', label: 'San Carlos De Las Minas' },
      ZUMBI: { code: '57', label: 'Zumbi' },
      ZAMORA: { code: '02', label: 'Zamora' },
      EL_LIMON: { code: '01', label: 'El Limon' },
      ZAMORA_CABECERA_CANTONAL_Y_CAPITAL_PROV: {
        code: '50',
        label: 'Zamora, Cabecera Cantonal Y Capital Prov',
      },
      IMBANA_LA_VICTORIA_DE_IMBANA: {
        code: '53',
        label: 'Imbana (La Victoria De Imbana)',
      },
      GUADALUPE: { code: '52', label: 'Guadalupe' },
      CUMBARATZA: { code: '51', label: 'Cumbaratza' },
    },
    CHINCHIPE: {
      VALLADOLID: { code: '58', label: 'Valladolid' },
      SAN_ANDRES: { code: '59', label: 'San Andres' },
      ZUMBA_CABECERA_CANTONAL: {
        code: '50',
        label: 'Zumba, Cabecera Cantonal',
      },
      CHITO: { code: '51', label: 'Chito' },
      SAN_FRANCISCO_DEL_VERGEL: {
        code: '57',
        label: 'San Francisco Del Vergel',
      },
      PUCAPAMBA: { code: '56', label: 'Pucapamba' },
      PALANDA: { code: '55', label: 'Palanda' },
      LA_CHONTA: { code: '54', label: 'La Chonta' },
      EL_PORVENIR_DEL_CARMEN: { code: '53', label: 'El Porvenir Del Carmen' },
      EL_CHORRO: { code: '52', label: 'El Chorro' },
    },
    NANGARITZA: {
      GUAYZIMI_CABECERA_CANTONAL: {
        code: '50',
        label: 'Guayzimi, Cabecera Cantonal',
      },
      ZURMI: { code: '51', label: 'Zurmi' },
    },
    YACUAMBI: {
      LA_PAZ: { code: '51', label: 'La Paz' },
      '28_DE_MAYO_SAN_JOSE_DE_YACUAMBI_CABEC': {
        code: '50',
        label: '28 De Mayo (San Jose De Yacuambi), Cabec',
      },
      TUTUPALI: { code: '52', label: 'Tutupali' },
    },
    YANTZAZA: {
      CHICANA: { code: '51', label: 'Chicaña' },
      YANTZAZA_YANTZAZA_CABECERA_CANTONAL: {
        code: '50',
        label: 'Yantzaza, Yantzaza, Cabecera Cantonal',
      },
      EL_PANGUI: { code: '52', label: 'El Pangui' },
      LOS_ENCUENTROS: { code: '53', label: 'Los Encuentros' },
    },
    EL_PANGUI: {
      PACHICUTZA: { code: '52', label: 'Pachicutza' },
      EL_GUISME: { code: '51', label: 'El Guisme' },
      TUNDAYME: { code: '53', label: 'Tundayme' },
      EL_PANGUI_CABECERA_CANTONAL: {
        code: '50',
        label: 'El Pangui, Cabecera Cantonal',
      },
    },
    CENTINELA_DEL_CONDOR: {
      PAQUISHA: { code: '51', label: 'Paquisha' },
      ZUMBI_CABECERA_CANTONAL: {
        code: '50',
        label: 'Zumbi, Cabecera Cantonal',
      },
    },
    PALANDA: {
      VALLADOLID: { code: '53', label: 'Valladolid' },
      SAN_FRANCISCO_DEL_VERGEL: {
        code: '52',
        label: 'San Francisco Del Vergel',
      },
      LA_CANELA: { code: '54', label: 'La Canela' },
      EL_PORVENIR_DEL_CARMEN: { code: '51', label: 'El Porvenir Del Carmen' },
      PALANDA_CAB_CANTONAL: { code: '50', label: 'Palanda, Cab Cantonal' },
    },
    PAQUISHA: {
      BELLAVISTA: { code: '51', label: 'Bellavista' },
      NUEVO_QUITO: { code: '52', label: 'Nuevo Quito' },
      PAQUISHA_CAB_CANTONAL: { code: '50', label: 'Paquisha, Cab. Cantonal' },
    },
  },
  GALAPAGOS: {
    SAN_CRISTOBAL: {
      PUERTO_BAQUERIZO_MORENO_CABECERA_CANTON: {
        code: '50',
        label: 'Puerto Baquerizo Moreno, Cabecera Canton',
      },
      EL_PROGRESO: { code: '51', label: 'El Progreso' },
      ISLA_SANTA_MARIA_FLOREANA_CAB_PTRO: {
        code: '52',
        label: 'Isla Santa Maria (Floreana) (Cab. Ptro.',
      },
    },
    ISABELA: {
      PUERTO_VILLAMIL_CABECERA_CANTONAL: {
        code: '50',
        label: 'Puerto Villamil, Cabecera Cantonal',
      },
      TOMAS_DE_BERLANGA_SANTO_TOMAS: {
        code: '51',
        label: 'Tomas De Berlanga (Santo Tomas)',
      },
    },
    SANTA_CRUZ: {
      BELLAVISTA: { code: '51', label: 'Bellavista' },
      SANTA_ROSA: { code: '52', label: 'Santa Rosa' },
      PUERTO_AYORA_CABECERA_CANTONAL: {
        code: '50',
        label: 'Puerto Ayora, Cabecera Cantonal',
      },
    },
  },
  SUCUMBIOS: {
    LAGO_AGRIO: {
      EL_ENO: { code: '55', label: 'El Eno' },
      PACAYACU: { code: '56', label: 'Pacayacu' },
      GENERAL_FARFAN: { code: '53', label: 'General Farfan' },
      TARAPOA: { code: '54', label: 'Tarapoa' },
      JAMBELI: { code: '57', label: 'Jambeli' },
      SANTA_CECILIA: { code: '58', label: 'Santa Cecilia' },
      AGUAS_NEGRAS: { code: '59', label: 'Aguas Negras' },
      NUEVA_LOJA_CABECERA_CANTONAL_Y_CAPITAL: {
        code: '50',
        label: 'Nueva Loja, Cabecera Cantonal Y Capital',
      },
      CUYABENO: { code: '51', label: 'Cuyabeno' },
      DURENO: { code: '52', label: 'Dureno' },
    },
    GONZALO_PIZARRO: {
      PUERTO_LIBRE: { code: '54', label: 'Puerto Libre' },
      SANTA_ROSA_DE_SUCUMBIOS: { code: '55', label: 'Santa Rosa De Sucumbios' },
      GONZALO_PIZARRO: { code: '52', label: 'Gonzalo Pizarro' },
      LUMBAQUI: { code: '53', label: 'Lumbaqui' },
      EL_DORADO_DE_CASCALES_LUMBAQUI_CABECER: {
        code: '50',
        label: 'El Dorado De Cascales, Lumbaqui, Cabecer',
      },
      EL_REVENTADOR: { code: '51', label: 'El Reventador' },
    },
    PUTUMAYO: {
      PUERTO_BOLIVAR_PUERTO_MONTUFAR: {
        code: '52',
        label: 'Puerto Bolivar (Puerto Montufar)',
      },
      PUERTO_RODRIGUEZ: { code: '53', label: 'Puerto Rodriguez' },
      PUERTO_EL_CARMEN_DEL_PUTUMAYO_CABECERA: {
        code: '50',
        label: 'Puerto El Carmen Del Putumayo, Cabecera',
      },
      PALMA_ROJA: { code: '51', label: 'Palma Roja' },
      SANTA_ELENA: { code: '54', label: 'Santa Elena' },
    },
    SHUSHUFINDI: {
      LIMONCOCHA: { code: '51', label: 'Limoncocha' },
      PANACOCHA: { code: '52', label: 'Pañacocha' },
      SHUSHUFINDI_CABECERA_CANTONAL: {
        code: '50',
        label: 'Shushufindi, Cabecera Cantonal',
      },
      SIETE_DE_JULIO: { code: '55', label: 'Siete De Julio' },
      SAN_ROQUE_CAB_EN_SAN_VICENTE: {
        code: '53',
        label: 'San Roque (Cab. En San Vicente)',
      },
      SAN_PEDRO_DE_LOS_COFANES: {
        code: '54',
        label: 'San Pedro De Los Cofanes',
      },
    },
    SUCUMBIOS: {
      ROSA_FLORIDA: { code: '53', label: 'Rosa Florida' },
      SANTA_BARBARA: { code: '54', label: 'Santa Barbara' },
      EL_PLAYON_DE_SAN_FRANCISCO: {
        code: '51',
        label: 'El Playon De San Francisco',
      },
      LA_SOFIA: { code: '52', label: 'La Sofia' },
      LA_BONITA_CABECERA_CANTONAL: {
        code: '50',
        label: 'La Bonita, Cabecera Cantonal',
      },
    },
    CASCALES: {
      SEVILLA: { code: '52', label: 'Sevilla' },
      EL_DORADO_DE_CASCALES_CABECERA_CANTONAL: {
        code: '50',
        label: 'El Dorado De Cascales, Cabecera Cantonal',
      },
      SANTA_ROSA_DE_SUCUMBIOS: { code: '51', label: 'Santa Rosa De Sucumbios' },
    },
    CUYABENO: {
      TARAPOA_CAB_CANTONAL: { code: '50', label: 'Tarapoa, Cab. Cantonal' },
      CUYABENO: { code: '51', label: 'Cuyabeno' },
      AGUAS_NEGRAS: { code: '52', label: 'Aguas Negras' },
    },
  },
  ORELLANA: {
    ORELLANA: {
      PUERTO_FRANCISCO_DE_ORELLANACOCA: {
        code: '50',
        label: 'Puerto Francisco De Orellana(Coca)',
      },
      DAYUMA: { code: '51', label: 'Dayuma' },
      TARACOA: { code: '52', label: 'Taracoa' },
      INES_ARANGO: { code: '57', label: 'Ines Arango' },
      GARCIA_MORENO: { code: '56', label: 'Garcia Moreno' },
      EL_EDEN: { code: '55', label: 'El Eden' },
      LA_BELLEZA: { code: '58', label: 'La Belleza' },
      SAN_LUIS_DE_ARMENIA: { code: '61', label: 'San Luis De Armenia' },
      SAN_JOSE_DE_GUAYUSA: { code: '60', label: 'San Jose De Guayusa' },
      NUEVO_PARAISO: { code: '59', label: 'Nuevo Paraiso' },
      ALEJANDRO_LABACA: { code: '53', label: 'Alejandro Labaca' },
      EL_DORADO: { code: '54', label: 'El Dorado' },
    },
    AGUARICO: {
      CAPITAN_AUGUSTO_RIVADENEYRA: {
        code: '51',
        label: 'Capitan Augusto Rivadeneyra',
      },
      NUEVO_ROCAFUERTE_CAB_CANTONAL: {
        code: '50',
        label: 'Nuevo Rocafuerte, Cab. Cantonal',
      },
      CONONACO: { code: '52', label: 'Cononaco' },
      YASUNI: { code: '55', label: 'Yasuni' },
      TIPUTINI: { code: '54', label: 'Tiputini' },
      SANTA_MARIA_DE_HUIRIRIMA: {
        code: '53',
        label: 'Santa Maria De Huiririma',
      },
    },
    LA_JOYA_DE_LOS_SACHAS: {
      TRES_DE_NOVIEMBRE: { code: '57', label: 'Tres De Noviembre' },
      UNION_MILAGRENA: { code: '58', label: 'Union Milagreña' },
      LAGO_SAN_PEDRO: { code: '55', label: 'Lago San Pedro' },
      RUMIPAMBA: { code: '56', label: 'Rumipamba' },
      SAN_SEBASTIAN_DEL_COCA: { code: '54', label: 'San Sebastian Del Coca' },
      LA_JOYA_DE_LOS_SACHAS_CAB_CANTONAL: {
        code: '50',
        label: 'La Joya De Los Sachas, Cab. Cantonal',
      },
      SAN_CARLOS: { code: '53', label: 'San Carlos' },
      POMPEYA: { code: '52', label: 'Pompeya' },
      ENOKANQUI: { code: '51', label: 'Enokanqui' },
    },
    LORETO: {
      PUERTO_MURIALDO: { code: '52', label: 'Puerto Murialdo' },
      AVILA: { code: '51', label: 'Avila' },
      LORERO_CAB_CANTONAL: { code: '50', label: 'Lorero, Cab. Cantonal' },
      SAN_JOSE_DE_PAYAMINO: { code: '53', label: 'San Jose De Payamino' },
      SAN_VICENTE_DE_HUATICOCHA: {
        code: '55',
        label: 'San Vicente De Huaticocha',
      },
      SAN_JOSE_DE_DAHUANO: { code: '54', label: 'San Jose  De Dahuano' },
    },
  },
  SANTO_DOMINGO_DE_LOS_TSACHILAS: {
    SANTO_DOMINGO: {
      PUERTO_LIMON: { code: '52', label: 'Puerto Limon' },
      LUZ_DE_AMERICA: { code: '53', label: 'Luz De America' },
      SAN_JACINTO_DEL_BUA: { code: '54', label: 'San Jacinto Del Bua' },
      ALLURIQUIN: { code: '51', label: 'Alluriquin' },
      SANTO_DOMINGO_DE_LOS_COLORADOS_CABECERA: {
        code: '50',
        label: 'Santo Domingo De Los Colorados, Cabecera',
      },
      ZARACAY: { code: '07', label: 'Zaracay' },
      SANTO_DOMINGO_DE_LOS_COLORADOS: {
        code: '06',
        label: 'Santo Domingo De Los Colorados',
      },
      VALLE_HERMOSO: { code: '55', label: 'Valle Hermoso' },
      BOMBOLI: { code: '02', label: 'Bomboli' },
      ABRAHAM_CALAZACON: { code: '01', label: 'Abraham Calazacon' },
      SANTA_MARIA_DEL_TOACHI: { code: '57', label: 'Santa Maria Del Toachi' },
      CHIGUILPE: { code: '03', label: 'Chiguilpe' },
      EL_ESFUERZO: { code: '56', label: 'El Esfuerzo' },
      RIO_VERDE: { code: '05', label: 'Rio Verde' },
      RIO_TOACHI: { code: '04', label: 'Rio Toachi' },
    },
  },
  SANTA_ELENA: {
    LA_LIBERTAD: {
      LA_LIBERTAD_CABECERA_CANTONAL: {
        code: '50',
        label: 'La Libertad, Cabecera Cantonal',
      },
    },
    SALINAS: {
      CARLOS_ESPINOZA_LARREA: { code: '01', label: 'Carlos Espinoza Larrea' },
      JOSE_LUIS_TAMAYO_MUEY: { code: '52', label: 'Jose Luis Tamayo (Muey)' },
      GRAL_ALBERTO_ENRIQUEZ_GALLO: {
        code: '02',
        label: 'Gral. Alberto Enriquez Gallo',
      },
      SANTA_ROSA: { code: '04', label: 'Santa Rosa' },
      VICENTE_ROCAFUERTE: { code: '03', label: 'Vicente  Rocafuerte' },
      ANCONCITO: { code: '51', label: 'Anconcito' },
      SALINAS_CABECERA_CANTONAL: {
        code: '50',
        label: 'Salinas, Cabecera Cantonal',
      },
    },
    SANTA_ELENA: {
      MANGLARALTO: { code: '54', label: 'Manglaralto' },
      SIMON_BOLIVAR_JULIO_MORENO: {
        code: '55',
        label: 'Simon Bolivar (Julio Moreno)',
      },
      CHANDUY: { code: '53', label: 'Chanduy' },
      ATAHUALPA: { code: '51', label: 'Atahualpa' },
      COLONCHE: { code: '52', label: 'Colonche' },
      SAN_JOSE_DE_ANCON: { code: '56', label: 'San Jose De Ancon' },
      SANTA_ELENA: { code: '02', label: 'Santa Elena' },
      BALLENITA: { code: '01', label: 'Ballenita' },
      SANTA_ELENA_CABECERA_CANTONAL: {
        code: '50',
        label: 'Santa Elena, Cabecera Cantonal',
      },
    },
  },
  ZONAS_NO_DELIMITADAS: {
    LAS_GOLONDRINAS: {
      LAS_GOLONDRINAS: { code: '51', label: 'Las Golondrinas' },
    },
    MANGA_DEL_CURA: { MANGA_DEL_CURA: { code: '51', label: 'Manga Del Cura' } },
    EL_PIEDRERO: { EL_PIEDRERO: { code: '51', label: 'El Piedrero' } },
  },
} as const;

export function parroquia(
  provincia_code: string,
  canton_code: string,
  code: string,
) {
  const prov = provincia(provincia_code);
  if (!prov) return undefined;

  const cant = canton(provincia_code, canton_code);
  if (!cant) return undefined;

  const provParroquias = parroquias[prov.key] as Record<
    string,
    Record<string, { code: string; label: string }>
  >;
  const cantParroquias = provParroquias?.[cant.key];
  if (!cantParroquias) return undefined;

  const entry = Object.entries(cantParroquias).find(([, v]) => v.code === code);
  if (!entry) return undefined;

  const [key, { label }] = entry;
  return { key, label };
}

export type Parroquia = string | Parroquias[string][string][string];
