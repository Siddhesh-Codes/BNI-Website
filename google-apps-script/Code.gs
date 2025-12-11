/**
 * ============================================
 * BNI CONFLUENCE 2026 - EXHIBITORS API
 * Google Apps Script Backend
 * ============================================
 * 
 * SETUP INSTRUCTIONS:
 * 
 * 1. Open your Google Sheet with exhibitor data
 * 2. Go to Extensions > Apps Script
 * 3. Delete any existing code and paste this entire script
 * 4. Click "Deploy" > "New deployment"
 * 5. Select type: "Web app"
 * 6. Set "Execute as": "Me"
 * 7. Set "Who has access": "Anyone"
 * 8. Click "Deploy" and authorize the app
 * 9. Copy the Web App URL and paste it in your HTML files
 *    (Replace 'YOUR_APPS_SCRIPT_WEB_APP_URL_HERE')
 * 
 * IMPORTANT: After making ANY changes to this script:
 * - Go to Deploy > Manage deployments
 * - Click edit (pencil icon) on your deployment
 * - Change "Version" to "New version"
 * - Click "Deploy"
 * 
 * SHEET STRUCTURE:
 * Your Google Sheet should have these columns:
 * - Column A: Mail (Email address)
 * - Column B: Exhibitors Name (Company/Business name)
 * - Column C: Name (Contact person name)
 * 
 * Row 1 should contain headers (Mail, Exhibitors Name, Name)
 * Data starts from Row 2
 */

// ============================================
// CONFIGURATION
// ============================================

// Sheet name (tab name) - change if your sheet tab has a different name
const SHEET_NAME = 'Sheet1';

// Column indices (0-based) - adjust if your columns are in different order
const COL_EMAIL = 0;        // Column A
const COL_COMPANY = 1;      // Column B (Exhibitors Name)
const COL_PERSON_NAME = 2;  // Column C (Name)

// ============================================
// MAIN WEB APP FUNCTION
// ============================================

/**
 * Handles GET requests to the web app
 * @param {Object} e - Event object containing request parameters
 * @returns {TextOutput} JSON response
 */
function doGet(e) {
  // Disable caching to always get fresh data
  const cache = CacheService.getScriptCache();
  
  try {
    // Get the letter parameter from the request
    const letter = e.parameter.letter ? e.parameter.letter.toUpperCase() : null;
    
    // If no letter specified, return all exhibitors grouped by letter
    if (!letter) {
      return createJsonResponse(getAllExhibitorsGrouped());
    }
    
    // Validate letter is A-Z
    if (!/^[A-Z]$/.test(letter)) {
      return createJsonResponse({
        error: 'Invalid letter parameter. Must be A-Z.',
        exhibitors: []
      });
    }
    
    // Get exhibitors for the specified letter (always fresh from sheet)
    const exhibitors = getExhibitorsByLetter(letter);
    
    return createJsonResponse({
      letter: letter,
      count: exhibitors.length,
      exhibitors: exhibitors,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error in doGet:', error);
    return createJsonResponse({
      error: error.message,
      exhibitors: []
    });
  }
}

/**
 * Handles POST requests (for future use - adding exhibitors)
 * @param {Object} e - Event object containing request data
 * @returns {TextOutput} JSON response
 */
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    
    // Add new exhibitor
    if (data.action === 'add') {
      const result = addExhibitor(data.email, data.company, data.personName);
      return createJsonResponse(result);
    }
    
    return createJsonResponse({ error: 'Invalid action' });
    
  } catch (error) {
    console.error('Error in doPost:', error);
    return createJsonResponse({ error: error.message });
  }
}

// ============================================
// DATA FUNCTIONS
// ============================================

/**
 * Gets all exhibitors from the sheet for a specific letter
 * @param {string} letter - Single letter A-Z
 * @returns {Array} Array of exhibitor objects
 */
function getExhibitorsByLetter(letter) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  
  if (!sheet) {
    throw new Error(`Sheet "${SHEET_NAME}" not found`);
  }
  
  const data = sheet.getDataRange().getValues();
  const exhibitors = [];
  
  // Skip header row (index 0), start from index 1
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const company = row[COL_COMPANY] ? String(row[COL_COMPANY]).trim() : '';
    
    // Check if company name starts with the specified letter
    if (company && company.toUpperCase().charAt(0) === letter) {
      exhibitors.push({
        email: row[COL_EMAIL] ? String(row[COL_EMAIL]).trim() : '',
        company: company,
        name: company, // Alias for compatibility
        personName: row[COL_PERSON_NAME] ? String(row[COL_PERSON_NAME]).trim() : ''
      });
    }
  }
  
  // Sort alphabetically by company name
  exhibitors.sort((a, b) => a.company.localeCompare(b.company));
  
  return exhibitors;
}

