import type * as Core from '../../core';

export interface Paciente {
  id: number;
  nombres: Core.Nombres.NombresItem;
  identificacion: Core.DocumentoIdentidad.DocumentoIdentidad[];
  nacimiento: Core.Demografica.NacimientoItem;
  residencia: Core.Domicilio.ResidenciaItem[];
  contacto: Core.Contacto.ContactoItem[];
  sexo: Core.Sexo.Sexo;
  estadoCivil?: Core.EstadoCivil.EstadoCivil;
  ocupacion?: string;
  peso?: number;
  talla?: number;
  grupoSanguineo?: Core.GrupoSanguineo.GrupoSanguineo;
  discapacidad?: Core.Discapacidad.DiscapacidadItem;
  alergias?: Core.Alergia.AlergiaItem[];
  aseguradora?: Core.Aseguradoras.AseguradoraItem[];
  consentimientos?: Core.Consentimiento.ConsentimientoItem[];
  contactoEmergencia?: Core.Contacto.ContactoReferencia[];
}
