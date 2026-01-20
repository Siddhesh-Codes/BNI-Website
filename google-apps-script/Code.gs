/**
 * ============================================
 * BNI CONFLUENCE 2026 - EXHIBITORS & TEAM API
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
 * EXHIBITORS SHEET STRUCTURE:
 * Your Google Sheet should have these columns:
 * - Column A: Mail (Email address)
 * - Column B: Exhibitors Name (Company/Business name)
 * - Column C: Name (Contact person name)
 * - Column D: Stall No (Stall number)
 * - Column E: Category in BNI (Category)
 * - Column F: Logo URL (Image URL from imgbb, imgur, etc.)
 * - Column G: Business tagline (Short tagline)
 * - Column H: Website URL
 * - Column I: Summary (Short description)
 * 
 * Row 1 should contain headers
 * Data starts from Row 2
 * 
 * TEAM SHEET STRUCTURE (Sheet name: "Team"):
 * - Column A: Name (Team member name)
 * - Column B: Profession (Specialty)
 * - Column C: Company Name (Company name)
 * - Column D: Photo URL (Profile image URL)
 * - Column E: Website URL (optional)
 * - Column F: Email (optional)
 */

// ============================================
// CONFIGURATION
// ============================================

// Sheet names
const SHEET_NAME = 'Exhibitors';      // Exhibitors sheet
const TEAM_SHEET_NAME = 'Team';   // Team members sheet

// Exhibitors Column indices (0-based)
const COL_EMAIL = 0;        // Column A
const COL_COMPANY = 1;      // Column B (Exhibitors Name)
const COL_PERSON_NAME = 2;  // Column C (Name)
const COL_STALL_NO = 3;     // Column D (Stall No)
const COL_CATEGORY = 4;     // Column E (Category in BNI)
const COL_LOGO = 5;         // Column F (Logo URL)
const COL_TAGLINE = 6;      // Column G (Business tagline)
const COL_WEBSITE = 7;      // Column H (Website URL)
const COL_SUMMARY = 8;      // Column I (Summary)

// Team Column indices (0-based)
const TEAM_COL_NAME = 0;          // Column A (Name)
const TEAM_COL_PROFESSION = 1;    // Column B (Profession)
const TEAM_COL_COMPANY_NAME = 2;  // Column C (Company Name)
const TEAM_COL_PHOTO = 3;         // Column D (Photo URL)
const TEAM_COL_WEBSITE = 4;       // Column E (Website)
const TEAM_COL_EMAIL = 5;         // Column F (Email)
const TEAM_COL_FEATURED = 6;      // Column G (Featured: Yes/No)

// Partners Sheet Configuration
const PARTNERS_SHEET_NAME = 'Partners';  // Partners sheet

// Partners Column indices (0-based)
const PARTNERS_COL_TYPE = 0;        // Column A (Partner Type)
const PARTNERS_COL_STATUS = 1;      // Column B (Status: Closed/Available)
const PARTNERS_COL_NAME = 2;        // Column C (Partner Name)
const PARTNERS_COL_COMPANY = 3;     // Column D (Company Name)
const PARTNERS_COL_LOGO = 4;        // Column E (Logo URL)
const PARTNERS_COL_WEBSITE = 5;     // Column F (Website)

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
    // Check if this is a team request
    const type = e.parameter.type ? e.parameter.type.toLowerCase() : 'exhibitors';
    
    if (type === 'team') {
      const teamMembers = getTeamMembers();
      return createJsonResponse({
        count: teamMembers.length,
        team: teamMembers,
        timestamp: new Date().toISOString()
      });
    }
    
    // Handle partners request
    if (type === 'partners') {
      const partners = getPartners();
      return createJsonResponse({
        closedCount: partners.closed.length,
        availableCount: partners.available.length,
        totalCount: partners.closed.length + partners.available.length,
        partners: partners,
        timestamp: new Date().toISOString()
      });
    }
    
    // Handle exhibitors request
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
        personName: row[COL_PERSON_NAME] ? String(row[COL_PERSON_NAME]).trim() : '',
        stallNo: row[COL_STALL_NO] ? String(row[COL_STALL_NO]).trim() : '',
        category: row[COL_CATEGORY] ? String(row[COL_CATEGORY]).trim() : '',
        logo: row[COL_LOGO] ? String(row[COL_LOGO]).trim() : '',
        tagline: row[COL_TAGLINE] ? String(row[COL_TAGLINE]).trim() : '',
        website: row[COL_WEBSITE] ? String(row[COL_WEBSITE]).trim() : '',
        summary: row[COL_SUMMARY] ? String(row[COL_SUMMARY]).trim() : ''
      });
    }
  }
  
  // Sort alphabetically by company name
  exhibitors.sort((a, b) => a.company.localeCompare(b.company));
  
  return exhibitors;
}

