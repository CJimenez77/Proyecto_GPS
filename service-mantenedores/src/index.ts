import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import pkg from 'pg';
const { Pool } = pkg;

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3003;
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

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'service-mantenedores' }));

// ─── JERARQUÍA COMPLETA ───────────────────────────────────────────────────────
app.get('/jerarquia', authenticateToken, async (_req, res: Response): Promise<void> => {
  try {
    const result = await pool.query(`
      SELECT
        e.id AS emp_id, e.nombre AS emp_nombre, e.rut AS emp_rut,
        a.id AS area_id, a.nombre AS area_nombre,
        p.id AS proy_id, p.nombre AS proy_nombre, p.descripcion AS proy_desc,
        d.id AS disc_id, d.nombre AS disc_nombre
      FROM empresas e
      LEFT JOIN areas a ON a.id_empresa = e.id AND a.estado = 'activo'
      LEFT JOIN proyectos p ON p.id_area = a.id AND p.estado = 'activo'
      LEFT JOIN disciplinas d ON d.id_proyecto = p.id AND d.estado = 'activo'
      WHERE e.estado = 'activo'
      ORDER BY e.id, a.id, p.id, d.id
    `);

    const empresasMap = new Map<number, any>();
    for (const row of result.rows) {
      if (!empresasMap.has(row.emp_id)) {
        empresasMap.set(row.emp_id, { id: row.emp_id, nombre: row.emp_nombre, rut: row.emp_rut, areas: [] });
      }
      const empresa = empresasMap.get(row.emp_id)!;
      if (!row.area_id) continue;
      let area = empresa.areas.find((a: any) => a.id === row.area_id);
      if (!area) { area = { id: row.area_id, nombre: row.area_nombre, proyectos: [] }; empresa.areas.push(area); }
      if (!row.proy_id) continue;
      let proy = area.proyectos.find((p: any) => p.id === row.proy_id);
      if (!proy) { proy = { id: row.proy_id, nombre: row.proy_nombre, descripcion: row.proy_desc, disciplinas: [] }; area.proyectos.push(proy); }
      if (row.disc_id) proy.disciplinas.push({ id: row.disc_id, nombre: row.disc_nombre });
    }
    res.json([...empresasMap.values()]);
  } catch (error) { console.error(error); res.status(500).json({ error: 'Error interno' }); }
});

// ─── EMPRESAS ─────────────────────────────────────────────────────────────────
app.get('/empresas', authenticateToken, async (_req, res: Response): Promise<void> => {
  try {
    const r = await pool.query("SELECT * FROM empresas WHERE estado = 'activo' ORDER BY nombre");
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: 'Error interno' }); }
});

app.post('/empresas', authenticateToken, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { nombre, rut } = req.body;
    if (!nombre) { res.status(400).json({ error: 'nombre es requerido' }); return; }
    const r = await pool.query('INSERT INTO empresas (nombre, rut) VALUES ($1, $2) RETURNING *', [nombre, rut || null]);
    res.status(201).json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: 'Error interno' }); }
});

app.put('/empresas/:id', authenticateToken, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { nombre, rut } = req.body;
    const r = await pool.query(
      'UPDATE empresas SET nombre=$1, rut=$2, updated_at=CURRENT_TIMESTAMP WHERE id=$3 RETURNING *',
      [nombre, rut, req.params.id]
    );
    if (!r.rows.length) { res.status(404).json({ error: 'No encontrado' }); return; }
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: 'Error interno' }); }
});

app.put('/empresas/:id/estado', authenticateToken, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { estado } = req.body;
    const r = await pool.query('UPDATE empresas SET estado=$1, updated_at=CURRENT_TIMESTAMP WHERE id=$2 RETURNING *', [estado, req.params.id]);
    if (!r.rows.length) { res.status(404).json({ error: 'No encontrado' }); return; }
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: 'Error interno' }); }
});

// ─── ÁREAS ────────────────────────────────────────────────────────────────────
app.get('/areas', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id_empresa } = req.query;
    let q = "SELECT * FROM areas WHERE estado = 'activo'";
    const vals: any[] = [];
    if (id_empresa) { q += ' AND id_empresa = $1'; vals.push(id_empresa); }
    q += ' ORDER BY nombre';
    const r = await pool.query(q, vals);
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: 'Error interno' }); }
});

app.post('/areas', authenticateToken, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { nombre, id_empresa } = req.body;
    if (!nombre || !id_empresa) { res.status(400).json({ error: 'nombre e id_empresa requeridos' }); return; }
    const r = await pool.query('INSERT INTO areas (nombre, id_empresa) VALUES ($1, $2) RETURNING *', [nombre, id_empresa]);
    res.status(201).json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: 'Error interno' }); }
});

