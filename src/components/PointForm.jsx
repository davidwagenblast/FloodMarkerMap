import { useEffect, useState } from 'preact/hooks';
import MapView from './MapView';
import { FIELDS } from '../config/fields';
import { toCsv } from '../lib/csv';
import { emailCsv } from '../lib/email';
import { readExif } from '../lib/exif';
import { loadDraft, saveDraft, clearDraft } from '../storage/markerStore';

const EMPTY = { lat: '', lon: '', existing: false, ...Object.fromEntries(FIELDS.map((f) => [f.key, ''])) };

export default function PointForm() {
  const [point, setPoint] = useState(() => ({ ...EMPTY, ...loadDraft() }));
  const [photos, setPhotos] = useState([]); // { file, url, exif, preview }; not kept between visits
  const [status, setStatus] = useState(null); // { text, action?: { label, run } }

  // changes: an object, or a function of the current point returning one
  function update(changes) {
    setPoint((prev) => {
      const next = { ...prev, ...(typeof changes === 'function' ? changes(prev) : changes) };
      saveDraft(next);
      return next;
    });
  }

  const lat = Number(point.lat);
  const lon = Number(point.lon);
  const hasLocation = point.lat !== '' && point.lon !== '' && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;

  function onPick(ll) {
    if (point.existing) return; // an existing point's location doesn't change
    update({ lat: ll.lat.toFixed(6), lon: ll.lng.toFixed(6), fix: 'Map click' });
    setStatus(null);
  }

  function useGeotag(photo, extra = '') {
    update({ lat: photo.exif.lat.toFixed(6), lon: photo.exif.lon.toFixed(6), fix: 'Phone GPS' });
    setStatus({ text: join(`Location filled in from the geotag of ${photo.file.name}. Click the map or edit the numbers to change it.`, extra) });
  }

  function selectExisting(p) {
    update({ lat: p.lat, lon: p.lon, name: p.name, existing: true, fix: '', horizontal_rms_m: '', vertical_rms_m: '' });
    setStatus({ text: `Adding photos to the existing point “${p.name || 'unnamed'}”. Its location stays as it is.` });
  }

  function chooseNewLocation() {
    update({ lat: '', lon: '', name: '', existing: false });
    setStatus(null);
  }

  async function onPhotos(e) {
    const input = e.currentTarget;
    const files = [...input.files];
    input.value = '';
    if (!files.length) return;
    const added = await Promise.all(
      files.map(async (file) => {
        const url = URL.createObjectURL(file);
        return { file, url, exif: await readExif(file), preview: await canDisplay(url) };
      })
    );
    setPhotos((prev) => [...prev, ...added]);

    const dated = added.find((p) => p.exif.date);
    const dateNote = dated && !point.date ? `Date and time filled in from ${dated.file.name}.` : '';
    if (dateNote) update({ date: dated.exif.date, time: dated.exif.time });

    const tagged = added.find((p) => p.exif.lat !== undefined);
    if (point.existing) {
      if (dateNote) setStatus({ text: join(`Adding photos to the existing point “${point.name || 'unnamed'}”. Its location stays as it is.`, dateNote) });
    } else if (!tagged) {
      if (!hasLocation) setStatus({ text: join('No location found in the photo. Click the map or type the coordinates.', dateNote) });
      else if (dateNote) setStatus({ text: dateNote });
    } else if (!hasLocation) {
      useGeotag(tagged, dateNote);
    } else {
      setStatus({
        text: join(`${tagged.file.name} has a location (${tagged.exif.lat.toFixed(6)}, ${tagged.exif.lon.toFixed(6)}).`, dateNote),
        action: { label: 'Use photo location', run: () => useGeotag(tagged) },
      });
    }
  }

  function removePhoto(photo) {
    URL.revokeObjectURL(photo.url);
    setPhotos((prev) => prev.filter((p) => p !== photo));
  }

  function onSubmit(e) {
    e.preventDefault(); // the browser has already checked required fields and ranges
    if (point.existing && !photos.length) {
      alert('Attach at least one photo to add to this point.');
      return;
    }
    const names = photos.map((p) => p.file.name);
    const subject = point.existing ? `Photos for existing point: ${point.name}` : 'Point submission';
    const note = names.length ? `Photos to attach before sending: ${names.join(', ')}` : '';
    emailCsv(subject, toCsv([{ ...point, lat, lon, photos: names.join('; ') }]), 'flood-point.csv', note);
  }

  function onClear() {
    if (!confirm('Clear this point, its details and photos?')) return;
    photos.forEach((p) => URL.revokeObjectURL(p.url));
    setPhotos([]);
    setPoint(EMPTY);
    setStatus(null);
    clearDraft();
  }

  return (
    <>
      <MapView
        className="map submit-map"
        pin={hasLocation ? [lat, lon] : null}
        pinPhoto={photos.find((p) => p.preview)?.url}
        onPick={onPick}
        onSelectExisting={selectExisting}
      />
      <form class="point-form" onSubmit={onSubmit}>
        <label class="wide">
          Photos
          <input type="file" accept="image/*" multiple onChange={onPhotos} />
        </label>
        {photos.length > 0 && (
          <div class="photo-list wide">
            {photos.map((p) => (
              <figure key={p.url}>
                {p.preview
                  ? <img src={p.url} alt={p.file.name} />
                  : <div class="photo-placeholder" title={p.file.name}>No preview<br />{p.file.name}</div>}
                <button type="button" class="remove" aria-label={`Remove ${p.file.name}`} onClick={() => removePhoto(p)}>×</button>
              </figure>
            ))}
          </div>
        )}
        {status && (
          <p class="status wide">
            {status.text}{' '}
            {status.action && <button type="button" class="secondary" onClick={status.action.run}>{status.action.label}</button>}
          </p>
        )}
        {point.existing && (
          <p class="status wide">
            <button type="button" class="secondary" onClick={chooseNewLocation}>Choose a new location instead</button>
          </p>
        )}

        <label>
          Latitude
          <input type="number" step="any" min="-90" max="90" required readOnly={point.existing} value={point.lat}
            onInput={(e) => update({ lat: e.currentTarget.value })} />
        </label>
        <label>
          Longitude
          <input type="number" step="any" min="-180" max="180" required readOnly={point.existing} value={point.lon}
            onInput={(e) => update({ lon: e.currentTarget.value })} />
        </label>
        {FIELDS.map((f) => (
          <label key={f.key} class={f.type === 'textarea' ? 'wide' : undefined}>
            {f.label}{f.type === 'date' ? ' (MM/DD/YYYY)' : ''}
            <Control field={f} value={point[f.key]} readOnly={point.existing && f.key === 'name'}
              onChange={(v) => update({ [f.key]: v })} />
          </label>
        ))}
        <div class="actions">
          <button type="button" class="secondary" onClick={onClear}>Clear</button>
          <button>Email to us</button>
        </div>
      </form>
    </>
  );
}

