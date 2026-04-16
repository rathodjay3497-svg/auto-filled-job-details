/**
 * Job Autofill – popup.js
 * Handles: profile loading/saving, tab switching, resume upload,
 * autofill trigger, and status display.
 */

'use strict';

// ─── Constants ───────────────────────────────────────────────────────────────

const PROFILE_KEY = 'userProfile';

const PROFILE_FIELDS = [
  'firstName', 'lastName', 'email', 'phone',
  'address', 'city', 'state', 'zip', 'country',
  'linkedIn', 'website',
];

const EDUCATION_FIELDS = [
  'collegeName', 'degree', 'fieldOfStudy', 'graduationYear',
  'coverLetter',
];

const WORK_FIELDS = [
  'title', 'middleName', 'alternateEmail', 'alternateMobile',
  'gender', 'maritalStatus', 'dateOfBirth',
  'totalExperience', 'itExperience', 'experienceYears',
  'organisation', 'designation', 'noticePeriod',
  'preferredLocation', 'currentCTC', 'expectedCTC',
];

const DEFAULT_PROFILE = {
  firstName: '', lastName: '', email: '', phone: '',
  address: '', city: '', state: '', zip: '', country: '',
  linkedIn: '', website: '', coverLetter: '',
  collegeName: '', degree: '', fieldOfStudy: '', graduationYear: '',
  resumeFileName: '', resumeBase64: '', resumeMimeType: 'application/pdf',
  // Personal Details
  title: '', middleName: '', alternateEmail: '', alternateMobile: '',
  gender: '', maritalStatus: '', dateOfBirth: '',
  // Work Experience
  totalExperience: '', itExperience: '', experienceYears: '',
  organisation: '', designation: '', noticePeriod: '',
  preferredLocation: '', currentCTC: '', expectedCTC: '',
};

// ─── DOM References ───────────────────────────────────────────────────────────

const tabBtns       = document.querySelectorAll('.tab-btn');
const tabContents   = document.querySelectorAll('.tab-content');
const saveProfileBtn   = document.getElementById('saveProfileBtn');
const saveEducationBtn = document.getElementById('saveEducationBtn');
const autofillBtn   = document.getElementById('autofillBtn');
const clearBtn      = document.getElementById('clearBtn');
const resumeFileInput  = document.getElementById('resumeFile');
const resumeFileName   = document.getElementById('resumeFileName');
const fileInfo      = document.getElementById('fileInfo');
const removeResumeBtn  = document.getElementById('removeResumeBtn');
const statusArea    = document.getElementById('statusArea');
const statusBadge   = document.getElementById('statusBadge');
const filledCount   = document.getElementById('filledCount');
const skippedCount  = document.getElementById('skippedCount');
const statusErrors  = document.getElementById('statusErrors');
const errorList     = document.getElementById('errorList');
const closeStatusBtn = document.getElementById('closeStatusBtn');
const toast         = document.getElementById('toast');

// ─── Tab Switching ─────────────────────────────────────────────────────────

tabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const target = btn.dataset.tab;
    tabBtns.forEach(b => b.classList.remove('active'));
    tabContents.forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(`tab-${target}`).classList.add('active');
  });
});

// ─── Toast Helper ──────────────────────────────────────────────────────────