app.put('/areas/:id', authenticateToken, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { nombre } = req.body;
    const r = await pool.query('UPDATE areas SET nombre=$1, updated_at=CURRENT_TIMESTAMP WHERE id=$2 RETURNING *', [nombre, req.params.id]);
    if (!r.rows.length) { res.status(404).json({ error: 'No encontrado' }); return; }
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: 'Error interno' }); }
});

app.put('/areas/:id/estado', authenticateToken, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { estado } = req.body;
    const r = await pool.query('UPDATE areas SET estado=$1, updated_at=CURRENT_TIMESTAMP WHERE id=$2 RETURNING *', [estado, req.params.id]);
    if (!r.rows.length) { res.status(404).json({ error: 'No encontrado' }); return; }
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: 'Error interno' }); }
});

// ─── PROYECTOS ────────────────────────────────────────────────────────────────
app.get('/proyectos', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id_area } = req.query;
    let q = `SELECT p.*, a.nombre AS area_nombre FROM proyectos p JOIN areas a ON a.id = p.id_area WHERE p.estado = 'activo' AND a.estado = 'activo'`;
    const vals: any[] = [];
    if (id_area) { q += ' AND p.id_area = $1'; vals.push(id_area); }
    q += ' ORDER BY p.nombre';
    const r = await pool.query(q, vals);
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: 'Error interno' }); }
});

app.post('/proyectos', authenticateToken, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { nombre, id_area, descripcion } = req.body;
    if (!nombre || !id_area) { res.status(400).json({ error: 'nombre e id_area requeridos' }); return; }
    const r = await pool.query('INSERT INTO proyectos (nombre, id_area, descripcion) VALUES ($1, $2, $3) RETURNING *', [nombre, id_area, descripcion || null]);
    res.status(201).json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: 'Error interno' }); }
});

app.put('/proyectos/:id', authenticateToken, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { nombre, descripcion } = req.body;
    const r = await pool.query('UPDATE proyectos SET nombre=$1, descripcion=$2, updated_at=CURRENT_TIMESTAMP WHERE id=$3 RETURNING *', [nombre, descripcion, req.params.id]);
    if (!r.rows.length) { res.status(404).json({ error: 'No encontrado' }); return; }
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: 'Error interno' }); }
});

app.put('/proyectos/:id/estado', authenticateToken, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { estado } = req.body;
    const r = await pool.query('UPDATE proyectos SET estado=$1, updated_at=CURRENT_TIMESTAMP WHERE id=$2 RETURNING *', [estado, req.params.id]);
    if (!r.rows.length) { res.status(404).json({ error: 'No encontrado' }); return; }
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: 'Error interno' }); }
});

// ─── DISCIPLINAS ──────────────────────────────────────────────────────────────
app.get('/disciplinas', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id_proyecto } = req.query;
    let q = "SELECT * FROM disciplinas WHERE estado = 'activo'";
    const vals: any[] = [];
    if (id_proyecto) { q += ' AND id_proyecto = $1'; vals.push(id_proyecto); }
    q += ' ORDER BY nombre';
    const r = await pool.query(q, vals);
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: 'Error interno' }); }
});

app.post('/disciplinas', authenticateToken, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { nombre, id_proyecto } = req.body;
    if (!nombre || !id_proyecto) { res.status(400).json({ error: 'nombre e id_proyecto requeridos' }); return; }
    const r = await pool.query('INSERT INTO disciplinas (nombre, id_proyecto) VALUES ($1, $2) RETURNING *', [nombre, id_proyecto]);
    res.status(201).json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: 'Error interno' }); }
});

app.put('/disciplinas/:id', authenticateToken, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { nombre } = req.body;
    const r = await pool.query('UPDATE disciplinas SET nombre=$1, updated_at=CURRENT_TIMESTAMP WHERE id=$2 RETURNING *', [nombre, req.params.id]);
    if (!r.rows.length) { res.status(404).json({ error: 'No encontrado' }); return; }
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: 'Error interno' }); }
});

app.put('/disciplinas/:id/estado', authenticateToken, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { estado } = req.body;
    const r = await pool.query('UPDATE disciplinas SET estado=$1, updated_at=CURRENT_TIMESTAMP WHERE id=$2 RETURNING *', [estado, req.params.id]);
    if (!r.rows.length) { res.status(404).json({ error: 'No encontrado' }); return; }
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: 'Error interno' }); }
});

