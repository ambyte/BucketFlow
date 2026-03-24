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
│   ├── composables/             # useAuth, useAppContext, etc.
│   ├── layouts/                 # auth, default
│   ├── middleware/              # Client middleware
│   ├── pages/                   # login, index, admin, public
│   ├── utils/                   # UI utilities
│   └── types/                   # Shared types
├── server/                      # Nitro API and server logic
│   ├── api/
│   │   ├── auth/                # Authentication and setup
│   │   ├── admin/               # Destination/user administration
│   │   ├── destinations/        # Destination availability/testing
│   │   ├── s3/                  # S3 operations (list, objects, folders, metadata)
│   │   ├── links/               # Authenticated public-link management
│   │   └── public/              # Public API by link hash
│   ├── middleware/              # Server auth middleware
│   ├── plugins/                 # Runtime/init plugins
│   └── utils/                   # Auth, storage, S3, publicAccess, zip-download
├── docs/                        # Docsify documentation
│   ├── images/                  # Screenshots and assets
│   ├── index.html               # Docsify entry
│   ├── index.md                 # Docs home page
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
- JWT + bcryptjs for authentication
- Zod for API input validation

## S3 compatibility

BucketFlow supports any S3-compatible endpoint with proper `endpoint`, `region`, and `forcePathStyle` configuration when needed.
