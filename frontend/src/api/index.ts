import {
  LoginResponse, Usuario, Expediente, ExpedienteVersion, Tarea,
  JerarquiaEmpresa, Formulario, Empresa, Area, Proyecto, Disciplina, CampoFormulario
} from '../entities';

const API_BASE = '';
const API_USUARIOS = `${API_BASE}/api/usuarios`;
const API_EXPEDIENTES = `${API_BASE}/api/expedientes`;
const API_MANTENEDORES = `${API_BASE}/api/mantenedores`;
const API_TAREAS = `${API_BASE}/api/tareas`;

export function getToken(): string | null {
  return localStorage.getItem('token');
}

export function getCurrentUser(): Usuario | null {
  const user = localStorage.getItem('usuario');
  return user ? JSON.parse(user) : null;
}

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers = new Headers(options.headers || {});
  
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  
  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, { ...options, headers });
  if (!response.ok) {
    let errMsg = `Error: ${response.status}`;
    try {
      const errBody = await response.json();
      errMsg = errBody.error || errMsg;
    } catch {}
    throw new Error(errMsg);
  }
  return response.json();
}

export const api = {
  // Usuarios
  login: (username: string, password: string): Promise<LoginResponse> =>
    request(`${API_USUARIOS}/login`, { method: 'POST', body: JSON.stringify({ username, password }) }),
  register: (data: { username: string; password: string; nombre: string; email: string }): Promise<Usuario> =>
    request(`${API_USUARIOS}/register`, { method: 'POST', body: JSON.stringify(data) }),
  getUsuarios: (): Promise<Usuario[]> => request(`${API_USUARIOS}/usuarios`),
  createUsuario: (data: Partial<Usuario>): Promise<Usuario> =>
    request(`${API_USUARIOS}/usuarios`, { method: 'POST', body: JSON.stringify(data) }),
  updateUsuario: (id: number, data: Partial<Usuario>): Promise<Usuario> =>
    request(`${API_USUARIOS}/usuarios/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  updateUsuarioEstado: (id: number, estado: string): Promise<Usuario> =>
    request(`${API_USUARIOS}/usuarios/${id}/estado`, { method: 'PUT', body: JSON.stringify({ estado }) }),
  forgotPassword: (email: string): Promise<{ message: string; token?: string }> =>
    request(`${API_USUARIOS}/forgot-password`, { method: 'POST', body: JSON.stringify({ email }) }),
  resetPassword: (token: string, password: string): Promise<{ message: string }> =>
    request(`${API_USUARIOS}/reset-password`, { method: 'POST', body: JSON.stringify({ token, password }) }),

  // Expedientes
  getExpedientes: (): Promise<Expediente[]> => request(`${API_EXPEDIENTES}/expedientes`),
  getExpediente: (id: number): Promise<Expediente> => request(`${API_EXPEDIENTES}/expedientes/${id}`),
  getExpedienteVersiones: (id: number): Promise<ExpedienteVersion[]> => request(`${API_EXPEDIENTES}/expedientes/${id}/versiones`),
  getExpedienteUrl: (id: number): Promise<{url: string, nombre_archivo: string}> => request(`${API_EXPEDIENTES}/expedientes/${id}/url`),
  createExpediente: (formData: FormData): Promise<Expediente | Expediente[]> =>
    request(`${API_EXPEDIENTES}/expedientes`, { method: 'POST', body: formData }),
  createNuevaVersion: (idPadre: number, formData: FormData): Promise<Expediente> =>
    request(`${API_EXPEDIENTES}/expedientes/${idPadre}/nueva-version`, { method: 'POST', body: formData }),

  // Mantenedores - Jerarquía
  getJerarquia: (): Promise<JerarquiaEmpresa[]> => request(`${API_MANTENEDORES}/jerarquia`),
  buscarFormulario: (id_proyecto: number, id_disciplina: number): Promise<Formulario> =>
    request(`${API_MANTENEDORES}/formularios/buscar?id_proyecto=${id_proyecto}&id_disciplina=${id_disciplina}`),

  // Mantenedores - Empresas
  getEmpresas: (): Promise<Empresa[]> => request(`${API_MANTENEDORES}/empresas`),
  createEmpresa: (data: { nombre: string; rut?: string }): Promise<Empresa> =>
    request(`${API_MANTENEDORES}/empresas`, { method: 'POST', body: JSON.stringify(data) }),
  updateEmpresa: (id: number, data: { nombre: string; rut?: string }): Promise<Empresa> =>
    request(`${API_MANTENEDORES}/empresas/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  updateEmpresaEstado: (id: number, estado: string): Promise<Empresa> =>
    request(`${API_MANTENEDORES}/empresas/${id}/estado`, { method: 'PUT', body: JSON.stringify({ estado }) }),

  // Mantenedores - Áreas
  getAreas: (id_empresa?: number): Promise<Area[]> =>
    request(`${API_MANTENEDORES}/areas${id_empresa ? `?id_empresa=${id_empresa}` : ''}`),
  createArea: (data: { nombre: string; id_empresa: number }): Promise<Area> =>
    request(`${API_MANTENEDORES}/areas`, { method: 'POST', body: JSON.stringify(data) }),
  updateArea: (id: number, data: { nombre: string }): Promise<Area> =>
    request(`${API_MANTENEDORES}/areas/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  updateAreaEstado: (id: number, estado: string): Promise<Area> =>
    request(`${API_MANTENEDORES}/areas/${id}/estado`, { method: 'PUT', body: JSON.stringify({ estado }) }),

  // Mantenedores - Proyectos
  getProyectos: (id_area?: number): Promise<Proyecto[]> =>
    request(`${API_MANTENEDORES}/proyectos${id_area ? `?id_area=${id_area}` : ''}`),
  createProyecto: (data: { nombre: string; id_area: number; descripcion?: string }): Promise<Proyecto> =>
    request(`${API_MANTENEDORES}/proyectos`, { method: 'POST', body: JSON.stringify(data) }),
  updateProyecto: (id: number, data: { nombre: string; descripcion?: string }): Promise<Proyecto> =>
    request(`${API_MANTENEDORES}/proyectos/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  updateProyectoEstado: (id: number, estado: string): Promise<Proyecto> =>
    request(`${API_MANTENEDORES}/proyectos/${id}/estado`, { method: 'PUT', body: JSON.stringify({ estado }) }),

  // Mantenedores - Disciplinas
  getDisciplinas: (id_proyecto?: number): Promise<Disciplina[]> =>
    request(`${API_MANTENEDORES}/disciplinas${id_proyecto ? `?id_proyecto=${id_proyecto}` : ''}`),
  createDisciplina: (data: { nombre: string; id_proyecto: number }): Promise<Disciplina> =>
    request(`${API_MANTENEDORES}/disciplinas`, { method: 'POST', body: JSON.stringify(data) }),
  updateDisciplina: (id: number, data: { nombre: string }): Promise<Disciplina> =>
    request(`${API_MANTENEDORES}/disciplinas/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  updateDisciplinaEstado: (id: number, estado: string): Promise<Disciplina> =>
    request(`${API_MANTENEDORES}/disciplinas/${id}/estado`, { method: 'PUT', body: JSON.stringify({ estado }) }),

  // Mantenedores - Formularios
  getFormularios: (): Promise<Formulario[]> => request(`${API_MANTENEDORES}/formularios`),
  getFormulario: (id: number): Promise<Formulario> => request(`${API_MANTENEDORES}/formularios/${id}`),
  createFormulario: (data: { nombre: string; id_proyecto?: number | null; id_disciplina?: number | null; campos: Partial<CampoFormulario>[] }): Promise<Formulario> =>
    request(`${API_MANTENEDORES}/formularios`, { method: 'POST', body: JSON.stringify(data) }),
  updateFormulario: (id: number, data: { nombre: string; id_proyecto?: number | null; id_disciplina?: number | null; campos: Partial<CampoFormulario>[] }): Promise<Formulario> =>
    request(`${API_MANTENEDORES}/formularios/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // Tareas
  getMisTareas: (): Promise<Tarea[]> => request(`${API_TAREAS}/mis-tareas`),
  getTodasTareas: (params?: { estado?: string }): Promise<Tarea[]> => {
    const qs = params?.estado ? `?estado=${params.estado}` : '';
    return request(`${API_TAREAS}/tareas${qs}`);
  },
  getTarea: (id: number): Promise<Tarea> => request(`${API_TAREAS}/tareas/${id}`),
  resolverTarea: (id: number, estado: string, comentario: string): Promise<Tarea> =>
    request(`${API_TAREAS}/tareas/${id}`, { method: 'PUT', body: JSON.stringify({ estado, comentario }) })
};