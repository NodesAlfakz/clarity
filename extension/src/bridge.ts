/**
 * Bridge content script (ISOLATED world) — relays messages between the MAIN
 * world shim in `content.ts` and the extension's service worker.
 *
 * D1-2 scaffold.
 */

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.kind === 'ping') {
    sendResponse({ ok: true, from: 'bridge' });
    return true;
  }
  return false;
});

export {};
