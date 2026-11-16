import L from 'leaflet';
import masterCsv from '../data/master.csv?raw';
import { FIELDS } from '../config/fields';
import { parseCsv } from '../lib/csv';
import { masterPhotoUrls, photoIcon } from '../lib/photos';

const LABELS = {
  lat: 'Latitude',
  lon: 'Longitude',
  ...Object.fromEntries(FIELDS.map((f) => [f.key, f.label])),
};

export function showMasterPoints(map, onAddPhotos) {
  const [header = [], ...rows] = parseCsv(masterCsv);
  const layer = L.featureGroup().addTo(map);

  for (const row of rows) {
    const point = Object.fromEntries(header.map((h, i) => [h, (row[i] ?? '').trim()]));
    const lat = Number(point.lat);
    const lon = Number(point.lon);
    if (!point.lat || !point.lon || !(lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180)) continue;
    const photos = masterPhotoUrls(point.photos);
    const marker = photos.length ? L.marker([lat, lon], { icon: photoIcon(photos[0]) }) : L.marker([lat, lon]);
    marker.bindPopup(() => buildDetails(point, photos, onAddPhotos && (() => {
      map.closePopup();
      onAddPhotos(point);
    }))).addTo(layer);
  }

  if (layer.getLayers().length) map.fitBounds(layer.getBounds(), { padding: [24, 24] });
}

function buildDetails(point, photos, onAddPhotos) {
  const box = document.createElement('div');
  box.className = 'point-details';
  const title = document.createElement('strong');
  title.textContent = point.name || 'Unnamed point';
  box.append(title);

  if (photos.length) {
    const gallery = document.createElement('div');
    gallery.className = 'point-photos';
    for (const url of photos) {
      const link = document.createElement('a');
      link.href = url;
      link.target = '_blank';
      const img = document.createElement('img');
      img.src = url;
      img.alt = '';
      link.append(img);
      gallery.append(link);
    }
    box.append(gallery);
  }

  const list = document.createElement('dl');
  for (const [key, value] of Object.entries(point)) {
    if (key === 'name' || key === 'photos' || !value) continue;
    const dt = document.createElement('dt');
    dt.textContent = LABELS[key] ?? key;
    const dd = document.createElement('dd');
    dd.textContent = value;
    list.append(dt, dd);
  }
  box.append(list);

  if (onAddPhotos) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = 'Add photos to this point';
    button.addEventListener('click', onAddPhotos);
    box.append(button);
  }
  return box;
}
