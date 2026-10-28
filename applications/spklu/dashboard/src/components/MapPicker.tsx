import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

interface MapPickerProps {
  lat: string | null;
  lng: string | null;
  onChange: (lat: string, lng: string) => void;
}

interface NomResult {
  lat: string;
  lon: string;
  display_name: string;
}

const DEFAULT_CENTER: [number, number] = [-2.5489, 118.0149]; // Indonesia
const DEFAULT_ZOOM = 5;

function toNum(v: string | null | undefined): number | null {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

// Nominatim has patchy coverage for Indonesian facility names: "RSUD Bali
// Mandara" returns NOTHING while "Bali Mandara" returns the hospital itself.
// When the raw query finds nothing, retry once with the facility-type prefix
// stripped. Longest prefixes first so "rumah sakit umum daerah" wins over "rs".
const FACILITY_PREFIXES = [
  'rumah sakit umum daerah',
  'rumah sakit umum',
  'rumah sakit',
  'rsud',
  'rsup',
  'rsia',
  'rsu',
  'rs',
  'puskesmas',
  'klinik',
  'rumah bersalin',
  'posyandu',
  'apotek',
  'laboratorium',
];

function stripFacilityPrefix(q: string): string {
  const lower = q.toLowerCase();
  for (const p of FACILITY_PREFIXES) {
    if (lower.startsWith(p + ' ')) return q.slice(p.length + 1).trim();
  }
  return q;
}

async function nomSearch(q: string): Promise<NomResult[]> {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(q)}`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  const data = (await res.json()) as NomResult[];
  return Array.isArray(data) ? data : [];
}

export default function MapPicker({ lat, lng, onChange }: MapPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<NomResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  // One-time map init.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const icon = L.icon({
      iconUrl: markerIcon,
      iconRetinaUrl: markerIcon2x,
      shadowUrl: markerShadow,
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41],
    });

    const initialLat = toNum(lat);
    const initialLng = toNum(lng);
    const hasPos = initialLat != null && initialLng != null;
    const center: [number, number] = hasPos ? [initialLat, initialLng] : DEFAULT_CENTER;
    const zoom = hasPos ? 16 : DEFAULT_ZOOM;

    const map = L.map(containerRef.current, { center, zoom, scrollWheelZoom: false, zoomControl: false });
    // Kontrol zoom default Leaflet ada di kiri-atas, tempat yang sama dengan
    // kotak pencarian (.map-search, z-index 1000), sehingga tombol +/- tertutup.
    // Pindahkan ke kanan-atas agar keduanya bisa dipakai.
    L.control.zoom({ position: 'topright' }).addTo(map);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    const marker = L.marker(center, { icon, draggable: true }).addTo(map);
    marker.on('dragend', () => {
      const p = marker.getLatLng();
      onChangeRef.current(p.lat.toFixed(7), p.lng.toFixed(7));
    });
    map.on('click', (e: L.LeafletMouseEvent) => {
      marker.setLatLng(e.latlng);
      onChangeRef.current(e.latlng.lat.toFixed(7), e.latlng.lng.toFixed(7));
    });

    mapRef.current = map;
    markerRef.current = marker;

    // Leaflet needs a sized container; modal may still be settling layout.
    const t = setTimeout(() => {
      if (mapRef.current) mapRef.current.invalidateSize();
    }, 100);

    return () => {
      clearTimeout(t);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync marker/center when lat/lng change externally (search pick, edit load).
  useEffect(() => {
    const map = mapRef.current;
    const marker = markerRef.current;
    if (!map || !marker) return;
    const nLat = toNum(lat);
    const nLng = toNum(lng);
    if (nLat == null || nLng == null) return;
    const cur = marker.getLatLng();
    if (Math.abs(cur.lat - nLat) > 1e-6 || Math.abs(cur.lng - nLng) > 1e-6) {
      const pos: [number, number] = [nLat, nLng];
      marker.setLatLng(pos);
      map.setView(pos, Math.max(map.getZoom(), 16));
    }
  }, [lat, lng]);

  async function runSearch() {
    const q = query.trim();
    if (!q) return;
    setSearching(true);
    setError('');
    setNotice('');
    try {
      let data = await nomSearch(q);
      let relaxed = false;
      if (!data.length) {
        const stripped = stripFacilityPrefix(q);
        if (stripped && stripped !== q) {
          data = await nomSearch(stripped);
          relaxed = data.length > 0;
        }
      }
      if (data.length) {
        setResults(data);
        // Move the marker + fill Latitude/Longitude immediately, so pressing
        // "Cari" visibly updates the map. The result list stays open so the
        // user can switch to a more accurate candidate if the top hit is off.
        applyResult(data[0]);
        if (relaxed) {
          setNotice(`Tidak ada hasil untuk "${q}" — menampilkan hasil untuk "${stripFacilityPrefix(q)}".`);
        }
      } else {
        setResults([]);
        setError('Lokasi tidak ditemukan. Coba kata kunci yang lebih umum, atau isi Latitude/Longitude manual.');
      }
    } catch {
      setError('Gagal mencari lokasi. Periksa koneksi, atau isi Latitude/Longitude manual.');
    } finally {
      setSearching(false);
    }
  }

  // Move the marker + recenter, and push the coordinate up to the form state.
  function applyResult(r: NomResult) {
    const nLat = Number(r.lat);
    const nLng = Number(r.lon);
    if (!Number.isFinite(nLat) || !Number.isFinite(nLng)) return;
    const pos: [number, number] = [nLat, nLng];
    markerRef.current?.setLatLng(pos);
    mapRef.current?.setView(pos, 16);
    onChangeRef.current(nLat.toFixed(7), nLng.toFixed(7));
  }

  function pick(r: NomResult) {
    applyResult(r);
    setResults([]);
    setNotice('');
    setQuery('');
  }

  return (
    <div className="map-picker">
      <div className="map-search">
        <div className="map-search-row">
          <input
            type="text"
            placeholder="Cari lokasi…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                runSearch();
              }
            }}
          />
          <button type="button" onClick={runSearch} disabled={searching}>
            {searching ? '…' : 'Cari'}
          </button>
        </div>
        {results.length > 0 && (
          <ul className="map-results">
            {results.map((r, i) => (
              <li key={i}>
                <button type="button" onClick={() => pick(r)}>
                  {r.display_name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div ref={containerRef} className="map-canvas" />
      {notice && <p className="map-note">{notice}</p>}
      {error && <p className="map-error">{error}</p>}
    </div>
  );
}
