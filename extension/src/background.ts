/**
 * Service worker (background) for Clarity extension.
 *
 * Will hold session state, manage API calls to the Engine, cache recent
 * analyses, and coordinate the popup UI.
 *
 * D1-2 scaffold.
 */

chrome.runtime.onInstalled.addListener(() => {
  console.debug('[Clarity] extension installed');
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.kind === 'ping') {
    sendResponse({ ok: true, from: 'background' });
    return true;
  }
  return false;
});

export {};
