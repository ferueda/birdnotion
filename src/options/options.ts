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
    testBtn.disabled = true;
    testBtn.textContent = 'Testing...';

    // Reset all states
    ['v-token', 'v-database', 'v-linked', 'v-properties'].forEach((id) => {
      setValidationState(id, 'pending');
    });

    const token = tokenInput.value.trim();
    const databaseId = extractDatabaseId(databaseUrlInput.value.trim());

    try {
      if (!token) {
        setValidationState('v-token', 'error', 'Token required');
        return;
      }

      if (!databaseId) {
        setValidationState('v-database', 'error', 'Database ID required');
        return;
      }

      // Step 1: Test token validity
      const { testConnection, getDatabase, getDataSource } = await import('../lib/notion-client.js');
      
      try {
        const user = await testConnection(token);
        setValidationState('v-token', 'success', `Connected as ${user.name || 'Bot'}`);
      } catch (err) {
        setValidationState('v-token', 'error', err instanceof Error ? err.message : 'Invalid token');
        return;
      }

      // Step 2: Get database and extract data source ID
      let database;
      let dataSourceId;
      try {
        database = await getDatabase(token, databaseId);
        
        if (!database.data_sources || database.data_sources.length === 0) {
          setValidationState('v-database', 'error', 'Database has no data sources');
          return;
        }
        
        // Use the first data source (typically there's only one)
        dataSourceId = database.data_sources[0].id;
        setValidationState('v-database', 'success', 'Database accessible');
      } catch (err) {
        setValidationState('v-database', 'error', err instanceof Error ? err.message : 'Database not found');
        return;
      }

      // Step 3: Check for linked databases
      // Note: The API doesn't support linked databases
      setValidationState('v-linked', 'success', 'Not a linked database');

      // Step 4: Get data source schema and validate required properties
      let dataSource;
      try {
        dataSource = await getDataSource(token, dataSourceId);
      } catch (err) {
        setValidationState('v-properties', 'error', err instanceof Error ? err.message : 'Failed to get data source schema');
        return;
      }

      const requiredProps = ['Title', 'URL', 'Canonical URL', 'Saved At'];
      const properties = dataSource.properties;
      const missingProps = requiredProps.filter(prop => !properties[prop]);

      if (missingProps.length > 0) {
        setValidationState('v-properties', 'error', `Missing: ${missingProps.join(', ')}`);
      } else {
        setValidationState('v-properties', 'success', 'All required properties found');
      }

      // Store dataSourceId for later use
      await saveSettings({ token, databaseId, dataSourceId });
    } catch (err) {
      console.error('Connection test failed:', err);
      statusMessage.textContent = err instanceof Error ? err.message : 'Connection test failed';
      statusMessage.className = 'status-message error';
      statusMessage.style.display = 'block';
    } finally {
      testBtn.disabled = false;
      testBtn.textContent = 'Test Connection';
    }
  });

  // Save settings
  saveBtn.addEventListener('click', async () => {
    const token = tokenInput.value.trim();
    const databaseId = extractDatabaseId(databaseUrlInput.value.trim());

    // Load existing settings to preserve dataSourceId
    const existingSettings = await loadSettings();

    await saveSettings({
      token,
      databaseId,
      dataSourceId: existingSettings.dataSourceId || '', // Preserve existing dataSourceId
    });

    statusMessage.textContent = 'Settings saved!';
    statusMessage.className = 'status-message success';
    statusMessage.style.display = 'block';
  });
});
