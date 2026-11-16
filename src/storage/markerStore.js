// Keeps the unsent single-point submission in this browser between visits.
const STORAGE_KEY = 'submissionDraft';

export function loadDraft() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; }
  catch { return {}; }
}

export function saveDraft(draft) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(draft)); }
  catch { /* storage unavailable (private mode); the form still works */ }
}

export function clearDraft() {
  try { localStorage.removeItem(STORAGE_KEY); }
  catch { /* nothing saved */ }
}
