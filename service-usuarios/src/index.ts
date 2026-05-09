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

if (!process.env.JWT_SECRET) {
  console.error('ERROR: JWT_SECRET no está definido en las variables de entorno');
  process.exit(1);
}

const JWT_SECRET = process.env.JWT_SECRET;

app.use(cors());
app.use(express.json());

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'gps_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  ssl: false,
});

const initDb = async () => {
  // Esperar a que postgres esté listo
  for (let i = 0; i < 15; i++) {
    try {
      await pool.query('SELECT 1');
      break;
    } catch {
      console.log(`Esperando DB... intento ${i + 1}`);
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  try {
    // El admin debería existir ya por init.sql, pero lo creamos como respaldo
    const adminCheck = await pool.query("SELECT id FROM usuarios WHERE username = 'admin'");
    if (adminCheck.rows.length === 0) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await pool.query(
        `INSERT INTO usuarios (username, password, nombre, email, rol, id_area, estado)
         VALUES ('admin', $1, 'Administrador', 'admin@gps.cl', 'administrador', NULL, 'activo')`,
        [hashedPassword]
      );
      console.log('Usuario admin creado (admin/admin123)');
    } else {
      console.log('Usuario admin encontrado, sistema listo.');
    }
  } catch (err) {
    console.warn('ADVERTENCIA: No se pudo verificar usuario admin:', err);
  }
};

interface User {
  id: number;
  username: string;
  nombre: string;
  email: string;
  rol: string;
  id_area: number | null;
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
      res.status(403).json({ error: 'Token inválido o expirado' });
      return;
    }
    (req as Request & { user: User }).user = user as User;
    next();
  });
};

const requireAdmin = (req: Request, res: Response, next: express.NextFunction) => {
  const user = (req as Request & { user: User }).user;
  if (user?.rol !== 'administrador') {
    res.status(403).json({ error: 'No tienes permisos para esta acción' });
    return;
  }
  next();
};

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'service-usuarios' });
});

// POST /login
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
      { id: user.id, username: user.username, rol: user.rol, id_area: user.id_area },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        nombre: user.nombre,
        email: user.email,
        rol: user.rol,
        id_area: user.id_area
      }
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

// GET /usuarios (solo admin)
app.get('/usuarios', authenticateToken, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query(
      `SELECT id, username, nombre, email, rol, id_area, estado, created_at, updated_at
       FROM usuarios ORDER BY id`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error al listar usuarios:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

// GET /usuarios/:id
app.get('/usuarios/:id', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const user = (req as Request & { user: User }).user;

    if (user.rol !== 'administrador' && user.id !== parseInt(id)) {
      res.status(403).json({ error: 'No tienes permisos para esta acción' });
      return;
    }

    const result = await pool.query(
      'SELECT id, username, nombre, email, rol, id_area, estado, created_at, updated_at FROM usuarios WHERE id = $1',
      [id]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'No encontrado' });
      return;
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error al obtener usuario:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

// POST /usuarios (solo admin)
app.post('/usuarios', authenticateToken, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    let { username, password, nombre, email, rol = 'lector', id_area } = req.body;

    if (!password || !nombre || !email || !id_area) {
      res.status(400).json({ error: 'nombre, email, password e id_area son requeridos' });
      return;
    }

    if (!username) {
      username = nombre.toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_]/g, '');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO usuarios (username, password, nombre, email, rol, id_area)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, username, nombre, email, rol, id_area, estado`,
      [username, hashedPassword, nombre, email, rol, id_area]
    );
    res.status(201).json(result.rows[0]);
  } catch (error: unknown) {
    if (error instanceof Error && (error.message.includes('duplicate') || error.message.includes('unique'))) {
      res.status(409).json({ error: 'El usuario o email ya existe' });
      return;
    }
    console.error('Error al crear usuario:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

// PUT /usuarios/:id (admin edita todo; usuario propio solo nombre y email)
app.put('/usuarios/:id', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const currentUser = (req as Request & { user: User }).user;
    const { nombre, email, rol, id_area } = req.body;

    if (currentUser.rol !== 'administrador' && currentUser.id !== parseInt(id)) {
      res.status(403).json({ error: 'No tienes permisos para esta acción' });
      return;
    }

    const updates: string[] = [];
    const values: (string | number | null)[] = [];
    let paramIndex = 1;

    if (nombre) { updates.push(`nombre = $${paramIndex++}`); values.push(nombre); }
    if (email) { updates.push(`email = $${paramIndex++}`); values.push(email); }

    // Solo admin puede cambiar rol e id_area
    if (currentUser.rol === 'administrador') {
      if (rol) { updates.push(`rol = $${paramIndex++}`); values.push(rol); }
      if (id_area !== undefined) { updates.push(`id_area = $${paramIndex++}`); values.push(id_area); }
    }

    if (updates.length === 0) {
      res.status(400).json({ error: 'No hay campos para actualizar' });
      return;
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(parseInt(id));

    const result = await pool.query(
      `UPDATE usuarios SET ${updates.join(', ')} WHERE id = $${paramIndex}
       RETURNING id, username, nombre, email, rol, id_area, estado`,
      values
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'No encontrado' });
      return;
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error al actualizar usuario:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

// PUT /usuarios/:id/estado (solo admin)
app.put('/usuarios/:id/estado', authenticateToken, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { estado } = req.body;

    if (!estado || !['activo', 'inactivo'].includes(estado)) {
      res.status(400).json({ error: 'Estado debe ser "activo" o "inactivo"' });
      return;
    }

    const result = await pool.query(
      `UPDATE usuarios SET estado = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING id, username, nombre, email, rol, id_area, estado`,
      [estado, id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'No encontrado' });
      return;
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error al cambiar estado de usuario:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

app.listen(PORT, async () => {
  await initDb();
  console.log(`service-usuarios corriendo en puerto ${PORT}`);
});

export default app;