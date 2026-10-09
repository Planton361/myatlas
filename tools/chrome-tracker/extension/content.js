/* Inspect only explicitly labelled submit/status controls; never editor/body text. */
(() => {
  'use strict';
  const C = MyAtlasTracker, detector = new C.Detector();
  const SELECTOR = '[data-e2e-locator="submission-result"], [data-e2e-locator="submission-result-status"], [data-e2e-locator="submission-status"], [role="status"]';
  const EXCLUDED = 'pre, code, textarea, input, [contenteditable], .monaco-editor, .CodeMirror, [data-track-load="description_content"]';
  const active = () => document.visibilityState === 'visible' && document.hasFocus();
  let timer, scheduled = false;
  function label(node) {
    if (!node || node.closest(EXCLUDED) || node.childElementCount || !node.getClientRects().length) return '';
    const style = getComputedStyle(node);
    if (style.visibility !== 'visible' || style.display === 'none' || style.opacity === '0') return '';
    // Only allow short text-only status nodes. Never serialize a subtree.
    if (node.childNodes.length !== 1 || node.firstChild.nodeType !== Node.TEXT_NODE || node.firstChild.length > 60) return '';
    return node.firstChild.data.trim();
  }
  function sample() {
    scheduled = false;
    if (!detector.attempt) return;
    const statuses = [...document.querySelectorAll(SELECTOR)].map(label).filter(Boolean);
    const unique = [...new Set(statuses)];
    // Ambiguous simultaneous statuses cannot produce an attestation prompt.
    if (unique.length > 1) { detector.reset(); return; }
    detector.observe({url: location.href, active: active(), status: unique[0] || '', now: Date.now()});
  }
  function schedule() {
    if (detector.attempt && !scheduled) { scheduled = true; queueMicrotask(sample); }
  }
  document.addEventListener('click', event => {
    if (!event.isTrusted) return;
    const target = event.target instanceof Element ? event.target : null;
    // Opening any link after Submit cancels the observation, including history links.
    if (target?.closest('a')) { detector.reset(); return; }
    const b = target?.closest('button');
    if (!b || b.disabled || b.closest(EXCLUDED)) return;
    const submit = b.getAttribute('data-e2e-locator') === 'console-submit-button' ||
      b.getAttribute('aria-label') === 'Submit' || label(b) === 'Submit';
    if (!submit) return;
    detector.submit({url: location.href, trusted: event.isTrusted, active: active(), now: Date.now()});
    clearTimeout(timer);
    timer = setTimeout(() => detector.reset(), C.TTL);
    // Do not sample the pre-click result. Only subsequent DOM changes count.
  }, true);
  new MutationObserver(schedule).observe(document.documentElement, {
    subtree: true, childList: true, characterData: true,
    attributes: true, attributeFilter: ['hidden', 'class', 'aria-hidden']
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) detector.reset(); });
  window.addEventListener('popstate', () => detector.reset());
  window.addEventListener('hashchange', () => detector.reset());
  window.addEventListener('pagehide', () => detector.reset());
  chrome.runtime.onMessage.addListener((message, sender, respond) => {
    if (sender.id !== chrome.runtime.id) return;
    if (message.type === 'context') {
      respond(C.problemURL(location.href));
    } else if (message.type === 'candidate') {
      // Opening the extension popup takes focus; freshness/URL/visibility are still required.
      detector.observe({url: location.href, active: !document.hidden, status: '', now: Date.now()});
      respond(detector.candidate);
    } else if (message.type === 'dismiss') { detector.reset(); respond(true); }
  });
})();