/**
 * Gets all team members from the Team sheet
 * @returns {Array} Array of team member objects
 */
function getTeamMembers() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TEAM_SHEET_NAME);
  
  if (!sheet) {
    throw new Error(`Sheet "${TEAM_SHEET_NAME}" not found. Please create a sheet named "Team".`);
  }
  
  const data = sheet.getDataRange().getValues();
  const teamMembers = [];
  
  // Skip header row (index 0), start from index 1
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const name = row[TEAM_COL_NAME] ? String(row[TEAM_COL_NAME]).trim() : '';
    
    // Only add if name exists
    if (name) {
      teamMembers.push({
        name: name,
        profession: row[TEAM_COL_PROFESSION] ? String(row[TEAM_COL_PROFESSION]).trim() : '',
        companyName: row[TEAM_COL_COMPANY_NAME] ? String(row[TEAM_COL_COMPANY_NAME]).trim() : '',
        photo: row[TEAM_COL_PHOTO] ? String(row[TEAM_COL_PHOTO]).trim() : '',
        website: row[TEAM_COL_WEBSITE] ? String(row[TEAM_COL_WEBSITE]).trim() : '',
        email: row[TEAM_COL_EMAIL] ? String(row[TEAM_COL_EMAIL]).trim() : '',
        featured: row[TEAM_COL_FEATURED] ? String(row[TEAM_COL_FEATURED]).trim().toLowerCase() === 'yes' : false
      });
    }
  }
  
  return teamMembers;
}

/**
 * Gets all partners from the Partners sheet, grouped by status
 * @returns {Object} Object with 'closed' and 'available' arrays
 */
function getPartners() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(PARTNERS_SHEET_NAME);
  
  if (!sheet) {
    throw new Error(`Sheet "${PARTNERS_SHEET_NAME}" not found. Please create a sheet named "Partners".`);
  }
  
  const data = sheet.getDataRange().getValues();
  const closed = [];
  const available = [];
  
  // Skip header row (index 0), start from index 1
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const partnerType = row[PARTNERS_COL_TYPE] ? String(row[PARTNERS_COL_TYPE]).trim() : '';
    const status = row[PARTNERS_COL_STATUS] ? String(row[PARTNERS_COL_STATUS]).trim().toLowerCase() : '';
    
    // Only add if partner type exists
    if (partnerType) {
      const partner = {
        type: partnerType,
        status: status === 'closed' ? 'Closed' : 'Available',
        name: row[PARTNERS_COL_NAME] ? String(row[PARTNERS_COL_NAME]).trim() : '',
        company: row[PARTNERS_COL_COMPANY] ? String(row[PARTNERS_COL_COMPANY]).trim() : '',
        logo: row[PARTNERS_COL_LOGO] ? String(row[PARTNERS_COL_LOGO]).trim() : '',
        website: row[PARTNERS_COL_WEBSITE] ? String(row[PARTNERS_COL_WEBSITE]).trim() : ''
      };
      
      if (status === 'closed') {
        closed.push(partner);
      } else {
        available.push(partner);
      }
    }
  }
  
  return {
    closed: closed,
    available: available
  };
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
          personName: row[COL_PERSON_NAME] ? String(row[COL_PERSON_NAME]).trim() : '',
          stallNo: row[COL_STALL_NO] ? String(row[COL_STALL_NO]).trim() : '',
          category: row[COL_CATEGORY] ? String(row[COL_CATEGORY]).trim() : '',
          logo: row[COL_LOGO] ? String(row[COL_LOGO]).trim() : '',
          tagline: row[COL_TAGLINE] ? String(row[COL_TAGLINE]).trim() : '',
          website: row[COL_WEBSITE] ? String(row[COL_WEBSITE]).trim() : '',
          summary: row[COL_SUMMARY] ? String(row[COL_SUMMARY]).trim() : ''
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
