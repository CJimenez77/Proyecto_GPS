# AGENTS.md

Key context for working in this SharePoint/SPFx project. See `CONTEXT.md` for full details.

## Sprint 1 Status: PostgreSQL TEMPORAL

> **Fase temporal**: Hasta obtener tenant Microsoft, el sistema usa PostgreSQL.
> Cuando llegue el tenant: migrar auth a Microsoft Entra ID + migrar datos a SharePoint lists.

## Commands

```bash
# Dev local (necesita PostgreSQL corriendo)
docker-compose up -d postgres

# Backend
cd service-usuarios && npm run dev   # Puerto 3001
cd service-expedientes && npm run dev  # Puerto 3002
```

## Critical Constraints (temporary)

| Rule | Why |
|---|---|
| PostgreSQL hasta tenant | Fase temporal |
| No `any` in TypeScript | Strict typing required |
| No secrets in repo | Use env vars |
| No push to `main` | Branch: `main` (stable), `develop`, `feature/*` |

## Backend Services (Sprint 1)

| Service | Ports | Endpoints |
|---------|-------|------------|
| service-usuarios | 3001 | POST /login, GET/POST/PUT/DELETE /usuarios |
| service-expedientes | 3002 | CRUD /expediente, /contratistas, /areas |

## Don't Do This

- ❌ Dependencias entre servicios que impidan independientes
- ❌ Node.js 16 — always use Node.js 18
- ❌ Secrets en repo
- ❌ Push to `main` directly

## Code Conventions

- Language: English (code, variables, comments)
- UI text: Spanish
- Commit format: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`

## CI/CD

GitHub Actions in `.github/workflows/ci.yml`:
`npm ci` → lint → build → docker build → push to Docker Hub (main only)

## User Seed

- **admin** / **admin123** (rol: administrador)

## Reference

- Full context: `CONTEXT.md`
- Docker: `docker-compose.yml`