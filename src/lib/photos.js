import L from 'leaflet';

export function masterPhotoUrls(photos) {
  return (photos || '')
    .split(';')
    .map((name) => name.trim())
    .filter(Boolean)
    .map((name) => `${import.meta.env.BASE_URL}photos/${encodeURIComponent(name)}`);
}

export function photoIcon(url) {
  const img = document.createElement('img');
  img.className = 'photo-pin';
  img.src = url;
  img.alt = '';
  return L.divIcon({ html: img, className: 'photo-icon', iconSize: [44, 44], iconAnchor: [22, 22], popupAnchor: [0, -22] });
}
