# AGENTS.md

## Current State: PostgreSQL TEMPORAL

> Until Microsoft tenant arrives: PostgreSQL is used for persistence.
> When tenant arrives: migrate auth to Microsoft Entra ID + data to SharePoint lists.

## Commands

```bash
# Start PostgreSQL
docker-compose up -d postgres

# Run backend services (separate terminals)
cd service-usuarios && npm run dev   # Port 3001
cd service-expedientes && npm run dev  # Port 3002

# Run frontend (port 5173)
cd frontend && npm run dev
```

## Project Structure

| Directory | Purpose |
|-----------|---------|
| `service-usuarios/` | User auth + CRUD (port 3001) |
| `service-expedientes/` | Expedientes, contratistas, areas CRUD (port 3002) |
| `frontend/` | React SPFx web part |

## Critical Constraints

| Rule | Reason |
|---|---|
| PostgreSQL only | Temporary until SharePoint tenant |
| Node.js 18 | Never use Node.js 16 |
| No secrets in repo | Use environment variables |
| No push to `main` directly | Use PRs: `main`=stable, `develop`, `feature/*` |

## Code Conventions

- Code language: English (variables, functions, comments)
- UI text: Spanish
- Commit format: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`

## CI/CD (GitHub Actions)

Pipeline: `.github/workflows/ci.yml`

```
npm install → lint → build → docker build → push to Docker Hub (main only)
```

Run locally before PR:
```bash
cd service-usuarios && npm run lint && npm run build
cd service-expedientes && npm run lint && npm run build
```

## Test Credentials

- **admin** / **admin123** (rol: administrador)

## Services

| Service | Port | Endpoints |
|---------|------|-----------|
| service-usuarios | 3001 | POST /login, GET/POST/PUT/DELETE /usuarios |
| service-expedientes | 3002 | CRUD /expediente, /contratistas, /areas |

## Reference

- Full context: `CONTEXT.md`
- Docker: `docker-compose.yml`