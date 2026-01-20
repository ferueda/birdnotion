// Popup script - UI for saving current page

document.addEventListener('DOMContentLoaded', async () => {
  const contentTypeEl = document.getElementById('contentType') as HTMLSpanElement;
  const typeSelect = document.getElementById('type') as HTMLSelectElement;
  const saveBtn = document.getElementById('saveBtn') as HTMLButtonElement;
  const statusEl = document.getElementById('status') as HTMLDivElement;
  const settingsLink = document.getElementById('settingsLink') as HTMLAnchorElement;

  // Open settings page
  settingsLink.addEventListener('click', (e) => {
    e.preventDefault();
    chrome.runtime.openOptionsPage();
  });

  // Get current tab info
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const url = tab.url || '';

  // Detect content type
  const isTwitter = /https:\/\/(x|twitter)\.com\/\w+\/status\/\d+/.test(url);
  if (isTwitter) {
    contentTypeEl.textContent = 'Tweet';
    typeSelect.value = 'tweet';
  } else {
    contentTypeEl.textContent = 'Page';
    typeSelect.value = 'article';
  }

  // Save handler
  saveBtn.addEventListener('click', async () => {
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';
    statusEl.style.display = 'none';

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'SAVE_TO_NOTION',
        payload: {
          url,
          title: tab.title,
          contentType: typeSelect.value,
          tags: (document.getElementById('tags') as HTMLInputElement).value,
          notes: (document.getElementById('notes') as HTMLTextAreaElement).value,
          archiveMedia: (document.getElementById('archiveMedia') as HTMLInputElement).checked,
        },
      });

      if (response.success) {
        statusEl.textContent = 'Saved! ';
        statusEl.className = 'status success';
        if (response.notionUrl) {
          const link = document.createElement('a');
          link.href = response.notionUrl;
          link.textContent = 'Open in Notion';
          link.target = '_blank';
          statusEl.appendChild(link);
        }
      } else {
        throw new Error(response.error || 'Unknown error');
      }
    } catch (err) {
      statusEl.textContent = err instanceof Error ? err.message : 'Failed to save';
      statusEl.className = 'status error';
    } finally {
      statusEl.style.display = 'block';
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save to Notion';
    }
  });
});
