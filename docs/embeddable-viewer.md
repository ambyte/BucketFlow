# Embeddable Viewer

[← Back to index](index.md)

BucketFlow public view can be embedded into any website via `iframe`.

![Public view](images/public-link-with-upload-permission.png)

## Basic example

```html
<iframe
  src="https://your-domain.com/public?path=your-public-link-hash"
  width="100%"
  height="600"
  frameborder="0"
></iframe>
```

## Theme parameters

You can pass theme settings through query parameters:

```text
?path=your-public-link-hash&primary=emerald&neutral=zinc&theme=dark
```

- `path` — public link hash
- `primary` — primary color
- `neutral` — neutral palette
- `theme` — `light` or `dark`

## Best practices

- create separate links for specific folders/use cases;
- use read-only links for public embedding by default;
- enable upload/folder creation only when required.
