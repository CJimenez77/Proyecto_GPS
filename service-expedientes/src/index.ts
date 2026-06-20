// Polyfill crypto para Node 18 requerido por @aws-sdk/client-s3
import { webcrypto } from 'crypto';
if (typeof globalThis.crypto === 'undefined') {
  (globalThis as any).crypto = webcrypto;
}

import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import pkg from 'pg';
const { Pool } = pkg;

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;
const JWT_SECRET = process.env.JWT_SECRET!;
const MINIO_BUCKET = process.env.MINIO_BUCKET || 'expedientes-gps';

app.use(cors());
app.use(express.json());

// ─── MinIO / S3 Client ────────────────────────────────────────────────────────
const s3 = new S3Client({
  endpoint: `http://${process.env.MINIO_ENDPOINT || 'localhost'}:${process.env.MINIO_PORT || '9000'}`,
  region: 'us-east-1',
  credentials: {
    accessKeyId: process.env.MINIO_ACCESS_KEY || 'minioadmin',
    secretAccessKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
  },
  forcePathStyle: true,
});

// ─── DB Pool ──────────────────────────────────────────────────────────────────
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'gps_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  ssl: false,
});

const initDB = async () => {
  try {
    // Agregar columna id_proceso si no existe
    await pool.query(`
      ALTER TABLE public.expedientes 
      ADD COLUMN IF NOT EXISTS id_proceso integer REFERENCES public.procesos(id);
    `);
    console.log('[DB] Columna id_proceso en tabla expedientes verificada/creada');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS public.historial_expedientes (
        id SERIAL PRIMARY KEY,
        id_expediente integer NOT NULL,
        evento character varying(100) NOT NULL,
        descripcion text NOT NULL,
        id_usuario integer NOT NULL,
        created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_historial_expediente FOREIGN KEY (id_expediente) REFERENCES public.expedientes(id) ON DELETE CASCADE,
        CONSTRAINT fk_historial_usuario FOREIGN KEY (id_usuario) REFERENCES public.usuarios(id)
      )
    `);
    console.log('[DB] Tabla historial_expedientes verificada/creada');
  } catch (err) {
    console.error('[DB] Error al inicializar tabla historial_expedientes o columnas:', err);
  }
};
initDB();

// ─── Multer (memoria) ────────────────────────────────────────────────────────
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

// ─── Tipos ───────────────────────────────────────────────────────────────────
interface User { id: number; username: string; rol: string; id_area: number | null; }

// ─── Middlewares ─────────────────────────────────────────────────────────────
const authenticateToken = (req: Request, res: Response, next: express.NextFunction) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) { res.status(401).json({ error: 'Token requerido' }); return; }
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) { res.status(403).json({ error: 'Token inválido o expirado' }); return; }
    (req as any).user = user as User;
    next();
  });
};

const requireRoles = (...roles: string[]) => (req: Request, res: Response, next: express.NextFunction) => {
  const user: User = (req as any).user;
  if (!roles.includes(user.rol)) {
    res.status(403).json({ error: 'No tienes permisos para esta acción' }); return;
  }
  next();
};

// ─── Health ───────────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'service-expedientes' }));

// ─── GET /stats (Dashboard Metrics) ───────────────────────────────────────────
app.get('/stats', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    // 1. Expedientes por estado
    const estadosQ = await pool.query(`
      SELECT estado, COUNT(*) as cantidad
      FROM expedientes
      WHERE estado != 'ARCHIVADO'
      GROUP BY estado
    `);

    // 2. Expedientes por área
    const areasQ = await pool.query(`
      SELECT a.nombre as area, COUNT(e.id) as cantidad
      FROM expedientes e
      JOIN proyectos p ON p.id = e.id_proyecto
      JOIN areas a ON a.id = p.id_area
      WHERE e.estado != 'ARCHIVADO'
      GROUP BY a.nombre
    `);

    // 3. Tareas pendientes por revisor
    const revisoresQ = await pool.query(`
      SELECT u.nombre as revisor, COUNT(t.id) as cantidad
      FROM usuarios u
      LEFT JOIN tareas t ON t.id_usuario_asignado = u.id AND t.estado IN ('ABIERTA', 'EN_REVISION')
      WHERE u.rol = 'revisor'
      GROUP BY u.nombre
    `);

    res.json({
      estados: estadosQ.rows,
      areas: areasQ.rows,
      revisores: revisoresQ.rows
    });
  } catch (e) {
    console.error('[Stats] Error al obtener estadísticas:', e);
    res.status(500).json({ error: 'Error interno' });
  }
});

// ─── GET /expedientes ─────────────────────────────────────────────────────────
app.get('/expedientes', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const user: User = (req as any).user;
    const { id_proyecto, id_disciplina, estado, titulo, fecha_desde, fecha_hasta, incluir_archivados } = req.query;

    let q = `
      SELECT e.*, p.nombre AS proyecto_nombre, d.nombre AS disciplina_nombre,
             pr.nombre AS proceso_nombre,
             u.nombre AS subido_por_nombre, a.id AS id_area
      FROM expedientes e
      JOIN proyectos p ON p.id = e.id_proyecto
      JOIN disciplinas d ON d.id = e.id_disciplina
      JOIN usuarios u ON u.id = e.subido_por
      JOIN areas a ON a.id = p.id_area
      LEFT JOIN procesos pr ON pr.id = e.id_proceso
      WHERE 1=1
    `;
    const vals: any[] = [];
    let i = 1;

    // Filtros por rol
    if (user.rol === 'usuario_terreno') {
      q += ` AND e.subido_por = $${i++}`; vals.push(user.id);
    } else if (user.rol === 'revisor') {
      q += ` AND a.id = $${i++}`; vals.push(user.id_area);
    } else if (user.rol === 'lector') {
      q += ` AND a.id = $${i++} AND e.estado = 'APROBADO'`; vals.push(user.id_area);
    }
    // admin ve todo

    if (id_proyecto) { q += ` AND e.id_proyecto = $${i++}`; vals.push(id_proyecto); }
    if (id_disciplina) { q += ` AND e.id_disciplina = $${i++}`; vals.push(id_disciplina); }
    if (estado) {
      q += ` AND e.estado = $${i++}`; vals.push(estado);
    } else {
      // Por defecto no mostrar archivados
      if (incluir_archivados === 'true' && user.rol === 'administrador') {
        // No filtrar
      } else {
        q += " AND e.estado != 'ARCHIVADO'";
      }
    }
    if (titulo) { q += ` AND e.titulo ILIKE $${i++}`; vals.push(`%${titulo}%`); }
    if (fecha_desde) { q += ` AND e.created_at >= $${i++}`; vals.push(fecha_desde); }
    if (fecha_hasta) { q += ` AND e.created_at <= $${i++}`; vals.push(`${fecha_hasta} 23:59:59`); }
    q += ' ORDER BY e.created_at DESC';

    const r = await pool.query(q, vals);
    res.json(r.rows);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Error interno' }); }
});

// ─── GET /expedientes/:id ─────────────────────────────────────────────────────
app.get('/expedientes/:id', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const user: User = (req as any).user;
    const r = await pool.query(`
      SELECT e.*, p.nombre AS proyecto_nombre, d.nombre AS disciplina_nombre,
             pr.nombre AS proceso_nombre,
             u.nombre AS subido_por_nombre, a.id AS id_area
      FROM expedientes e
      JOIN proyectos p ON p.id = e.id_proyecto
      JOIN disciplinas d ON d.id = e.id_disciplina
      JOIN usuarios u ON u.id = e.subido_por
      JOIN areas a ON a.id = p.id_area
      LEFT JOIN procesos pr ON pr.id = e.id_proceso
      WHERE e.id = $1
    `, [req.params.id]);

    if (!r.rows.length) { res.status(404).json({ error: 'No encontrado' }); return; }
    const exp = r.rows[0];

    // Verificar acceso
    if (user.rol === 'usuario_terreno' && exp.subido_por !== user.id) {
      res.status(403).json({ error: 'No tienes permisos para esta acción' }); return;
    }
    if ((user.rol === 'revisor' || user.rol === 'lector') && exp.id_area !== user.id_area) {
      res.status(403).json({ error: 'No tienes permisos para esta acción' }); return;
    }
    if (user.rol === 'lector' && exp.estado !== 'APROBADO') {
      res.status(403).json({ error: 'No tienes permisos para esta acción' }); return;
    }

    // Respuestas de formulario
    const respuestas = await pool.query(`
      SELECT rf.*, cf.etiqueta, cf.nombre AS campo_nombre, cf.tipo
      FROM respuestas_formulario rf
      JOIN campos_formulario cf ON cf.id = rf.id_campo
      WHERE rf.id_expediente = $1 ORDER BY cf.orden
    `, [exp.id]);
    exp.respuestas_formulario = respuestas.rows;

    res.json(exp);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Error interno' }); }
});

// ─── Mime type helper ─────────────────────────────────────────────────────────
function getMimeType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  const map: Record<string, string> = {
    pdf: 'application/pdf',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ppt: 'application/vnd.ms-powerpoint',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    zip: 'application/zip',
    txt: 'text/plain',
    csv: 'text/csv',
    dwg: 'application/acad',
    dxf: 'application/dxf',
  };
  return map[ext] || 'application/octet-stream';
}

// ─── GET /expedientes/:id/url ─────────────────────────────────────────────────
app.get('/expedientes/:id/url', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const r = await pool.query('SELECT archivo_key, nombre_archivo FROM expedientes WHERE id = $1', [req.params.id]);
    if (!r.rows.length) { res.status(404).json({ error: 'No encontrado' }); return; }
    const { archivo_key, nombre_archivo } = r.rows[0];

    // Para URLs pre-firmadas que se usan en el navegador, el S3Client debe usar el endpoint público (localhost)
    // porque la firma HMAC incluye el Host header. Si se firma con "minio", fallará al abrirse en localhost.
    const publicS3 = new S3Client({
      endpoint: `http://${process.env.MINIO_PUBLIC_ENDPOINT || 'localhost'}:${process.env.MINIO_PUBLIC_PORT || '9000'}`,
      region: 'us-east-1',
      credentials: {
        accessKeyId: process.env.MINIO_ACCESS_KEY || 'minioadmin',
        secretAccessKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
      },
      forcePathStyle: true,
    });

    let keys: string[] = [];
    let names: string[] = [];

    try {
      if (nombre_archivo.startsWith('[')) {
        names = JSON.parse(nombre_archivo);
        keys = JSON.parse(archivo_key);
      } else {
        names = [nombre_archivo];
        keys = [archivo_key];
      }
    } catch {
      names = [nombre_archivo];
      keys = [archivo_key];
    }

    const archivosResult = [];
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      const name = names[i];
      const contentType = getMimeType(name);
      const cmd = new GetObjectCommand({
        Bucket: MINIO_BUCKET,
        Key: key,
        ResponseContentDisposition: `attachment; filename="${name}"`,
        ResponseContentType: contentType,
      });
      const url = await getSignedUrl(publicS3, cmd, { expiresIn: 3600 });
      archivosResult.push({ url, nombre_archivo: name, content_type: contentType });
    }

    res.json({
      url: archivosResult[0].url,
      nombre_archivo: archivosResult[0].nombre_archivo,
      content_type: archivosResult[0].content_type,
      expires_in: 3600,
      archivos: archivosResult
    });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Error interno' }); }
});

