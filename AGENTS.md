# AGENTS.md

# See project architecture and workflow rules.

# The Codex system prompt instructs the agent to read this file first.

# Keep this file aligned with the active repo rules and roadmap.

## Mission

Build a production-grade modular monolith backend for a SaaS pharmacy management system using:

- Express
- TypeScript
- Prisma
- PostgreSQL
- Redis

The codebase must be:

- modular
- readable
- maintainable
- performance-conscious
- tenant-aware
- branch-aware
- audit-friendly
- i18n-aware
- safe for future scaling

---

## Architecture Rules

### 1. Architecture style

Use a **modular monolith**.

Do not introduce microservices.
Do not introduce event buses or distributed systems unless explicitly requested.
Background jobs may be introduced later for OCR, analytics, alerts, and catalog sync.

### 2. Top-level structure

Use this structure:

````txt
src/
  app.ts
  server.ts

  core/
  shared/
  modules/
    platform/
    tenant/
  routes/

prisma/
  schema.prisma

```txt
````

## Documentation Rules

### 3. Module docs directory

````txt
For every implemented module, maintain documentation under:

docs/<module-name>/
```txt
````
