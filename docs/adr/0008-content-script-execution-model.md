# Content Script Execution Model

Thread extraction, filtering, serialization, and clipboard writing execute entirely within the content script, with the background service worker acting solely as a thin router for `chrome.commands` keyboard shortcuts. Manifest V3 service workers cannot access the DOM or `navigator.clipboard` without spinning up offscreen documents; executing within the content script leverages user-activation click contexts to write to the clipboard synchronously with zero messaging latency.
