# BirdNotion - Clip to Notion

One-button capture of tweets/articles/tools into your Notion library, with optional media archiving.

## Problem Statement

When browsing X/Twitter and finding content worth saving (tweets, articles, tools), the current workflow involves:

```
X/web → copy URL → WhatsApp (inbox) → later → curate into Notion (library)
```

**Pain points:**
- High friction at capture step
- Links rot over time (deleted tweets, changed URLs)
- WhatsApp backlog grows indefinitely
- Manual curation is tedious

**Solution:** A Chrome extension that captures content directly to Notion with preserved media.

## Goals (v0.1)

- One click (or hotkey) to save current page/post to Notion
- Works on: X posts, articles/blogs/docs, any generic URL
- Saves: URL, title, source, timestamp, extracted text, images
- Video: best-effort (link at minimum)

## Non-Goals (v0.1)

- Perfect HTML → Notion conversion fidelity
- Multi-user auth / extension store publishing
- Full-text search outside Notion
- AI auto-tagging (future)

## Architecture

### Tiered Capture Strategy

The system uses layered capture to remain robust when individual extraction methods fail:

| Tier | Content | Always | Best-effort |
|------|---------|--------|-------------|
| 1 | Any URL | URL + title + metadata | Screenshot |
| 2 | Article | Tier 1 + cleaned text (Readability) | OG images |
| 3 | X Post | Tier 1 + tweet text + author + timestamp | Media URLs, video |

### Extension Architecture (Manifest V3)

```
birdnotion/
├── manifest.json          # MV3 config
├── src/
│   ├── background/        # Service worker
│   │   └── index.ts
│   ├── content/           # Content scripts
│   │   ├── extractor.ts   # Base extraction
│   │   ├── x-extractor.ts # X/Twitter specific
│   │   └── article-extractor.ts
│   ├── popup/             # Extension popup UI
│   │   ├── popup.html
│   │   └── popup.ts
│   ├── options/           # Settings page
│   │   ├── options.html
│   │   └── options.ts
│   ├── lib/
│   │   ├── notion-client.ts
│   │   ├── content-classifier.ts
│   │   └── media-handler.ts
│   └── types/
│       └── index.ts
├── package.json
├── tsconfig.json
└── DESIGN.md
```

### Tech Stack

- **Runtime:** Chrome Extension (Manifest V3)
- **Language:** TypeScript
- **Build:** Vite or esbuild
- **Article extraction:** @mozilla/readability
- **Notion API:** v2025-09-03 (data sources)

## Notion Integration

### API Version

Using `Notion-Version: 2025-09-03` which introduces data sources (databases as containers).

### Setup Flow (Database → Data Source)

In API 2025-09-03, a "database" is a container holding one or more data sources. Pages are created under a `data_source_id`, not `database_id`.

**Options page flow:**

1. User pastes database URL or ID
2. Extension calls `GET /v1/databases/{database_id}`
3. Display list of `data_sources` for user to select
4. Store both `database_id` and `data_source_id`
5. Retrieve data source schema for property mapping

**Critical warning to display:**

> ⚠️ Linked data sources are not supported by the Notion API. You must share the **original** data source with your integration. Linked views will return 404 or empty results.

**Validation checks:**
- Token is valid (any successful API call)
- Database is shared with integration (not 404)
- Selected data source has required properties (or user maps them)
- Integration has `insert_content` capability

### Data Model

| Property | Type | Description |
|----------|------|-------------|
| Name | title | Page title |
| URL | url | Original URL (clickable) |
| Canonical URL | rich_text | Normalized URL for dedupe queries* |
| Source | select | X, Web |
| Content Type | select | Tweet, Article, Tool, Other |
| Author | rich_text | Content author |
| Published At | date | Original publish date |
| Saved At | date | When captured |
| Tags | multi_select | User tags |
| Status | select | Inbox, Reading, Processed |
| Domain | rich_text | Source domain |
| Summary | rich_text | Description/summary |

*Note: Notion does not support filtering on `url` type properties. We use `Canonical URL` (rich_text) for dedupe queries via `rich_text.equals` filter.

### Property Mapping

To avoid hardcoding property names and support existing databases:

