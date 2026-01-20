// Shared types for BirdNotion

export type ContentType = 'tweet' | 'article' | 'tool' | 'other';
export type Source = 'X' | 'Web';

export interface ExtractedContent {
  url: string;
  canonicalUrl: string;
  title: string;
  domain: string;
  contentType: ContentType;
  source: Source;
  author?: string;
  publishedAt?: string;
  summary?: string;
  content?: string;
  imageUrls?: string[];
  videoUrls?: string[];
}

export interface SaveRequest {
  url: string;
  title: string;
  contentType: ContentType;
  tags: string;
  notes: string;
  archiveMedia: boolean;
}

export interface SaveResponse {
  success: boolean;
  notionUrl?: string;
  error?: string;
}

export interface Settings {
  token: string;
  databaseId: string;
  dataSourceId: string;
  propertyMapping?: PropertyMapping;
}

export interface PropertyMapping {
  title: string;
  url: string;
  canonicalUrl: string;
  source: string;
  contentType: string;
  author: string;
  publishedAt: string;
  savedAt: string;
  tags: string;
  status: string;
  domain: string;
  summary: string;
}

export interface Message<T = unknown> {
  type: string;
  payload?: T;
}

// Chrome runtime message types
export type ExtractTweetMessage = Message & { type: 'EXTRACT_TWEET' };
export type ExtractArticleMessage = Message & { type: 'EXTRACT_ARTICLE' };
export type SaveToNotionMessage = Message<SaveRequest> & { type: 'SAVE_TO_NOTION' };
