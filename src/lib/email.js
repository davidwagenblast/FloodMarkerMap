import { SUBMIT_EMAIL } from '../config/submit';

const MAX_MAILTO_LENGTH = 1800;

export function emailHref(subject, body) {
  return `mailto:${SUBMIT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function downloadCsv(text, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type: 'text/csv' }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export function emailCsv(subject, csv, fileName, note = '') {
  const intro = note ? `${note}\n\n` : '';
  let href = emailHref(subject, `${intro}Submitted data:\n\n${csv}`);
  if (href.length > MAX_MAILTO_LENGTH) {
    downloadCsv(csv, fileName);
    href = emailHref(subject, `${intro}Attached: ${fileName}\n\n(Remember to attach the downloaded file before sending.)`);
  }
  location.href = href;
}
