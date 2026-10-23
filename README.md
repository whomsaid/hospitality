# Smart Hospital Management System

A production-oriented hospital management platform built with React, Express, and MySQL.

## Design phases

Phase 1 and Phase 2 designs are documented below. The Phase 2 DDL is installed in the isolated `smart_hospital_proposed` database; the running app remains on the legacy `smart_hospital` database because its routes have not yet been migrated to the tenant model.

- [Architecture, roles, patient journey, and security model](docs/architecture.md)
- [Database entities, ER diagram, constraints, and acceptance tests](docs/database-design.md)
- [Proposed API contract](docs/api-design.md)
- [Master-brief requirements and 30-step acceptance traceability](docs/requirements-traceability.md)
- [Standalone proposed MySQL DDL](database/proposed_schema.sql)

The current runtime and original `database/migrations/001_init_schema.sql` remain an early prototype. From `server/`, run `npm run db:apply:phase2` to apply the schema to a new `smart_hospital_proposed` database. The command refuses to overwrite an existing database. Do not point the current API at it until route compatibility and regression tests are complete.

## Project structure

```text
rApp/
├── client/                  # React frontend
├── server/                  # Express API
├── database/                # MySQL schema and migrations
├── docs/                    # Project docs and database diagrams
├── .gitignore
├── .env.example
├── docker-compose.yml
├── Dockerfile.backend
├── Dockerfile.frontend
├── README.md
└── package.json
```

## Current state and next step

The client, server, and initial prototype migration already exist. The design files above are proposals; they do not install packages, change the running schema, or claim the target workflows are implemented. Review the open decisions in `docs/architecture.md` before turning `database/proposed_schema.sql` into a reviewed migration. Project setup and runtime changes belong to a later implementation phase.
