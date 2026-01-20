// Service worker - handles Notion API calls, media downloads, message coordination

import type { SaveRequest, SaveResponse, Settings } from '../types/index.js';
import { createPage, queryByCanonicalUrl, type NotionConfig } from '../lib/notion-client.js';
import { canonicalizeUrl, extractDomain } from '../lib/url-utils.js';

console.log('BirdNotion service worker loaded');

chrome.runtime.onInstalled.addListener(() => {
  console.log('BirdNotion installed');
});

// Helper to build Notion page properties
function buildPageProperties(request: SaveRequest, canonicalUrl: string, domain: string) {
  return {
    Title: {
      rich_text: [{ text: { content: request.title } }],
    },
    URL: {
      url: request.url,
    },
    'Canonical URL': {
      rich_text: [{ text: { content: canonicalUrl } }],
    },
    Domain: {
      rich_text: [{ text: { content: domain } }],
    },
    'Content Type': {
      select: { name: request.contentType },
    },
    'Saved At': {
      date: { start: new Date().toISOString() },
    },
    ...(request.tags && {
      Tags: {
        multi_select: request.tags.split(',').map((tag) => ({ name: tag.trim() })),
      },
    }),
  };
}

// Message handler for content script -> service worker communication
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'SAVE_TO_NOTION') {
    handleSaveToNotion(message.payload as SaveRequest)
      .then(sendResponse)
      .catch((err) => {
        console.error('Save to Notion failed:', err);
        sendResponse({
          success: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        } as SaveResponse);
      });
    return true; // Keep message channel open for async response
  }
});

async function handleSaveToNotion(request: SaveRequest): Promise<SaveResponse> {
  try {
    // Load settings from chrome.storage
    const result = (await chrome.storage.local.get([
      'token',
      'dataSourceId',
    ])) as Partial<Settings>;

    if (!result.token || !result.dataSourceId) {
      return {
        success: false,
        error: 'Not configured. Please set up your Notion integration in the options page.',
      };
    }

    const config: NotionConfig = {
      token: result.token,
      dataSourceId: result.dataSourceId,
    };

    // Get canonical URL and domain
    const canonicalUrl = canonicalizeUrl(request.url);
    const domain = extractDomain(canonicalUrl);

    // Check for duplicates
    const existingPage = await queryByCanonicalUrl(config, canonicalUrl);
    if (existingPage) {
      return {
        success: false,
        error: 'Page already saved',
        notionUrl: existingPage.url,
      };
    }

    // Build properties
    const properties = buildPageProperties(request, canonicalUrl, domain);

    // Add notes as page content if provided
    const children = request.notes
      ? [
          {
            object: 'block',
            type: 'paragraph',
            paragraph: {
              rich_text: [{ text: { content: request.notes } }],
            },
          },
        ]
      : [];

    // Create the page
    const page = await createPage(config, properties, children);

    return {
      success: true,
      notionUrl: page.url,
    };
  } catch (err) {
    console.error('Save error:', err);
    throw err;
  }
}
