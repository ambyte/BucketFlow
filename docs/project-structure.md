# Project Structure

[← Back to index](index.md)

```
├── app/                    # Nuxt app
│   ├── components/         # Vue components (S3FileManager, AdminS3Config, etc.)
│   ├── composables/        # useAuth, useS3
│   ├── layouts/            # auth, default
│   ├── middleware/         # auth
│   ├── pages/              # index, admin, login, public
│   └── types/              # User, S3Destination, FileItem, etc.
├── server/                 # API routes
│   ├── api/                # REST endpoints
│   │   ├── admin/          # destinations, users
│   │   ├── auth/           # login, me
│   │   ├── destinations/  # available, test
│   │   ├── public/        # public destinations, S3 list
│   │   └── s3/            # buckets, list, objects, upload-url, folders
│   └── utils/             # auth, storage, s3 helpers
├── docs/                   # Documentation
│   └── images/             # Screenshots
├── Dockerfile
└── docker-compose.yml
```

---

## Supported S3 Providers

BucketFlow works with any S3-compatible API:

- **AWS S3**
- **Cloudflare R2**
- **MinIO**
- **Wasabi**
- **DigitalOcean Spaces**
- **Backblaze B2**
- **Any S3-compatible endpoint**

Configure the correct `endpoint` and `region` for each provider. Use **Force Path Style** for MinIO and similar self-hosted services.
