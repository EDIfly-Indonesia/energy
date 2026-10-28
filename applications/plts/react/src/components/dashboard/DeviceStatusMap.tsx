// src/components/dashboard/DeviceStatusMap.tsx
// src/components/dashboard/DeviceStatusMap.tsx
import React, { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { divIcon } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import MarkerClusterGroup from 'react-leaflet-markercluster';
import devicesApi from '@/api/modules/devices';

// Extend Leaflet Marker options to include status
declare module 'leaflet' {
  interface MarkerOptions {
    status?: string;
  }
}

interface Device {
  id: string;
  serialNumber?: string;
  status?: string;
  site?: {
    id: string;
    name: string;
    latitude?: string;
    longitude?: string;
    tenant?: { name: string };
    capacityKwp?: string;
  };
}

interface DeviceStatusMapProps {
  selectedSiteId?: string | null;
}

const STATUS_COLOR: Record<string, { bg: string; border: string; label: string }> = {
  ONLINE:      { bg: '#10b981', border: '#059669', label: 'Online' },
  OFFLINE:     { bg: '#ef4444', border: '#dc2626', label: 'Offline' },
  MAINTENANCE: { bg: '#f59e0b', border: '#d97706', label: 'Maintenance' },
};

const getStatusColor = (status?: string) => {
  return STATUS_COLOR[status || 'OFFLINE'] || STATUS_COLOR.OFFLINE;
};

const deviceIcon = (status?: string): L.DivIcon => {
  const { bg, border } = getStatusColor(status);
  return divIcon({
    html: `<div style="background:${bg};border:2px solid ${border};" class="w-5 h-5 rounded-full shadow-md"></div>`,
    className: 'device-marker-icon',
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  }) as unknown as L.DivIcon;
};

const clusterIconFn = (cluster: any): L.DivIcon => {
  let online = 0;
  let offline = 0;
  let maintenance = 0;

  cluster.getAllChildMarkers().forEach((child: any) => {
    const s = child.options.status || 'OFFLINE';
    if (s === 'ONLINE') online++;
    else if (s === 'MAINTENANCE') maintenance++;
    else offline++;
  });

  let dominantColor = STATUS_COLOR.OFFLINE.bg;
  if (online >= offline && online >= maintenance) dominantColor = STATUS_COLOR.ONLINE.bg;
  else if (offline > online && offline >= maintenance) dominantColor = STATUS_COLOR.OFFLINE.bg;
  else dominantColor = STATUS_COLOR.MAINTENANCE.bg;

  const ratioParts = [];
  if (online > 0) ratioParts.push(online.toString());
  if (offline > 0) ratioParts.push(offline.toString());
  if (maintenance > 0) ratioParts.push(maintenance.toString());
  const ratioText = ratioParts.join('/');

  return divIcon({
    html: `
      <div class="relative flex items-center justify-center w-12 h-12">
        <div style="background:${dominantColor};" class="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold shadow-lg text-sm">
          ${ratioText}
        </div>
      </div>
    `,
    className: 'cluster-icon',
    iconSize: [48, 48],
    iconAnchor: [24, 24],
  }) as unknown as L.DivIcon;
};

const DeviceStatusMapInner: React.FC<{
  selectedSiteId?: string | null;
  onDevicesChange?: (devices: Device[]) => void;
}> = ({ selectedSiteId, onDevicesChange }) => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const mapInstance = useMap();

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const res = await devicesApi.getDevices({ siteId: selectedSiteId || undefined });
        const data: Device[] = res.data?.data || res.data || [];
        setDevices(data);
        onDevicesChange?.(data);

        setTimeout(() => {
          mapInstance.eachLayer((layer: any) => {
            if (layer && typeof layer.refreshClusters === 'function') {
              layer.refreshClusters();
            }
          });
          mapInstance.invalidateSize();
        }, 500);
      } catch (error) {
        console.error('Error loading:', error);
        setDevices([]);
        onDevicesChange?.([]);
      } finally {
        setLoading(false);
      }
    };

    loadData();
    const interval = setInterval(loadData, 120000);
    return () => clearInterval(interval);
  }, [selectedSiteId, mapInstance]);

  const validDevices = useMemo(() => {
    return devices.filter((d) => {
      const lat = parseFloat(d.site?.latitude || '0');
      const lng = parseFloat(d.site?.longitude || '0');
      return !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0;
    });
  }, [devices]);

  return (
    <MarkerClusterGroup
      chunkedLoading
      iconCreateFunction={clusterIconFn}
      key={validDevices.length}
    >
      {validDevices.map((device) => {
        const lat = parseFloat(device.site?.latitude || '0');
        const lng = parseFloat(device.site?.longitude || '0');
        const status = device.status || 'OFFLINE';

        return (
          <Marker
            key={device.id}
            position={[lat, lng]}
            icon={deviceIcon(status)}
            status={status}
          >
            <Popup>
              <div className="text-sm min-w-[200px] p-1">
                <div className="border-b border-gray-200 pb-1 mb-2">
                  <span className="font-semibold text-gray-500 text-xs">SN-{device.serialNumber}</span>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Tenant:</span>
                    <span className="font-medium">{device.site?.tenant?.name || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Status:</span>
                    <span className="font-medium" style={{ color: getStatusColor(status).bg }}>
                      {status}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Site:</span>
                    <span className="font-medium">{device.site?.name || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Capacity:</span>
                    <span className="font-medium">{device.site?.capacityKwp || 'N/A'} kWp</span>
                  </div>
                </div>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MarkerClusterGroup>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
export const DeviceStatusMap: React.FC<DeviceStatusMapProps> = ({ selectedSiteId }) => {
  const [deviceCounts, setDeviceCounts] = useState({ online: 0, offline: 0, maintenance: 0 });
  const [totalDevices, setTotalDevices] = useState(0);

  // Fetch device counts for legend (separate from map markers)
  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const res = await devicesApi.getDevices({ siteId: selectedSiteId || undefined });
        const devices = res.data?.data || res.data || [];
        const online = devices.filter(d => d.status === 'ONLINE').length;
        const offline = devices.filter(d => d.status === 'OFFLINE').length;
        const maintenance = devices.filter(d => d.status === 'MAINTENANCE').length;
        setDeviceCounts({ online, offline, maintenance });
        setTotalDevices(devices.length);
      } catch (error) {
        console.error('Error fetching device counts:', error);
      }
    };

    fetchCounts();
    const interval = setInterval(fetchCounts, 60000);
    return () => clearInterval(interval);
  }, [selectedSiteId]);

  return (
    <div className="rounded-lg shadow overflow-hidden h-[400px]">
      <div className="bg-white px-3 py-2 border-b flex items-center justify-between text-xs">
        <div className="flex items-center gap-4">
          <span className="font-medium text-gray-500">Status:</span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full" style={{ background: STATUS_COLOR.ONLINE.bg }}></span> Online ({deviceCounts.online})
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full" style={{ background: STATUS_COLOR.OFFLINE.bg }}></span> Offline ({deviceCounts.offline})
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full" style={{ background: STATUS_COLOR.MAINTENANCE.bg }}></span> Maintenance ({deviceCounts.maintenance})
          </span>
        </div>
        <span className="text-gray-500">Showing {totalDevices} devices</span>
      </div>

      <MapContainer center={[-2.214843, 113.861659]} zoom={5} style={{ height: 'calc(100% - 36px)', width: '100%' }} className="relative z-0">
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <DeviceStatusMapInner selectedSiteId={selectedSiteId} onDevicesChange={(d) => {
            const online = d.filter(x => x.status === 'ONLINE').length;
            const offline = d.filter(x => x.status === 'OFFLINE').length;
            const maintenance = d.filter(x => x.status === 'MAINTENANCE').length;
            setDeviceCounts({ online, offline, maintenance });
            setTotalDevices(d.length);
        }} />
      </MapContainer>
    </div>
  );
};

export default DeviceStatusMap;