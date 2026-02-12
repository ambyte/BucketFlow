# Overview

[← Back to index](index.md)

BucketFlow is a web-based file manager that connects to one or more S3-compatible storage providers. It provides:

- **Single interface** for multiple cloud storage destinations
- **Role-based access control** with Admin and Editor roles
- **Per-destination user permissions** so editors can only access assigned destinations
- **Public read-only sharing** via shareable URLs
- **Embeddable viewer** for integration into other websites

---

## Key Features

| Feature | Description |
|---------|-------------|
| **Multi-provider support** | Connect multiple S3-compatible destinations (AWS S3, R2, MinIO, Wasabi, Spaces, etc.) |
| **Role-based access** | Admin and Editor roles with per-destination user permissions |
| **Public sharing** | Generate shareable read-only links for specific destinations and buckets |
| **Embeddable viewer** | Embed the file browser via iframe with customizable themes (light/dark, colors) |
| **Full CRUD operations** | Browse, upload, download, delete, create folders, and rename files |
| **Secure by design** | JWT authentication, bcrypt password hashing, credential isolation between roles |
