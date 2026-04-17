# CONTEXT.md — Sistema de Gestión Documental (SharePoint / SPFx)

> Archivo de contexto para agentes de IA (Claude Code, GitHub Copilot, Cursor, etc.)
> Leer completo antes de generar, editar o revisar cualquier archivo del proyecto.

---

## 1. Descripción general del proyecto

Sistema de gestión documental tipo Kizeo (https://www.kizeo-forms.com/es/) construido sobre
SharePoint Online (Microsoft 365). Permite centralizar expedientes, requerimientos y
documentación de trabajo en terreno, con flujos de revisión, aprobación y colaboración
entre áreas. El proyecto es de naturaleza universitaria (ramo Gestión de Proyectos de
Software) con un cliente real (Cristian) que evaluará el producto.

**Objetivo principal:** que un usuario pueda crear un expediente, asignarlo a un
contratista/área, y que el sistema genere automáticamente las tareas de revisión y
aprobación según el proceso configurado para esa área.

---

## 2. Stack tecnológico

| Capa | Tecnología | Versión / Notas |
|---|---|---|
| Frontend | React + SPFx (SharePoint Framework) | Node.js 18 — NO usar v16 |
| Backend | Node.js + Express.js | Microservicios independientes |
| Plataforma | SharePoint Online (Microsoft 365) | Listas y bibliotecas como BD |
| Autenticación | Microsoft Entra ID (Azure AD) | SSO obligatorio, sin login propio |
| Reportes | Power BI | Embebido en la interfaz SPFx |
| Contenedores | Docker + Docker Compose | Un contenedor por microservicio |
| CI/CD | GitHub Actions | Pipeline en `.github/workflows/` |
| Control de versiones | GitHub | Repositorio principal |
| Testing | Jest + Prettier | Lint + tests en cada PR |
| Estilo UI | Fluent UI | Coherencia con ecosistema Microsoft |

> **Importante:** La documentación oficial de SPFx menciona Node.js 16 — ignorar eso,
> usar siempre Node.js 18.

---

## 3. Jerarquía de entidades (modelo de datos core)

Esta es la jerarquía principal del sistema. Si no está bien modelada, el sistema no funciona.

```
Contratista
└── Área (cada contratista tiene múltiples áreas)
    └── Disciplina (opcional, para mayor granularidad — ej: Movimiento de tierra, Metalúrgica)
        └── Proceso / Etapa (define quién revisa, aprueba y colabora)
            ├── Etapa 1: Revisor asignado
            ├── Etapa 2: Aprobador asignado
            └── (etapas configurables por área)
```

### Entidades principales (listas en SharePoint)

- **Contratistas** — empresa externa. Tiene dos grupos: `Colaboradores` (pueden subir docs) y `Lectores` (solo auditoría).
- **Áreas** — pertenece a un contratista. Tiene sus propios grupos de colaboradores y lectores.
- **Disciplinas** — pertenece a un área. Ej: contabilidad, ingeniería, estudios de suelo.
- **Procesos/Etapas** — define el flujo documental de un área. Cada etapa tiene: secuencia, revisor asignado, aprobador asignado, flag `requiere_aprobador` (booleano).
- **Expedientes** — documento principal (Document Set de SharePoint). Tiene: título, descripción, contratista, área, disciplina, estado, etapa actual.
- **Tareas** — generadas automáticamente al crear un expediente. Asignadas al revisor de la etapa activa.
- **Comentarios** — vinculados a tareas. Permiten colaboración dentro del flujo.

---

## 4. Flujo del proceso documental

1. Usuario crea un **expediente** y selecciona: contratista → área → disciplina.
2. El sistema busca automáticamente el **proceso** configurado para esa área.
3. Se genera una **tarea** en la **Etapa 1** y se asigna al revisor configurado.
4. El revisor puede:
   - Pedir **colaboración** → crea subtarea para un colaborador del área (solo del área asignada).
   - Pedir **revisión** adicional.
   - **Aprobar** → avanza a la siguiente etapa.
   - **Rechazar** → devuelve con comentario.
5. El colaborador solo puede **cerrar su tarea** con comentario, no puede aprobar ni rechazar.
6. Una vez aprobada la última etapa, el expediente queda en estado `Cerrado`.

### Estados de un expediente
`Borrador` → `En Revisión` → `En Aprobación` → `Cerrado` | `Rechazado`

---

## 5. Roles y permisos (RBAC)

| Rol | Permisos |
|---|---|
| **Administrador** | Acceso total. Configura mantenedores, áreas, procesos, usuarios. |
| **Supervisor** | Ve, edita y exporta todos los expedientes de su área/departamento. |
| **Revisor** | Recibe tareas de revisión. Puede aprobar, rechazar o pedir colaboración. |
| **Colaborador** | Recibe tareas de colaboración. Solo puede cerrar su tarea con comentario. |
| **Lector** | Solo lectura. Rol de auditoría. No puede crear ni modificar nada. |

> Autenticación gestionada exclusivamente por **Microsoft Entra ID (Azure AD)**. SSO
> obligatorio. No implementar sistema de login propio.

---

## 6. Módulos del sistema

### 6.1 Módulo de mantenedores
CRUD de las entidades base. Acceso solo para Administrador.
- Contratistas
- Áreas (con sus grupos de usuarios)
- Disciplinas
- Tipos de proceso
- Etapas del proceso (con secuencia, revisor, aprobador, flag `requiere_aprobador`)
- Estados de requerimiento

### 6.2 Módulo de expedientes
- Crear expediente (Document Set en SharePoint)
- Cargar documentos adjuntos (PDF, Word, Excel, imágenes, etc.)
- Ver expediente con historial de etapas y comentarios
- Búsqueda y filtrado por área, estado, contratista, fecha

### 6.3 Módulo de tareas
- Vista de todas las tareas del usuario autenticado
- Accionar sobre la tarea: aprobar, rechazar, pedir colaboración, cerrar
- Contador de tareas pendientes visible en el panel principal

### 6.4 Módulo de reportes (Power BI)
Reportes básicos embebidos en la interfaz SPFx:
- Expedientes por estado (abiertos, en revisión, aprobados, rechazados)
- Expedientes por área y contratista
- Tareas pendientes por usuario
- Filtros por fecha y área

---

## 7. Arquitectura del frontend (SPFx + React)

Estructura de carpetas esperada dentro del Web Part de SPFx:

```
src/
└── webparts/
    └── gestionDocumental/
        ├── components/        # Componentes React reutilizables (Fluent UI)
        ├── hooks/             # Custom hooks para lógica de negocio y llamadas a API
        ├── store/             # Estado global (slices/reducers — Redux o Zustand)
        ├── api/               # Funciones de acceso a SharePoint REST API / MS Graph
        ├── entities/          # Tipos e interfaces TypeScript (Expediente, Tarea, etc.)
        ├── context/           # React Context para datos globales (usuario, permisos)
        └── utils/             # Helpers y funciones utilitarias
```

### Reglas de arquitectura frontend
- Los **componentes** no contienen lógica de negocio ni llamadas directas a API.
- Los **hooks** encapsulan toda la lógica y se comunican con la capa `api/`.
- El **store** maneja el estado global (ej: lista de expedientes, tarea activa).
- Las **entities** definen los tipos TypeScript de todas las entidades del modelo.
- Todo el código debe estar en **TypeScript** con tipado estricto.
- Usar **Fluent UI** para todos los componentes visuales.

---

## 8. Arquitectura del backend (microservicios)

Cada dominio tiene su propio servicio Node.js + Express independiente:

| Servicio | Responsabilidad |
|---|---|
| `service-expedientes` | CRUD de expedientes, gestión de Document Sets |
| `service-tareas` | Creación y actualización de tareas, asignación de revisores |
| `service-mantenedores` | CRUD de contratistas, áreas, disciplinas, procesos |
| `service-usuarios` | Perfiles, roles y permisos vía Microsoft API |
| `service-reportes` | Exposición de datos estructurados para Power BI |

Cada servicio corre en su **propio contenedor Docker**. La comunicación entre servicios
es via HTTP interno. No compartir base de datos entre servicios.

---

## 9. SharePoint: listas, bibliotecas y Document Sets

> No se usa base de datos relacional tradicional. SharePoint Online actúa como
> repositorio único. Las listas son las "tablas".

### Listas principales
- `Contratistas`
- `Areas`
- `Disciplinas`
- `ProcesosEtapas`
- `Expedientes` (Document Set)
- `Tareas`
- `Comentarios`

### Reglas de SharePoint a respetar
- Los campos se definen **a nivel de sitio** y se heredan a listas/bibliotecas via tipos de contenido.
- Usar **Document Sets** para agrupar el expediente con sus documentos adjuntos y metadatos.
- Consultas limitadas a **top 5.000 elementos** — siempre paginar e indexar columnas que se usen en filtros.
- No crear columnas de búsqueda en cascada sin indexación previa.

---

## 10. CI/CD — GitHub Actions

Pipeline ubicado en `.github/workflows/ci.yml`.

### Etapas del pipeline
1. **Checkout** del código
2. **Install** — `npm install`
3. **Lint** — ESLint + Prettier
4. **Test** — Jest
5. **Build** — compilación del Web Part SPFx y de cada microservicio
6. **Docker build** — construcción de imágenes por microservicio
7. **Deploy** (rama `main` únicamente)

### Reglas de branching
- `main` — siempre funcional y desplegable. Ningún push directo.
- `develop` — integración de features.
- `feature/nombre-feature` — desarrollo de funcionalidades.
- Todo cambio a `main` o `develop` pasa por Pull Request con al menos 1 aprobación.

---

## 11. Requisitos no funcionales clave

- **Rendimiento:** Web Parts SPFx deben cargar en menos de 3 segundos en red normal.
- **Disponibilidad:** 99.9% — hereda el SLA de Microsoft 365.
- **Responsividad:** interfaz mobile-friendly (tablets y móvil).
- **Compatibilidad:** Microsoft Edge, Google Chrome y Safari (versiones recientes).
- **Seguridad:** datos en tránsito y en reposo encriptados. Acceso solo con cuenta M365.
- **Mantenibilidad:** código documentado, modularizado, TypeScript estricto.

---

## 12. Lo que el agente NO debe hacer

- ❌ No crear un sistema de login/autenticación propio. Todo es via Microsoft Entra ID.
- ❌ No usar bases de datos externas (MySQL, PostgreSQL, MongoDB, etc.). Solo SharePoint listas.
- ❌ No usar Node.js 16. Siempre Node.js 18.
- ❌ No hacer llamadas a la API de SharePoint directamente desde componentes React. Usar la capa `api/`.
- ❌ No mezclar lógica de negocio en los componentes visuales.
- ❌ No hacer consultas a listas de SharePoint sin paginación si pueden superar 5.000 items.
- ❌ No subir secretos, tokens ni credenciales al repositorio. Usar variables de entorno o GitHub Secrets.
- ❌ No usar `any` en TypeScript salvo casos excepcionales justificados con comentario.
- ❌ No hacer push directo a `main`.

---

## 13. Convenciones de código

- **Lenguaje:** TypeScript en todo el proyecto (frontend y backend).
- **Estilo:** ESLint + Prettier. Configuración en raíz del proyecto.
- **Componentes React:** funcionales con hooks. Sin componentes de clase.
- **Nombrado:** `camelCase` para variables/funciones, `PascalCase` para componentes y tipos, `SCREAMING_SNAKE_CASE` para constantes.
- **Commits:** formato Conventional Commits — `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`.
- **Idioma del código:** inglés (variables, funciones, comentarios técnicos). Idioma de la UI: español.

---

## 14. Integrantes del equipo

| Nombre | Rol |
|---|---|
| Cristian Jiménez | Desarrollador |
| Catalina Toro | Desarrolladora |
| Matías Aguilera | Desarrollador |

**Cliente:** Cristian (empresa — contacto vía Gastón)
**Profesor guía:** Gastón
**Reuniones de consulta técnica:** preferentemente viernes, 15–20 minutos

---

## 15. Recursos útiles

- Documentación SPFx: https://learn.microsoft.com/en-us/sharepoint/dev/spfx/
- Documentación Fluent UI React: https://developer.microsoft.com/en-us/fluentui
- Microsoft Graph API: https://learn.microsoft.com/en-us/graph/overview
- Power BI Embedded: https://learn.microsoft.com/en-us/power-bi/developer/embedded/
- Referencia Kizeo (inspiración del sistema): https://www.kizeo-forms.com/es/
