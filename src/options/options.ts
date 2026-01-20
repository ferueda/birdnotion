// Options page - Notion integration setup and validation

interface Settings {
  token: string;
  databaseId: string;
  dataSourceId: string;
}

async function loadSettings(): Promise<Settings> {
  const result = await chrome.storage.local.get(['token', 'databaseId', 'dataSourceId']) as Partial<Settings>;
  return {
    token: result.token || '',
    databaseId: result.databaseId || '',
    dataSourceId: result.dataSourceId || '',
  };
}

async function saveSettings(settings: Settings): Promise<void> {
  await chrome.storage.local.set(settings);
}

function extractDatabaseId(input: string): string {
  // Handle full URLs like https://www.notion.so/workspace/DatabaseName-abc123...
  const urlMatch = input.match(/([a-f0-9]{32})/);
  if (urlMatch) {
    return urlMatch[1];
  }
  // Handle UUID format
  const uuidMatch = input.match(/([a-f0-9-]{36})/);
  if (uuidMatch) {
    return uuidMatch[1].replace(/-/g, '');
  }
  return input;
}

function setValidationState(id: string, state: 'success' | 'error' | 'pending', message?: string) {
  const el = document.getElementById(id);
  if (!el) return;

  el.className = `validation-item ${state}`;
  const icon = el.querySelector('.icon');
  const text = el.querySelector('span:last-child');

  if (icon) {
    icon.textContent = state === 'success' ? '✓' : state === 'error' ? '✗' : '○';
  }
  if (text && message) {
    text.textContent = message;
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  const tokenInput = document.getElementById('token') as HTMLInputElement;
  const databaseUrlInput = document.getElementById('databaseUrl') as HTMLInputElement;
  const testBtn = document.getElementById('testBtn') as HTMLButtonElement;
  const saveBtn = document.getElementById('saveBtn') as HTMLButtonElement;
  const validationResults = document.getElementById('validationResults') as HTMLDivElement;
  const statusMessage = document.getElementById('statusMessage') as HTMLDivElement;

  // Load existing settings
  const settings = await loadSettings();
  tokenInput.value = settings.token;
  databaseUrlInput.value = settings.databaseId;

  // Test connection
  testBtn.addEventListener('click', async () => {
    validationResults.style.display = 'block';
    statusMessage.style.display = 'none';

    // Reset all states
    ['v-token', 'v-database', 'v-linked', 'v-properties'].forEach((id) => {
      setValidationState(id, 'pending');
    });

    const token = tokenInput.value.trim();
    const databaseId = extractDatabaseId(databaseUrlInput.value.trim());

    if (!token) {
      setValidationState('v-token', 'error', 'Token required');
      return;
    }

    // TODO: Implement actual Notion API validation calls
    // For now, just show pending states
    console.log('Testing connection with:', { token: token.substring(0, 10) + '...', databaseId });

    // Simulated validation - replace with real API calls
    setValidationState('v-token', 'success', 'Token valid');
    setValidationState('v-database', 'pending', 'Checking database...');
  });

  // Save settings
  saveBtn.addEventListener('click', async () => {
    const token = tokenInput.value.trim();
    const databaseId = extractDatabaseId(databaseUrlInput.value.trim());

    await saveSettings({
      token,
      databaseId,
      dataSourceId: '', // TODO: Set from data source picker
    });

    statusMessage.textContent = 'Settings saved!';
    statusMessage.className = 'status-message success';
    statusMessage.style.display = 'block';
  });
});
