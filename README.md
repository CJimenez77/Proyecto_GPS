# Sistema de Gestión de Requerimientos y Documentación

> Plataforma de control de gestión construida sobre **SharePoint Online (SPFx + React)** con arquitectura de **microservicios dockerizados**, pipeline **CI/CD en Jenkins** e integración con **Power BI** para reportes en tiempo real.

---

## Descripción general

Este proyecto es un sistema web empresarial que centraliza y estandariza la gestión de requerimientos, expedientes y documentación de procesos sobre la plataforma **Microsoft 365**. Se solicitó como algo similar a Kizeo una herramienta de digitalización de formularios y recolección de datos en terreno — pero construido íntegramente sobre el ecosistema Microsoft, aprovechando la infraestructura de SharePoint Online que muchas empresas ya tienen contratada.

El sistema permite a los equipos de trabajo **crear expedientes digitales**, adjuntar documentación asociada, hacer seguimiento del estado de cada requerimiento a través de un flujo definido, y obtener reportes de gestión en tiempo real mediante Power BI. Todo esto operando dentro de Microsoft 365, lo que reduce costos de implementación y aprovecha la gestión de usuarios y permisos ya existente en la organización.

---

## Stack tecnológico

| Capa | Tecnología | Descripción |
|---|---|---|
| Frontend | SPFx + React | Framework oficial de Microsoft para desarrollar sobre SharePoint con experiencia moderna |
| Plataforma | SharePoint Online — Microsoft 365 | Plataforma de almacenamiento, permisos y despliegue del frontend |
| Backend | Microservicios REST (Node.js) | Servicios independientes que encapsulan la lógica de negocio |
| Contenedores | Docker | Cada microservicio corre en su propio contenedor aislado |
| CI/CD | Jenkins | Pipeline automatizado de build, test y deploy |
| Almacenamiento | Listas y bibliotecas de SharePoint | Equivalente a tablas relacionales en el contexto de SharePoint |
| Reportes | Power BI | Dashboards embebidos directamente en la interfaz del sistema |
| Runtime | Node.js 18 | La documentación oficial de SPFx referencia Node 16, pero está obsoleta |

---

## Módulos del sistema

### Gestión de expedientes
El módulo central del sistema. Un **expediente** es un contenedor digital implementado como *document set* en SharePoint, que agrupa documentación relacionada a un requerimiento junto con su metadata estructurada.

- Crear expedientes con metadata: área, proyecto, categoría, subtipo, contratista, año y estado.
- Adjuntar uno o más archivos de cualquier tipo (PDF, Word, Excel, imágenes).
- Listar y filtrar expedientes por área, proyecto, estado, contratista y rango de fechas.
- Ver detalle completo: metadata, documentos adjuntos e historial de cambios de estado.
- Cambiar estado de un expediente con registro automático del usuario y timestamp.

### Mantenedores
Entidades maestras configurables por el administrador, almacenadas en listas de SharePoint:

| Mantenedor | Descripción |
|---|---|
| Contratistas | Empresas o personas que generan requerimientos |
| Áreas | Unidades organizacionales internas |
| Proyectos | Asociados a cada área y contratista |
| Categorías y subtipos | Clasificación de requerimientos |
| Estados | Ciclo de vida: Borrador → En revisión → Aprobado / Rechazado |

Cada mantenedor soporta operaciones CRUD completas. Los registros se desactivan en lugar de eliminarse para mantener la integridad referencial de expedientes históricos.

### Permisos y roles
La autenticación es delegada a **Microsoft 365**. El sistema define tres roles:

| Rol | Permisos |
|---|---|
| **Administrador** | Acceso total: mantenedores, usuarios, expedientes y configuración del sitio |
| **Colaborador** | Crear y editar expedientes, adjuntar documentos, cambiar estados permitidos |
| **Revisor / Lector** | Solo lectura de expedientes y documentos |

### Reportes Power BI
- Listas de SharePoint vía Graph API y expone los datos como dataset.
- Los reportes se publican en Power BI Online y se embeben directamente en la interfaz SPFx.
- Métricas planificadas: expedientes por estado, por área, por período y por contratista.

## 📄 Licencia

Proyecto académico — Ingeniería Civil en Informática, 2026.
