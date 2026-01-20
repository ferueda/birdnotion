# BirdNotion

Chrome extension to save tweets and articles to Notion with one click.

## Features

- Save any URL to your Notion database
- Extract tweet content (text, author, images) from X/Twitter
- Extract article content via Readability
- Deduplicate by URL
- Rate-limited Notion API client with automatic retry

## Setup

### Prerequisites

- Node.js 22+
- A Notion account with an integration

### 1. Create Notion Integration

1. Go to [notion.so/my-integrations](https://www.notion.so/my-integrations)
2. Click **"+ New integration"**
3. Give it a name (e.g., "BirdNotion")
4. Select your workspace
5. Click **"Submit"**
6. Copy the **Internal Integration Secret** (starts with `secret_`)

### 2. Create Notion Database

Create a new database in Notion with the following properties:

| Property Name | Type | Required | Notes |
|--------------|------|----------|-------|
| **Title** | Title | ✅ | Auto-created, page title |
| **URL** | URL | ✅ | Original page URL |
| **Canonical URL** | Text | ✅ | Normalized URL for dedupe |
| **Domain** | Text | ✅ | Extracted domain |
| **Content Type** | Select | ✅ | Options: article, tweet, tool, other |
| **Saved At** | Date | ✅ | Timestamp when saved |
| **Tags** | Multi-select | ⚪ | Optional tags |

**Quick Setup:**
- Create the database as a full page (not inline)
- Add each property using the "+ New property" button
- Make sure property names match exactly (case-sensitive!)

### 3. Share Database with Integration

1. Open your database in Notion
2. Click the `...` menu (top-right)
3. Click **"Connections"** or **"Add connections"**
4. Find your integration and add it
5. Copy the **Database ID** from the URL:
   - URL format: `https://notion.so/workspace/DatabaseName-{database_id}?v=...`
   - Database ID is the 32-character string after the database name

### 4. Install Extension

```bash
# Clone the repo
git clone https://github.com/your-username/birdnotion.git
cd birdnotion

# Install dependencies
npm install

# Build the extension
npm run build
```

### 5. Load in Chrome

1. Open `chrome://extensions`
2. Enable **"Developer mode"** (toggle in top-right)
3. Click **"Load unpacked"**
4. Select the `dist/` folder

### 6. Configure Extension

1. Click the **BirdNotion extension icon** in Chrome toolbar
2. Click **"Settings"** (or right-click → Options)
3. Enter your:
   - **Integration Token** (from step 1)
   - **Database ID** (from step 3)
4. Click **"Test Connection"**
   - ✅ Should show: "Token valid", "Database accessible", "All required properties found"
   - ❌ If errors, see Troubleshooting below
5. Click **"Save Settings"**

## Usage

1. Navigate to any webpage or tweet
2. Click the **BirdNotion icon**
3. Optionally add tags or notes
4. Click **"Save to Notion"**
5. Click **"Open in Notion"** to view the saved page

**Dedupe:** Saving the same URL again will show "Already saved" with a link to the existing page.

## Troubleshooting

### "Could not find database" error
- Make sure the database is shared with your integration (step 3)
- Verify you're using the database ID, not the page ID
- Check that integration has access to the workspace

### "Missing properties" error
- Verify all required properties exist in your database
- Property names must match exactly (case-sensitive)
- Use property types shown in the table above

### "Page already saved" on first save
- The extension deduplicates by canonical URL
- Check if a similar URL already exists in your database

### Extension not appearing
- Make sure you loaded the `dist/` folder, not the project root
- Check `chrome://extensions` for any error messages
- Try refreshing the extension (click refresh icon)

## Development

```bash
# Watch mode (rebuilds on changes)
npm run dev

# Run linter
npm run lint

# Run type checker
npm run typecheck

# Run tests
npm run test
```

After making changes, go to `chrome://extensions` and click the refresh icon on the BirdNotion card.

## Project Structure

```
birdnotion/
├── manifest.json           # Chrome extension manifest (MV3)
├── src/
│   ├── background/         # Service worker
│   ├── content/            # Content scripts (X extractor, article extractor)
│   ├── popup/              # Extension popup UI
│   ├── options/            # Settings page
│   ├── lib/                # Shared utilities (Notion client, URL utils)
│   └── types/              # TypeScript types
├── scripts/                # Build and release scripts
└── dist/                   # Built extension (gitignored)
```

## Release Process

### Create a Release

```bash
# Patch release (0.1.0 → 0.1.1)
npm run release:patch

# Minor release (0.1.0 → 0.2.0)
npm run release:minor

# Major release (0.1.0 → 1.0.0)
npm run release:major
```

This will:
1. Bump version in `package.json` and `manifest.json`
2. Update `CHANGELOG.md`
3. Create a commit and tag
4. Prompt to push to remote

When pushed, GitHub Actions will automatically create a release with the packaged extension.

### Manual Package

```bash
npm run package
```

Creates `birdnotion.zip` in the project root.

## Tech Stack

- TypeScript
- Vite + @crxjs/vite-plugin
- Chrome Extension Manifest V3
- Notion API (2025-09-03)
- @mozilla/readability

## License

MIT
