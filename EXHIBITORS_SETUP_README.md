# BNI Confluence 2026 - Exhibitors Directory System

## Overview

This system provides a dynamic exhibitor directory that automatically syncs with your Google Sheet. When you update the sheet, the website automatically reflects the changes.

## Architecture

```
┌─────────────────────┐     ┌──────────────────────┐     ┌─────────────────┐
│   Website (HTML)    │────▶│  Google Apps Script  │────▶│  Google Sheet   │
│   exhibitors/*.html │     │      (API)           │     │  (Data Source)  │
└─────────────────────┘     └──────────────────────┘     └─────────────────┘
```

## File Structure

```
BNI Website/
├── index.html                    # Main website with A-Z buttons
├── exhibitors/                   # 26 alphabet pages
│   ├── A.html
│   ├── B.html
│   ├── ... (C through Y)
│   └── Z.html
└── google-apps-script/
    └── Code.gs                   # Apps Script backend code
```

## Setup Instructions

### Step 1: Prepare Your Google Sheet

Your Google Sheet should have this structure:

| Column A | Column B | Column C |
|----------|----------|----------|
| Mail | Exhibitors Name | Name |
| email@example.com | Company ABC | John Doe |
| ... | ... | ... |

- **Row 1**: Headers (Mail, Exhibitors Name, Name)
- **Row 2+**: Exhibitor data
- The sheet tab should be named "Sheet1" (or update the SHEET_NAME in Code.gs)

### Step 2: Deploy Google Apps Script

1. **Open your Google Sheet** with exhibitor data

2. **Go to Extensions > Apps Script**
   - This opens the Apps Script editor

3. **Copy the code** from `google-apps-script/Code.gs`

4. **Paste it** into the Apps Script editor (replace any existing code)

5. **Save the project** (Ctrl+S or File > Save)

6. **Test the setup**:
   - Click "Run" > "Run function" > "testSetup"
   - Check the Execution log for any errors
   - You should see "✅ Setup looks good!"

7. **Deploy as Web App**:
   - Click "Deploy" > "New deployment"
   - Click the gear icon next to "Select type" and choose "Web app"
   - Set configuration:
     - **Description**: "BNI Exhibitors API v1"
     - **Execute as**: "Me"
     - **Who has access**: "Anyone"
   - Click "Deploy"

8. **Authorize the app**:
   - Click "Authorize access"
   - Select your Google account
   - Click "Advanced" > "Go to [Project Name] (unsafe)"
   - Click "Allow"

9. **Copy the Web App URL**
   - It looks like: `https://script.google.com/macros/s/XXXXX/exec`

### Step 3: Configure the Website

1. **Open** any exhibitor HTML file (e.g., `exhibitors/A.html`)

2. **Find this line** (around line 290):
   ```javascript
   const APPS_SCRIPT_URL = 'YOUR_APPS_SCRIPT_WEB_APP_URL_HERE';
   ```

3. **Replace** `YOUR_APPS_SCRIPT_WEB_APP_URL_HERE` with your actual Web App URL

4. **Update all 26 files**:
   - You can use Find & Replace in your code editor
   - Search for: `YOUR_APPS_SCRIPT_WEB_APP_URL_HERE`
   - Replace with: `https://script.google.com/macros/s/YOUR_ID/exec`

### Step 4: Test the System

1. Open `exhibitors/A.html` in a browser
2. It should load exhibitors starting with 'A'
3. Check the browser console (F12) for any errors

## How It Works

### When a user visits an exhibitor page:

1. The page detects the current letter from the filename (A.html → "A")
2. JavaScript makes a request to your Apps Script: `?letter=A`
3. Apps Script reads your Google Sheet
4. It filters and returns only exhibitors starting with "A"
5. The page displays the exhibitor cards

### Auto-sync:

- The website fetches **fresh data** every time someone visits
- When you update the Google Sheet, changes appear immediately
- No manual deployment or code changes needed!

## Updating Exhibitors

### To add a new exhibitor:
1. Open your Google Sheet
2. Add a new row with: Email, Company Name, Person Name
3. Done! The website will show it automatically.

### To edit an exhibitor:
1. Open your Google Sheet
2. Find and edit the row
3. Done!

### To remove an exhibitor:
1. Open your Google Sheet
2. Delete the row
3. Done!

## Troubleshooting

### "Loading..." never finishes
- Check browser console (F12) for errors
- Verify the Apps Script URL is correct
- Make sure the script is deployed and accessible

### "Error loading data"
- Check if the Google Sheet is accessible
- Run `testSetup()` in Apps Script to verify configuration
- Check the column indices in Code.gs match your sheet structure

### Wrong data showing
- Verify column order: A=Email, B=Company, C=Person Name
- Check the sheet tab name matches `SHEET_NAME` in Code.gs

### CORS errors
- Make sure deployment is set to "Anyone" can access
- Try creating a new deployment

## API Reference

### Get exhibitors by letter
```
GET {APPS_SCRIPT_URL}?letter=A
```

Response:
```json
{
  "letter": "A",
  "count": 6,
  "exhibitors": [
    {
      "email": "email@example.com",
      "company": "ABC Corp",
      "name": "ABC Corp",
      "personName": "John Doe"
    }
  ]
}
```

### Get all exhibitors grouped
```
GET {APPS_SCRIPT_URL}
```

Response:
```json
{
  "totalCount": 50,
  "exhibitorsByLetter": {
    "A": [...],
    "B": [...],
    ...
  }
}
```

## Customization

### Change sheet tab name
In `Code.gs`, modify:
```javascript
const SHEET_NAME = 'Sheet1';  // Change to your tab name
```

### Change column order
In `Code.gs`, modify:
```javascript
const COL_EMAIL = 0;        // Column A (0-indexed)
const COL_COMPANY = 1;      // Column B
const COL_PERSON_NAME = 2;  // Column C
```

### Add more fields
1. Add columns to your Google Sheet
2. Update `Code.gs` to include new columns
3. Update the HTML template to display new fields

## Security Notes

- The Apps Script runs under your Google account
- "Anyone" access means anyone with the URL can READ the data
- Email addresses will be visible to website visitors
- Consider if you want to expose email addresses publicly

## Support

If you encounter issues:
1. Check the browser console for JavaScript errors
2. Check the Apps Script execution logs
3. Verify your Google Sheet structure
4. Make sure the deployment is active

---

Built for BNI CONFLUENCE 2026 | BNI Lakshya Chapter
