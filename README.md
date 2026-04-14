# Job Autofill

A Chrome Extension (Manifest V3) that automatically fills job application forms with your saved profile information including personal details, education, cover letter, and resume.

## Features

### Profile Management
- **Personal Information**: First name, last name, email, phone number
- **Address**: Street address, city, state, ZIP code, country
- **Online Presence**: LinkedIn URL, portfolio/website URL
- **Education**: College name, degree, field of study, graduation year
- **Cover Letter**: Pre-written cover letter template
- **Resume Upload**: Upload PDF resume (stored locally in browser storage)

### Autofill Engine
- **Smart Field Matching**: Matches fields by name, id, placeholder, label, aria-label, and nearby text
- **Framework Support**: Works with standard HTML forms, React, and Vue
- **Resume Upload**: Automatically uploads your saved PDF resume to file input fields
- **Selective Filling**: Skips fields without matching profile data and shows results

### User Interface
- **Tabbed Interface**: Three tabs - Profile, Education, Autofill
- **Real-time Status**: Shows number of fields filled and skipped
- **Error Reporting**: Displays any errors encountered during autofill
- **Clear Function**: Option to clear all autofilled fields

## Installation

### From Source (Developer Mode)

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** (toggle in top-right corner)
3. Click **Load unpacked**
4. Select the extension folder (`auto-fill-job-details`)
5. The extension icon will appear in your toolbar

### Testing the Extension

1. Pin the extension icon to your toolbar
2. Click the icon to open the popup
3. Fill in your profile information in the Profile tab
4. Click Save Profile
5. Navigate to any job application form
6. Click the extension icon and go to the Autofill tab
7. Click "Autofill This Page"

## Field Matching

The extension matches form fields using multiple strategies:

| Priority | Method | Examples |
|----------|--------|----------|
| 1 | Input type | `type="email"` → email, `type="tel"` → phone |
| 2 | Input type=url | Check name/id for LinkedIn vs website |
| 3 | name attribute | `name="first_name"` → firstName |
| 4 | id attribute | `id="user-email"` → email |
| 5 | placeholder | `placeholder="Enter email"` → email |
| 6 | aria-label | `aria-label="Contact Email"` → email |
| 7 | label text | Label "Email Address" → email |
| 8 | nearby text | Text adjacent to input → match |

### Supported Keywords

Each profile field has multiple keyword variations:

- `firstName`: first name, first-name, firstname, fname, given name, forename
- `lastName`: last name, last-name, lastname, lname, surname, family name
- `email`: email, e-mail, mail
- `phone`: phone, mobile, tel, contact number, cell
- `address`: address, street, addr, line 1, line1
- `city`: city, town
- `state`: state, province, region
- `zip`: zip, postal, pincode, post code, postcode
- `country`: country, nation
- `collegeName`: college, university, school, institution
- `degree`: degree, qualification, education level
- `fieldOfStudy`: major, field of study, specialization, branch, discipline
- `graduationYear`: graduation, grad year, passing year, batch, year of passing
- `coverLetter`: cover letter, covering letter, why do you want, motivation
- `linkedIn`: linkedin
- `website`: website, portfolio, personal url, personal site

## Usage Steps

### Step 1: Install the Extension
Follow the installation instructions above.

### Step 2: Save Your Profile
1. Click the extension icon in Chrome toolbar
2. The Profile tab is shown by default
3. Fill in your personal information:
   - First Name, Last Name
   - Email Address
   - Phone Number
4. Fill in your address (optional):
   - Street Address, City, State, ZIP, Country
5. Add your online presence (optional):
   - LinkedIn URL
   - Portfolio/Website URL
6. Click "Save Profile"

### Step 3: Add Education Details
1. Click the Education tab
2. Fill in your education:
   - College/University name
   - Degree (select from dropdown)
   - Field of Study
   - Graduation Year
3. Optionally add a cover letter template
4. Optionally upload your resume (PDF only)
5. Click "Save Profile"

### Step 4: Autofill a Job Application
1. Navigate to the job application form page
2. Click the extension icon
3. Click the Autofill tab
4. Click "Autofill This Page"
5. The extension will:
   - Fill all matching text fields with your profile data
   - Upload your resume to file input fields (if detected)
   - Show results with count of filled/skipped fields

### Step 5: Clear If Needed
1. Click the extension icon
2. Go to Autofill tab
3. Click "Clear Filled Fields"
4. All fields with `data-autofilled="true"` will be cleared

## Project Structure

```
auto-fill-job-details/
├── manifest.json          # Extension manifest (MV3)
├── background/
│   └── service_worker.js # Background script (message routing)
├── content/
│   └── content.js        # Injected content script (autofill logic)
├── popup/
│   ├── popup.html       # Popup UI
│   ├── popup.css       # Popup styles
│   └── popup.js        # Popup logic (profile management)
└── assets/
    ├── icon16.png      # Extension icon 16x16
    ├── icon48.png      # Extension icon 48x48
    └── icon128.png    # Extension icon 128x128
```

## Technical Details

- **Manifest Version**: 3
- **Permissions**: storage, activeTab, scripting
- **Storage**: chrome.storage.local (stores profile as JSON)
- **Content Script**: Injected on demand (not on every page)
- **Event Dispatching**: Native value setter with input/change/focus/blur events for React/Vue compatibility

## Browser Support

- Chrome (Desktop) - Manifest V3 required
- Other Chromium-based browsers (Edge, Brave, etc.)

## Limitations

- File inputs can only accept the saved resume PDF (no custom file uploads)
- Some complex custom form fields may not be detected
- The extension works on web pages only (not native dialogs)
- Resume upload requires the file input to be detectable as a resume field

## Uninstall

1. Right-click the extension icon
2. Select "Remove from Chrome"
3. Confirm the removal