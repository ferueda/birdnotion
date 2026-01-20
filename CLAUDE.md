# CLAUDE.md - BirdNotion

## Project Overview

BirdNotion is a Chrome extension (Manifest V3) that saves tweets and articles to Notion with one click. It extracts content from web pages and X/Twitter, then creates structured pages in a Notion database.

## Tech Stack

- **Runtime:** Chrome Extension (Manifest V3)
- **Language:** TypeScript
- **Build:** Vite + @crxjs/vite-plugin
- **Type Checker:** tsgo (@typescript/native-preview)
- **Linting:** ESLint 9 (flat config)
- **Testing:** Vitest
- **Article Extraction:** @mozilla/readability
- **Notion API:** Version 2025-09-03

## Architecture

```
src/
├── background/       # Service worker - API calls, message coordination
├── content/          # Content scripts - DOM extraction (runs in page context)
├── popup/            # Extension popup UI
├── options/          # Settings page
├── lib/              # Shared utilities
│   ├── notion-client.ts  # Rate-limited API client with queue
│   └── url-utils.ts      # Canonicalization, classification
└── types/            # Shared TypeScript types
```

### Key Architectural Decisions

1. **Content scripts extract, service worker fetches** - Content scripts only extract URLs and metadata. All cross-origin fetches (Notion API, media downloads) happen in the service worker.

2. **Request queue with rate limiting** - All Notion API calls go through `NotionRequestQueue` which handles rate limits (429), retry logic, and request serialization.

3. **Canonical URL for dedupe** - Notion doesn't support filtering on `url` type properties. We use a `Canonical URL` (rich_text) property with normalized URLs for deduplication queries.

4. **Tiered capture** - Always save URL + metadata. Best-effort for content extraction and media archiving. The system should succeed even if extraction fails.

## Code Conventions

### TypeScript

- Strict mode enabled
- No `any` unless absolutely necessary (warn, not error)
- Use explicit types for function parameters
- Prefer interfaces over type aliases for objects

### Naming

- Files: kebab-case (`notion-client.ts`)
- Functions/variables: camelCase
- Types/interfaces: PascalCase
- Constants: SCREAMING_SNAKE_CASE for true constants

### Imports

- Use ES modules (`import`/`export`)
- Group imports: external packages first, then internal modules
- Use explicit `.js` extensions in imports if needed for module resolution

### Error Handling

- Always handle errors gracefully - show user-friendly messages
- Log errors with `console.error()` for debugging
- Never let the extension crash silently

## Notion API Constraints

These are hard limits that must be respected:

| Constraint         | Limit                      |
| ------------------ | -------------------------- |
| Rate limit         | ~3 requests/second average |
| Append blocks      | Max 100 blocks per request |
| Block nesting      | Max 2 levels               |
| Request payload    | Max 500KB                  |
| File upload size   | Max 20MB                   |
| File upload expiry | 1 hour to attach           |

The `NotionRequestQueue` in `src/lib/notion-client.ts` handles rate limiting and chunking.

## Chrome Extension Gotchas

1. **Service worker can terminate** - Don't rely on in-memory state. Persist important data to `chrome.storage`.

2. **Content scripts have limited API access** - They can't make cross-origin requests. Send messages to service worker instead.

3. **Manifest V3 restrictions** - No remote code execution, no `eval()`, all scripts must be bundled.

4. **Host permissions required** - Add domains to `host_permissions` in manifest.json for cross-origin fetches.

## Testing

- Run tests: `npm run test`
- Watch mode: `npm run test:watch`
- Tests are required for utility functions (`lib/`)
- Integration tests for Notion client should mock the API

## Git Conventions

- **Commits:** Conventional commits format
- **Branches:** Feature branches, PR-based workflow
- **Releases:** Use `npm run release:patch|minor|major`

### Commit Message Format

```
type: description

type: feat|fix|refactor|test|docs|chore
```

## Commands

```bash
npm run dev          # Watch mode
npm run build        # Production build
npm run lint         # Run ESLint
npm run typecheck    # Run tsgo type checker
npm run test         # Run tests
npm run release      # Interactive release
./ship.sh "message"  # Sync to remote + git ops
```

## Before Submitting Code

1. `npm run lint` passes
2. `npm run typecheck` passes
3. `npm run test` passes
4. `npm run build` succeeds
5. Manually test in Chrome if UI/functionality changed

## Important Files

- `manifest.json` - Extension configuration, permissions, entry points
- `src/lib/notion-client.ts` - All Notion API interactions
- `src/lib/url-utils.ts` - URL canonicalization (critical for dedupe)
- `DESIGN.md` - Full technical specification
- `TODO.md` - Current implementation status

## Common Tasks

### Adding a new Notion API call

1. Add function to `src/lib/notion-client.ts`
2. Use `requestQueue.enqueue()` to respect rate limits
3. Handle errors and return typed response

### Adding a new content extractor

1. Create file in `src/content/`
2. Export extraction function
3. Add message listener for service worker communication
4. Register in `manifest.json` content_scripts if needed

### Modifying the popup/options UI

1. Edit HTML in `src/popup/` or `src/options/`
2. Styles are inline in the HTML files
3. TypeScript logic in corresponding `.ts` file
