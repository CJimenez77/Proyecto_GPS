export interface Usuario {
  id: number;
  username: string;
  nombre: string;
  email: string;
  rol: 'administrador' | 'revisor' | 'usuario_terreno' | 'lector';
  id_area: number | null;
  estado: 'activo' | 'inactivo';
}

export interface LoginResponse {
  token: string;
  user: Usuario;
}

export interface Empresa { id: number; nombre: string; rut: string; estado: string; }
export interface Area { id: number; nombre: string; id_empresa: number; estado: string; }
export interface Proyecto { id: number; nombre: string; id_area: number; descripcion: string; estado: string; }
export interface Disciplina { id: number; nombre: string; id_proyecto: number; estado: string; }

export interface JerarquiaDisciplina { id: number; nombre: string; estado: string; }
export interface JerarquiaProyecto { id: number; nombre: string; descripcion: string; estado: string; disciplinas: JerarquiaDisciplina[]; }
export interface JerarquiaArea { id: number; nombre: string; estado: string; proyectos: JerarquiaProyecto[]; }
export interface JerarquiaEmpresa { id: number; nombre: string; rut: string; estado: string; areas: JerarquiaArea[]; }

export interface CampoFormulario {
  id: number;
  etiqueta: string;
  nombre: string;
  tipo: string;
  opciones?: string[];
  requerido: boolean;
  orden: number;
}
export interface Formulario {
  id: number;
  nombre: string;
  id_disciplina: number;
  estado: string;
  campos: CampoFormulario[];
}

export interface RespuestaFormulario {
  id_campo: number;
  valor: string;
  etiqueta?: string;
  tipo?: string;
}

export interface Expediente {
  id: number;
  titulo: string;
  id_proyecto: number;
  id_disciplina: number;
  subido_por: number;
  archivo_key: string;
  nombre_archivo: string;
  estado: 'PENDIENTE' | 'APROBADO' | 'RECHAZADO' | 'RECHAZADO_DEFINITIVO';
  version: number;
  id_expediente_padre: number | null;
  created_at: string;
  updated_at: string;
  respuestas_formulario?: RespuestaFormulario[];
}

export interface ExpedienteVersion extends Expediente {
  subido_por_nombre?: string;
}

export interface Tarea {
  id: number;
  id_expediente: number;
  id_usuario_asignado: number;
  id_etapa: number;
  estado: 'ABIERTA' | 'EN_REVISION' | 'APROBADA' | 'RECHAZADA';
  comentario: string | null;
  created_at: string;
  updated_at: string;
  // extras de la vista
  expediente_titulo?: string;
  expediente_version?: number;
  expediente_estado?: string;
  etapa_nombre?: string;
  asignado_a_nombre?: string;
  proyecto_nombre?: string;
  disciplina_nombre?: string;
}

export interface Proceso {
  id: number;
  nombre: string;
  id_area: number;
  estado: string;
  created_at?: string;
  updated_at?: string;
}

export interface Etapa {
  id: number;
  nombre: string;
  orden: number;
  id_proceso: number;
  id_revisor: number | null;
  estado: string;
  revisor_nombre?: string;
  created_at?: string;
  updated_at?: string;
}

export interface HistorialExpediente {
  id: number;
  id_expediente: number;
  evento: string;
  descripcion: string;
  id_usuario: number;
  usuario_nombre?: string;
  expediente_version?: number;
  created_at: string;
}