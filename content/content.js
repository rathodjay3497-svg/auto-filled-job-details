/**
 * Job Autofill – content.js
 * Injected into job application pages on demand.
 * Detects form fields, matches them against the user's profile,
 * and fills them with React/Vue-compatible event dispatching.
 */

'use strict';

// ─── Field Keyword Map ────────────────────────────────────────────────────

const FIELD_MAP = {
  firstName:      ['first name', 'first-name', 'firstname', 'fname', 'given name', 'forename'],
  lastName:       ['last name', 'last-name', 'lastname', 'lname', 'surname', 'family name'],
  email:          ['email', 'e-mail', 'mail'],
  phone:          ['phone', 'mobile', 'tel', 'contact number', 'cell'],
  address:        ['address', 'street', 'addr', 'line 1', 'line1'],
  city:           ['city', 'town'],
  state:          ['state', 'province', 'region'],
  zip:            ['zip', 'postal', 'pincode', 'post code', 'postcode'],
  country:        ['country', 'nation'],
  linkedIn:       ['linkedin'],
  website:        ['website', 'portfolio', 'personal url', 'personal site'],
  username:       ['username', 'user name', 'user-name', 'login', 'user id', 'userid'],
  password:       ['password', 'passwd', 'pass word'],
  collegeName:    ['college', 'university', 'school', 'institution'],
  degree:         ['degree', 'qualification', 'education level'],
  fieldOfStudy:   ['major', 'field of study', 'specialization', 'branch', 'discipline'],
  graduationYear: ['graduation', 'grad year', 'passing year', 'batch', 'year of passing'],
  coverLetter:    ['cover letter', 'covering letter', 'why do you want', 'motivation'],
  fullName:       ['full name', 'fullname', 'name', 'applicant name', 'complete name', 'full-name'],

  // ── Personal Details ──
  title:           ['title', 'salutation', 'prefix', 'mr', 'mrs', 'ms', 'dr'],
  middleName:      ['middle name', 'middlename', 'middle-name', 'mname'],
  alternateEmail:  ['alternate email', 'alt email', 'secondary email', 'other email'],
  alternateMobile: ['alternate mobile', 'alt mobile', 'alternate phone', 'other mobile', 'secondary phone'],
  gender:          ['gender', 'sex'],
  maritalStatus:   ['marital', 'marital status', 'married'],
  dateOfBirth:     ['date of birth', 'dob', 'birth date', 'birthday', 'd.o.b'],

  // ── Work Experience ──
  totalExperience:   ['total experience', 'total exp', 'years of experience', 'work experience', 'overall experience'],
  itExperience:      ['it experience', 'it exp', 'technical experience', 'tech experience'],
  experienceYears:   ['experience in years', 'exp in years', 'years exp'],
  organisation:      ['organisation', 'organization', 'company', 'employer', 'current company', 'current employer'],
  designation:       ['designation', 'desig', 'job title', 'current designation', 'position', 'role', 'current role'],
  noticePeriod:      ['notice period', 'notice', 'serving notice', 'days notice'],
  preferredLocation: ['preferred location', 'preferred city', 'preferred work location', 'work location preference'],
  currentCTC:        ['current ctc', 'current salary', 'ctc', 'current package', 'annual ctc'],
  expectedCTC:       ['expected ctc', 'expected salary', 'expected package', 'desired salary', 'salary expectation'],
};

// ─── Type-based Quick Map ─────────────────────────────────────────────────
// When input[type] unambiguously identifies a field, use it directly.

const TYPE_MAP = {
  email:    'email',
  tel:      'phone',
  password: 'password',
};

// ─── React-compatible Value Setter ────────────────────────────────────────

