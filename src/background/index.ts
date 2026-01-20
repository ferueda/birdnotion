// Service worker - handles Notion API calls, media downloads, message coordination

console.log('BirdNotion service worker loaded');

chrome.runtime.onInstalled.addListener(() => {
  console.log('BirdNotion installed');
});

// Message handler for content script -> service worker communication
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'SAVE_TO_NOTION') {
    // TODO: Implement Notion save flow
    console.log('Save request received:', message.payload);
    sendResponse({ success: true });
  }
  return true; // Keep message channel open for async response
});
