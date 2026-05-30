import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import pkg from 'pg';
const { Pool } = pkg;

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3004;
const JWT_SECRET = process.env.JWT_SECRET!;

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

interface User { id: number; username: string; rol: string; id_area: number | null; }

const authenticateToken = (req: Request, res: Response, next: express.NextFunction) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) { res.status(401).json({ error: 'Token requerido' }); return; }
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) { res.status(403).json({ error: 'Token inválido o expirado' }); return; }
    (req as any).user = user as User;
    next();
  });
};

const requireAdmin = (req: Request, res: Response, next: express.NextFunction) => {
  if ((req as any).user?.rol !== 'administrador') {
    res.status(403).json({ error: 'No tienes permisos para esta acción' }); return;
  }
  next();
};

const TAREA_SELECT = `
  SELECT t.*, e.titulo AS expediente_titulo, e.estado AS expediente_estado,
         e.id_proyecto, e.id_disciplina, e.version AS expediente_version,
         u.nombre AS asignado_a_nombre,
         p.nombre AS proyecto_nombre, d.nombre AS disciplina_nombre,
         a.id AS id_area,
         et.nombre AS etapa_nombre
  FROM tareas t
  JOIN expedientes e ON e.id = t.id_expediente
  JOIN usuarios u ON u.id = t.id_usuario_asignado
  JOIN proyectos p ON p.id = e.id_proyecto
  JOIN disciplinas d ON d.id = e.id_disciplina
  JOIN areas a ON a.id = p.id_area
  LEFT JOIN etapas et ON et.id = t.id_etapa
`;

// ─── Health ───────────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'service-tareas' }));

// ─── GET /mis-tareas ──────────────────────────────────────────────────────────
app.get('/mis-tareas', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const user: User = (req as any).user;
    const r = await pool.query(
      `${TAREA_SELECT} WHERE t.id_usuario_asignado = $1 AND t.estado IN ('ABIERTA', 'EN_REVISION') ORDER BY t.created_at DESC`,
      [user.id]
    );
    res.json(r.rows);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Error interno' }); }
});

// ─── GET /tareas (solo admin) ─────────────────────────────────────────────────
app.get('/tareas', authenticateToken, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { estado, id_area, id_usuario } = req.query;
    let q = `${TAREA_SELECT} WHERE 1=1`;
    const vals: any[] = [];
    let i = 1;
    if (estado) { q += ` AND t.estado = $${i++}`; vals.push(estado); }
    if (id_area) { q += ` AND a.id = $${i++}`; vals.push(id_area); }
    if (id_usuario) { q += ` AND t.id_usuario_asignado = $${i++}`; vals.push(id_usuario); }
    q += ' ORDER BY t.created_at DESC';
    const r = await pool.query(q, vals);
    res.json(r.rows);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Error interno' }); }
});

// ─── GET /tareas/:id ──────────────────────────────────────────────────────────
app.get('/tareas/:id', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  const client = await pool.connect();
  try {
    const user: User = (req as any).user;
    const r = await client.query(`${TAREA_SELECT} WHERE t.id = $1`, [req.params.id]);
    if (!r.rows.length) { res.status(404).json({ error: 'No encontrado' }); return; }
    const tarea = r.rows[0];

    // Verificar acceso
    if (user.rol !== 'administrador' && tarea.id_usuario_asignado !== user.id) {
      res.status(403).json({ error: 'No autorizado' }); return;
    }

    // Marcar EN_REVISION si estaba ABIERTA
    if (tarea.estado === 'ABIERTA') {
      await client.query(
        "UPDATE tareas SET estado = 'EN_REVISION', updated_at = CURRENT_TIMESTAMP WHERE id = $1",
        [tarea.id]
      );
      tarea.estado = 'EN_REVISION';
    }

    res.json(tarea);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Error interno' }); }
  finally { client.release(); }
});

// ─── PUT /tareas/:id ──────────────────────────────────────────────────────────
app.put('/tareas/:id', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  const client = await pool.connect();
  try {
    const user: User = (req as any).user;
    const { estado, comentario } = req.body;

    // Obtener tarea actual
    const tareaQ = await client.query(`${TAREA_SELECT} WHERE t.id = $1`, [req.params.id]);
    if (!tareaQ.rows.length) { res.status(404).json({ error: 'No encontrado' }); return; }
    const tarea = tareaQ.rows[0];

    // Solo el asignado o admin puede resolver
    if (user.rol !== 'administrador' && tarea.id_usuario_asignado !== user.id) {
      res.status(403).json({ error: 'No autorizado' }); return;
    }

    // Comentario obligatorio para APROBADA o RECHAZADA
    if ((estado === 'APROBADA' || estado === 'RECHAZADA') && !comentario?.trim()) {
      res.status(400).json({ error: 'El comentario es obligatorio' }); return;
    }

    const estadosValidos = ['ABIERTA', 'EN_REVISION', 'APROBADA', 'RECHAZADA'];
    if (!estadosValidos.includes(estado)) {
      res.status(400).json({ error: 'Estado no válido' }); return;
    }

    await client.query('BEGIN');

    // Actualizar tarea
    await client.query(
      'UPDATE tareas SET estado=$1, comentario=$2, updated_at=CURRENT_TIMESTAMP WHERE id=$3',
      [estado, comentario || null, req.params.id]
    );

    // Propagar cambio al expediente
    if (estado === 'APROBADA') {
      await client.query(
        "UPDATE expedientes SET estado='APROBADO', updated_at=CURRENT_TIMESTAMP WHERE id=$1",
        [tarea.id_expediente]
      );
    } else if (estado === 'RECHAZADA') {
      await client.query(
        "UPDATE expedientes SET estado='RECHAZADO', updated_at=CURRENT_TIMESTAMP WHERE id=$1",
        [tarea.id_expediente]
      );
    }

    await client.query('COMMIT');

    const updated = await pool.query(`${TAREA_SELECT} WHERE t.id = $1`, [req.params.id]);
    res.json(updated.rows[0]);
  } catch (e) {
    await client.query('ROLLBACK');
    console.error(e); res.status(500).json({ error: 'Error interno' });
  } finally { client.release(); }
});

app.listen(PORT, () => console.log(`service-tareas corriendo en puerto ${PORT}`));
export default app;
