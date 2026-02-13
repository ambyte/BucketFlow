# Installation

[← Back to index](index.md)

## Prerequisites

| Method | Requirements |
|--------|--------------|
| **Docker** | Docker 20.10+ and Docker Compose v2 |
| **Local** | Node.js 20+, [pnpm](https://pnpm.io) 9+ (or `corepack enable` for auto-install) |

---

## Docker (recommended)

Docker deployment is the fastest way to get BucketFlow running. Choose one of the options below.

### Option A: Build from source

Clone the repository and run with the included `docker-compose.yml`:

```bash
git clone https://github.com/your-org/bucketflow.git
cd bucketflow
docker compose up -d
```

The default setup builds the image from the local Dockerfile. This is ideal for development or when you need to customize the build.

### Option B: Pre-built image

For a quicker start without building, use the pre-built image from GitHub Container Registry. Create a `docker-compose.yml`:

```yaml
services:
  bucketflow:
    image: ghcr.io/ambyte/bucketflow:latest
    container_name: bucketflow
    restart: unless-stopped
    ports:
      - "3000:3000"
    volumes:
      - bucketflow-data:/app/.data/storage
    healthcheck:
      test: ["CMD", "wget", "-q", "-O", "/dev/null", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 10s

volumes:
  bucketflow-data:
```

Then run:

```bash
docker compose up -d
```

### Docker features

- **Auto-restart** — Container restarts automatically on failure
- **Persistent volume** — User accounts, S3 destinations, and settings stored in `bucketflow-data`
- **Health check** — Monitors `/api/health` every 30 seconds

### Custom port

To use a different host port (e.g. 8080):

```yaml
ports:
  - "8080:3000"
```

---

## First launch

1. Open [http://localhost:3000](http://localhost:3000) in your browser
2. You'll see a **registration form** — create the first admin account
3. Log in and add your first S3 destination in **Settings → Destinations**

See [S3 Destinations](s3-destinations.md) for provider-specific configuration.

---

## Local development

For contributing or debugging:

```bash
git clone https://github.com/your-org/bucketflow.git
cd bucketflow
pnpm install
pnpm dev
```

The app runs at [http://localhost:3000](http://localhost:3000) with hot-reload.

### Build for production (local)

```bash
pnpm build
pnpm preview
```

Use `pnpm preview` to test the production build locally before deploying.

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Port 3000 already in use | Change the host port in `docker-compose.yml` (e.g. `"8080:3000"`) or stop the process using port 3000 |
| Container exits immediately | Check logs: `docker compose logs bucketflow` |
| Data lost after restart | Ensure the `bucketflow-data` volume is defined and not removed with `docker compose down -v` |
| Health check failing | Wait ~10–30 seconds after `docker compose up`; the first startup may take longer |
