// src/components/dashboard/LiveEnergyFlow.tsx
import React, { useEffect, useState } from 'react';
import {
  Sun,
  BatteryCharging,
  Zap,
  Home,
  Factory,
  RadioTower,
  Building2,
  PlugZap,
  Activity,
} from 'lucide-react';
import { useTelemetryStore } from '@/stores/telemetry.store';

interface LiveEnergyFlowProps {
  selectedSiteId?: string | null;
  /**
   * Data realtime device terpilih (dari drawer). Saat diberikan, komponen
   * hanya memakai data device ini sebagai pengganti store global ketika
   * data realtime untuk site belum tersedia / belum dimuat.
   */
  deviceRealtime?: any;
  /**
   * Jenis/konteks beban yang dilayani untuk memilih ikon panel konsumen:
   * 'home' | 'factory' | 'tower' | 'mixed'. Default 'home'.
   */
  loadType?: 'home' | 'factory' | 'tower' | 'mixed';
  /**
   * Mode embedded: render konten diagram saja TANPA kartu luar dan header
   * hijau sendiri. Dipakai saat dirender di dalam Drawer yang sudah memiliki
   * header, agar tidak terjadi dua lapis kartu/header yang bertumpuk.
   */
  embedded?: boolean;
}

// ─── Utilitas ────────────────────────────────────────────────────────────────
const fmt = (v: number, digits = 2) =>
  v !== undefined && v !== null && isFinite(v) ? v.toFixed(digits) : '—';

// Sederhanakan nilai ke kW/W dengan satuan yang pas
const humanize = (w: number) => {
  if (!w || !isFinite(w)) return '0 W';
  const abs = Math.abs(w);
  if (abs >= 1000) return `${(w / 1000).toFixed(2)} kW`;
  return `${w.toFixed(0)} W`;
};

// ─── Kartu penampil nilai detail ─────────────────────────────────────────────
const NodeStat: React.FC<{
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  color: string;
  active?: boolean;
}> = ({ label, value, sub, icon, color, active }) => (
  <div
    className="relative flex flex-col items-center justify-center rounded-xl border px-4 py-3 text-center transition-all duration-300"
    style={{
      borderColor: active ? color : 'rgba(148,163,184,0.2)',
      background: active ? `${color}14` : 'rgba(248,250,252,0.6)',
      boxShadow: active ? `0 0 18px ${color}30` : 'none',
    }}
  >
    <div className="mb-1 transition-transform duration-300" style={{ color: active ? color : '#94a3b8' }}>
      {icon}
    </div>
    <div className="text-sm font-bold text-gray-900 dark:text-scada-text">{value}</div>
    <div className="text-[10px] text-gray-500 dark:text-scada-muted uppercase tracking-wider">{label}</div>
    {sub && active && (
      <div className="mt-0.5 text-[10px] font-medium" style={{ color }}>
        {sub}
      </div>
    )}
  </div>
);

// ─── Sistem koordinat diagram ────────────────────────────────────────────────
// Semua node & garis memakai satu sistem koordinat viewBox 0..640 x 0..360,
// sehingga garis selalu bertemu node pada lebar container berapa pun.
const VB_W = 640;
const VB_H = 360;
// Setengah ukuran kartu node (satuan viewBox) untuk menghitung titik ujung garis
const NODE_HALF_W = 62;
const NODE_HALF_H = 48;

type Pt = { x: number; y: number };

// Titik pusat tiap node pada kanvas viewBox
const NODE_CENTER: Record<'solar' | 'inverter' | 'load' | 'battery' | 'grid', Pt> = {
  solar:    { x: 140, y: 62 },
  load:     { x: 500, y: 62 },
  inverter: { x: 320, y: 180 },
  battery:  { x: 140, y: 300 },
  grid:     { x: 500, y: 300 },
};

// Titik di tepi kotak node `from` yang menghadap node `to`
const edgePt = (from: Pt, to: Pt): Pt => {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (dx === 0 && dy === 0) return { ...from };
  const tx = dx !== 0 ? Math.abs(NODE_HALF_W / dx) : Infinity;
  const ty = dy !== 0 ? Math.abs(NODE_HALF_H / dy) : Infinity;
  const s = Math.min(tx, ty, 1);
  return { x: from.x + dx * s, y: from.y + dy * s };
};

// Posisi node sebagai persentase container (agar sejajar dengan viewBox)
const nodeStyle = (center: Pt): React.CSSProperties => ({
  position: 'absolute',
  left: `${(center.x / VB_W) * 100}%`,
  top: `${(center.y / VB_H) * 100}%`,
  transform: 'translate(-50%, -50%)',
});

