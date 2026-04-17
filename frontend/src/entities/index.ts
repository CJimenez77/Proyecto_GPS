export interface Usuario {
  id: number;
  nombre: string;
  email: string;
  rol: 'administrador' | 'supervisor' | 'revisor' | 'colaborador' | 'lector';
}

export interface LoginResponse {
  token: string;
  user: Usuario;
}

export interface Expediente {
  id: number;
  titulo: string;
  descripcion: string;
  estado: 'borrador' | 'en_revision' | 'en_aprobacion' | 'cerrado' | 'rechazado';
  area_id: number;
  contratista_id: number;
  created_at: string;
  updated_at: string;
}

export interface Contratista {
  id: number;
  nombre: string;
  rut: string;
  activo: boolean;
}

export interface Area {
  id: number;
  nombre: string;
  contratista_id: number;
  activo: boolean;
}