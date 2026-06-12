import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
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

// ─── POST /tareas (internal endpoint to create a task and notify the reviewer) ──
app.post('/tareas', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id_expediente, id_usuario_asignado, id_etapa, id_usuario_responsable } = req.body;
    if (!id_expediente || !id_usuario_asignado || !id_etapa) {
      res.status(400).json({ error: 'id_expediente, id_usuario_asignado e id_etapa son requeridos' });
      return;
    }

    const r = await pool.query(
      `INSERT INTO tareas (id_expediente, id_usuario_asignado, id_etapa, estado)
       VALUES ($1, $2, $3, 'ABIERTA') RETURNING *`,
      [id_expediente, id_usuario_asignado, id_etapa]
    );
    const tarea = r.rows[0];

    // Obtener detalles del revisor, etapa y expediente
    const detailsQ = await pool.query(
      `SELECT u.nombre AS revisor_nombre, u.email AS revisor_email, e.titulo AS expediente_titulo,
              et.nombre AS etapa_nombre
       FROM usuarios u
       JOIN expedientes e ON e.id = $2
       LEFT JOIN etapas et ON et.id = $3
       WHERE u.id = $1`,
      [id_usuario_asignado, id_expediente, id_etapa]
    );

    if (detailsQ.rows.length > 0) {
      const { revisor_nombre, revisor_email, expediente_titulo, etapa_nombre } = detailsQ.rows[0];

      // Registrar en historial_expedientes
      const autorId = id_usuario_responsable || id_usuario_asignado;
      const desc = `Tarea de revisión asignada a "${revisor_nombre}" para la etapa "${etapa_nombre || 'Inicial'}"`;
      await pool.query(
        `INSERT INTO public.historial_expedientes (id_expediente, evento, descripcion, id_usuario)
         VALUES ($1, 'Asignación de Tarea', $2, $3)`,
        [id_expediente, desc, autorId]
      );

      if (process.env.SMTP_USER && process.env.SMTP_PASS && revisor_email) {
        try {
          const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
          const taskUrl = `${frontendUrl}/tareas`;

          await transporter.sendMail({
            from: process.env.SMTP_FROM || `"GPS Seguridad" <${process.env.SMTP_USER}>`,
            to: revisor_email,
            subject: '📋 Nueva tarea de revisión asignada - GPS',
            html: `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e6ed; border-radius: 8px;">
                <h2 style="color: #0078d4; text-align: center;">Nueva Tarea de Revisión</h2>
                <p>Hola <strong>${revisor_nombre}</strong>,</p>
                <p>Se te ha asignado una nueva tarea de revisión en el Sistema de Gestión Documental de GPS.</p>
                <div style="background-color: #f5f7fa; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #0078d4;">
                  <p style="margin: 0; font-size: 16px;"><strong>Expediente:</strong> ${expediente_titulo}</p>
                </div>
                <p>Por favor, ingresa al sistema para revisar el expediente y resolver la aprobación o rechazo del mismo.</p>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${taskUrl}" style="background-color: #0078d4; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">Ver mis Tareas</a>
                </div>
                <hr style="border: none; border-top: 1px solid #e0e6ed; margin: 20px 0;" />
                <p style="font-size: 12px; color: gray; text-align: center;">Este es un correo automático. Por favor no respondas a este mensaje.</p>
              </div>
            `,
          });
          console.log(`[Email] Notificación enviada a ${revisor_email} por expediente ${id_expediente}`);
        } catch (mailError) {
          console.error('[Email] Error al enviar correo de notificación:', mailError);
        }
      } else {
        console.warn('[Email] Configuración SMTP incompleta o vacía. Saltando envío de correo.');
      }
    }

    res.status(201).json(tarea);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error interno' });
  }
});

// ─── GET /mis-tareas ──────────────────────────────────────────────────────────
app.get('/mis-tareas', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const user: User = (req as any).user;
    const r = await pool.query(
      `${TAREA_SELECT} WHERE t.id_usuario_asignado = $1 AND t.estado IN ('ABIERTA', 'EN_REVISION') AND e.estado != 'ARCHIVADO' ORDER BY t.created_at DESC`,
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

      // Registrar en historial
      await client.query(
        `INSERT INTO public.historial_expedientes (id_expediente, evento, descripcion, id_usuario)
         VALUES ($1, 'Cambio de Estado', $2, $3)`,
        [tarea.id_expediente, `Estado del expediente cambiado a "APROBADO" por resolución de tarea (Comentario: "${comentario}")`, user.id]
      );

      // Cancelar/cerrar otras tareas del mismo expediente que sigan abiertas
      await client.query(
        "UPDATE tareas SET estado='APROBADA', comentario='Aprobado por otro revisor', updated_at=CURRENT_TIMESTAMP WHERE id_expediente=$1 AND id != $2 AND estado IN ('ABIERTA', 'EN_REVISION')",
        [tarea.id_expediente, req.params.id]
      );
    } else if (estado === 'RECHAZADA') {
      await client.query(
        "UPDATE expedientes SET estado='RECHAZADO', updated_at=CURRENT_TIMESTAMP WHERE id=$1",
        [tarea.id_expediente]
      );

      // Registrar en historial
      await client.query(
        `INSERT INTO public.historial_expedientes (id_expediente, evento, descripcion, id_usuario)
         VALUES ($1, 'Cambio de Estado', $2, $3)`,
        [tarea.id_expediente, `Estado del expediente cambiado a "RECHAZADO" por resolución de tarea (Comentario: "${comentario}")`, user.id]
      );

      // Cancelar/cerrar otras tareas del mismo expediente que sigan abiertas
      await client.query(
        "UPDATE tareas SET estado='RECHAZADA', comentario='Rechazado por otro revisor', updated_at=CURRENT_TIMESTAMP WHERE id_expediente=$1 AND id != $2 AND estado IN ('ABIERTA', 'EN_REVISION')",
        [tarea.id_expediente, req.params.id]
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
