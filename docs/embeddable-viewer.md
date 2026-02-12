# Embeddable Viewer

[← Back to index](index.md)

Embed the public file browser in any webpage via iframe:

```html
<iframe src="https://your-domain.com/public?slug=your-destination-slug" width="100%" height="600" frameborder="0"></iframe>
```

## Customization

Add query params for theme:

```
?slug=my-storage&primary=blue&neutral=slate&theme=dark
```

## Content-Security-Policy

Control embedding via `FRAME_ANCESTORS` environment variable (e.g. restrict to your domain).