// ─── Garis aliran energi (dash animasi) ─────────────────────────────────────
// Garis putus-putus yang terus "mengalir" saat aktif, berubah warna sesuai arah.
// Menggunakan SVG stroke-dashoffset + CSS animation agar motion halus tanpa re-render.
const EnergyLine: React.FC<{
  from: Pt;
  to: Pt;
  active: boolean;
  color: string;
  label?: string;
  /** offset paralel (tegak lurus garis) untuk memisahkan arah bolak-balik. */
  offset?: number;
}> = ({ from, to, active, color, label, offset = 0 }) => {
  const [offsetAnim, setOffsetAnim] = useState(0);

  useEffect(() => {
    if (!active) return;
    let raf: number;
    let start: number | null = null;
    const animate = (t: number) => {
      if (start === null) start = t;
      // ~20px dash cycle @ 60fps → kecepatan aliran yang nyaman
      setOffsetAnim((t - start) / 8);
      raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [active]);

  // Ujung garis di tepi kedua node, lalu geser tegak lurus (offset) bila perlu
  const rawFrom = edgePt(from, to);
  const rawTo = edgePt(to, from);
  const rawDx = rawTo.x - rawFrom.x;
  const rawDy = rawTo.y - rawFrom.y;
  const rawLen = Math.hypot(rawDx, rawDy) || 1;
  // Normal tegak lurus (arah offset)
  const nx = -rawDy / rawLen;
  const ny = rawDx / rawLen;

  const f = { x: rawFrom.x + nx * offset, y: rawFrom.y + ny * offset };
  const t = { x: rawTo.x + nx * offset, y: rawTo.y + ny * offset };

  const dx = t.x - f.x;
  const dy = t.y - f.y;
  const len = Math.hypot(dx, dy) || 1;
  const unx = dx / len;
  const uny = dy / len;
  // Posisi titik panah di ujung (mengarah ke "to")
  const ax = t.x - unx * 9;
  const ay = t.y - uny * 9;
  // Sudut rotasi panah (dalam derajat)
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
  // Label diletakkan di tengah garis, sedikit menjauh dari sisi pasangannya
  const labelGap = offset >= 0 ? 16 : -16;
  const lx = (f.x + t.x) / 2 + nx * labelGap;
  const ly = (f.y + t.y) / 2 + ny * labelGap;

  return (
    <g>
      <line
        x1={f.x}
        y1={f.y}
        x2={t.x}
        y2={t.y}
        stroke={active ? color : '#d1d5db'}
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={active ? '10 8' : 'none'}
        strokeDashoffset={active ? -offsetAnim : 0}
        opacity={active ? 1 : 0.35}
        style={active ? { transition: 'stroke 0.3s ease' } : undefined}
      />
      {active && (
        <g transform={`translate(${ax}, ${ay}) rotate(${angle})`}>
          <polygon points="0,0 -9,-4 -9,4" fill={color} />
        </g>
      )}
      {label && (
        <text
          x={lx}
          y={ly}
          textAnchor="middle"
          fontSize="12"
          fontWeight="bold"
          fill={active ? color : '#9ca3af'}
          style={{ transition: 'fill 0.3s ease' }}
        >
          {label}
        </text>
      )}
    </g>
  );
};

// ─── Komponen utama ──────────────────────────────────────────────────────────
export const LiveEnergyFlow: React.FC<LiveEnergyFlowProps> = ({
  selectedSiteId,
  deviceRealtime,
  loadType = 'home',
  embedded = false,
}) => {
  const { realtimeData, isRealtimeLoading } = useTelemetryStore();

  // Sumber data: prioritas data device yang dipilih (drawer), fallback ke store global.
  const hasDeviceRealtime = Boolean(
    deviceRealtime && typeof deviceRealtime === 'object' && Object.keys(deviceRealtime).length > 0
  );
  const effectiveData = hasDeviceRealtime
    ? [deviceRealtime]
    : realtimeData && typeof realtimeData === 'object'
      ? Object.values(realtimeData)
      : [];

  const hasRealtimeData = hasDeviceRealtime || effectiveData.length > 0;

  // Header site/device label — dari deviceRealtime bila ada, fallback ke selectedSiteId
  const headerSiteLabel = deviceRealtime?.siteName || (selectedSiteId ? `Site ${selectedSiteId}` : 'Semua Site');
  const headerDeviceLabel = deviceRealtime?.modelName || deviceRealtime?.serialNumber || 'Device';

  // Ikon & label beban sesuai tipe konteks klien (residensial, pabrik, tower telekomunikasi)
  const loadNodeIcon =
    loadType === 'factory' ? <Factory className="w-7 h-7" />
    : loadType === 'tower'  ? <RadioTower className="w-7 h-7" />
    : loadType === 'mixed'  ? <Building2 className="w-7 h-7" />
    : <Home className="w-7 h-7" />;
  const loadNodeLabel =
    loadType === 'factory' ? 'Pabrik'
    : loadType === 'tower'  ? 'Tower Telekomunikasi'
    : loadType === 'mixed'  ? 'Beban / Campuran'
    : 'Rumah / Beban';
  const loadNodeShort =
    loadType === 'factory' ? 'Pabrik'
    : loadType === 'tower'  ? 'Tower'
    : loadType === 'mixed'  ? 'Beban'
    : 'Rumah';

  // ── Agregasi nilai dari data realtime ──
  let production = 0; // W
  let consumption = 0; // W (beban)
  let batteryCharge = 0; // W
  let batteryDischarge = 0; // W
  let batterySoc = 0;
  let socCount = 0;
  let gridExport = 0; // W → grid
  let gridImport = 0; // W ← grid
  let hasBattery = false;
  let hasGrid = false;
  let deviceCount = 0;

  Object.values(effectiveData).forEach((d: any) => {
    if (!d || typeof d !== 'object') return;
    deviceCount++;
    const p = d.power ?? {};
    const b = d.battery ?? {};
    const p_ac = Number(p.p_ac) || 0;
    const p_dc = Number(p.p_dc) || 0;

    production += p_dc > 0 ? p_dc : p_ac;
    if (Number(p.p_load) > 0) consumption += Number(p.p_load);
    if (Number(b.b_charge) > 0) { batteryCharge += Number(b.b_charge); hasBattery = true; }
    if (Number(b.b_discharge) > 0) { batteryDischarge += Number(b.b_discharge); hasBattery = true; }
    if (b.b_soc !== undefined && b.b_soc !== null) {
      batterySoc += Number(b.b_soc);
      socCount++;
      hasBattery = true;
    }
    if (Number(p.p_export) > 0) { gridExport += Number(p.p_export); hasGrid = true; }
    if (Number(p.p_import) > 0) { gridImport += Number(p.p_import); hasGrid = true; }
  });

  const avgSoc = socCount > 0 ? batterySoc / socCount : 0;

  // Aktivasi aliran (garis menyala saat ada energi yang mengalir)
  const panelToInverterActive = production > 0;
  const inverterToBatteryActive = hasBattery && batteryCharge > 0;
  const batteryToInverterActive = hasBattery && batteryDischarge > 0;
  const inverterToLoadActive = consumption > 0;
  const inverterToGridActive = gridExport > 0;
  const gridToInverterActive = gridImport > 0;
  const anyFlow = panelToInverterActive || inverterToLoadActive || inverterToBatteryActive || batteryToInverterActive;

  const solar = NODE_CENTER.solar;
  const inverter = NODE_CENTER.inverter;
  const load = NODE_CENTER.load;
  const battery = NODE_CENTER.battery;
  const grid = NODE_CENTER.grid;

  const diagram = (
    <div className="relative w-full" style={{ aspectRatio: `${VB_W} / ${VB_H}` }}>
      <svg className="absolute inset-0 w-full h-full" viewBox={`0 0 ${VB_W} ${VB_H}`} preserveAspectRatio="xMidYMid meet">
        {/* PLTS Atap → Inverter (produksi / langsung pakai) */}
        <EnergyLine from={solar} to={inverter} active={panelToInverterActive} color="#f59e0b" label={panelToInverterActive ? `${humanize(production)}` : undefined} />
        {/* Inverter → Beban (konsumsi / pemakaian) */}
        <EnergyLine from={inverter} to={load} active={inverterToLoadActive} color="#ef4444" label={inverterToLoadActive ? `${humanize(consumption)}` : undefined} />
        {/* Inverter → Battery (charging) — offset paralel, terpisah dari jalur discharging */}
        <EnergyLine from={inverter} to={battery} active={inverterToBatteryActive} color="#10b981" label={inverterToBatteryActive ? `${humanize(batteryCharge)}` : undefined} offset={14} />
        {/* Battery → Inverter (discharging) — offset arah berlawanan agar tidak menimpa charging */}
        <EnergyLine from={battery} to={inverter} active={batteryToInverterActive} color="#3b82f6" label={batteryToInverterActive ? `${humanize(batteryDischarge)}` : undefined} offset={-14} />
        {/* Inverter → Grid (export) — offset paralel */}
        <EnergyLine from={inverter} to={grid} active={inverterToGridActive} color="#a855f7" label={inverterToGridActive ? `${humanize(gridExport)}` : undefined} offset={14} />
        {/* Grid → Inverter (import) — offset arah berlawanan agar tidak menimpa export */}
        <EnergyLine from={grid} to={inverter} active={gridToInverterActive} color="#6366f1" label={gridToInverterActive ? `${humanize(gridImport)}` : undefined} offset={-14} />
      </svg>

      {/* Node — diposisikan mengikuti koordinat viewBox */}
      <div style={nodeStyle(solar)}>
        <NodeStat
          label="PLTS Atap"
          value={panelToInverterActive ? humanize(production) : '0 W'}
          icon={<Sun className="w-7 h-7" />}
          color="#f59e0b"
          active={panelToInverterActive}
        />
      </div>
      <div style={nodeStyle(inverter)}>
        <NodeStat
          label="Inverter"
          value={inverterToLoadActive || panelToInverterActive ? humanize(Math.max(consumption, production)) : '0 W'}
          icon={<Zap className="w-7 h-7" />}
          color="#10b981"
          active={inverterToLoadActive || panelToInverterActive}
        />
      </div>
      <div style={nodeStyle(load)}>
        <NodeStat
          label={loadNodeLabel}
          value={inverterToLoadActive ? humanize(consumption) : '0 W'}
          icon={loadNodeIcon}
          color="#ef4444"
          active={inverterToLoadActive}
        />
      </div>
      <div style={nodeStyle(battery)}>
        <NodeStat
          label="Battery"
          value={hasBattery ? `${fmt(avgSoc, 0)}%` : '—'}
          sub={hasBattery ? humanize(Math.max(batteryCharge, batteryDischarge)) : undefined}
          icon={<BatteryCharging className="w-7 h-7" />}
          color="#3b82f6"
          active={hasBattery}
        />
      </div>
      <div style={nodeStyle(grid)}>
        <NodeStat
          label="Grid"
          value={gridExport > 0 ? `-${humanize(gridExport)}` : gridImport > 0 ? `+${humanize(gridImport)}` : '0 W'}
          sub={hasGrid ? 'Terhubung' : 'Terputus'}
          icon={<PlugZap className="w-7 h-7" />}
          color="#a855f7"
          active={hasGrid}
        />
      </div>
    </div>
  );

  const caption = (
    <div className={`px-0 text-xs text-gray-500 dark:text-scada-muted flex items-center justify-between ${embedded ? 'mb-3' : 'pt-3 px-6'}`}>
      <span className="font-semibold text-gray-700 dark:text-scada-text">{headerDeviceLabel}</span>
      <span>{headerSiteLabel}</span>
    </div>
  );

  const legend = (
    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-scada-border">
      <p className="text-[11px] font-semibold text-gray-500 dark:text-scada-muted uppercase tracking-wider mb-2">
        Aliran Energi
      </p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-600 dark:text-scada-muted">
        <div className="flex items-center gap-2"><span className="w-4 h-0.5 rounded" style={{ background: '#f59e0b' }} /> PLTS Atap → Inverter (produksi)</div>
        <div className="flex items-center gap-2"><span className="w-4 h-0.5 rounded" style={{ background: '#ef4444' }} /> Inverter → {loadNodeShort} (konsumsi)</div>
        <div className="flex items-center gap-2"><span className="w-4 h-0.5 rounded" style={{ background: '#10b981' }} /> Inverter → Baterai (charging)</div>
        <div className="flex items-center gap-2"><span className="w-4 h-0.5 rounded" style={{ background: '#3b82f6' }} /> Baterai → Inverter (discharging)</div>
        <div className="flex items-center gap-2"><span className="w-4 h-0.5 rounded" style={{ background: '#a855f7' }} /> Inverter → Grid (export)</div>
        <div className="flex items-center gap-2"><span className="w-4 h-0.5 rounded" style={{ background: '#6366f1' }} /> Grid → Inverter (import)</div>
      </div>
    </div>
  );

  const stats = (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-4 border-t border-gray-200 dark:border-scada-border">
      <div className="text-center p-3 bg-amber-50 dark:bg-amber-900/10 rounded-lg">
        <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
          {panelToInverterActive ? humanize(production) : '—'}
        </p>
        <p className="text-xs text-gray-500 dark:text-scada-muted">Production</p>
      </div>
      <div className="text-center p-3 bg-emerald-50 dark:bg-emerald-900/10 rounded-lg">
        <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
          {hasBattery ? humanize(Math.max(batteryCharge, batteryDischarge)) : '—'}
        </p>
        <p className="text-xs text-gray-500 dark:text-scada-muted">Battery Flow</p>
      </div>
      <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/10 rounded-lg">
        <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
          {hasBattery ? `${fmt(avgSoc, 0)}%` : '—'}
        </p>
        <p className="text-xs text-gray-500 dark:text-scada-muted">Battery SOC</p>
      </div>
      <div className="text-center p-3 bg-rose-50 dark:bg-rose-900/10 rounded-lg">
        <p className="text-2xl font-bold text-rose-600 dark:text-rose-400">
          {inverterToLoadActive ? humanize(consumption) : '—'}
        </p>
        <p className="text-xs text-gray-500 dark:text-scada-muted">Consumption</p>
      </div>
    </div>
  );

  const gridDetail = hasGrid ? (
    <div className="mt-3 grid grid-cols-2 gap-3">
      <div className="flex items-center justify-between px-3 py-2 bg-purple-50 dark:bg-purple-900/10 rounded-lg">
        <span className="text-xs text-gray-500 dark:text-scada-muted">Export ke Grid</span>
        <span className="text-sm font-bold text-purple-600 dark:text-purple-400">{gridExport > 0 ? humanize(gridExport) : '0 W'}</span>
      </div>
      <div className="flex items-center justify-between px-3 py-2 bg-indigo-50 dark:bg-indigo-900/10 rounded-lg">
        <span className="text-xs text-gray-500 dark:text-scada-muted">Import dari Grid</span>
        <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">{gridImport > 0 ? humanize(gridImport) : '0 W'}</span>
      </div>
    </div>
  ) : null;

  const emptyState = (!hasRealtimeData && !isRealtimeLoading) ? (
    <div className="mt-4 text-center text-gray-500 dark:text-scada-muted py-6">
      <p className="text-sm">Menunggu data real-time...</p>
      <p className="text-xs mt-1">Data akan muncul ketika device online</p>
    </div>
  ) : null;

  const cardHeader = (
    <div className="px-6 py-4 border-b border-gray-200 dark:border-scada-border bg-gradient-to-r from-green-600 to-emerald-700">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold text-white tracking-wider uppercase flex items-center gap-2">
          <Zap className="w-4 h-4" />
          Live Energy Flow
        </h3>
        <span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-white/90">
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: anyFlow ? '#4ade80' : '#fca5a5' }}
          />
          {anyFlow ? 'Mengalir' : 'Tidak Ada Aliran'}
        </span>
      </div>
    </div>
  );

  // Loading state — tanpa header ganda bila embedded
  if (!hasDeviceRealtime && !hasRealtimeData && isRealtimeLoading) {
    if (embedded) {
      return (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-scada-600 mx-auto mb-4" />
          <p className="text-sm text-gray-500 dark:text-scada-muted">Memuat data real-time...</p>
        </div>
      );
    }
    return (
      <div className="bg-white dark:bg-scada-card rounded-xl shadow-sm border border-gray-200 dark:border-scada-border overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-scada-border bg-gradient-to-r from-green-600 to-emerald-700">
          <h3 className="text-xs font-bold text-white tracking-wider uppercase flex items-center gap-2">
            <Activity className="w-4 h-4 animate-spin" />
            Live Energy Flow
          </h3>
        </div>
        <div className="p-6">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-scada-600 mx-auto mb-4" />
            <p className="text-sm text-gray-500 dark:text-scada-muted">Memuat data real-time...</p>
          </div>
        </div>
      </div>
    );
  }

  if (embedded) {
    return (
      <div className="w-full">
        {caption}
        {diagram}
        {legend}
        {stats}
        {gridDetail}
        {emptyState}
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-scada-card rounded-xl shadow-sm border border-gray-200 dark:border-scada-border overflow-hidden">
      {cardHeader}
      {caption}
      <div className="p-6 pt-2">
        {diagram}
        {legend}
        {stats}
        {gridDetail}
        {emptyState}
      </div>
    </div>
  );
};

export default LiveEnergyFlow;
