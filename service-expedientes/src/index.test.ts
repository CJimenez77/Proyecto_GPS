process.env.JWT_SECRET = 'test_secret';
import request from 'supertest';
import app from './index';
import pkg from 'pg';

jest.mock('pg', () => {
  const query = jest.fn().mockResolvedValue({ rows: [] });
  const clientQuery = jest.fn().mockImplementation((sql: any) => {
    if (typeof sql === 'string') {
      const clean = sql.trim().toUpperCase();
      if (clean === 'BEGIN' || clean === 'COMMIT' || clean === 'ROLLBACK') {
        return Promise.resolve({ rows: [] });
      }
      if (clean.includes('SELECT * FROM EXPEDIENTES WHERE ID =')) {
        return Promise.resolve({ rows: [{ id: 1, titulo: 'Expediente A', subido_por: 2, id_area: 1 }] });
      }
      if (clean.includes('UPDATE EXPEDIENTES SET ESTADO')) {
        return Promise.resolve({ rows: [{ id: 1, estado: 'ARCHIVADO' }] });
      }
    }
    return Promise.resolve({ rows: [] });
  });
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
    callback(null, { id: 1, username: 'user1', rol: 'usuario_terreno', id_area: 1 });
  }),
}));

// Mock S3
jest.mock('@aws-sdk/client-s3', () => {
  return {
    S3Client: jest.fn().mockImplementation(() => {
      return {
        send: jest.fn().mockResolvedValue({}),
      };
    }),
    PutObjectCommand: jest.fn(),
    GetObjectCommand: jest.fn(),
  };
});

// Mock Presigner
jest.mock('@aws-sdk/s3-request-presigner', () => {
  return {
    getSignedUrl: jest.fn().mockResolvedValue('http://mocked-signed-url.com/file'),
  };
});

// Mock global fetch
global.fetch = jest.fn().mockResolvedValue({
  ok: true,
  json: async () => ({ id: 1 }),
} as any);

describe('Microservicio de Expedientes - Tests Unitarios', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // 1. GET /health
  it('1. GET /health - debe retornar status ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok', service: 'service-expedientes' });
  });

  // 2. GET /stats
  it('2. GET /stats - debe retornar estadísticas si está autenticado', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ estado: 'PENDIENTE', cantidad: 5 }] });
    mockQuery.mockResolvedValueOnce({ rows: [{ area: 'Minería', cantidad: 3 }] });
    mockQuery.mockResolvedValueOnce({ rows: [{ revisor: 'Revisor A', cantidad: 2 }] });

    const res = await request(app)
      .get('/stats')
      .set('Authorization', 'Bearer token_valido');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      estados: [{ estado: 'PENDIENTE', cantidad: 5 }],
      areas: [{ area: 'Minería', cantidad: 3 }],
      revisores: [{ revisor: 'Revisor A', cantidad: 2 }]
    });
  });

  // 3. GET /expedientes - unauthorized
  it('3. GET /expedientes - debe retornar 401 si no hay token', async () => {
    const res = await request(app).get('/expedientes');
    expect(res.status).toBe(401);
  });

  // 4. GET /expedientes - terrain user filter
  it('4. GET /expedientes - debe retornar expedientes del usuario si el rol es usuario_terreno', async () => {
    const mockExp = [{ id: 1, titulo: 'Expediente A', subido_por: 1 }];
    mockQuery.mockResolvedValueOnce({ rows: mockExp });

    const res = await request(app)
      .get('/expedientes')
      .set('Authorization', 'Bearer token_valido');

    expect(res.status).toBe(200);
    expect(res.body).toEqual(mockExp);
  });

  // 5. GET /expedientes/:id - not found
  it('5. GET /expedientes/:id - debe retornar 404 si no existe', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .get('/expedientes/999')
      .set('Authorization', 'Bearer token_valido');

    expect(res.status).toBe(404);
  });

  // 6. GET /expedientes/:id - forbidden
  it('6. GET /expedientes/:id - debe retornar 403 si el usuario terreno no subió el expediente', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 2, titulo: 'Expediente B', subido_por: 99, id_area: 2 }] });

    const res = await request(app)
      .get('/expedientes/2')
      .set('Authorization', 'Bearer token_valido');

    expect(res.status).toBe(403);
  });

  // 7. GET /expedientes/:id - success with answers
  it('7. GET /expedientes/:id - debe retornar el expediente con sus respuestas de formulario', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, titulo: 'Expediente A', subido_por: 1, id_area: 1 }] });
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, etiqueta: 'Nombre', valor: 'Prueba' }] });

    const res = await request(app)
      .get('/expedientes/1')
      .set('Authorization', 'Bearer token_valido');

    expect(res.status).toBe(200);
    expect(res.body.titulo).toBe('Expediente A');
    expect(res.body.respuestas_formulario).toEqual([{ id: 1, etiqueta: 'Nombre', valor: 'Prueba' }]);
  });

  // 8. GET /expedientes/:id/url - returns signed url
  it('8. GET /expedientes/:id/url - debe retornar URL firmada para descarga', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ archivo_key: 'key-123', nombre_archivo: 'doc.pdf' }] });

    const res = await request(app)
      .get('/expedientes/1/url')
      .set('Authorization', 'Bearer token_valido');

    expect(res.status).toBe(200);
    expect(res.body.url).toContain('http://mocked-signed-url.com/file');
  });

  // 9. GET /expedientes/:id/versiones
  it('9. GET /expedientes/:id/versiones - debe retornar lista de versiones', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ raiz: 1 }] });
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, version: 1 }, { id: 2, version: 2 }] });

    const res = await request(app)
      .get('/expedientes/1/versiones')
      .set('Authorization', 'Bearer token_valido');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([{ id: 1, version: 1 }, { id: 2, version: 2 }]);
  });

  // 10. PUT /expedientes/:id/archivar - forbidden if not admin
  it('10. PUT /expedientes/:id/archivar - debe retornar 403 si no es administrador', async () => {
    const res = await request(app)
      .put('/expedientes/1/archivar')
      .set('Authorization', 'Bearer token_valido');

    expect(res.status).toBe(403);
  });

  // 11. PUT /expedientes/:id/archivar - success for admin
  it('11. PUT /expedientes/:id/archivar - debe archivar el expediente si es administrador', async () => {
    const jwt = require('jsonwebtoken');
    jwt.verify.mockImplementationOnce((token: any, secret: any, callback: any) => {
      callback(null, { id: 2, username: 'admin', rol: 'administrador', id_area: null });
    });

    const res = await request(app)
      .put('/expedientes/1/archivar')
      .set('Authorization', 'Bearer token_valido');

    expect(res.status).toBe(200);
    expect(res.body.estado).toBe('ARCHIVADO');
  });
});
