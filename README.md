Online Mangala Website

A web-based Mangala game project with a React frontend, an Express backend, and a PostgreSQL database.

Current stack

- Frontend: React 19, Vite, React Router
- Backend: Node.js, Express, PostgreSQL, JWT auth
- Database: PostgreSQL 16 via Docker Compose

Project structure

- `client/` frontend app
- `server/` backend API and database logic
- `server/src/db/migrations/` database migration files (source of truth)
- `docs/` small project notes such as developer commands
- `docker-compose.yml` PostgreSQL container setup

Run locally

1. Start the database:
   `docker compose up -d`

2. Install dependencies:
   `cd server && npm install`
   `cd ../client && npm install`

3. Start the frontend in one terminal:
   `cd client`
   `npm run dev`

4. Start the backend in another terminal:
   `cd server`
   `npm run dev`

Migration system (new)

- We now use `node-pg-migrate`.
- Database schema changes must be done through migration files only.
- Backend startup runs migrations automatically before boot.

Commands

- Create a new migration file:
  `cd server && npm run migrate:create -- add_some_change`

- Run pending migrations:
  `cd server && npm run migrate`

- Roll back the last migration:
  `cd server && npm run migrate:down`

Daily workflow for schema changes

1. Create a new migration file in `server/src/db/migrations/` (timestamp prefix).
2. Put all schema changes in that file (table/column/index updates).
3. Run migrations locally:
   `cd server && npm run migrate`
4. Run the app and verify key flows.
5. Commit both code changes and migration file together.

Rules to avoid future compatibility conflicts

- Never rename or alter DB columns directly in runtime server code.
- Never edit the DB manually in one environment without a migration file.
- Keep frontend + backend field names aligned with the migrated schema.
- For breaking schema changes, deploy in two steps:
  1. Add backward-compatible schema first.
  2. Update app code.
  3. Remove old schema in a later migration.
