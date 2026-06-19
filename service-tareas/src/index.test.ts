process.env.JWT_SECRET = 'test_secret';
import request from 'supertest';
import app from './index';
import pkg from 'pg';

jest.mock('pg', () => {
  const query = jest.fn();
  const clientQuery = jest.fn();
  const clientRelease = jest.fn();
  return {
    Pool: jest.fn().mockImplementation(() => {
      return {
        query,
        connect: jest.fn().mockResolvedValue({
          query: clientQuery,
          release: clientRelease,
        }),
        on: jest.fn(),
        end: jest.fn(),
      };
    }),
    _queryMock: query,
    _clientQueryMock: clientQuery,
    _clientReleaseMock: clientRelease,
  };
});

const mockQuery = (pkg as any)._queryMock;
const mockClientQuery = (pkg as any)._clientQueryMock;
const mockClientRelease = (pkg as any)._clientReleaseMock;

// Mock JWT
jest.mock('jsonwebtoken', () => ({
  verify: jest.fn((token, secret, callback) => {
    callback(null, { id: 1, username: 'revisor1', rol: 'revisor', id_area: 1 });
  }),
}));

// Mock Nodemailer
jest.mock('nodemailer', () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: jest.fn().mockResolvedValue({ messageId: 'mock_message_id' }),
  }),
}));

describe('Microservicio de Tareas - Tests Unitarios', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // 1. Health check
  it('1. GET /health - debe retornar status ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok', service: 'service-tareas' });
  });

  // 2. Create task - validation error
  it('2. POST /tareas - debe retornar 400 si faltan campos', async () => {
    const res = await request(app)
      .post('/tareas')
      .send({ id_expediente: 1 });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'id_expediente, id_usuario_asignado e id_etapa son requeridos' });
  });

  // 3. Create task - success
  it('3. POST /tareas - debe crear una tarea y retornar 201', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 5, id_expediente: 1, id_usuario_asignado: 1, id_etapa: 1, estado: 'ABIERTA' }] });
    mockQuery.mockResolvedValueOnce({
      rows: [{ revisor_nombre: 'Revisor', revisor_email: 'revisor@test.com', expediente_titulo: 'Expediente A', etapa_nombre: 'Etapa 1' }]
    });
    mockQuery.mockResolvedValueOnce({ rows: [] }); // historial

    const res = await request(app)
      .post('/tareas')
      .send({ id_expediente: 1, id_usuario_asignado: 1, id_etapa: 1 });
    expect(res.status).toBe(201);
    expect(res.body.id).toBe(5);
  });

  // 4. GET /mis-tareas - unauthorized
  it('4. GET /mis-tareas - debe retornar 401 si no hay token', async () => {
    const res = await request(app).get('/mis-tareas');
    expect(res.status).toBe(401);
  });

  // 5. GET /mis-tareas - success
  it('5. GET /mis-tareas - debe retornar lista de tareas para el usuario', async () => {
    const mockTasks = [{ id: 1, id_usuario_asignado: 1, estado: 'ABIERTA' }];
    mockQuery.mockResolvedValueOnce({ rows: mockTasks });

    const res = await request(app)
      .get('/mis-tareas')
      .set('Authorization', 'Bearer token_valido');
    expect(res.status).toBe(200);
    expect(res.body).toEqual(mockTasks);
  });

  // 6. GET /tareas - forbidden if not admin
  it('6. GET /tareas - debe retornar 403 si el usuario no es admin', async () => {
    const res = await request(app)
      .get('/tareas')
      .set('Authorization', 'Bearer token_valido');
    expect(res.status).toBe(403);
    expect(res.body).toEqual({ error: 'No tienes permisos para esta acción' });
  });

  // 7. GET /tareas - success for admin
  it('7. GET /tareas - debe retornar todas las tareas si es admin', async () => {
    const jwt = require('jsonwebtoken');
    jwt.verify.mockImplementationOnce((token: any, secret: any, callback: any) => {
      callback(null, { id: 2, username: 'admin', rol: 'administrador', id_area: null });
    });
    const mockTasks = [{ id: 1, id_usuario_asignado: 1 }, { id: 2, id_usuario_asignado: 2 }];
    mockQuery.mockResolvedValueOnce({ rows: mockTasks });

    const res = await request(app)
      .get('/tareas')
      .set('Authorization', 'Bearer token_valido');
    expect(res.status).toBe(200);
    expect(res.body).toEqual(mockTasks);
  });

  // 8. GET /tareas/:id - not found
  it('8. GET /tareas/:id - debe retornar 404 si la tarea no existe', async () => {
    mockClientQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .get('/tareas/999')
      .set('Authorization', 'Bearer token_valido');
    expect(res.status).toBe(404);
  });

  // 9. GET /tareas/:id - forbidden if not assigned
  it('9. GET /tareas/:id - debe retornar 403 si la tarea no es del usuario', async () => {
    mockClientQuery.mockResolvedValueOnce({ rows: [{ id: 10, id_usuario_asignado: 2, estado: 'ABIERTA' }] });

    const res = await request(app)
      .get('/tareas/10')
      .set('Authorization', 'Bearer token_valido');
    expect(res.status).toBe(403);
    expect(res.body).toEqual({ error: 'No autorizado' });
  });

  // 10. GET /tareas/:id - success and updates state to EN_REVISION
  it('10. GET /tareas/:id - debe retornar la tarea y actualizar a EN_REVISION si estaba ABIERTA', async () => {
    mockClientQuery.mockResolvedValueOnce({ rows: [{ id: 10, id_usuario_asignado: 1, estado: 'ABIERTA' }] });
    mockClientQuery.mockResolvedValueOnce({ rows: [] }); // update status

    const res = await request(app)
      .get('/tareas/10')
      .set('Authorization', 'Bearer token_valido');
    expect(res.status).toBe(200);
    expect(res.body.estado).toBe('EN_REVISION');
  });

  // 11. PUT /tareas/:id - validation error
  it('11. PUT /tareas/:id - debe retornar 400 si falta el comentario al aprobar', async () => {
    mockClientQuery.mockResolvedValueOnce({ rows: [{ id: 10, id_usuario_asignado: 1, estado: 'EN_REVISION' }] });

    const res = await request(app)
      .put('/tareas/10')
      .set('Authorization', 'Bearer token_valido')
      .send({ estado: 'APROBADA', comentario: '' });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'El comentario es obligatorio' });
  });
});
