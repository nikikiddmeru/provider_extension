// popup.js
document.addEventListener('DOMContentLoaded', async () => {
  // Load saved configuration
  const config = await chrome.storage.sync.get(['airtableToken', 'baseId', 'tableName']);
  
  if (config.airtableToken) {
    document.getElementById('airtableToken').value = config.airtableToken;
    document.getElementById('baseId').value = config.baseId || '';
    document.getElementById('tableName').value = config.tableName || 'Providers';
    document.getElementById('extractionSection').style.display = 'block';
  }

  // Save configuration
  document.getElementById('saveConfig').addEventListener('click', async () => {
    const token = document.getElementById('airtableToken').value;
    const baseId = document.getElementById('baseId').value;
    const tableName = document.getElementById('tableName').value;

    if (!token || !baseId) {
      showStatus('Please fill in all configuration fields', 'error');
      return;
    }

    await chrome.storage.sync.set({
      airtableToken: token,
      baseId: baseId,
      tableName: tableName
    });

    showStatus('Configuration saved!', 'success');
    document.getElementById('extractionSection').style.display = 'block';
  });

  // Extract data from current page
  document.getElementById('extractData').addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab.url.includes('zocdoc.com/professional/')) {
      showStatus('Please navigate to a ZocDoc provider profile page', 'error');
      return;
    }

    chrome.tabs.sendMessage(tab.id, { action: 'extractData' }, (response) => {
      if (response) {
        document.getElementById('providerName').value = response.name || '';
        document.getElementById('npiNumber').value = response.npi || '';
        document.getElementById('credentials').value = response.credentials || '';
        document.getElementById('phone').value = response.phone || '';
        document.getElementById('specialty').value = response.specialty || '';
        document.getElementById('insurance').value = response.insurance || '';
        showStatus('Data extracted successfully!', 'success');
      } else {
        showStatus('Could not extract data from this page', 'error');
      }
    });
  });

  // Submit to Airtable
  document.getElementById('submitToAirtable').addEventListener('click', async () => {
    const config = await chrome.storage.sync.get(['airtableToken', 'baseId', 'tableName']);
    
    const data = {
      name: document.getElementById('providerName').value,
      npi: document.getElementById('npiNumber').value,
      credentials: document.getElementById('credentials').value,
      phone: document.getElementById('phone').value,
      specialty: document.getElementById('specialty').value,
      insurance: document.getElementById('insurance').value
    };

    if (!data.name || !data.npi) {
      showStatus('Name and NPI are required', 'error');
      return;
    }

    try {
      const response = await fetch(`https://api.airtable.com/v0/${config.baseId}/${config.tableName}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.airtableToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          records: [{
            fields: {
              'Name': data.name,
              'NPI': data.npi,
              'Credentials': data.credentials,
              'Phone': data.phone,
              'Specialty': data.specialty,
              'Insurance': data.insurance,
              'Source': 'ZocDoc',
              'Status': 'New',
              'Date Added': new Date().toISOString().split('T')[0]
            }
          }]
        })
      });

      if (response.ok) {
        showStatus('Successfully submitted to Airtable!', 'success');
        // Clear form
        document.getElementById('providerName').value = '';
        document.getElementById('npiNumber').value = '';
        document.getElementById('credentials').value = '';
        document.getElementById('phone').value = '';
        document.getElementById('specialty').value = '';
        document.getElementById('insurance').value = '';
      } else {
        const error = await response.json();
        showStatus(`Error: ${error.error?.message || 'Failed to submit'}`, 'error');
      }
    } catch (error) {
      showStatus(`Error: ${error.message}`, 'error');
    }
  });
});

function showStatus(message, type) {
  const statusDiv = document.getElementById('status');
  statusDiv.textContent = message;
  statusDiv.className = `status ${type}`;
  statusDiv.style.display = 'block';
  
  setTimeout(() => {
    statusDiv.style.display = 'none';
  }, 3000);
}
