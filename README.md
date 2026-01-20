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

### Notion Integration

1. Go to [notion.so/my-integrations](https://www.notion.so/my-integrations)
2. Create a new integration
3. Copy the "Internal Integration Secret"
4. Share your target database with the integration

### Installation

```bash
# Clone the repo
git clone https://github.com/your-username/birdnotion.git
cd birdnotion

# Install dependencies
npm install

# Build the extension
npm run build
```

### Load in Chrome

1. Open `chrome://extensions`
2. Enable "Developer mode" (top right)
3. Click "Load unpacked"
4. Select the `dist/` folder

### Configure

1. Click the BirdNotion extension icon
2. Click "Settings"
3. Enter your Notion integration token
4. Enter your database URL or ID
5. Click "Test Connection" to validate
6. Click "Save Settings"

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
