# Version Management

**Current Version: 1.0.5**

This file tracks all locations where the TONL version number is referenced throughout the project. When releasing a new version, update the version number in all files listed below.

## Version Numbering

Following [Semantic Versioning 2.0.0](https://semver.org/):
- **MAJOR** (1.x.x): Breaking API changes
- **MINOR** (x.1.x): New features (backward compatible)
- **PATCH** (x.x.1): Bug fixes (backward compatible)

## Core Files (Must Update)

### 1. Package Configuration
- `package.json` → `"version": "1.0.5"`
- `package-lock.json` → Auto-updated by npm
- `vscode-extension/package.json` → VSCode extension has independent versioning (0.1.0)

### 2. Documentation
- `README.md` → `**🎉 v1.0.5 - Stable, Secure & Production Ready**`
- `README.md` → CDN links: `@1.0.5` in jsdelivr and unpkg URLs
- `CHANGELOG.md` → Add new version section at top

### 3. Website Files
- `website/index.html` → Version badge, CDN links, footer version
  - Hero section: `v1.0.5 - Fully Secure`
  - Browser usage: `@1.0.5` in CDN URLs
  - Footer: `v1.0.5`
- `website/examples-backup.html` → Example data may contain version references
- `website/docs.html` → Documentation may reference version

### 4. Documentation Files
- `docs/SPECIFICATION.md` → Check for version references
- `docs/API.md` → Check for version references
- `docs/GETTING_STARTED.md` → Check for installation examples with version
- `docs/CLI_ADDENDUM.md` → Check for version references
- `docs/MODIFICATION_API.md` → Check for version references

### 5. Security Documents
- `SECURITY.md` → Update latest version in security policy

## Files That DO NOT Need Updates

### Generated/Git Files
- `.git/COMMIT_EDITMSG` → Commit message history (do not modify)
- `dist/**/*` → Auto-generated from build (do not edit manually)

### Test Fixtures
- `bench/fixtures/*.json` → Test data with sample versions (not project version)

### Lock Files
- `package-lock.json` → Auto-updated by `npm install`
- `vscode-extension/package-lock.json` → Auto-updated by npm (extension dependencies)

## Update Process

1. **Update VERSION.md**: Change current version number at the top
2. **Update package.json**: Change `"version"` field
3. **Update README.md**: Update version badge and security release note
4. **Update CHANGELOG.md**: Add new version section with changes
5. **Update website files**: Search and replace old version in CDN URLs
6. **Update documentation**: Check for version-specific instructions
7. **Run tests**: `npm test` to verify everything works
8. **Update lock file**: Run `npm install` to update package-lock.json
9. **Commit changes**: `git commit -m "release: v1.0.4 - [description]"`
10. **Create git tag**: `git tag v1.0.4`
11. **Push to GitHub**: `git push && git push --tags`
12. **Publish to npm**: `npm publish`

## Quick Search Commands

```bash
# Find all references to current version
grep -r "1.0.3" --exclude-dir={.git,node_modules,dist,vscode-extension/node_modules} .

# Find all package.json files
find . -name "package.json" -not -path "*/node_modules/*" -not -path "*/dist/*"

# Find version fields in package files
grep -r "\"version\":" --include="package.json" --exclude-dir=node_modules .
```

## Changelog Entry Template

```markdown
## [X.Y.Z] - YYYY-MM-DD

### Added
- New features

### Changed
- Changes to existing functionality

### Fixed
- Bug fixes

### Security
- Security improvements
```
