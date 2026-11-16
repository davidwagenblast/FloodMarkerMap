import { useEffect, useRef } from 'preact/hooks';
import L from 'leaflet';
import { TILE_URL, ATTRIBUTION, MAX_ZOOM, CENTER, ZOOM } from '../config/map';
import { photoIcon } from '../lib/photos';
import { showMasterPoints } from './MasterLayer';

export default function MapView({ className = 'map', pin, pinPhoto, onPick, onSelectExisting }) {
  const el = useRef(null);
  const mapRef = useRef(null);
  const pinRef = useRef(null);
  const handlers = useRef({});
  handlers.current = { onPick, onSelectExisting };

  useEffect(() => {
    const map = L.map(el.current).setView(CENTER, ZOOM);
    L.tileLayer(TILE_URL, { maxZoom: MAX_ZOOM, attribution: ATTRIBUTION }).addTo(map);
    const picker = Boolean(handlers.current.onPick);
    if (picker) map.on('click', (e) => handlers.current.onPick(e.latlng));
    showMasterPoints(map, picker ? (point) => handlers.current.onSelectExisting?.(point) : null);
    mapRef.current = map;
    return () => map.remove();
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!pin) {
      pinRef.current?.remove();
      pinRef.current = null;
      return;
    }
    const icon = pinPhoto ? photoIcon(pinPhoto) : new L.Icon.Default();
    if (pinRef.current) pinRef.current.setLatLng(pin).setIcon(icon);
    else pinRef.current = L.marker(pin, { icon, zIndexOffset: 1000 }).addTo(map);
    if (!map.getBounds().contains(pin)) map.panTo(pin);
  }, [pin?.[0], pin?.[1], pinPhoto]);

  return <div ref={el} class={className} />;
}
