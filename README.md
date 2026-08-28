<h1 align="center">
  <img src="app/assets/logo.png" alt="BucketFlow Logo" width="180">
  <p>BucketFlow</p>
</h1>

**A modern, self-hosted S3-compatible storage file manager** built with Nuxt and Nuxt UI. Manage your cloud objects across AWS S3, Cloudflare R2, MinIO, Wasabi, DigitalOcean Spaces, and any S3-compatible service from a single interface. Includes one-command Docker deployment, role-based access, public sharing for buckets and folders, bulk ZIP download and delete, bucket administration, and an embeddable file viewer.

<p align="center">
  <img src="docs/images/files.png" alt="BucketFlow — buckets and files" width="800">
</p>

## Features

- **Multi-provider support** — Connect multiple S3-compatible destinations (AWS S3, R2, MinIO, Wasabi, Spaces, etc.)
- **Role-based access** — Admin and Editor roles with per-destination user permissions
- **Public sharing** — Shareable links for buckets and folders, with expiration, upload/folder permissions, and **Embed** vs **Shared page** layouts
- **Embeddable viewer** — Embed the file browser via iframe with theme colors and `system` / light / dark mode
- **File operations** — Browse, upload, preview, rename, edit metadata, download as ZIP, and bulk-delete selected files and folders
- **Bucket tools** — Create, rename, and delete buckets (admin); refresh the list; see used size
- **Secure by design** — HttpOnly JWT cookie, bcrypt passwords, AES-256-GCM for stored S3 secrets, login/register rate limits, CSP headers

---

## Quick Start

### Using Docker (recommended)

1. **Clone the repository**

   ```bash
   git clone https://github.com/ambyte/bucketflow.git
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
- Persistent volume for users, destinations, and generated secrets
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

## Documentation

Full documentation: [bucketflow.ambyte.org](https://bucketflow.ambyte.org/). Sources are in [`docs/`](docs/index.md).

Preview locally:

```bash
pip install -r requirements-docs.txt
mkdocs serve
```

---

## License

MIT License — see [LICENSE](LICENSE) for details.