// ─── GET /expedientes/:id/versiones ──────────────────────────────────────────
app.get('/expedientes/:id/versiones', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    // Buscar el expediente raíz
    const rootQ = await pool.query(
      'SELECT COALESCE(id_expediente_padre, id) AS raiz FROM expedientes WHERE id = $1',
      [req.params.id]
    );
    if (!rootQ.rows.length) { res.status(404).json({ error: 'No encontrado' }); return; }
    const raiz = rootQ.rows[0].raiz;

    const r = await pool.query(`
      SELECT e.id, e.titulo, e.estado, e.version, e.created_at, e.id_expediente_padre,
             u.nombre AS subido_por_nombre
      FROM expedientes e
      JOIN usuarios u ON u.id = e.subido_por
      WHERE e.id = $1 OR e.id_expediente_padre = $1
      ORDER BY e.version
    `, [raiz]);
    res.json(r.rows);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Error interno' }); }
});

// ─── POST /expedientes ────────────────────────────────────────────────────────
app.post('/expedientes',
  authenticateToken,
  requireRoles('usuario_terreno', 'administrador'),
  upload.any(),
  async (req: Request, res: Response): Promise<void> => {
    const client = await pool.connect();
    try {
      const user: User = (req as any).user;
      const { titulo, id_proyecto, id_disciplina, id_proceso, respuestas_formulario } = req.body;
      const files = (req as any).files as Express.Multer.File[] | undefined;

      if (!titulo || !id_proyecto || !id_disciplina || !id_proceso || !files || files.length === 0) {
        res.status(400).json({ error: 'titulo, id_proyecto, id_disciplina, id_proceso y al menos un archivo son requeridos' }); return;
      }

      // Validar que el proyecto pertenece al área del usuario (si no es administrador)
      const proyQ = await pool.query(
        'SELECT p.id, p.id_area FROM proyectos p WHERE p.id = $1 AND p.estado = \'activo\'',
        [id_proyecto]
      );
      if (!proyQ.rows.length) { res.status(404).json({ error: 'Proyecto no encontrado' }); return; }
      if (user.rol !== 'administrador' && proyQ.rows[0].id_area !== user.id_area) {
        res.status(403).json({ error: 'No perteneces al área de este proyecto' }); return;
      }

      await client.query('BEGIN');

      const keys: string[] = [];
      const names: string[] = [];

      for (const file of files) {
        // Subir a MinIO
        const archivo_key = uuidv4();
        const nombre_archivo = file.originalname;
        await s3.send(new PutObjectCommand({
          Bucket: MINIO_BUCKET,
          Key: archivo_key,
          Body: file.buffer,
          ContentType: file.mimetype,
        }));
        keys.push(archivo_key);
        names.push(nombre_archivo);
      }

      // Serializar
      const finalArchivoKey = keys.length === 1 ? keys[0] : JSON.stringify(keys);
      const finalNombreArchivo = names.length === 1 ? names[0] : JSON.stringify(names);

      // Insertar expediente único con id_proceso
      const expResult = await client.query(`
        INSERT INTO expedientes (titulo, id_proyecto, id_disciplina, id_proceso, subido_por, archivo_key, nombre_archivo, estado, version)
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'PENDIENTE', 1)
        RETURNING *
      `, [titulo, id_proyecto, id_disciplina, id_proceso, user.id, finalArchivoKey, finalNombreArchivo]);
      const expediente = expResult.rows[0];

      // Registrar en historial
      await client.query(
        `INSERT INTO public.historial_expedientes (id_expediente, evento, descripcion, id_usuario)
         VALUES ($1, 'Creación', $2, $3)`,
        [expediente.id, `Expediente creado y asociado al proceso ID ${id_proceso}: "${titulo}"`, user.id]
      );

      // Insertar respuestas de formulario si vienen
      if (respuestas_formulario) {
        let respuestas: Array<{ id_campo: number; valor: string }> = [];
        try {
          respuestas = typeof respuestas_formulario === 'string'
            ? JSON.parse(respuestas_formulario)
            : respuestas_formulario;
        } catch { /* ignorar si no es JSON válido */ }

        for (const resp of respuestas) {
          if (resp.id_campo) {
            await client.query(
              'INSERT INTO respuestas_formulario (id_expediente, id_campo, valor) VALUES ($1, $2, $3)',
              [expediente.id, resp.id_campo, resp.valor || '']
            );
          }
        }
      }

      // Asignación de tarea al revisor de la primera etapa (orden = 1) del proceso seleccionado
      const etapaQ = await client.query(`
        SELECT e.id AS etapa_id, e.id_revisor
        FROM etapas e
        WHERE e.id_proceso = $1 AND e.orden = 1 AND e.estado = 'activo'
        LIMIT 1
      `, [id_proceso]);

      let etapa = etapaQ.rows.length ? etapaQ.rows[0] : null;

      if (!etapa || !etapa.id_revisor) {
        throw new Error('El proceso seleccionado no posee una etapa inicial activa (etapa con orden = 1) con revisor asignado.');
      }

      await client.query('COMMIT');

      // Asignación de tareas por HTTP (fuera de la transacción de base de datos)
      try {
        const id_revisor = etapa.id_revisor;
        const TAREAS_SERVICE_URL = process.env.TAREAS_SERVICE_URL || 'http://service-tareas:3004';
        const tRes = await fetch(`${TAREAS_SERVICE_URL}/tareas`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id_expediente: expediente.id,
            id_usuario_asignado: id_revisor,
            id_etapa: etapa.etapa_id,
            id_usuario_responsable: user.id
          })
        });
        if (!tRes.ok) {
          console.error(`[Error] Falló la creación de tarea para revisor ${id_revisor}: ${tRes.statusText}`);
        }
      } catch (err) {
        console.error('[Error] No se pudo conectar con service-tareas:', err);
      }

      res.status(201).json(expediente);
    } catch (e: any) {
      await client.query('ROLLBACK');
      console.error(e);
      res.status(500).json({ error: e.message || 'Error interno' });
    } finally { client.release(); }
  }
);

