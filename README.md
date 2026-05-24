Online Mangala Website

A web-based Mangala game project with a React frontend, an Express backend, and a PostgreSQL database.

Current stack

- Frontend: React 19, Vite, React Router
- Backend: Node.js, Express, PostgreSQL, JWT auth
- Database: PostgreSQL 16 via Docker Compose

Project structure

- `client/` frontend app
- `server/` backend API and database logic
- `docs/` small project notes such as developer commands
- `docker-compose.yml` PostgreSQL container setup

Run locally

1. Start the database:
   `docker compose up -d`

2. Start the frontend in one terminal:
   `cd client`
   `npm run dev`

3. Start the backend in another terminal:
   `cd server`
   `npm run dev`

Useful note

- Developer commands are collected in [docs/dev-commands.md](docs/dev-commands.md).
