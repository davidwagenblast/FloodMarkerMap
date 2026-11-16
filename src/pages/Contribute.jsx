import { useState } from 'preact/hooks';
import PointForm from '../components/PointForm';
import { FIELDS } from '../config/fields';
import { checkCsv, toCsv } from '../lib/csv';
import { emailHref } from '../lib/email';

const TEMPLATE_HREF = 'data:text/csv;charset=utf-8,' + encodeURIComponent(toCsv([]));
const MAX_PROBLEMS_SHOWN = 20;

function columnHint(f) {
  if (f.type === 'date') return 'date like 2026-11-16';
  if (f.type === 'time') return '24-hour time like 14:05:30';
  if (f.type === 'number') return 'number';
  if (f.type === 'select') return f.options.join(', ');
  return 'text';
}

export default function Contribute() {
  const [file, setFile] = useState(null); // { name, count, problems }

  async function onFile(e) {
    const input = e.currentTarget;
    const chosen = input.files[0];
    input.value = '';
    if (!chosen) return;
    setFile({ name: chosen.name, ...checkCsv(await chosen.text()) });
  }

  const mailto = file && emailHref(
    `CSV submission: ${file.name} (${file.count} rows)`,
    `Attached: ${file.name}\n\n(Remember to attach the file before sending.)`
  );

  return (
    <div class="page">
      <h1>Contribute</h1>
      <p>We welcome data submissions to help create a more complete data set
from both hobbyists and professionals. To assist in this, we have two main
options for submission.</p>
      <p> You may either submit a single data point through the built-in
submission preparation tool, or utilize our .csv
submission tool, intended for large scale data contribution. Both will be
forwarded to administrators for review before inclusion on our master file.</p>

      <h2>Single point submission</h2>
      <ol>
        <li>
          Click the map where you saw flooding, or attach a photo: if it has a geotag, the location fills in
          from it. You can always type exact values instead. To add photos to a point already on the map,
          click it and choose “Add photos to this point.”
        </li>
        <li>Fill in what you know. Leave the GPS and equipment fields blank if you clicked the map or used a phone.</li>
        <li>Click Email to us. The details go in the body of the email; <b> be sure to attach your photos to the email before sending.</b></li>
      </ol>
      <PointForm />
      <p class="hint">What you type is kept in this browser until you clear it. Photos need to be attached again after you leave the page.</p>

      <h2>CSV submission</h2>
      <ol>
        <li>
          <a href={TEMPLATE_HREF} download="flood-submission-template.csv">Download the template</a> and
          fill in one row per location.
        </li>
        <li>Choose your file below to check it for mistakes.</li>
        <li>Email it to us with the file, and any photos, attached.</li>
      </ol>

      <p class="hint">Columns: <code>lat</code> and <code>lon</code> are required, in decimal degrees
        (for example 40.3573 and -74.6672). The rest are optional:</p>
      <ul class="hint">
        {FIELDS.map((f) => (
          <li key={f.key}><code>{f.key}</code>: {columnHint(f)}</li>
        ))}
        <li><code>photos</code>: file names of the photos you attach, separated by <code>;</code></li>
      </ul>

      <input type="file" accept=".csv,text/csv" onChange={onFile} />

      {file && file.problems.length > 0 && (
        <div>
          <p class="error">{file.name} has problems. Fix them and choose the file again:</p>
          <ul class="error">
            {file.problems.slice(0, MAX_PROBLEMS_SHOWN).map((p) => <li key={p}>{p}</li>)}
          </ul>
          {file.problems.length > MAX_PROBLEMS_SHOWN && (
            <p class="error">…and {file.problems.length - MAX_PROBLEMS_SHOWN} more.</p>
          )}
        </div>
      )}

      {file && file.problems.length === 0 && (
        <div>
          <p>{file.name}: {file.count} {file.count === 1 ? 'row' : 'rows'} look good.</p>
          <a class="button" href={mailto}>Email it to us</a>
          <p class="hint">Your email app will open. Attach {file.name} before sending.</p>
        </div>
      )}
    </div>
  );
}
