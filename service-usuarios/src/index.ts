import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import nodemailer from 'nodemailer';
import pkg from 'pg';
const { Pool } = pkg;

dotenv.config();

// Configuración del transportador SMTP para correos reales
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true', // true para puerto 465, false para 587
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },
});

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

  // Asegurar que existan las columnas de restablecimiento de contraseña
  try {
    await pool.query('ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255)');
    await pool.query('ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMP');
  } catch (err) {
    console.error('Error al agregar columnas de reset de contraseña:', err);
  }

  // Usuarios de testing a mantener en el sistema
  const TEST_USERS = [
    { username: 'admin', password: 'admin123', nombre: 'Administrador', email: 'admin@gps.cl', rol: 'administrador' },
    { username: 'juan_revisor', password: 'password123', nombre: 'Juan Revisor', email: 'juan@gps.cl', rol: 'revisor' },
    { username: 'test_revisor_2', password: 'password123', nombre: 'Test Revisor 2', email: 'test_revisor2@gps.cl', rol: 'revisor' },
    { username: 'pedro_terreno', password: 'password123', nombre: 'Pedro Terreno', email: 'pedro@gps.cl', rol: 'usuario_terreno' },
    { username: 'revisor_test', password: 'password123', nombre: 'Test Revisor', email: 'revisor_test@gps.cl', rol: 'usuario_terreno' },
    { username: 'maria_lectora', password: 'password123', nombre: 'Maria Lectora', email: 'maria@gps.cl', rol: 'lector' },
    { username: 'test_lector_2', password: 'password123', nombre: 'Test Lector 2', email: 'test_lector2@gps.cl', rol: 'lector' },
  ];

  for (const u of TEST_USERS) {
    try {
      const check = await pool.query('SELECT id FROM usuarios WHERE username = $1', [u.username]);
      if (check.rows.length === 0) {
        const hashed = await bcrypt.hash(u.password, 10);
        await pool.query(
          `INSERT INTO usuarios (username, password, nombre, email, rol, id_area, estado)
           VALUES ($1, $2, $3, $4, $5, NULL, 'activo')`,
          [u.username, hashed, u.nombre, u.email, u.rol]
        );
        console.log(`Usuario de testing creado: ${u.username} (${u.rol})`);
      }
    } catch (err) {
      console.warn(`ADVERTENCIA: No se pudo verificar usuario ${u.username}:`, err);
    }
  }

  console.log('Sistema listo.');
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

// POST /register (público — crea cuenta con rol mínimo 'lector')
app.post('/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password, nombre, email } = req.body;

    if (!username || !password || !nombre || !email) {
      res.status(400).json({ error: 'username, password, nombre y email son requeridos' });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO usuarios (username, password, nombre, email, rol, id_area, estado)
       VALUES ($1, $2, $3, $4, 'lector', NULL, 'activo')
       RETURNING id, username, nombre, email, rol, id_area, estado`,
      [username.trim(), hashedPassword, nombre.trim(), email.trim().toLowerCase()]
    );

    res.status(201).json(result.rows[0]);
  } catch (error: unknown) {
    if (error instanceof Error && (error.message.includes('duplicate') || error.message.includes('unique'))) {
      res.status(409).json({ error: 'El username o email ya está registrado' });
      return;
    }
    console.error('Error en registro:', error);
    res.status(500).json({ error: 'Error interno' });
  }
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

// POST /forgot-password
app.post('/forgot-password', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ error: 'El correo electrónico es requerido' });
      return;
    }

    const result = await pool.query('SELECT * FROM usuarios WHERE email = $1 AND estado = \'activo\'', [email.trim().toLowerCase()]);
    if (result.rows.length === 0) {
      // Por seguridad, damos un mensaje genérico
      res.json({ message: 'Si el correo está registrado, se enviarán las instrucciones para restablecer la contraseña.' });
      return;
    }

    const user = result.rows[0];
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date();
    expires.setHours(expires.getHours() + 1); // 1 hora de validez

    await pool.query(
      'UPDATE usuarios SET reset_token = $1, reset_token_expires = $2 WHERE id = $3',
      [token, expires, user.id]
    );

    // Configuración de la URL dinámica
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetUrl = `${frontendUrl}/reset-password?token=${token}`;

    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      try {
        await transporter.sendMail({
          from: process.env.SMTP_FROM || `"GPS Seguridad" <${process.env.SMTP_USER}>`,
          to: user.email,
          subject: '🔑 Restablecer contraseña - GPS',
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e6ed; border-radius: 8px;">
              <h2 style="color: #0078d4; text-align: center;">Restablecimiento de Contraseña</h2>
              <p>Hola <strong>${user.nombre}</strong>,</p>
              <p>Recibimos una solicitud para restablecer tu contraseña de acceso en el Sistema de Gestión Documental de GPS.</p>
              <p>Para continuar y establecer una nueva contraseña, por favor haz clic en el botón de abajo:</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${resetUrl}" style="background-color: #0078d4; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">Restablecer Contraseña</a>
              </div>
              <p style="color: #666; font-size: 12px; border-top: 1px solid #eff2f5; padding-top: 15px;">
                Si no solicitaste este cambio, puedes ignorar este correo de forma segura. Tu contraseña actual seguirá funcionando.
              </p>
            </div>
          `
        });
        console.log(`📧 Correo de restablecimiento enviado exitosamente a: ${user.email}`);
      } catch (mailErr) {
        console.error('Error al enviar correo electrónico real:', mailErr);
        res.status(500).json({ error: 'No se pudo enviar el correo de recuperación. Verifique la configuración de SMTP.' });
        return;
      }
    } else {
      console.warn('ADVERTENCIA: SMTP no configurado en el archivo .env. El correo de restablecimiento no pudo ser enviado.');
      res.status(500).json({ error: 'La funcionalidad de recuperación por correo real requiere configurar el servidor SMTP en el archivo .env.' });
      return;
    }

    res.json({
      message: 'Si el correo está registrado, se enviarán las instrucciones para restablecer la contraseña.',
      token: token
    });
  } catch (error) {
    console.error('Error en forgot-password:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

// POST /reset-password
app.post('/reset-password', async (req: Request, res: Response): Promise<void> => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      res.status(400).json({ error: 'Token y nueva contraseña son requeridos' });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
      return;
    }

    const result = await pool.query(
      'SELECT * FROM usuarios WHERE reset_token = $1 AND reset_token_expires > CURRENT_TIMESTAMP AND estado = \'activo\'',
      [token]
    );

    if (result.rows.length === 0) {
      res.status(400).json({ error: 'El token de restablecimiento es inválido o ha expirado' });
      return;
    }

    const user = result.rows[0];
    const hashedPassword = await bcrypt.hash(password, 10);

    await pool.query(
      'UPDATE usuarios SET password = $1, reset_token = NULL, reset_token_expires = NULL WHERE id = $2',
      [hashedPassword, user.id]
    );

    res.json({ message: 'Contraseña restablecida con éxito.' });
  } catch (error) {
    console.error('Error en reset-password:', error);
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