# Backend Environment Configuration

The backend server automatically loads environment variables from `backend/.env` on startup using `dotenv`. Variables already present in your shell or hosting platform continue to take precedence, so you can override any default by exporting it before starting the process.

## MongoDB replica set is required

Prisma's MongoDB connector expects a replica set, even for local development. The default `DATABASE_URL` shipped with this repository points to `mongodb://localhost:27017/workpro4?replicaSet=rs0`. Make sure any MongoDB instance you connect to exposes the same replica-set name (or update the query string accordingly).

### Recommended: Docker-based services

Use the project's `docker-compose.yml` to start MongoDB (with the replica set enabled) along with the supporting services:

```bash
docker compose up -d
```

The `mongodb-init` helper container waits for MongoDB to pass its health check and then runs:

```javascript
rs.initiate({ _id: "rs0", members: [{ _id: 0, host: "mongodb:27017" }] })
```

This ensures the replica set exists before the backend boots and attempts to seed the demo tenant.

### Using an existing MongoDB installation

If you prefer running MongoDB directly on your machine:

1. Start `mongod` with replica-set flags, e.g.
   ```bash
   mongod --replSet rs0 --bind_ip localhost,127.0.0.1
   ```
2. Open a shell and initialize the replica set once:
   ```bash
   mongosh --eval 'rs.initiate({ _id: "rs0", members: [{ _id: 0, host: "localhost:27017" }] })'
   ```
3. Update `backend/.env` so that `DATABASE_URL` references the correct host, port, database, and `replicaSet` name.

After the database is ready you can start the backend with:

```bash
npm run --prefix backend dev
```

### Seeding demo data with Prisma

The backend now ships with a Prisma-based seed script that provisions a demo tenant, ensures the default admin user exists, and
creates a sample work order linked to that account. Run it any time you need to populate a fresh database:

```bash
npm run --prefix backend db:seed
```

The script reads environment variables via `src/config/env`, reuses the shared Prisma client from `src/db`, and exits cleanly
after disconnecting. Rerunning the seed is safe—the tenant and admin user are idempotent, and the work order is only created
when it does not already exist.