```typescript
interface PropertyMapping {
  title: string;        // "Name"
  url: string;          // "URL"
  canonicalUrl: string; // "Canonical URL"
  source: string;       // "Source"
  // ... etc
}
```

Store property IDs from "Retrieve data source" response. Use IDs for writes/queries (resilient to renames).

### Page Content Structure

**For Tweets:**
```
[Bookmark: URL]
[Quote: Tweet text]
[Callout: @author · timestamp]
[Image blocks if available]
```

**For Articles:**
```
[Bookmark: URL]
[Toggle: Extracted Content]
  [Paragraph blocks...]
[Toggle: Metadata]
  [OG data, diagnostics]
```

### API Constraints

- Rate limit: ~3 req/sec average
- Append children: max 100 blocks/request, max 2 levels nesting
- Payload: max 1000 blocks, 500KB per request
- File uploads: 20MB per file, must attach within 1 hour

### Media Handling

| Media Type | Default | Archive Mode |
|------------|---------|--------------|
| Images | External link | Direct upload |
| Videos | External link + poster | Best-effort upload |
| Screenshots | Not captured | On-demand capture |

**Architecture: Where downloads happen**

Content scripts are subject to page origin (same-origin policy). All cross-origin work happens in the service worker.

| Component | Responsibility |
|-----------|----------------|
| Content script | Extract URLs + metadata only |
| Service worker | Download media bytes, Notion upload, attach to blocks |

**Service worker media flow:**
1. Receive media URLs from content script
2. Fetch bytes via `fetch()` (requires `host_permissions` in manifest)
3. Create Notion file upload object
4. Send bytes to Notion
5. Attach uploaded file to page blocks

**Fallback chain:**
1. Direct upload fails → try external import (if URL publicly accessible)
2. External import fails → store as external link block
3. File too large → external link + screenshot if available

## Content Detection

### URL Classification

```typescript
function classify(url: string): ContentType {
  if (/https:\/\/(x|twitter)\.com\/\w+\/status\/\d+/.test(url)) {
    return 'tweet';
  }
  // Readability text density check
  if (isArticle(document)) {
    return 'article';
  }
  return 'other';
}
```

### URL Canonicalization

A `canonicalizeUrl(url)` module for consistent dedupe and clean data:

```typescript
function canonicalizeUrl(url: string): string {
  const u = new URL(url);

  // Normalize X domains
  if (u.host === 'twitter.com') u.host = 'x.com';

  // Strip tracking params
  const trackingParams = ['utm_source', 'utm_medium', 'utm_campaign',
                          'utm_term', 'utm_content', 'ref', 's', 't'];
  trackingParams.forEach(p => u.searchParams.delete(p));

  // Remove fragments
  u.hash = '';

  // Normalize www
  u.host = u.host.replace(/^www\./, '');

  // Sort remaining params for consistency
  u.searchParams.sort();

  return u.toString();
}
```

**Stores:**
- `URL` — original as clicked
- `Canonical URL` — normalized for queries
- `Domain` — parsed hostname

### X/Twitter Extraction (DOM Scraping)

No paid API required. Content script extracts URLs and metadata only (no binary downloads).

**Extracted data:**
- Tweet text from visible container
- Author display name + handle
- Timestamp from `<time>` element
- Image URLs from `img[src]` in media container
- Video: poster image URL as fallback (direct video URLs often obfuscated)

**Success criteria (minimum viable capture):**
- ✅ Tweet text + author handle + timestamp

**Partial success (still save):**
- ⚠️ Got URL + basic title + screenshot (fallback)

**Fallback triggers:**
- Cannot locate `<time>` element, author, or tweet text container
- Detected "This post is unavailable" UI
- Extraction exceeded timeout threshold

**oEmbed:** Available as last-resort metadata fallback, but X's embed ecosystem has compatibility issues—treat as supplementary, not primary.

## User Experience

### Entry Points

1. Toolbar button click
2. Keyboard shortcut: `Cmd/Ctrl+Shift+S`
3. Right-click context menu: "Save to Notion"

### Popup UI

```
┌─────────────────────────────┐
│ [X] Tweet detected          │
├─────────────────────────────┤
│ Tags: [tech] [ai] [+]       │
│ Type: [Tweet ▼]             │
│ ☐ Archive media             │
│ Notes: [                  ] │
├─────────────────────────────┤
│ [Save to Notion]            │
└─────────────────────────────┘
```