// ─── POST /expedientes/:id/nueva-version ─────────────────────────────────────
app.post('/expedientes/:id/nueva-version',
  authenticateToken,
  requireRoles('usuario_terreno', 'administrador'),
  upload.any(),
  async (req: Request, res: Response): Promise<void> => {
    const client = await pool.connect();
    try {
      const user: User = (req as any).user;
      const { titulo } = req.body;
      const files = (req as any).files as Express.Multer.File[] | undefined;

      // Obtener expediente original
      const origQ = await pool.query('SELECT * FROM expedientes WHERE id = $1', [req.params.id]);
      if (!origQ.rows.length) { res.status(404).json({ error: 'No encontrado' }); return; }
      const original = origQ.rows[0];

      if (original.estado !== 'RECHAZADO') {
        res.status(400).json({ error: 'Solo se puede crear nueva versión de un expediente RECHAZADO' }); return;
      }
      if (user.rol !== 'administrador' && original.subido_por !== user.id) {
        res.status(403).json({ error: 'No autorizado' }); return;
      }
      if (!files || files.length === 0) { res.status(400).json({ error: 'archivo(s) requerido(s)' }); return; }

      await client.query('BEGIN');

      const keys: string[] = [];
      const names: string[] = [];

      for (const file of files) {
        const archivo_key = uuidv4();
        const nombre_archivo = file.originalname;
        await s3.send(new PutObjectCommand({
          Bucket: MINIO_BUCKET,
          Key: archivo_key,
          Body: file.buffer,
          ContentType: file.mimetype,
        }));
        keys.push(archivo_key);
        names.push(nombre_archivo);
      }

      const finalArchivoKey = keys.length === 1 ? keys[0] : JSON.stringify(keys);
      const finalNombreArchivo = names.length === 1 ? names[0] : JSON.stringify(names);

      // Determinar número de versión
      const raiz = original.id_expediente_padre || original.id;
      const verQ = await client.query(
        'SELECT MAX(version) AS max_ver FROM expedientes WHERE id = $1 OR id_expediente_padre = $1',
        [raiz]
      );
      const nuevaVersion = (verQ.rows[0].max_ver || 1) + 1;

      // Heredar el id_proceso
      const id_proceso = original.id_proceso;

      const newExp = await client.query(`
        INSERT INTO expedientes (titulo, id_proyecto, id_disciplina, id_proceso, subido_por, archivo_key, nombre_archivo, estado, id_expediente_padre, version)
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'PENDIENTE', $8, $9)
        RETURNING *
      `, [
        titulo || original.titulo,
        original.id_proyecto, original.id_disciplina, id_proceso,
        user.id, finalArchivoKey, finalNombreArchivo,
        raiz, nuevaVersion
      ]);
      const expediente = newExp.rows[0];

      // Registrar en historial
      await client.query(
        `INSERT INTO public.historial_expedientes (id_expediente, evento, descripcion, id_usuario)
         VALUES ($1, 'Nueva Versión', $2, $3)`,
        [expediente.id, `Nueva versión ${nuevaVersion} subida: "${titulo || original.titulo}"`, user.id]
      );

      // Obtener la primera etapa (orden = 1) del proceso
      const etapaQ = await client.query(`
        SELECT e.id AS etapa_id, e.id_revisor
        FROM etapas e
        WHERE e.id_proceso = $1 AND e.orden = 1 AND e.estado = 'activo'
        LIMIT 1
      `, [id_proceso]);

      let etapa = etapaQ.rows.length ? etapaQ.rows[0] : null;

      if (!etapa || !etapa.id_revisor) {
        throw new Error('El proceso del expediente no posee una etapa inicial activa (etapa con orden = 1) con revisor asignado.');
      }

      await client.query('COMMIT');

      // Asignación de tareas por HTTP (fuera de la transacción de base de datos)
      try {
        const id_revisor = etapa.id_revisor;
        const TAREAS_SERVICE_URL = process.env.TAREAS_SERVICE_URL || 'http://service-tareas:3004';
        const tRes = await fetch(`${TAREAS_SERVICE_URL}/tareas`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id_expediente: expediente.id,
            id_usuario_asignado: id_revisor,
            id_etapa: etapa.etapa_id,
            id_usuario_responsable: user.id
          })
        });
        if (!tRes.ok) {
          console.error(`[Error] Falló la creación de tarea para revisor ${id_revisor}: ${tRes.statusText}`);
        }
      } catch (err) {
        console.error('[Error] No se pudo conectar con service-tareas:', err);
      }

      res.status(201).json(expediente);
    } catch (e: any) {
      await client.query('ROLLBACK');
      console.error(e);
      res.status(500).json({ error: e.message || 'Error interno' });
    } finally { client.release(); }
  }
);

