import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import pkg from 'pg';
const { Pool } = pkg;

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;
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
    CREATE TABLE IF NOT EXISTS contratistas (
      id SERIAL PRIMARY KEY,
      nombre VARCHAR(100) NOT NULL,
      rut VARCHAR(20) UNIQUE NOT NULL,
      direccion VARCHAR(255),
      telefono VARCHAR(20),
      estado VARCHAR(20) NOT NULL DEFAULT 'activo',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS areas (
      id SERIAL PRIMARY KEY,
      nombre VARCHAR(100) NOT NULL,
      contratista_id INTEGER REFERENCES contratistas(id),
      estado VARCHAR(20) NOT NULL DEFAULT 'activo',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS expediente (
      id SERIAL PRIMARY KEY,
      titulo VARCHAR(255) NOT NULL,
      descripcion TEXT,
      contratista_id INTEGER REFERENCES contratistas(id),
      area_id INTEGER REFERENCES areas(id),
      estado VARCHAR(20) NOT NULL DEFAULT 'borrador',
      created_by INTEGER,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log('Tablas de expedientes inicializadas');
};

interface User {
  id: number;
  username: string;
  rol: string;
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

app.get('/expedientes', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { estado, area, contratista, limit = 50, offset = 0 } = req.query;
    
    let query = `
      SELECT e.id, e.titulo, e.descripcion, e.estado, e.created_at,
             c.nombre as contratista_nombre, c.id as contratista_id,
             a.nombre as area_nombre, a.id as area_id
      FROM expediente e
      LEFT JOIN contratistas c ON e.contratista_id = c.id
      LEFT JOIN areas a ON e.area_id = a.id
      WHERE 1=1
    `;
    const values: (string | number)[] = [];
    let paramIndex = 1;

    if (estado) {
      query += ` AND e.estado = $${paramIndex++}`;
      values.push(estado as string);
    }
    if (area) {
      query += ` AND e.area_id = $${paramIndex++}`;
      values.push(parseInt(area as string));
    }
    if (contratista) {
      query += ` AND e.contratista_id = $${paramIndex++}`;
      values.push(parseInt(contratista as string));
    }

    query += ` ORDER BY e.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    values.push(parseInt(limit as string), parseInt(offset as string));

    const result = await pool.query(query, values);
    res.json(result.rows);
  } catch (error) {
    console.error('Error al listar expedientes:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

app.get('/expedientes/:id', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT e.id, e.titulo, e.descripcion, e.estado, e.created_at, e.updated_at,
             c.nombre as contratista_nombre, c.id as contratista_id,
             a.nombre as area_nombre, a.id as area_id
      FROM expediente e
      LEFT JOIN contratistas c ON e.contratista_id = c.id
      LEFT JOIN areas a ON e.area_id = a.id
      WHERE e.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Expediente no encontrado' });
      return;
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error al obtener expediente:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

app.post('/expedientes', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { titulo, descripcion, area_id, contratista_id } = req.body;
    const user = (req as Request & { user: User }).user;

    if (!titulo || !area_id || !contratista_id) {
      res.status(400).json({ error: 'Título, área y contratista son requeridos' });
      return;
    }

    const result = await pool.query(
      `INSERT INTO expediente (titulo, descripcion, area_id, contratista_id, created_by) 
       VALUES ($1, $2, $3, $4, $5) RETURNING id, titulo, descripcion, estado`,
      [titulo, descripcion, area_id, contratista_id, user.id]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error al crear expediente:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

app.put('/expedientes/:id', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const user = (req as Request & { user: User }).user;
    const { titulo, descripcion, estado, area_id, contratista_id } = req.body;

    const updates: string[] = [];
    const values: (string | number)[] = [];
    let paramIndex = 1;

    if (titulo) { updates.push(`titulo = $${paramIndex++}`); values.push(titulo); }
    if (descripcion) { updates.push(`descripcion = $${paramIndex++}`); values.push(descripcion); }
    if (estado) { updates.push(`estado = $${paramIndex++}`); values.push(estado); }
    if (area_id) { updates.push(`area_id = $${paramIndex++}`); values.push(area_id); }
    if (contratista_id) { updates.push(`contratista_id = $${paramIndex++}`); values.push(contratista_id); }

    if (updates.length === 0) {
      res.status(400).json({ error: 'No hay campos para actualizar' });
      return;
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(parseInt(id));

    const result = await pool.query(
      `UPDATE expediente SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING id, titulo, descripcion, estado`,
      values
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Expediente no encontrado' });
      return;
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error al actualizar expediente:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

app.delete('/expediente/:id', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM expediente WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Expediente no encontrado' });
      return;
    }
    res.json({ message: 'Expediente eliminado' });
  } catch (error) {
    console.error('Error al eliminar expediente:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

app.get('/contratistas', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query('SELECT * FROM contratistas WHERE estado = $1 ORDER BY nombre', ['activo']);
    res.json(result.rows);
  } catch (error) {
    console.error('Error al listar contratistas:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

app.post('/contratistas', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { nombre, rut, direccion, telefono } = req.body;
    if (!nombre || !rut) {
      res.status(400).json({ error: 'Nombre y RUT requeridos' });
      return;
    }
    const result = await pool.query(
      'INSERT INTO contratistas (nombre, rut, direccion, telefono) VALUES ($1, $2, $3, $4) RETURNING *',
      [nombre, rut, direccion, telefono]
    );
    res.status(201).json(result.rows[0]);
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes('duplicate')) {
      res.status(409).json({ error: 'RUT ya existe' });
      return;
    }
    console.error('Error al crear contratista:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

app.get('/areas', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { contratista_id } = req.query;
    let query = 'SELECT * FROM areas WHERE estado = $1';
    const values: (string | number)[] = ['activo'];
    
    if (contratista_id) {
      query += ' AND contratista_id = $2';
      values.push(parseInt(contratista_id as string));
    }
    query += ' ORDER BY nombre';
    
    const result = await pool.query(query, values);
    res.json(result.rows);
  } catch (error) {
    console.error('Error al listar áreas:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

app.post('/areas', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { nombre, contratista_id } = req.body;
    if (!nombre || !contratista_id) {
      res.status(400).json({ error: 'Nombre y contratista_id requeridos' });
      return;
    }
    const result = await pool.query(
      'INSERT INTO areas (nombre, contratista_id) VALUES ($1, $2) RETURNING *',
      [nombre, contratista_id]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error al crear área:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

app.listen(PORT, async () => {
  await initDb();
  console.log(`service-expedientes corriendo en puerto ${PORT}`);
});

export default app;