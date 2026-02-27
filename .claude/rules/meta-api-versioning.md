---
paths:
  - "**/meta/**"
  - "**/facebook/**"
  - "**/tracking/**"
  - "**/capi/**"
---

# Meta API Versioning

## Version Lifecycle

Meta Graph API versions follow a 2-year lifecycle with quarterly releases:
- New version every quarter (January, April, July, October)
- Each version supported for 2 years from release
- After expiry, calls to deprecated versions return errors

## Current Versions (as of early 2026)

| Version | Status | Notes |
|---------|--------|-------|
| v24.0 | Current | Latest stable |
| v23.0 | Supported | |
| v22.0 | Supported | |
| v21.0 | Supported | Approaching EOL |
| v20.0 and below | Deprecated | Will return errors |

**Always verify current version support** via WebSearch before implementing. Versions shift quarterly.

## Rules

- Pin the Graph API version in an environment variable (`META_API_VERSION=v21.0`)
- Never use unversioned endpoints — they default to the oldest supported version
- Check Meta's changelog before upgrading versions
- Test in development before switching production to a new version

## Migration Process

1. **Check changelog** — review breaking changes for the new version
2. **Test in development** — update version env var, run full test suite
3. **Update production** — change env var, deploy, monitor
4. **Verify** — check Events Manager for event flow continuity

## Deprecation Handling

When a version approaches EOL (within 90 days):
1. Check current version in use across all services
2. Review migration guide for next version
3. Test upgraded version in staging
4. Update before expiry to avoid service disruption

## Error Detection

| Error Code | Meaning | Action |
|------------|---------|--------|
| 2635 | Version deprecated | Upgrade immediately |
| 190 | Invalid access token | Token may have expired or lost permissions |
| 100 | Invalid parameter | Check if parameter was removed in current version |
| 4 | Rate limited | Implement exponential backoff |

## Best Practices

- Use the same version across all services (Pixel, CAPI, Ads API, Graph API)
- Don't upgrade all services at once — stagger to isolate issues
- Subscribe to Meta's developer changelog for version announcements
- Build version health monitoring into your application