/**
 * Gets all exhibitors grouped by their starting letter
 * @returns {Object} Object with letters as keys and exhibitor arrays as values
 */
function getAllExhibitorsGrouped() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  
  if (!sheet) {
    throw new Error(`Sheet "${SHEET_NAME}" not found`);
  }
  
  const data = sheet.getDataRange().getValues();
  const grouped = {};
  let totalCount = 0;
  
  // Initialize all letters
  'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').forEach(letter => {
    grouped[letter] = [];
  });
  
  // Skip header row (index 0), start from index 1
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const company = row[COL_COMPANY] ? String(row[COL_COMPANY]).trim() : '';
    
    if (company) {
      const firstLetter = company.toUpperCase().charAt(0);
      
      // Only add if first letter is A-Z
      if (/[A-Z]/.test(firstLetter)) {
        grouped[firstLetter].push({
          email: row[COL_EMAIL] ? String(row[COL_EMAIL]).trim() : '',
          company: company,
          name: company,
          personName: row[COL_PERSON_NAME] ? String(row[COL_PERSON_NAME]).trim() : ''
        });
        totalCount++;
      }
    }
  }
  
  // Sort each letter's array
  Object.keys(grouped).forEach(letter => {
    grouped[letter].sort((a, b) => a.company.localeCompare(b.company));
  });
  
  return {
    totalCount: totalCount,
    exhibitorsByLetter: grouped
  };
}

/**
 * Adds a new exhibitor to the sheet
 * @param {string} email - Email address
 * @param {string} company - Company/Business name
 * @param {string} personName - Contact person name
 * @returns {Object} Result object
 */
function addExhibitor(email, company, personName) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  
  if (!sheet) {
    throw new Error(`Sheet "${SHEET_NAME}" not found`);
  }
  
  // Append new row
  sheet.appendRow([email, company, personName]);
  
  return {
    success: true,
    message: 'Exhibitor added successfully'
  };
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Creates a JSON response with CORS headers
 * @param {Object} data - Data to return as JSON
 * @returns {TextOutput} JSON response with proper headers
 */
function createJsonResponse(data) {
  const output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}

/**
 * Test function - Run this to test your setup
 * Go to Run > Run function > testSetup
 */
function testSetup() {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    
    if (!sheet) {
      console.log('❌ ERROR: Sheet "' + SHEET_NAME + '" not found!');
      console.log('Please check your sheet name and update the SHEET_NAME constant.');
      return;
    }
    
    const data = sheet.getDataRange().getValues();
    console.log('✅ Sheet found: ' + SHEET_NAME);
    console.log('📊 Total rows (including header): ' + data.length);
    console.log('📊 Total exhibitors: ' + (data.length - 1));
    
    // Test getting exhibitors for letter 'A'
    const aExhibitors = getExhibitorsByLetter('A');
    console.log('📋 Exhibitors starting with A: ' + aExhibitors.length);
    
    if (aExhibitors.length > 0) {
      console.log('Sample exhibitor:', JSON.stringify(aExhibitors[0]));
    }
    
    // Show column sample
    if (data.length > 1) {
      console.log('\n📝 Sample row data:');
      console.log('Email (Col A): ' + data[1][COL_EMAIL]);
      console.log('Company (Col B): ' + data[1][COL_COMPANY]);
      console.log('Person Name (Col C): ' + data[1][COL_PERSON_NAME]);
    }
    
    console.log('\n✅ Setup looks good! You can now deploy the web app.');
    
  } catch (error) {
    console.log('❌ Error during test:', error.message);
  }
}

/**
 * Gets statistics about exhibitors
 * @returns {Object} Statistics object
 */
function getStats() {
  const grouped = getAllExhibitorsGrouped();
  const stats = {
    totalExhibitors: grouped.totalCount,
    lettersWithExhibitors: 0,
    exhibitorsPerLetter: {}
  };
  
  Object.keys(grouped.exhibitorsByLetter).forEach(letter => {
    const count = grouped.exhibitorsByLetter[letter].length;
    stats.exhibitorsPerLetter[letter] = count;
    if (count > 0) {
      stats.lettersWithExhibitors++;
    }
  });
  
  return stats;
}

/**
 * Debug function to see all exhibitors
 * Go to Run > Run function > debugShowAll
 */
function debugShowAll() {
  const grouped = getAllExhibitorsGrouped();
  console.log('Total exhibitors:', grouped.totalCount);
  
  Object.keys(grouped.exhibitorsByLetter).forEach(letter => {
    const exhibitors = grouped.exhibitorsByLetter[letter];
    if (exhibitors.length > 0) {
      console.log(`\n${letter}: ${exhibitors.length} exhibitors`);
      exhibitors.forEach(e => console.log(`  - ${e.company} (${e.personName})`));
    }
  });
}
