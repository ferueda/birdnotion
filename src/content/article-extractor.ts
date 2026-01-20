// Content script for articles - extracts text via Readability

import { Readability } from '@mozilla/readability';

export interface ArticleData {
  title: string;
  content: string;
  excerpt: string;
  byline: string | null;
  siteName: string | null;
  publishedTime: string | null;
  url: string;
}

export function extractArticle(): ArticleData | null {
  const documentClone = document.cloneNode(true) as Document;
  const reader = new Readability(documentClone);
  const article = reader.parse();

  if (!article) {
    return null;
  }

  return {
    title: article.title,
    content: article.textContent,
    excerpt: article.excerpt,
    byline: article.byline,
    siteName: article.siteName,
    publishedTime: article.publishedTime,
    url: window.location.href,
  };
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'EXTRACT_ARTICLE') {
    const data = extractArticle();
    sendResponse({ success: !!data, data });
  }
  return true;
});
