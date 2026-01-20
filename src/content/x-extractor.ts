// Content script for X/Twitter - extracts tweet data from DOM

export interface TweetData {
  text: string;
  authorName: string;
  authorHandle: string;
  timestamp: string | null;
  imageUrls: string[];
  videoUrls: string[];
  tweetUrl: string;
}

export function extractTweet(): TweetData | null {
  // TODO: Implement DOM extraction
  // This will be fragile and need maintenance as X changes their DOM
  console.log('X extractor loaded on:', window.location.href);
  return null;
}

// Listen for extraction requests from popup/service worker
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'EXTRACT_TWEET') {
    const data = extractTweet();
    sendResponse({ success: !!data, data });
  }
  return true;
});
