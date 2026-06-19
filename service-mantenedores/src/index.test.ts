import request from 'supertest';
import app from './index';
import pkg from 'pg';

jest.mock('pg', () => {
  const query = jest.fn();
  const connect = jest.fn().mockReturnValue({
    query: jest.fn(),
    release: jest.fn(),
  });
  return {
    Pool: jest.fn().mockImplementation(() => {
      return {
        query,
        connect,
        on: jest.fn(),
        end: jest.fn(),
      };
    }),
    _queryMock: query,
    _connectMock: connect,
  };
});

const mockQuery = (pkg as any)._queryMock;

// Mock del middleware de JWT
jest.mock('jsonwebtoken', () => ({
  verify: jest.fn((token, secret, callback) => {
    callback(null, { id: 1, username: 'admin', rol: 'administrador', id_area: null });
  }),
}));

// Mock nodemailer
jest.mock('nodemailer', () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: jest.fn().mockResolvedValue({ messageId: 'mock_message_id' }),
  }),
}));

describe('Microservicio de Mantenedores - Tests Unitarios', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // 1. Health check
  describe('GET /health', () => {
    it('1. debe retornar status ok', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ status: 'ok', service: 'service-mantenedores' });
    });
  });

  // 2. GET /empresas - success
  describe('GET /empresas', () => {
    it('2. debe retornar la lista de empresas activas', async () => {
      const mockEmpresas = [
        { id: 1, nombre: 'Empresa A', rut: '123-4', estado: 'activo' },
        { id: 2, nombre: 'Empresa B', rut: '567-8', estado: 'activo' },
      ];
      mockQuery.mockResolvedValueOnce({ rows: mockEmpresas });

      const res = await request(app)
        .get('/empresas')
        .set('Authorization', 'Bearer token_valido');

      expect(res.status).toBe(200);
      expect(res.body).toEqual(mockEmpresas);
    });

    // 3. GET /empresas - DB failure
    it('3. debe retornar 500 si la base de datos falla', async () => {
      mockQuery.mockRejectedValueOnce(new Error('DB Error'));

      const res = await request(app)
        .get('/empresas')
        .set('Authorization', 'Bearer token_valido');

      expect(res.status).toBe(500);
      expect(res.body).toEqual({ error: 'Error interno' });
    });
  });

  // 4. POST /procesos - validations
  describe('POST /procesos', () => {
    it('4. debe retornar 400 si falta el nombre o el id_area', async () => {
      const res = await request(app)
        .post('/procesos')
        .set('Authorization', 'Bearer token_valido')
        .send({ nombre: '' });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: 'nombre e id_area requeridos' });
    });

    // 5. POST /procesos - stages validation
    it('5. debe retornar 400 si la lista de etapas está vacía', async () => {
      const res = await request(app)
        .post('/procesos')
        .set('Authorization', 'Bearer token_valido')
        .send({ nombre: 'Proceso de Aprobación', id_area: 7, etapas: [] });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: 'Debe proporcionar al menos una etapa para crear el proceso.' });
    });
  });

  // 6. GET /jerarquia
  describe('GET /jerarquia', () => {
    it('6. debe retornar la jerarquía mapeada correctamente', async () => {
      const mockJerarquiaRows = [
        {
          emp_id: 1, emp_nombre: 'Empresa A', emp_rut: '123-4',
          area_id: 10, area_nombre: 'Área 1',
          proy_id: 20, proy_nombre: 'Proyecto A', proy_desc: 'Desc',
          disc_id: 30, disc_nombre: 'Disciplina 1'
        }
      ];
      mockQuery.mockResolvedValueOnce({ rows: mockJerarquiaRows });

      const res = await request(app)
        .get('/jerarquia')
        .set('Authorization', 'Bearer token_valido');

      expect(res.status).toBe(200);
      expect(res.body).toEqual([
        {
          id: 1, nombre: 'Empresa A', rut: '123-4',
          areas: [
            {
              id: 10, nombre: 'Área 1',
              proyectos: [
                {
                  id: 20, nombre: 'Proyecto A', descripcion: 'Desc',
                  disciplinas: [{ id: 30, nombre: 'Disciplina 1' }]
                }
              ]
            }
          ]
        }
      ]);
    });
  });

  // 7. POST /empresas - success
  describe('POST /empresas', () => {
    it('7. debe crear una empresa si los datos son válidos', async () => {
      const mockEmpresa = { id: 3, nombre: 'Empresa C', rut: '999-9', estado: 'activo' };
      mockQuery.mockResolvedValueOnce({ rows: [mockEmpresa] });

      const res = await request(app)
        .post('/empresas')
        .set('Authorization', 'Bearer token_valido')
        .send({ nombre: 'Empresa C', rut: '999-9' });

      expect(res.status).toBe(201);
      expect(res.body).toEqual(mockEmpresa);
    });
  });

  // 8. PUT /empresas/:id - 404 Not Found
  describe('PUT /empresas/:id', () => {
    it('8. debe retornar 404 si la empresa a actualizar no existe', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .put('/empresas/999')
        .set('Authorization', 'Bearer token_valido')
        .send({ nombre: 'Inexistente', rut: '111-1' });

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'No encontrado' });
    });
  });

  // 9. GET /formularios/buscar
  describe('GET /formularios/buscar', () => {
    it('9. debe retornar un formulario activo coincidente', async () => {
      const mockForm = { id: 1, nombre: 'Formulario Calidad', id_proyecto: 20, id_disciplina: 30, estado: 'activo', campos: [] };
      mockQuery.mockResolvedValueOnce({ rows: [mockForm] });

      const res = await request(app)
        .get('/formularios/buscar?id_proyecto=20&id_disciplina=30')
        .set('Authorization', 'Bearer token_valido');

      expect(res.status).toBe(200);
      expect(res.body.nombre).toBe('Formulario Calidad');
    });
  });

  // 10. GET /procesos/:id
  describe('GET /procesos/:id', () => {
    it('10. debe retornar 404 si el proceso no existe', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .get('/procesos/999')
        .set('Authorization', 'Bearer token_valido');

      expect(res.status).toBe(404);
    });
  });

  // 11. GET /etapas
  describe('GET /etapas', () => {
    it('11. debe retornar las etapas del proceso especificado', async () => {
      const mockEtapas = [
        { id: 1, nombre: 'Etapa 1', orden: 1, id_revisor: 5, revisor_nombre: 'Revisor A' }
      ];
      mockQuery.mockResolvedValueOnce({ rows: mockEtapas });

      const res = await request(app)
        .get('/etapas?id_proceso=1')
        .set('Authorization', 'Bearer token_valido');

      expect(res.status).toBe(200);
      expect(res.body).toEqual(mockEtapas);
    });
  });
});
