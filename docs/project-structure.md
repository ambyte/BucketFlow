# Project Structure

[← Back to index](index.md)

Current repository structure at a high level:

```text
.
├── app/                         # Nuxt application (UI)
│   ├── components/
│   │   ├── admin/               # Admin panel components
│   │   ├── files/               # File manager and related modals
│   │   └── common/
│   ├── composables/             # useAuth, useAppContext, useFiles, useBuckets, …
│   ├── layouts/                 # auth, default
│   ├── middleware/              # Client middleware
│   ├── pages/                   # login, index, admin, public
│   ├── utils/                   # validators, publicLinkUrl, gridConfig, theme
│   └── types/                   # Shared types
├── server/                      # Nitro API and server logic
│   ├── api/
│   │   ├── auth/                # Login, logout, register, session
│   │   ├── admin/               # Destination/user administration
│   │   ├── destinations/        # Destination availability/testing
│   │   ├── s3/                  # Buckets, objects, folders, metadata
│   │   ├── links/               # Authenticated public-link management
│   │   └── public/              # Public API by link hash
│   ├── middleware/              # Cookie JWT auth
│   ├── plugins/                 # Init JWT/encryption secrets
│   └── utils/                   # storage, S3, crypto, cookies, rate-limit, zip
├── docs/                        # Docsify documentation
│   ├── images/                  # Screenshots and assets
│   ├── index.html               # Docsify entry
│   ├── index.md                 # Docs home page
│   ├── changelog.md             # Changes since origin/main
│   └── sidebar.md               # Docs sidebar
├── public/                      # Static files
├── Dockerfile                   # Production image build
└── docker-compose.yml           # Quick container launch
```

---

## Technologies

- [Nuxt 4](../package.json)
- [Nuxt UI](../package.json)
- AWS SDK v3 for S3 API access
- JWT in an HttpOnly cookie + bcryptjs for authentication
- Zod for API input validation

## S3 compatibility

BucketFlow supports any S3-compatible endpoint with proper `endpoint`, `region`, and `forcePathStyle` configuration when needed.