// ─── PROCESOS ─────────────────────────────────────────────────────────────────
app.get('/procesos', authenticateToken, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id_area } = req.query;
    let q = "SELECT * FROM procesos WHERE 1=1";
    const vals: any[] = [];
    let i = 1;
    if (id_area) { q += ` AND id_area = $${i++}`; vals.push(id_area); }
    q += ' ORDER BY id';
    const r = await pool.query(q, vals);
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: 'Error interno' }); }
});

app.get('/procesos/:id', authenticateToken, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const r = await pool.query('SELECT * FROM procesos WHERE id = $1', [req.params.id]);
    if (!r.rows.length) { res.status(404).json({ error: 'No encontrado' }); return; }
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: 'Error interno' }); }
});

app.post('/procesos', authenticateToken, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { nombre, id_area } = req.body;
    if (!nombre || !id_area) { res.status(400).json({ error: 'nombre e id_area requeridos' }); return; }
    const r = await pool.query('INSERT INTO procesos (nombre, id_area) VALUES ($1, $2) RETURNING *', [nombre, id_area]);
    res.status(201).json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: 'Error interno' }); }
});

app.put('/procesos/:id', authenticateToken, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { nombre, id_area, estado } = req.body;
    if (!nombre || !id_area) { res.status(400).json({ error: 'nombre e id_area requeridos' }); return; }
    const r = await pool.query(
      'UPDATE procesos SET nombre=$1, id_area=$2, estado=$3, updated_at=CURRENT_TIMESTAMP WHERE id=$4 RETURNING *',
      [nombre, id_area, estado || 'activo', req.params.id]
    );
    if (!r.rows.length) { res.status(404).json({ error: 'No encontrado' }); return; }
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: 'Error interno' }); }
});

// ─── ETAPAS ───────────────────────────────────────────────────────────────────
app.get('/etapas', authenticateToken, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id_proceso } = req.query;
    if (!id_proceso) { res.status(400).json({ error: 'id_proceso es requerido' }); return; }
    const r = await pool.query(
      `SELECT e.*, u.nombre AS revisor_nombre FROM etapas e
       LEFT JOIN usuarios u ON u.id = e.id_revisor
       WHERE e.id_proceso = $1 ORDER BY e.orden`,
      [id_proceso]
    );
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: 'Error interno' }); }
});

app.post('/etapas', authenticateToken, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { nombre, orden, id_proceso, id_revisor } = req.body;
    if (!nombre || !orden || !id_proceso) { res.status(400).json({ error: 'nombre, orden e id_proceso requeridos' }); return; }
    const r = await pool.query(
      'INSERT INTO etapas (nombre, orden, id_proceso, id_revisor) VALUES ($1, $2, $3, $4) RETURNING *',
      [nombre, orden, id_proceso, id_revisor || null]
    );
    res.status(201).json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: 'Error interno' }); }
});

app.put('/etapas/:id', authenticateToken, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { nombre, orden, id_revisor, estado } = req.body;
    if (!nombre || !orden) { res.status(400).json({ error: 'nombre y orden requeridos' }); return; }
    const r = await pool.query(
      'UPDATE etapas SET nombre=$1, orden=$2, id_revisor=$3, estado=$4, updated_at=CURRENT_TIMESTAMP WHERE id=$5 RETURNING *',
      [nombre, orden, id_revisor || null, estado || 'activo', req.params.id]
    );
    if (!r.rows.length) { res.status(404).json({ error: 'No encontrado' }); return; }
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: 'Error interno' }); }
});

// Mantener por compatibilidad con cualquier otra parte del sistema
app.get('/procesos/:id/etapas', authenticateToken, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const r = await pool.query(
      `SELECT e.*, u.nombre AS revisor_nombre FROM etapas e
       LEFT JOIN usuarios u ON u.id = e.id_revisor
       WHERE e.id_proceso = $1 ORDER BY e.orden`,
      [req.params.id]
    );
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: 'Error interno' }); }
});

app.post('/procesos/:id/etapas', authenticateToken, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { nombre, orden, id_revisor } = req.body;
    if (!nombre || !orden) { res.status(400).json({ error: 'nombre y orden requeridos' }); return; }
    const r = await pool.query(
      'INSERT INTO etapas (nombre, orden, id_proceso, id_revisor) VALUES ($1, $2, $3, $4) RETURNING *',
      [nombre, orden, req.params.id, id_revisor || null]
    );
    res.status(201).json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: 'Error interno' }); }
});

