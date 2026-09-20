/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef } from 'react';

/** Loads Leaflet from CDN once (no npm dependency). */
let leafletPromise: Promise<any> | null = null;
function loadLeaflet(): Promise<any> {
  if ((window as any).L) return Promise.resolve((window as any).L);
  if (leafletPromise) return leafletPromise;
  leafletPromise = new Promise((resolve) => {
    if (!document.getElementById('leaflet-css')) {
      const css = document.createElement('link');
      css.id = 'leaflet-css';
      css.rel = 'stylesheet';
      css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(css);
    }
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = () => resolve((window as any).L);
    document.body.appendChild(script);
  });
  return leafletPromise;
}

/**
 * Interactive OpenStreetMap pin-drop picker (Leaflet via CDN   no npm install).
 * Click the map to drop/move a pin; reports lat/lng via onChange.
 */
export default function LeafletMapPicker({
  lat, lng, onChange,
}: { lat?: number | null; lng?: number | null; onChange: (lat: number, lng: number) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  useEffect(() => {
    let cancelled = false;
    loadLeaflet().then((L) => {
      if (cancelled || !ref.current || mapRef.current) return;
      const start: [number, number] = [lat || 6.9271, lng || 79.8612]; // default: Colombo
      const map = L.map(ref.current).setView(start, lat ? 15 : 12);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors', maxZoom: 19,
      }).addTo(map);
      mapRef.current = map;
      if (lat && lng) markerRef.current = L.marker(start).addTo(map);
      map.on('click', (e: any) => {
        const la = Number(e.latlng.lat.toFixed(6));
        const ln = Number(e.latlng.lng.toFixed(6));
        if (markerRef.current) markerRef.current.setLatLng([la, ln]);
        else markerRef.current = L.marker([la, ln]).addTo(map);
        onChange(la, ln);
      });
      setTimeout(() => map.invalidateSize(), 250);
    });
    return () => {
      cancelled = true;
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={ref} className="w-full h-56 rounded-md border" />;
}
