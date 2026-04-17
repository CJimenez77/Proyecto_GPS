import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import pkg from 'pg';
const { Pool } = pkg;

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key';

app.use(cors());
app.use(express.json());

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'gps_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

const initDb = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id SERIAL PRIMARY KEY,
      username VARCHAR(100) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      nombre VARCHAR(100) NOT NULL,
      email VARCHAR(100) UNIQUE NOT NULL,
      rol VARCHAR(20) NOT NULL DEFAULT 'lector',
      estado VARCHAR(20) NOT NULL DEFAULT 'activo',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const existingUser = await pool.query("SELECT id FROM usuarios WHERE username = 'admin'");
  if (existingUser.rows.length === 0) {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    await pool.query(
      "INSERT INTO usuarios (username, password, nombre, email, rol) VALUES ('admin', $1, 'Administrador', 'admin@gps.cl', 'administrador')",
      [hashedPassword]
    );
    console.log('Usuario admin creado (admin/admin123)');
  }
};

interface User {
  id: number;
  username: string;
  nombre: string;
  email: string;
  rol: string;
  estado: string;
}

const authenticateToken = (req: Request, res: Response, next: express.NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ error: 'Token requerido' });
    return;
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      res.status(403).json({ error: 'Token inválido' });
      return;
    }
    (req as Request & { user: User }).user = user as User;
    next();
  });
};

const isAdmin = (req: Request, res: Response, next: express.NextFunction) => {
  const user = (req as Request & { user: User }).user;
  if (user?.rol !== 'administrador') {
    res.status(403).json({ error: 'Acceso denegado' });
    return;
  }
  next();
};

app.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      res.status(400).json({ error: 'Usuario y contraseña requeridos' });
      return;
    }

    const result = await pool.query('SELECT * FROM usuarios WHERE username = $1', [username]);
    const user = result.rows[0];

    if (!user || user.estado !== 'activo') {
      res.status(401).json({ error: 'Credenciales inválidas' });
      return;
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      res.status(401).json({ error: 'Credenciales inválidas' });
      return;
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, rol: user.rol },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({
      token,
      user: { id: user.id, username: user.username, nombre: user.nombre, email: user.email, rol: user.rol }
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

app.get('/usuarios', authenticateToken, isAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query('SELECT id, username, nombre, email, rol, estado, created_at, updated_at FROM usuarios ORDER BY id');
    res.json(result.rows);
  } catch (error) {
    console.error('Error al listar usuarios:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

app.get('/usuarios/:id', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const user = (req as Request & { user: User }).user;

    if (user.rol !== 'administrador' && user.id !== parseInt(id)) {
      res.status(403).json({ error: 'Acceso denegado' });
      return;
    }

    const result = await pool.query('SELECT id, username, nombre, email, rol, estado, created_at, updated_at FROM usuarios WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Usuario no encontrado' });
      return;
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error al obtener usuario:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

app.post('/usuarios', authenticateToken, isAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password, nombre, email, rol = 'lector' } = req.body;

    if (!username || !password || !nombre || !email) {
      res.status(400).json({ error: 'Todos los campos son requeridos' });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO usuarios (username, password, nombre, email, rol) VALUES ($1, $2, $3, $4, $5) RETURNING id, username, nombre, email, rol',
      [username, hashedPassword, nombre, email, rol]
    );
    res.status(201).json(result.rows[0]);
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes('duplicate')) {
      res.status(409).json({ error: 'Usuario o email ya existe' });
      return;
    }
    console.error('Error al crear usuario:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

app.put('/usuarios/:id', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const user = (req as Request & { user: User }).user;
    const { nombre, email, rol, estado } = req.body;

    if (user.rol !== 'administrador' && user.id !== parseInt(id)) {
      res.status(403).json({ error: 'Acceso denegado' });
      return;
    }

    const updates: string[] = [];
    const values: (string | number)[] = [];
    let paramIndex = 1;

    if (nombre) { updates.push(`nombre = $${paramIndex++}`); values.push(nombre); }
    if (email) { updates.push(`email = $${paramIndex++}`); values.push(email); }
    if (rol && user.rol === 'administrador') { updates.push(`rol = $${paramIndex++}`); values.push(rol); }
    if (estado && user.rol === 'administrador') { updates.push(`estado = $${paramIndex++}`); values.push(estado); }

    if (updates.length === 0) {
      res.status(400).json({ error: 'No hay campos para actualizar' });
      return;
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(parseInt(id));

    const result = await pool.query(
      `UPDATE usuarios SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING id, username, nombre, email, rol, estado`,
      values
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Usuario no encontrado' });
      return;
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error al actualizar usuario:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

app.delete('/usuarios/:id', authenticateToken, isAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM usuarios WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Usuario no encontrado' });
      return;
    }
    res.json({ message: 'Usuario eliminado' });
  } catch (error) {
    console.error('Error al eliminar usuario:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

app.listen(PORT, async () => {
  await initDb();
  console.log(`service-usuarios corriendo en puerto ${PORT}`);
});

export default app;