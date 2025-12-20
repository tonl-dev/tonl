# TONL Browser Examples

This directory contains examples demonstrating how to use TONL in browser environments.

## Examples

### 01-basic-usage.html
Basic JSON/TONL conversion with compression statistics.
- Convert JSON to TONL and back
- View compression savings
- Uses ESM bundle

### 02-document-api.html
Interactive TONLDocument API demonstration.
- Query operations (wildcards, filters, recursive)
- Modification operations (set, push, delete)
- Document statistics
- Uses ESM bundle

### 03-react-example.html
Full React application with TONL integration.
- User management CRUD operations
- Real-time TONL output
- Compression statistics
- Uses IIFE bundle with React 18

### 04-vue-example.html
Vue 3 task manager application.
- Task CRUD with filtering
- Priority management
- Real-time TONL sync
- Uses IIFE bundle with Vue 3

## Running the Examples

1. First, build the browser bundles:
   ```bash
   npm run build:browser
   ```

2. Serve the examples directory:
   ```bash
   # Using Python
   python -m http.server 8000

   # Using Node.js (npx)
   npx serve .

   # Using VS Code Live Server extension
   # Right-click on HTML file > Open with Live Server
   ```

3. Open in browser:
   - http://localhost:8000/examples/browser/01-basic-usage.html
   - http://localhost:8000/examples/browser/02-document-api.html
   - http://localhost:8000/examples/browser/03-react-example.html
   - http://localhost:8000/examples/browser/04-vue-example.html

## Bundle Formats

TONL provides three bundle formats for different use cases:

| Format | File | Size | Use Case |
|--------|------|------|----------|
| ESM | tonl.esm.js | ~6KB gzip | Modern browsers, bundlers |
| UMD | tonl.umd.js | ~5KB gzip | Webpack, RequireJS |
| IIFE | tonl.iife.js | ~5KB gzip | Direct script tag |

## CDN Usage

```html
<!-- ESM via unpkg -->
<script type="module">
  import { encodeTONL, decodeTONL } from 'https://unpkg.com/tonl/dist/browser/tonl.esm.js';
</script>

<!-- IIFE via unpkg -->
<script src="https://unpkg.com/tonl/dist/browser/tonl.iife.js"></script>
<script>
  const { encodeTONL, decodeTONL } = TONL;
</script>
```

## Browser API Reference

See [docs/BROWSER.md](../../docs/BROWSER.md) for complete API documentation.
