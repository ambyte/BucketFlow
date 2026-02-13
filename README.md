<h1 align="center">
  <img src="app/assets/logo.png" alt="BucketFlow Logo" width="180">
  <p>BucketFlow</p>
</h1>

**A modern, self-hosted S3-compatible storage file manager** built with Nuxt and Nuxt UI. Manage your cloud objects across AWS S3, Cloudflare R2, MinIO, Wasabi, DigitalOcean Spaces, and any S3-compatible service — all from a single, beautiful interface. One-command Docker deployment, role-based access, public sharing links, and an embeddable file viewer.

<p align="center">
  <img src="docs/images/buckets-and-files.png" alt="BucketFlow — buckets and files" width="800">
</p>

## Features

- **Multi-provider support** — Connect multiple S3-compatible destinations (AWS S3, R2, MinIO, Wasabi, Spaces, etc.)
- **Role-based access** — Admin and Editor roles with per-destination user permissions
- **Public sharing** — Generate shareable read-only links for specific destinations and buckets
- **Embeddable viewer** — Embed the file browser via iframe with customizable themes (light/dark, colors)
- **Full CRUD operations** — Browse, upload, download, delete, create folders, rename files, edit metadata
- **Secure by design** — JWT authentication, bcrypt password hashing, credential isolation between roles

---

## Quick Start

### Using Docker (recommended)

1. **Clone the repository**

   ```bash
   git clone https://github.com/your-org/bucketflow.git
   cd bucketflow
   ```

2. **Run with Docker Compose**

   ```bash
   docker compose up -d
   ```

3. **Open the app** — Navigate to [http://localhost:3000](http://localhost:3000). On first launch, you'll see a registration form to create the first admin account.

---

## Docker Installation

### Pull the image

```bash
docker pull ghcr.io/ambyte/bucketflow:latest
```

### Run the container

```bash
docker run -d \
  --name bucketflow \
  -p 3000:3000 \
  -v bucketflow-data:/app/.data/storage \
  --restart unless-stopped \
  ghcr.io/ambyte/bucketflow:latest
```

### Build from source (optional)

```bash
docker build -t bucketflow:latest .
```

### Run with Docker Compose

```bash
docker compose up -d
```

The Compose setup includes:

- Auto-restart policy
- Persistent volume for user data and S3 configurations
- Health check on `/api/health`

---

## Local Development

```bash
pnpm install
pnpm dev
```

The app runs at [http://localhost:3000](http://localhost:3000).

### Build for production

```bash
pnpm build
pnpm preview
```

---

## Project Structure

```
├── app/                    # Nuxt app (pages, components, composables)
├── server/                 # API routes, middleware, plugins
│   ├── api/               # REST endpoints (auth, admin, S3, public)
│   └── utils/             # Auth, storage, S3 client helpers
├── public/                # Static assets
├── Dockerfile              # Multi-stage production build
└── docker-compose.yml      # One-command deployment
```

---

## License

MIT License — see [LICENSE](LICENSE) for details.
