# BirdNotion - Next Steps

## Phase 1: Foundation + URL Saver (Current)

### Options Page - Connection Setup
- [ ] Wire up "Test Connection" to actually call Notion API
- [ ] Implement `GET /v1/users/me` for token validation
- [ ] Implement `GET /v1/databases/{id}` to fetch database
- [ ] Display data sources from database response for user selection
- [ ] Store `dataSourceId` in chrome.storage
- [ ] Validate required properties exist in schema
- [ ] Show clear error for linked databases (not supported)

### Basic Save Flow
- [ ] Service worker: handle `SAVE_TO_NOTION` message
- [ ] Build Notion page properties payload (Title, URL, Canonical URL, Saved At)
- [ ] Create page via `POST /v1/pages`
- [ ] Return Notion page URL to popup
- [ ] Show success/error in popup UI

### Dedupe
- [ ] Before save, query by Canonical URL
- [ ] If exists, show "Already saved" with link
- [ ] Option to update `Saved At` on duplicate

---

## Phase 2: Article Capture

- [ ] Inject article-extractor.ts on non-X pages
- [ ] Extract OG metadata (title, description, image)
- [ ] Extract content via Readability
- [ ] Build page blocks: Bookmark + Toggle with paragraphs
- [ ] Chunk blocks to 100 per request

---

## Phase 3: X Capture

- [ ] Implement DOM scraping in x-extractor.ts
  - [ ] Tweet text container
  - [ ] Author name + handle
  - [ ] Timestamp from `<time>` element
  - [ ] Image URLs from media container
- [ ] Build page blocks: Quote + Callout + Images
- [ ] Fallback: screenshot if extraction fails
- [ ] Handle "Post unavailable" detection

---

## Phase 4: Media Archive

- [ ] Service worker: download images via fetch
- [ ] Implement Notion file upload flow
  - [ ] `POST /v1/file_uploads` to create upload
  - [ ] `POST /v1/file_uploads/{id}/send` with binary
  - [ ] Attach to page blocks
- [ ] Screenshot capture via `chrome.tabs.captureVisibleTab`
- [ ] Fallback chain: upload → external import → external link

---

## Phase 5: Polish

- [ ] Keyboard shortcut (Cmd/Ctrl+Shift+S)
- [ ] Fetch tags from Notion schema for picker
- [ ] "Open in Notion" button after save
- [ ] Better icons (replace placeholders)

---

## Bugs / Tech Debt

- [ ] Handle service worker termination (persist queue to storage)
- [ ] Add tests for url-utils.ts
- [ ] Add tests for notion-client.ts

---

## Notes

- Notion API version: `2025-09-03`
- Rate limit: ~3 req/sec, handle 429 + Retry-After
- Block limit: 100 per append request
- File upload: 20MB max, 1 hour expiry
