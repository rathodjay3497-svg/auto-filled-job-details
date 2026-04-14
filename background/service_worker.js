/**
 * Job Autofill – service_worker.js (MV3 Background)
 * Bridges messages between the popup and the content script.
 * Injects content.js on demand so it does not run on every page.
 */

'use strict';

const CONTENT_SCRIPT = 'content/content.js';

// ─── Message Router ───────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'autofill') {
    handleAutofill(sendResponse);
    return true; // keep channel open for async response
  }

  if (message.action === 'clear') {
    handleClear(sendResponse);
    return true;
  }
});

// ─── Autofill Handler ─────────────────────────────────────────────────────

async function handleAutofill(sendResponse) {
  try {
    const tab = await getActiveTab();
    if (!tab) {
      sendResponse({ filled: 0, skipped: 0, errors: ['No active tab found.'] });
      return;
    }

    await injectContentScript(tab.id);
    const result = await sendMessageToTab(tab.id, { action: 'autofill' });
    sendResponse(result || { filled: 0, skipped: 0, errors: [] });
  } catch (err) {
    console.error('[Job Autofill SW] Autofill error:', err);
    sendResponse({ filled: 0, skipped: 0, errors: [err.message || 'Unknown error'] });
  }
}

// ─── Clear Handler ────────────────────────────────────────────────────────

async function handleClear(sendResponse) {
  try {
    const tab = await getActiveTab();
    if (!tab) {
      sendResponse({ success: false, error: 'No active tab found.' });
      return;
    }

    await injectContentScript(tab.id);
    const result = await sendMessageToTab(tab.id, { action: 'clear' });
    sendResponse(result || { success: true });
  } catch (err) {
    console.error('[Job Autofill SW] Clear error:', err);
    sendResponse({ success: false, error: err.message });
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────

/**
 * Returns the current active tab in the focused window.
 */
function getActiveTab() {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      resolve(tabs && tabs.length > 0 ? tabs[0] : null);
    });
  });
}

/**
 * Injects content.js into the given tab.
 * If already injected, the script will simply re-register its listener
 * (duplicate listeners are safe because we use sendMessage which resolves once).
 */
async function injectContentScript(tabId) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: [CONTENT_SCRIPT],
    });
  } catch (err) {
    // May fail on chrome:// or other restricted URLs – surface the error upward
    throw new Error(`Cannot inject script: ${err.message}`);
  }
}

/**
 * Sends a message to the content script running in a tab.
 * Returns a Promise that resolves with the content script's response.
 */
function sendMessageToTab(tabId, message) {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, message, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(response);
      }
    });
  });
}