// ─── PUT /expedientes/:id/archivar ───────────────────────────────────────────
app.put('/expedientes/:id/archivar',
  authenticateToken,
  requireRoles('administrador'),
  async (req: Request, res: Response): Promise<void> => {
    const client = await pool.connect();
    try {
      const user: User = (req as any).user;
      
      const origQ = await client.query('SELECT * FROM expedientes WHERE id = $1', [req.params.id]);
      if (!origQ.rows.length) { res.status(404).json({ error: 'No encontrado' }); return; }

      await client.query('BEGIN');

      // Actualizar estado del expediente a ARCHIVADO
      const updated = await client.query(
        "UPDATE expedientes SET estado = 'ARCHIVADO', updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *",
        [req.params.id]
      );

      // Registrar en historial
      await client.query(
        `INSERT INTO public.historial_expedientes (id_expediente, evento, descripcion, id_usuario)
         VALUES ($1, 'Cambio de Estado', 'Expediente archivado (Soft Delete)', $2)`,
        [req.params.id, user.id]
      );

      await client.query('COMMIT');
      res.json(updated.rows[0]);
    } catch (e) {
      await client.query('ROLLBACK');
      console.error(e);
      res.status(500).json({ error: 'Error interno' });
    } finally {
      client.release();
    }
  }
);

