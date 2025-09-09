// content.js
// This script runs on ZocDoc provider pages and extracts data
function extractProviderData() {
  const data = {
    name: '',
    npi: '',
    credentials: '',
    phone: '',
    specialty: '',
    insurance: '',
    url: window.location.href
  };

  // Extract provider name (try multiple selectors)
  const nameSelectors = [
    'h1[data-test-id*="name"]',
    'h1',
    '.provider-name',
    '[data-testid*="provider-name"]'
  ];
  
  for (const selector of nameSelectors) {
    const element = document.querySelector(selector);
    if (element && element.textContent.trim()) {
      data.name = element.textContent.trim();
      break;
    }
  }

  // Extract NPI number (10-digit number)
  const pageText = document.body.textContent;
  const npiPatterns = [
    /NPI[:\s#]*(\d{10})/i,
    /National Provider Identifier[:\s]*(\d{10})/i,
    /\b(\d{10})\b/g  // Any 10-digit number as fallback
  ];

  for (const pattern of npiPatterns) {
    const match = pageText.match(pattern);
    if (match) {
      // Validate it's a real NPI (basic check - starts with 1 or 2)
      const npi = match[1] || match[0];
      if (npi && (npi.startsWith('1') || npi.startsWith('2'))) {
        data.npi = npi;
        break;
      }
    }
  }

  // Extract credentials (LCSW, LMFT, etc.)
  const credentialPattern = /\b(LCSW|LMFT|LPC|LPCC|LMHC|LCPC|PsyD|PhD|MD)\b/gi;
  const credentialMatches = pageText.match(credentialPattern);
  if (credentialMatches) {
    data.credentials = [...new Set(credentialMatches)].join(', ');
  }

  // Extract phone number
  const phonePattern = /\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/;
  const phoneMatch = pageText.match(phonePattern);
  if (phoneMatch) {
    data.phone = phoneMatch[0];
  }

  // Extract specialty (look for common therapy terms)
  const specialtyTerms = ['anxiety', 'depression', 'trauma', 'therapy', 'counseling', 'cognitive behavioral', 'DBT', 'EMDR'];
  const foundSpecialties = [];
  
  for (const term of specialtyTerms) {
    if (pageText.toLowerCase().includes(term.toLowerCase())) {
      foundSpecialties.push(term);
    }
  }
  
  if (foundSpecialties.length > 0) {
    data.specialty = foundSpecialties.slice(0, 3).join(', '); // Limit to first 3
  }

  // Extract insurance information (look for insurance names)
  const insuranceTerms = ['aetna', 'blue cross', 'cigna', 'humana', 'united', 'anthem'];
  const foundInsurance = [];
  
  for (const insurance of insuranceTerms) {
    if (pageText.toLowerCase().includes(insurance.toLowerCase())) {
      foundInsurance.push(insurance);
    }
  }
  
  if (foundInsurance.length > 0) {
    data.insurance = foundInsurance.join(', ');
  }

  return data;
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extractData') {
    const extractedData = extractProviderData();
    sendResponse(extractedData);
  }
});

// Auto-extract data when page loads (optional)
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    console.log('ZocDoc Provider Extractor loaded');
  });
} else {
  console.log('ZocDoc Provider Extractor loaded');
}