app.put('/procesos/:id/etapas/:etapaId', authenticateToken, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { nombre, orden, id_revisor } = req.body;
    const r = await pool.query(
      'UPDATE etapas SET nombre=$1, orden=$2, id_revisor=$3, updated_at=CURRENT_TIMESTAMP WHERE id=$4 AND id_proceso=$5 RETURNING *',
      [nombre, orden, id_revisor, req.params.etapaId, req.params.id]
    );
    if (!r.rows.length) { res.status(404).json({ error: 'No encontrado' }); return; }
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: 'Error interno' }); }
});

// ─── FORMULARIOS ──────────────────────────────────────────────────────────────
// IMPORTANTE: la ruta /formularios/buscar debe ir ANTES de /formularios/:id
app.get('/formularios/buscar', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id_proyecto, id_disciplina } = req.query;

    // Precedencia: proyecto+disciplina > solo disciplina > solo proyecto
    let form: any = null;

    if (id_proyecto && id_disciplina) {
      const r = await pool.query(
        `SELECT f.*, json_agg(c ORDER BY c.orden) AS campos
         FROM formularios f
         LEFT JOIN campos_formulario c ON c.id_formulario = f.id
         WHERE f.id_proyecto = $1 AND f.id_disciplina = $2 AND f.estado = 'activo'
         GROUP BY f.id LIMIT 1`,
        [id_proyecto, id_disciplina]
      );
      if (r.rows.length) form = r.rows[0];
    }

    if (!form && id_disciplina) {
      const r = await pool.query(
        `SELECT f.*, json_agg(c ORDER BY c.orden) AS campos
         FROM formularios f
         LEFT JOIN campos_formulario c ON c.id_formulario = f.id
         WHERE f.id_disciplina = $1 AND f.id_proyecto IS NULL AND f.estado = 'activo'
         GROUP BY f.id LIMIT 1`,
        [id_disciplina]
      );
      if (r.rows.length) form = r.rows[0];
    }

    if (!form && id_proyecto) {
      const r = await pool.query(
        `SELECT f.*, json_agg(c ORDER BY c.orden) AS campos
         FROM formularios f
         LEFT JOIN campos_formulario c ON c.id_formulario = f.id
         WHERE f.id_proyecto = $1 AND f.id_disciplina IS NULL AND f.estado = 'activo'
         GROUP BY f.id LIMIT 1`,
        [id_proyecto]
      );
      if (r.rows.length) form = r.rows[0];
    }

    if (!form) {
      const r = await pool.query(
        `SELECT f.*, json_agg(c ORDER BY c.orden) AS campos
         FROM formularios f
         LEFT JOIN campos_formulario c ON c.id_formulario = f.id
         WHERE f.id_proyecto IS NULL AND f.id_disciplina IS NULL AND f.estado = 'activo'
         GROUP BY f.id LIMIT 1`
      );
      if (r.rows.length) form = r.rows[0];
    }

    if (!form) { res.status(404).json({ error: 'No encontrado' }); return; }
    form.campos = form.campos && form.campos[0] !== null ? form.campos : [];
    res.json(form);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Error interno' }); }
});

app.get('/formularios', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id_proyecto, id_disciplina } = req.query;
    let q = `
      SELECT f.*, json_agg(c ORDER BY c.orden) AS campos
      FROM formularios f
      LEFT JOIN campos_formulario c ON c.id_formulario = f.id
      WHERE f.estado = 'activo'
    `;
    const vals: any[] = [];
    let i = 1;
    if (id_proyecto) { q += ` AND f.id_proyecto = $${i++}`; vals.push(id_proyecto); }
    if (id_disciplina) { q += ` AND f.id_disciplina = $${i++}`; vals.push(id_disciplina); }
    q += ' GROUP BY f.id ORDER BY f.id';
    const r = await pool.query(q, vals);
    // json_agg returns [null] if left join finds nothing. Filter it out.
    const result = r.rows.map(row => ({
      ...row,
      campos: row.campos && row.campos[0] !== null ? row.campos : []
    }));
    res.json(result);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Error interno' }); }
});