// ─── PUT /expedientes/:id/desarchivar ─────────────────────────────────────────
app.put('/expedientes/:id/desarchivar',
  authenticateToken,
  requireRoles('administrador'),
  async (req: Request, res: Response): Promise<void> => {
    const client = await pool.connect();
    try {
      const user: User = (req as any).user;
      
      const origQ = await client.query('SELECT * FROM expedientes WHERE id = $1', [req.params.id]);
      if (!origQ.rows.length) { res.status(404).json({ error: 'No encontrado' }); return; }
      const original = origQ.rows[0];

      if (original.estado !== 'ARCHIVADO') {
        res.status(400).json({ error: 'El expediente no está archivado' });
        return;
      }

      await client.query('BEGIN');

      // Buscar el último estado en el historial antes de ser archivado
      const histQ = await client.query(
        `SELECT descripcion, evento FROM public.historial_expedientes 
         WHERE id_expediente = $1 AND descripcion NOT LIKE '%archivado%' AND descripcion NOT LIKE '%Archivado%'
         ORDER BY created_at DESC LIMIT 1`,
        [req.params.id]
      );

      let estadoDestino = 'PENDIENTE'; // por defecto
      if (histQ.rows.length > 0) {
        const desc = histQ.rows[0].descripcion;
        if (desc.includes('"APROBADO"')) {
          estadoDestino = 'APROBADO';
        } else if (desc.includes('"RECHAZADO_DEFINITIVO"')) {
          estadoDestino = 'RECHAZADO_DEFINITIVO';
        } else if (desc.includes('"RECHAZADO"')) {
          estadoDestino = 'RECHAZADO';
        }
      }

      // Actualizar estado del expediente
      const updated = await client.query(
        "UPDATE expedientes SET estado = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *",
        [estadoDestino, req.params.id]
      );

      // Registrar en historial
      await client.query(
        `INSERT INTO public.historial_expedientes (id_expediente, evento, descripcion, id_usuario)
         VALUES ($1, 'Cambio de Estado', $2, $3)`,
        [req.params.id, `Expediente desarchivado. Estado restaurado a "${estadoDestino}".`, user.id]
      );

      await client.query('COMMIT');
      res.json(updated.rows[0]);
    } catch (e) {
      await client.query('ROLLBACK');
      console.error(e);
      res.status(500).json({ error: 'Error interno' });
    } finally {
      client.release();
    }
  }
);

