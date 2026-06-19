process.env.JWT_SECRET = 'test_secret';
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

// Mock de JWT
jest.mock('jsonwebtoken', () => ({
  verify: jest.fn((token, secret, callback) => {
    callback(null, { id: 1, username: 'admin', rol: 'administrador', id_area: null });
  }),
  sign: jest.fn().mockReturnValue('mock_token'),
}));

// Mock crypto preservando funciones nativas para etag de Express
jest.mock('crypto', () => {
  const actualCrypto = jest.requireActual('crypto');
  return {
    ...actualCrypto,
    randomBytes: jest.fn().mockReturnValue({
      toString: jest.fn().mockReturnValue('mock_hex_token'),
    }),
  };
});

describe('Microservicio de Usuarios - Tests Unitarios', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // 1. Health check test
  it('1. GET /health - debe retornar status ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok', service: 'service-usuarios' });
  });

  // 2. Register validation: missing username
  it('2. POST /register - debe fallar si falta username', async () => {
    const res = await request(app)
      .post('/register')
      .send({ password: '123', nombre: 'Test', email: 'test@test.com' });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'username, password, nombre y email son requeridos' });
  });

  // 3. Register validation: missing password
  it('3. POST /register - debe fallar si falta password', async () => {
    const res = await request(app)
      .post('/register')
      .send({ username: 'testuser', nombre: 'Test', email: 'test@test.com' });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'username, password, nombre y email son requeridos' });
  });

  // 4. Register validation: missing email
  it('4. POST /register - debe fallar si falta email', async () => {
    const res = await request(app)
      .post('/register')
      .send({ username: 'testuser', password: '123', nombre: 'Test' });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'username, password, nombre y email son requeridos' });
  });

  // 5. Login validation: missing username
  it('5. POST /login - debe fallar si falta username', async () => {
    const res = await request(app)
      .post('/login')
      .send({ password: '123' });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'Usuario y contraseña requeridos' });
  });

  // 6. Login validation: missing password
  it('6. POST /login - debe fallar si falta password', async () => {
    const res = await request(app)
      .post('/login')
      .send({ username: 'admin' });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'Usuario y contraseña requeridos' });
  });

  // 7. Get usuarios list
  it('7. GET /usuarios - debe retornar lista de usuarios si está autenticado', async () => {
    const mockUsers = [
      { id: 1, username: 'admin', nombre: 'Administrador', email: 'admin@gps.cl', rol: 'administrador' }
    ];
    mockQuery.mockResolvedValueOnce({ rows: mockUsers });

    const res = await request(app)
      .get('/usuarios')
      .set('Authorization', 'Bearer token_valido');

    expect(res.status).toBe(200);
    expect(res.body).toEqual(mockUsers);
  });

  // 8. Role Authorization check: non-admin request to admin route
  it('8. POST /usuarios - debe denegar acceso si el token no tiene rol administrador', async () => {
    const jwt = require('jsonwebtoken');
    (jwt.verify as any).mockImplementationOnce((token: any, secret: any, callback: any) => {
      callback(null, { id: 2, username: 'user', rol: 'lector', id_area: null });
    });

    const res = await request(app)
      .post('/usuarios')
      .set('Authorization', 'Bearer token_valido')
      .send({ username: 'nuevo', password: '123', nombre: 'Nuevo', email: 'n@n.com', rol: 'revisor' });

    expect(res.status).toBe(403);
    expect(res.body).toEqual({ error: 'No tienes permisos para esta acción' });
  });

  // 9. Forgot password validation: missing email
  it('9. POST /forgot-password - debe fallar si falta email', async () => {
    const res = await request(app)
      .post('/forgot-password')
      .send({});
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'El correo electrónico es requerido' });
  });

  // 10. Reset password validation: missing token or password
  it('10. POST /reset-password - debe fallar si falta token o password', async () => {
    const res = await request(app)
      .post('/reset-password')
      .send({ token: 'algun_token' }); // falta password
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'Token y nueva contraseña son requeridos' });
  });
});