let toastTimer = null;
function showToast(msg, type = 'default', duration = 2400) {
  toast.textContent = msg;
  toast.className = `toast show${type !== 'default' ? ' ' + type : ''}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove('show');
  }, duration);
}

// ─── Load Profile ──────────────────────────────────────────────────────────

async function loadProfile() {
  try {
    const result = await chrome.storage.local.get(PROFILE_KEY);
    const profile = { ...DEFAULT_PROFILE, ...(result[PROFILE_KEY] || {}) };

    // Populate text/email/tel/url/select inputs
    [...PROFILE_FIELDS, ...EDUCATION_FIELDS, ...WORK_FIELDS].forEach(key => {
      const el = document.getElementById(key);
      if (!el) return;
      el.value = profile[key] || '';
    });

    // Show resume info if stored
    if (profile.resumeFileName) {
      showFileInfo(profile.resumeFileName);
    }
  } catch (err) {
    console.error('[Job Autofill] Failed to load profile:', err);
    showToast('Failed to load profile', 'error');
  }
}

// ─── Collect & Save Profile ────────────────────────────────────────────────

async function saveProfile() {
  try {
    // Read existing (to preserve resume data when saving from Profile tab)
    const existing = await chrome.storage.local.get(PROFILE_KEY);
    const current = { ...DEFAULT_PROFILE, ...(existing[PROFILE_KEY] || {}) };

    // Overwrite with form values
    [...PROFILE_FIELDS, ...EDUCATION_FIELDS, ...WORK_FIELDS].forEach(key => {
      const el = document.getElementById(key);
      if (el) current[key] = el.value.trim();
    });

    await chrome.storage.local.set({ [PROFILE_KEY]: current });
    showToast('✅ Profile saved!', 'success');
  } catch (err) {
    console.error('[Job Autofill] Failed to save profile:', err);
    showToast('Failed to save', 'error');
  }
}

saveProfileBtn.addEventListener('click', saveProfile);
saveEducationBtn.addEventListener('click', saveProfile);
document.getElementById('saveExperienceBtn').addEventListener('click', saveProfile);

// ─── Resume File Handling ─────────────────────────────────────────────────

function showFileInfo(name) {
  resumeFileName.textContent = name;
  fileInfo.style.display = 'flex';
}

function hideFileInfo() {
  resumeFileName.textContent = '';
  fileInfo.style.display = 'none';
}

resumeFileInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  // Validate PDF
  if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
    showToast('Please upload a PDF file', 'error');
    resumeFileInput.value = '';
    return;
  }

  try {
    const base64 = await readFileAsBase64(file);
    showFileInfo(file.name);

    // Save resume fields
    const existing = await chrome.storage.local.get(PROFILE_KEY);
    const profile = { ...DEFAULT_PROFILE, ...(existing[PROFILE_KEY] || {}) };
    profile.resumeFileName = file.name;
    profile.resumeBase64   = base64;
    profile.resumeMimeType = file.type || 'application/pdf';
    await chrome.storage.local.set({ [PROFILE_KEY]: profile });
    showToast('📄 Resume uploaded!', 'success');
  } catch (err) {
    console.error('[Job Autofill] Resume read error:', err);
    showToast('Failed to read file', 'error');
  }
});

removeResumeBtn.addEventListener('click', async () => {
  resumeFileInput.value = '';
  hideFileInfo();
  try {
    const existing = await chrome.storage.local.get(PROFILE_KEY);
    const profile = { ...DEFAULT_PROFILE, ...(existing[PROFILE_KEY] || {}) };
    profile.resumeFileName = '';
    profile.resumeBase64   = '';
    profile.resumeMimeType = 'application/pdf';
    await chrome.storage.local.set({ [PROFILE_KEY]: profile });
    showToast('Resume removed', 'default');
  } catch (err) {
    console.error('[Job Autofill] Failed to remove resume:', err);
  }
});

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => {
      // result is "data:application/pdf;base64,XXXX..."
      const b64 = reader.result.split(',')[1];
      resolve(b64);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

// ─── Autofill ────────────────────────────────────────────────────────────

autofillBtn.addEventListener('click', async () => {
  autofillBtn.disabled = true;
  const btnText = autofillBtn.querySelector('.btn-text');
  btnText.textContent = '...';

  try {
    const response = await sendMessageToBackground({ action: 'autofill' });
    displayStatus(response);
  } catch (err) {
    console.error('[Job Autofill] Autofill error:', err);
    displayStatus({ filled: 0, skipped: 0, errors: [err.message || 'Unknown error'] });
    showToast('Autofill failed', 'error');
  } finally {
    autofillBtn.disabled = false;
    btnText.textContent = 'Fill';
  }
});

// ─── Clear ────────────────────────────────────────────────────────────────

clearBtn.addEventListener('click', async () => {
  clearBtn.disabled = true;
  try {
    await sendMessageToBackground({ action: 'clear' });
    showToast('🗑️ Filled fields cleared', 'default');
    // Hide status area
    statusArea.style.display = 'none';
  } catch (err) {
    console.error('[Job Autofill] Clear error:', err);
    showToast('Clear failed', 'error');
  } finally {
    clearBtn.disabled = false;
  }
});

// ─── Status Close ─────────────────────────────────────────────────────────

if (closeStatusBtn) {
  closeStatusBtn.addEventListener('click', () => {
    statusArea.style.display = 'none';
  });
}

// ─── Status Display ────────────────────────────────────────────────────────

function displayStatus(result) {
  if (!result) return;

  const { filled = 0, skipped = 0, errors = [] } = result;
  filledCount.textContent  = filled;
  skippedCount.textContent = skipped;

  // Badge
  if (filled > 0 && errors.length === 0) {
    statusBadge.textContent = 'Success';
    statusBadge.className   = 'status-badge success';
  } else if (filled > 0 && errors.length > 0) {
    statusBadge.textContent = 'Partial';
    statusBadge.className   = 'status-badge partial';
  } else if (filled === 0 && errors.length > 0) {
    statusBadge.textContent = 'Error';
    statusBadge.className   = 'status-badge error';
  } else {
    statusBadge.textContent = filled === 0 ? 'No matches' : 'Done';
    statusBadge.className   = 'status-badge ' + (filled > 0 ? 'success' : 'partial');
  }

  // Errors
  if (errors.length > 0) {
    errorList.innerHTML = errors.map(e => `<li>${escapeHtml(e)}</li>`).join('');
    statusErrors.style.display = 'block';
  } else {
    statusErrors.style.display = 'none';
  }

  statusArea.style.display = 'block';

  // Toast
  if (filled > 0) {
    showToast(`✅ Filled ${filled} field${filled !== 1 ? 's' : ''}`, 'success');
  } else {
    showToast('No fields matched', 'default');
  }
}

// ─── Messaging ────────────────────────────────────────────────────────────

function sendMessageToBackground(message) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(response);
      }
    });
  });
}

// ─── Utilities ───────────────────────────────────────────────────────────

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ─── Expand / Collapse Panel ─────────────────────────────────────────────

const container    = document.querySelector('.container');
const expandToggle = document.getElementById('expandToggle');
const expandLabel  = document.getElementById('expandLabel');

expandToggle.addEventListener('click', () => {
  const isExpanded = container.classList.toggle('expanded');
  expandLabel.textContent = isExpanded ? 'Hide Details' : 'Profile Details';
});

// ─── Init ─────────────────────────────────────────────────────────────────

loadProfile();