// ─── GET /expedientes/:id/historial ──────────────────────────────────────────
app.get('/expedientes/:id/historial', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const user: User = (req as any).user;
    
    // Obtener el expediente para validar acceso
    const expQ = await pool.query(`
      SELECT e.*, p.id_area
      FROM expedientes e
      JOIN proyectos p ON p.id = e.id_proyecto
      WHERE e.id = $1
    `, [req.params.id]);

    if (!expQ.rows.length) { res.status(404).json({ error: 'No encontrado' }); return; }
    const exp = expQ.rows[0];

    // Validar acceso
    if (user.rol === 'usuario_terreno' && exp.subido_por !== user.id) {
      res.status(403).json({ error: 'No tienes permisos para esta acción' }); return;
    }
    if ((user.rol === 'revisor' || user.rol === 'lector') && exp.id_area !== user.id_area) {
      res.status(403).json({ error: 'No tienes permisos para esta acción' }); return;
    }

    // Buscar el expediente raíz
    const raiz = exp.id_expediente_padre || exp.id;

    // Obtener todo el historial de la familia del expediente (todas sus versiones)
    const hist = await pool.query(`
      SELECT h.*, u.nombre AS usuario_nombre, e.version AS expediente_version
      FROM public.historial_expedientes h
      JOIN usuarios u ON u.id = h.id_usuario
      JOIN expedientes e ON e.id = h.id_expediente
      WHERE e.id = $1 OR e.id_expediente_padre = $1
      ORDER BY h.created_at DESC
    `, [raiz]);

    res.json(hist.rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error interno' });
  }
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => console.log(`service-expedientes corriendo en puerto ${PORT}`));
}
export default app;