function setNativeValue(element, value) {
  const proto = element.tagName === 'TEXTAREA'
    ? window.HTMLTextAreaElement.prototype
    : window.HTMLInputElement.prototype;
  const nativeSetter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
  if (nativeSetter) {
    nativeSetter.call(element, value);
  } else {
    element.value = value;
  }
  element.dispatchEvent(new Event('input',  { bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
}

// ─── Keyword Matching ─────────────────────────────────────────────────────

/**
 * Tests if a string contains any of the keywords (case-insensitive).
 * Returns the matched field key, or null.
 */
function testKeywords(text, excludeKeys = []) {
  if (!text) return null;
  const lower = text.toLowerCase().trim();
  for (const [key, keywords] of Object.entries(FIELD_MAP)) {
    if (excludeKeys.includes(key)) continue;
    for (const kw of keywords) {
      if (lower.includes(kw)) return key;
    }
  }
  return null;
}

/**
 * Extracts the associated label text for an element.
 * Checks: for="id", wrapping <label>, aria-labelledby.
 */
function getLabelText(element) {
  // 1. Explicit label via for="id"
  if (element.id) {
    const lbl = document.querySelector(`label[for="${CSS.escape(element.id)}"]`);
    if (lbl) return lbl.textContent;
  }
  // 2. Wrapping label
  const parent = element.closest('label');
  if (parent) return parent.textContent;
  // 3. aria-labelledby
  const labelledBy = element.getAttribute('aria-labelledby');
  if (labelledBy) {
    const parts = labelledBy.split(/\s+/).map(id => {
      const el = document.getElementById(id);
      return el ? el.textContent : '';
    });
    return parts.join(' ');
  }
  return null;
}

/**
 * Gets nearby text: preceding sibling text, parent text, etc.
 */
function getNearbyText(element) {
  const texts = [];
  // Previous sibling
  let prev = element.previousSibling;
  while (prev) {
    if (prev.nodeType === Node.TEXT_NODE && prev.textContent.trim()) {
      texts.push(prev.textContent.trim());
      break;
    }
    if (prev.nodeType === Node.ELEMENT_NODE) {
      const t = prev.textContent.trim();
      if (t) { texts.push(t); break; }
    }
    prev = prev.previousSibling;
  }
  // Parent's direct text nodes
  const parentText = element.parentElement?.textContent?.trim();
  if (parentText) texts.push(parentText);
  return texts.join(' ');
}

// ─── matchField ───────────────────────────────────────────────────────────

/**
 * Determines which profile key best matches the given element.
 * Returns the key string or null if no match.
 *
 * Priority:
 * 1. type="email" → email, type="tel" → phone
 * 2. type="url" → check name/id for linkedin vs website
 * 3. name attribute
 * 4. id attribute
 * 5. placeholder
 * 6. aria-label
 * 7. label text
 * 8. nearby text
 */
function matchField(element) {
  const type        = (element.type        || '').toLowerCase();
  const name        = (element.name        || '').toLowerCase();
  const id          = (element.id          || '').toLowerCase();
  const placeholder = (element.placeholder || '').toLowerCase();
  const ariaLabel   = (element.getAttribute('aria-label') || '').toLowerCase();
  const titleAttr   = (element.getAttribute('title')      || '').toLowerCase();

  // 1. type="email"
  if (type === 'email')    return 'email';
  // 1. type="tel"
  if (type === 'tel')      return 'phone';
  // 1. type="password"
  if (type === 'password') return 'password';

  // 2. type="url" — disambiguate linkedin vs website
  if (type === 'url') {
    const combined = `${name} ${id} ${placeholder} ${ariaLabel}`;
    if (combined.includes('linkedin')) return 'linkedIn';
    return 'website';
  }

  // 3–8. Keyword matching in priority order
  const checks = [
    name,
    id,
    placeholder,
    ariaLabel,
    titleAttr,
    getLabelText(element) || '',
    getNearbyText(element),
  ];

  for (const text of checks) {
    const key = testKeywords(text);
    if (key) return key;
  }

  return null;
}

// ─── fillInput ────────────────────────────────────────────────────────────

/**
 * Fills a form element with the given value.
 * Handles: text/email/tel/url inputs, textarea, select, file input.
 */
function fillInput(element, value) {
  const tag  = element.tagName.toUpperCase();
  const type = (element.type || '').toLowerCase();

  // ── File input ──
  if (type === 'file') {
    fillFileInput(element, value);
    return;
  }

  // ── Radio ──
  if (type === 'radio') {
    const val        = (element.value || '').toLowerCase();
    const profileVal = (value || '').toLowerCase();
    if (val === profileVal || val.includes(profileVal) || profileVal.includes(val)) {
      element.checked = true;
      element.dispatchEvent(new Event('change', { bubbles: true }));
      element.setAttribute('data-autofilled', 'true');
    }
    return;
  }

  // ── Select ──
  if (tag === 'SELECT') {
    fillSelect(element, value);
    return;
  }

  // ── Textarea / text inputs ──
  setNativeValue(element, value);
  element.setAttribute('data-autofilled', 'true');

  // Also trigger blur for some frameworks
  element.dispatchEvent(new FocusEvent('focus', { bubbles: true }));
  element.dispatchEvent(new FocusEvent('blur',  { bubbles: true }));
}

/**
 * Sets a <select> element's value by matching option text or value attribute.
 */
function fillSelect(element, value) {
  const lowerValue = value.toLowerCase().trim();
  let matched = false;

  for (let i = 0; i < element.options.length; i++) {
    const opt = element.options[i];
    const optText  = opt.text.toLowerCase().trim();
    const optValue = opt.value.toLowerCase().trim();
    if (optText === lowerValue || optValue === lowerValue ||
        optText.includes(lowerValue) || lowerValue.includes(optText)) {
      element.selectedIndex = i;
      matched = true;
      break;
    }
  }

  if (matched) {
    element.dispatchEvent(new Event('change', { bubbles: true }));
    element.setAttribute('data-autofilled', 'true');
  }
}

/**
 * Reconstructs a File from base64 and injects it into a file input
 * via the DataTransfer API.
 */
function fillFileInput(element, profileResumeData) {
  const { base64, mimeType, fileName } = profileResumeData;
  if (!base64 || !fileName) return;

  try {
    const byteChars = atob(base64);
    const byteNums  = new Uint8Array(byteChars.length);
    for (let i = 0; i < byteChars.length; i++) {
      byteNums[i] = byteChars.charCodeAt(i);
    }
    const blob = new Blob([byteNums], { type: mimeType || 'application/pdf' });
    const file = new File([blob], fileName, { type: mimeType || 'application/pdf' });

    const dt = new DataTransfer();
    dt.items.add(file);
    element.files = dt.files;

    element.dispatchEvent(new Event('change', { bubbles: true }));
    element.setAttribute('data-autofilled', 'true');
  } catch (err) {
    console.warn('[Job Autofill] File input fill failed:', err);
  }
}

// ─── isResumeFileInput ────────────────────────────────────────────────────

/**
 * Checks whether a file input is likely a resume / CV field.
 */
function isResumeFileInput(element) {
  const accept      = (element.accept      || '').toLowerCase();
  const name        = (element.name        || '').toLowerCase();
  const id          = (element.id          || '').toLowerCase();
  const ariaLabel   = (element.getAttribute('aria-label') || '').toLowerCase();
  const labelText   = (getLabelText(element) || '').toLowerCase();
  const nearbyText  = getNearbyText(element).toLowerCase();
  const combined    = `${accept} ${name} ${id} ${ariaLabel} ${labelText} ${nearbyText}`;

  return combined.includes('resume') ||
         combined.includes('cv') ||
         combined.includes('curriculum') ||
         accept.includes('pdf');
}

// ─── autofill ─────────────────────────────────────────────────────────────

async function autofill() {
  let filled  = 0;
  let skipped = 0;
  const errors = [];

  try {
    const result  = await chrome.storage.local.get('userProfile');
    const profile = result.userProfile || {};

    // Collect all interactive form elements (skip hidden/disabled)
    const elements = Array.from(
      document.querySelectorAll('input, textarea, select')
    ).filter(el => {
      if (el.disabled || el.hidden) return false;
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') return false;
      const type = (el.type || '').toLowerCase();
      // Skip buttons, checkboxes, radios, submit, reset, hidden
      if (['button', 'submit', 'reset', 'checkbox', 'hidden', 'image', 'color', 'range'].includes(type)) return false;
      return true;
    });

    for (const el of elements) {
      try {
        const type = (el.type || '').toLowerCase();

        // ── File input: special handling ──
        if (type === 'file') {
          if (isResumeFileInput(el) && profile.resumeBase64 && profile.resumeFileName) {
            fillFileInput(el, {
              base64:   profile.resumeBase64,
              mimeType: profile.resumeMimeType || 'application/pdf',
              fileName: profile.resumeFileName,
            });
            filled++;
          } else {
            skipped++;
          }
          continue;
        }

        // ── Match field ──
        const key = matchField(el);
        if (!key) {
          skipped++;
          continue;
        }

        let value;
        if (key === 'fullName') {
          // Derive full name from firstName and lastName
          const first = profile.firstName || '';
          const last = profile.lastName || '';
          value = `${first} ${last}`.trim();
        } else {
          value = profile[key];
        }

        if (!value || value.toString().trim() === '') {
          skipped++;
          continue;
        }

        fillInput(el, value);
        filled++;
      } catch (elErr) {
        errors.push(`Field error: ${elErr.message}`);
        skipped++;
      }
    }
  } catch (err) {
    errors.push(`Autofill error: ${err.message}`);
  }

  return { filled, skipped, errors };
}

// ─── clear ────────────────────────────────────────────────────────────────

function clear() {
  const filled = document.querySelectorAll('[data-autofilled="true"]');
  let cleared = 0;
  filled.forEach(el => {
    const tag  = el.tagName.toUpperCase();
    const type = (el.type || '').toLowerCase();

    if (tag === 'SELECT') {
      el.selectedIndex = 0;
      el.dispatchEvent(new Event('change', { bubbles: true }));
    } else if (type === 'file') {
      try {
        const dt = new DataTransfer();
        el.files = dt.files;
        el.dispatchEvent(new Event('change', { bubbles: true }));
      } catch (_) { /* ignore */ }
    } else {
      setNativeValue(el, '');
    }

    el.removeAttribute('data-autofilled');
    cleared++;
  });
  return { cleared };
}

// ─── Message Listener ─────────────────────────────────────────────────────

// Guard against duplicate listeners when the script is re-injected.
if (!window.__jobAutofillListenerAttached) {
  window.__jobAutofillListenerAttached = true;

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.action === 'autofill') {
      autofill()
        .then(result => sendResponse(result))
        .catch(err  => sendResponse({ filled: 0, skipped: 0, errors: [err.message] }));
      return true; // async
    }

    if (message.action === 'clear') {
      try {
        const result = clear();
        sendResponse(result);
      } catch (err) {
        sendResponse({ cleared: 0, error: err.message });
      }
      return true;
    }
  });
}