function canDisplay(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = url;
  });
}

function join(...sentences) {
  return sentences.filter(Boolean).join(' ');
}

function Control({ field, value, readOnly, onChange }) {
  const onInput = (e) => onChange(e.currentTarget.value);
  if (field.type === 'date') return <DateInput value={value} onChange={onChange} />;
  if (field.type === 'textarea') return <textarea value={value} onInput={onInput} />;
  if (field.type === 'select') {
    return (
      <select value={value} onChange={onInput}>
        <option value="" />
        {field.options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    );
  }
  const step = field.type === 'number' ? 'any' : field.type === 'time' ? '1' : undefined;
  return <input type={field.type} step={step} readOnly={readOnly} value={value} onInput={onInput} />;
}

// A date typed as MM/DD/YYYY. value and onChange use YYYY-MM-DD, the format saved in the
// CSV and master file. The browser's own date picker can't be used: it follows the
// visitor's language settings, so it shows DD/MM/YYYY in many countries.
function DateInput({ value, onChange }) {
  const [text, setText] = useState(isoToUs(value));

  // Follow changes made elsewhere (a photo's date, Clear), but not while typing
  useEffect(() => {
    if ((usToIso(text) ?? '') !== value) setText(isoToUs(value));
  }, [value]);

  function onInput(e) {
    const typed = e.currentTarget.value;
    const iso = usToIso(typed);
    e.currentTarget.setCustomValidity(typed.trim() && !iso ? 'Enter a date as MM/DD/YYYY, for example 10/13/2025.' : '');
    setText(typed);
    onChange(iso ?? '');
  }

  return <input type="text" inputMode="numeric" placeholder="MM/DD/YYYY" value={text} onInput={onInput} />;
}

function isoToUs(iso) {
  const m = (iso || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[2]}/${m[3]}/${m[1]}` : '';
}

// Returns YYYY-MM-DD, or null unless text is a real date like 10/13/2025 (or 1/5/2025)
function usToIso(text) {
  const m = text.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const [, month, day, year] = m;
  const d = new Date(Date.UTC(year, month - 1, day));
  if (d.getUTCMonth() !== month - 1 || d.getUTCDate() !== Number(day)) return null; // e.g. 02/31
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}
