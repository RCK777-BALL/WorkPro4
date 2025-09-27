# Backend Environment Configuration

The backend server automatically loads environment variables from `backend/.env` on startup using `dotenv`. Variables already present in your shell or hosting platform continue to take precedence, so you can override any default by exporting it before starting the process.

## MongoDB connection strategies

The backend reads its MongoDB connection string from the `DATABASE_URL` environment variable. Copying `backend/.env.example` seeds the file with a standalone URI (`mongodb://localhost:27017/workpro4?directConnection=true`) so new contributors can connect to a single-node MongoDB instance without enabling replica sets. If you switch to a different deployment model, update the URI accordingly before starting the server.

### Option A – Standalone or single-node MongoDB (default)

Use the default URI when you run MongoDB locally without replica sets—for example via Homebrew, Chocolatey, Docker Desktop, or `mongod --config /path/to/mongod.conf`. Ensure the instance listens on `localhost:27017` and then run:

```bash
cp backend/.env.example backend/.env
pnpm --filter backend db:push
```

The backend automatically enables `directConnection=true` for this mode and seeds demo data when the database is empty. No replica-set flags are required.

### Option B – Local replica set (Docker Compose or manual setup)

If you prefer transactions or want parity with production-like environments, switch to a replica-set connection string:

```bash
DATABASE_URL=mongodb://localhost:27017/workpro4?replicaSet=rs0
```

You can start the project's Docker services to enable this configuration:

```bash
docker compose up -d
```

The included `mongodb-init` helper waits for MongoDB to become healthy and then runs `rs.initiate({ _id: "rs0", members: [{ _id: 0, host: "mongodb:27017" }] })` so Prisma can connect immediately. For a manual setup, start `mongod` with `--replSet rs0` and initialise it with the `mongosh --eval 'rs.initiate(...)'` command shown above.

### Option C – MongoDB Atlas or another managed cluster

Paste the SRV or standard connection string provided by your managed service:

```bash
DATABASE_URL="mongodb+srv://<user>:<password>@<cluster-host>/workpro4?retryWrites=true&w=majority"
```

Remember to configure IP allow lists, TLS certificates, and credentials as required by your provider. After updating the URI, rerun `pnpm --filter backend db:push` to sync the Prisma schema.

Once the database is reachable you can start the backend with:

```bash
npm run --prefix backend dev
```

The server seeds the default tenant when the target database is empty and logs progress to the console.
