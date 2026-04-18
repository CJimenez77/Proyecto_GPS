import { LoginResponse, Usuario, Expediente, Contratista, Area } from '../entities';

const API_BASE = '';
const API_USUARIOS = `${API_BASE}/api/usuarios`;
const API_EXPEDIENTES = `${API_BASE}/api/expedientes`;

function getToken(): string | null {
  return localStorage.getItem('token');
}

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };
  const response = await fetch(url, { ...options, headers });
  if (!response.ok) {
    throw new Error(`Error: ${response.status}`);
  }
  return response.json();
}

export const api = {
  login: (username: string, password: string): Promise<LoginResponse> =>
    request(`${API_USUARIOS}/login`, {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  getUsuarios: (): Promise<Usuario[]> =>
    request(`${API_USUARIOS}/usuarios`),

  createUsuario: (data: Omit<Usuario, 'id'>): Promise<Usuario> =>
    request(`${API_USUARIOS}/usuarios`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateUsuario: (id: number, data: Partial<Usuario>): Promise<Usuario> =>
    request(`${API_USUARIOS}/usuarios/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteUsuario: (id: number): Promise<void> =>
    request(`${API_USUARIOS}/usuarios/${id}`, { method: 'DELETE' }),

  getExpedientes: (): Promise<Expediente[]> =>
    request(`${API_EXPEDIENTES}/expedientes`),

  createExpediente: (data: Omit<Expediente, 'id' | 'created_at' | 'updated_at'>): Promise<Expediente> =>
    request(`${API_EXPEDIENTES}/expedientes`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getContratistas: (): Promise<Contratista[]> =>
    request(`${API_EXPEDIENTES}/contratistas`),

  getAreas: (): Promise<Area[]> =>
    request(`${API_EXPEDIENTES}/areas`),
};