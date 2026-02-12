# Installation

[← Back to index](index.md)

## Using Docker (recommended)

1. Clone the repository:
   ```bash
   git clone https://github.com/your-org/bucketflow.git
   cd bucketflow
   ```

2. Create environment file:
   ```bash
   cp .env.example .env
   ```

3. Set admin password (optional — auto-generated if omitted):
   ```env
   ADMIN_USERNAME=admin
   ADMIN_PASSWORD=your-secure-password
   ```

4. Run with Docker Compose:
   ```bash
   docker compose up -d
   ```

5. Open [http://localhost:3000](http://localhost:3000)

> **Note:** On first launch, the admin user is created automatically. Save the credentials shown in the logs — the password cannot be recovered.

## Run with Docker Compose

```bash
docker compose up -d
```

The Compose setup includes:
- Auto-restart policy
- Persistent volume for user data and S3 configurations
- Health check on `/api/health`

## Local Development

```bash
pnpm install
pnpm dev
```

The app runs at [http://localhost:3000](http://localhost:3000).

## Build for Production

```bash
pnpm build
pnpm preview
```