app.post('/formularios', authenticateToken, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const client = await pool.connect();
  try {
    const { nombre, id_proyecto, id_disciplina, campos } = req.body;
    if (!nombre) { res.status(400).json({ error: 'nombre es requerido' }); return; }

    await client.query('BEGIN');
    const formResult = await client.query(
      'INSERT INTO formularios (nombre, id_proyecto, id_disciplina) VALUES ($1, $2, $3) RETURNING *',
      [nombre, id_proyecto || null, id_disciplina || null]
    );
    const formulario = formResult.rows[0];

    const camposCreados = [];
    if (Array.isArray(campos)) {
      for (const campo of campos) {
        const cr = await client.query(
          `INSERT INTO campos_formulario (id_formulario, nombre, etiqueta, tipo, opciones, requerido, orden)
           VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
          [formulario.id, campo.nombre, campo.etiqueta, campo.tipo,
           campo.opciones ? JSON.stringify(campo.opciones) : null,
           campo.requerido || false, campo.orden || 1]
        );
        camposCreados.push(cr.rows[0]);
      }
    }
    await client.query('COMMIT');
    res.status(201).json({ ...formulario, campos: camposCreados });
  } catch (e) {
    await client.query('ROLLBACK');
    console.error(e); res.status(500).json({ error: 'Error interno' });
  } finally { client.release(); }
});

app.get('/formularios/:id', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const r = await pool.query(
      `SELECT f.*, json_agg(c ORDER BY c.orden) AS campos
       FROM formularios f
       LEFT JOIN campos_formulario c ON c.id_formulario = f.id
       WHERE f.id = $1 GROUP BY f.id`,
      [req.params.id]
    );
    if (!r.rows.length) { res.status(404).json({ error: 'No encontrado' }); return; }
    const result = r.rows[0];
    result.campos = result.campos && result.campos[0] !== null ? result.campos : [];
    res.json(result);
  } catch (e) { res.status(500).json({ error: 'Error interno' }); }
});

app.put('/formularios/:id', authenticateToken, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const client = await pool.connect();
  try {
    const { nombre, id_proyecto, id_disciplina, campos } = req.body;
    await client.query('BEGIN');
    const r = await client.query(
      'UPDATE formularios SET nombre=$1, id_proyecto=$2, id_disciplina=$3, updated_at=CURRENT_TIMESTAMP WHERE id=$4 RETURNING *',
      [nombre, id_proyecto || null, id_disciplina || null, req.params.id]
    );
    if (!r.rows.length) { await client.query('ROLLBACK'); res.status(404).json({ error: 'No encontrado' }); return; }

    if (Array.isArray(campos)) {
      // Obtener los IDs de campos existentes en la base de datos para este formulario
      const existingRes = await client.query('SELECT id FROM campos_formulario WHERE id_formulario = $1', [req.params.id]);
      const existingIds: number[] = existingRes.rows.map(r => Number(r.id));

      // Identificar IDs que deben eliminarse (están en la base de datos pero no vienen en la petición)
      const incomingIds: number[] = campos
        .map(c => c.id ? Number(c.id) : null)
        .filter((id): id is number => id !== null);
      const idsToDelete = existingIds.filter(id => !incomingIds.includes(id));

      if (idsToDelete.length > 0) {
        await client.query('DELETE FROM campos_formulario WHERE id = ANY($1)', [idsToDelete]);
      }

      // Insertar nuevos o actualizar los existentes
      for (const campo of campos) {
        const campoId = campo.id ? Number(campo.id) : null;
        if (campoId && existingIds.includes(campoId)) {
          await client.query(
            `UPDATE campos_formulario 
             SET nombre = $1, etiqueta = $2, tipo = $3, opciones = $4, requerido = $5, orden = $6
             WHERE id = $7`,
            [
              campo.nombre,
              campo.etiqueta,
              campo.tipo,
              campo.opciones ? JSON.stringify(campo.opciones) : null,
              campo.requerido || false,
              campo.orden || 1,
              campoId
            ]
          );
        } else {
          await client.query(
            `INSERT INTO campos_formulario (id_formulario, nombre, etiqueta, tipo, opciones, requerido, orden)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
              req.params.id,
              campo.nombre,
              campo.etiqueta,
              campo.tipo,
              campo.opciones ? JSON.stringify(campo.opciones) : null,
              campo.requerido || false,
              campo.orden || 1
            ]
          );
        }
      }
    }
    await client.query('COMMIT');

    const updated = await pool.query(
      `SELECT f.*, json_agg(c ORDER BY c.orden) AS campos FROM formularios f
       LEFT JOIN campos_formulario c ON c.id_formulario = f.id WHERE f.id = $1 GROUP BY f.id`,
      [req.params.id]
    );
    res.json(updated.rows[0]);
  } catch (e) {
    await client.query('ROLLBACK');
    console.error(e); res.status(500).json({ error: 'Error interno' });
  } finally { client.release(); }
});

app.listen(PORT, () => console.log(`service-mantenedores corriendo en puerto ${PORT}`));
export default app;
