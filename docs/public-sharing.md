# Public Sharing

[← Back to index](index.md)

When a destination has **Allowed anonymous access** enabled, admins can generate a public link.

## Getting the Link

1. Select a destination with public access
2. Click **Public Link** in the header
3. Copy the URL or embed code

## Public URL Format

```
https://your-domain.com/public?slug=your-destination-slug&primary=emerald&neutral=zinc&theme=light
```

| Query param | Description |
|-------------|-------------|
| `slug` | Destination slug (required) |
| `primary` | Nuxt UI primary color |
| `neutral` | Nuxt UI neutral color |
| `theme` | `light` or `dark` |

## Public Access Limitations

- **Read-only** — View and download only
- No upload, delete, or rename
- No admin features
