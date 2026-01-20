// Notion API client with request queue, rate limiting, and chunking

export interface NotionConfig {
  token: string;
  dataSourceId: string;
}

export interface NotionPage {
  id: string;
  url: string;
}

const NOTION_API_VERSION = '2025-09-03';
const NOTION_BASE_URL = 'https://api.notion.com/v1';
const MAX_BLOCKS_PER_REQUEST = 100;
const RATE_LIMIT_DELAY_MS = 334; // ~3 requests per second

class NotionRequestQueue {
  private queue: Array<() => Promise<unknown>> = [];
  private processing = false;
  private lastRequestTime = 0;

  async enqueue<T>(request: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await request();
          resolve(result);
        } catch (err) {
          reject(err);
        }
      });
      this.processQueue();
    });
  }

  private async processQueue() {
    if (this.processing || this.queue.length === 0) return;
    this.processing = true;

    while (this.queue.length > 0) {
      const timeSinceLastRequest = Date.now() - this.lastRequestTime;
      if (timeSinceLastRequest < RATE_LIMIT_DELAY_MS) {
        await new Promise((r) => setTimeout(r, RATE_LIMIT_DELAY_MS - timeSinceLastRequest));
      }

      const request = this.queue.shift();
      if (request) {
        this.lastRequestTime = Date.now();
        await request();
      }
    }

    this.processing = false;
  }
}

const requestQueue = new NotionRequestQueue();

async function notionFetch(
  endpoint: string,
  options: RequestInit,
  token: string
): Promise<Response> {
  const response = await fetch(`${NOTION_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Notion-Version': NOTION_API_VERSION,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (response.status === 429) {
    const retryAfter = parseInt(response.headers.get('Retry-After') || '1', 10);
    await new Promise((r) => setTimeout(r, retryAfter * 1000));
    return notionFetch(endpoint, options, token);
  }

  return response;
}

export async function testConnection(token: string): Promise<boolean> {
  return requestQueue.enqueue(async () => {
    const response = await notionFetch('/users/me', { method: 'GET' }, token);
    return response.ok;
  });
}

export async function getDatabase(token: string, databaseId: string) {
  return requestQueue.enqueue(async () => {
    const response = await notionFetch(`/databases/${databaseId}`, { method: 'GET' }, token);
    if (!response.ok) {
      throw new Error(`Failed to get database: ${response.status}`);
    }
    return response.json();
  });
}

export async function createPage(
  config: NotionConfig,
  properties: Record<string, unknown>,
  children: unknown[] = []
): Promise<NotionPage> {
  return requestQueue.enqueue(async () => {
    const response = await notionFetch(
      '/pages',
      {
        method: 'POST',
        body: JSON.stringify({
          parent: {
            type: 'data_source_id',
            data_source_id: config.dataSourceId,
          },
          properties,
          children: children.slice(0, MAX_BLOCKS_PER_REQUEST),
        }),
      },
      config.token
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create page');
    }

    const page = await response.json();

    // Append remaining blocks in chunks if needed
    if (children.length > MAX_BLOCKS_PER_REQUEST) {
      await appendBlocksChunked(config, page.id, children.slice(MAX_BLOCKS_PER_REQUEST));
    }

    return { id: page.id, url: page.url };
  });
}

async function appendBlocksChunked(
  config: NotionConfig,
  pageId: string,
  blocks: unknown[]
): Promise<void> {
  for (let i = 0; i < blocks.length; i += MAX_BLOCKS_PER_REQUEST) {
    const chunk = blocks.slice(i, i + MAX_BLOCKS_PER_REQUEST);
    await requestQueue.enqueue(async () => {
      const response = await notionFetch(
        `/blocks/${pageId}/children`,
        {
          method: 'PATCH',
          body: JSON.stringify({ children: chunk }),
        },
        config.token
      );
      if (!response.ok) {
        throw new Error('Failed to append blocks');
      }
    });
  }
}

export async function queryByCanonicalUrl(
  config: NotionConfig,
  canonicalUrl: string,
  propertyName: string = 'Canonical URL'
): Promise<NotionPage | null> {
  return requestQueue.enqueue(async () => {
    const response = await notionFetch(
      `/data_sources/${config.dataSourceId}/query`,
      {
        method: 'POST',
        body: JSON.stringify({
          filter: {
            property: propertyName,
            rich_text: { equals: canonicalUrl },
          },
          filter_properties: [propertyName],
          page_size: 1,
        }),
      },
      config.token
    );

    if (!response.ok) {
      throw new Error('Failed to query data source');
    }

    const data = await response.json();
    if (data.results && data.results.length > 0) {
      return { id: data.results[0].id, url: data.results[0].url };
    }
    return null;
  });
}