### Options Page - Setup Validator

Include a "Test Connection" button that validates:

| Check | Error Message |
|-------|---------------|
| Token valid | "Invalid token. Check your integration secret." |
| Database accessible | "Database not found. Share it with your integration." |
| Not a linked view | "Linked databases not supported. Use the original." |
| Required properties exist | "Missing properties: X, Y. Add them or map existing ones." |
| Insert capability | "Integration needs 'Insert content' permission." |

Display green checkmarks for passed validations. This eliminates "why isn't it working?" debugging.

### Feedback

- Success: Toast with "Open in Notion" link
- Duplicate: "Already saved" with link to existing page
- Error: Clear message (token invalid, rate limited, etc.)

## Deduplication

**Why not filter by URL property?** Notion's filter API does not support the `url` property type. We use `Canonical URL` (rich_text) instead.

**Before creating a new page:**

1. Canonicalize the URL: `canonical = canonicalizeUrl(tab.url)`
2. Query data source with filter:
   ```json
   {
     "filter": {
       "property": "Canonical URL",
       "rich_text": { "equals": "<canonical>" }
     },
     "filter_properties": ["Canonical URL"]
   }
   ```
3. If exists: update `Saved At`, optionally append "saved again" note
4. If not: create new page with both `URL` (original) and `Canonical URL` (normalized)

**Note:** Use `filter_properties` to reduce payload size and improve query speed.

## Error Handling

| Error | User Message | Recovery |
|-------|--------------|----------|
| Invalid token | "Notion token invalid. Update in settings." | Link to options |
| No DB access | "Integration not connected to database." | Instructions |
| Rate limited | "Notion busy, retrying..." | Auto-retry with backoff |
| Block limit | (silent) | Auto-chunk to 100 blocks |
| Upload failed | "Media archived as link instead." | Fallback to external URL |

## Security

### Mode 1: Direct (MVP)

Token stored in `chrome.storage.local`. Simpler, acceptable for personal use.

### Mode 2: Proxy (Future)

Serverless endpoint holds token. Extension sends extracted payload only. Better security, enables server-side media processing.

## Implementation Phases

### Phase 1: Foundation + URL Saver

Core infrastructure built first to avoid rework:

- [ ] Extension scaffold (MV3)
- [ ] **NotionRequestQueue** — core infrastructure for all Notion calls:
  - Serializes requests
  - Exponential backoff on 429 + Retry-After
  - Chunks blocks into ≤100 batches
  - Enforces request size caps
  - Persists queue state (MV3 service worker can restart)
- [ ] Options page with setup flow:
  - Token input
  - Database URL/ID input → fetch database → select data source
  - Property mapping UI
  - "Test Connection" validator
- [ ] **canonicalizeUrl()** module
- [ ] Create page with Title + URL + Canonical URL + Saved At
- [ ] Basic success/error feedback

### Phase 2: Article Capture + Dedupe

- [ ] OG metadata extraction
- [ ] Readability text extraction
- [ ] Append content as toggle blocks (using queue + chunking)
- [ ] Dedupe by Canonical URL (rich_text.equals filter)

### Phase 3: X Capture

- [ ] Detect X/Twitter URLs
- [ ] DOM scrape: tweet text, author handle, timestamp, image URLs
- [ ] Store as quote + callout + media blocks
- [ ] Extraction success/fallback logic per spec
- [ ] Screenshot fallback for failed extraction

### Phase 4: Media Archive

- [ ] Service worker media download pipeline
- [ ] Notion file upload for images
- [ ] Screenshot capture via extension API
- [ ] Optional video archive toggle
- [ ] Fallback chain (upload → import → external link)

### Phase 5: Polish

- [ ] Keyboard shortcut binding
- [ ] Tag picker from Notion schema
- [ ] "Open in Notion" button post-save

## Future Ideas

- Thread capture (save N tweets as bullets)
- Save + highlight (selected text as callout)
- AI auto-tagging based on content
- Command palette in popup
- Mobile share sheet via backend

## References

- [Notion API Docs](https://developers.notion.com/)
- [Chrome Extensions MV3](https://developer.chrome.com/docs/extensions/mv3/)
- [Readability.js](https://github.com/mozilla/readability)
