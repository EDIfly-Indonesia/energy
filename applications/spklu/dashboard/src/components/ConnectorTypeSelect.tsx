import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { CONNECTOR_TYPES, connectorTypeInfo } from '../connectorTypes';
import ConnectorIcon from './ConnectorIcon';

// Ikon per tipe konektor memakai file SVG sendiri di src/assets/icons
// (direkonstruksi dari referensi PNG di public/assets/images), karena Lucide
// tidak punya ikon konektor AC/DC. <option> pada <select> native tidak bisa
// memuat SVG, jadi daftar tipe dirender sebagai dropdown kustom.

// Nilai opsi dalam urutan tampil; '' = placeholder "Pilih Tipe".
const OPTION_VALUES = ['', ...CONNECTOR_TYPES.map((t) => t.value)];

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Tampilkan jenis arus & kecepatan di tiap pilihan. */
  detailed?: boolean;
  disabled?: boolean;
}

interface Rect {
  top: number;
  left: number;
  width: number;
}

export default function ConnectorTypeSelect({
  value,
  onChange,
  placeholder = 'Pilih Tipe',
  detailed = true,
  disabled = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState<Rect | null>(null);
  // Indeks opsi yang disorot keyboard (aria-activedescendant).
  const [activeIndex, setActiveIndex] = useState(0);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  // true selama navigasi keyboard: hover mouse tidak boleh menimpa sorotan.
  const keyboardNav = useRef(false);
  // true bila interaksi klik berikutnya harus ditelan (agar Modal tidak ikut tertutup).
  const swallowRef = useRef(false);

  const selected = connectorTypeInfo(value);
  // Nilai lama di luar daftar tetap ditampilkan apa adanya agar tidak terlihat
  // kosong (dan tidak hilang saat disimpan).
  const legacy = value !== '' && !selected ? value : '';

  // Posisi fixed dihitung dari trigger supaya menu tidak terpotong oleh
  // overflow-y-auto milik modal / tabel.
  useLayoutEffect(() => {
    if (!open || !btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    setRect({ top: r.bottom + 4, left: r.left, width: Math.max(r.width, 260) });
  }, [open]);

  // Saat dibuka, sorot opsi yang sedang terpilih (atau placeholder).
  useEffect(() => {
    if (!open) return;
    const idx = OPTION_VALUES.indexOf(value);
    setActiveIndex(idx >= 0 ? idx : 0);
  }, [open, value]);

  // Pastikan opsi aktif tetap terlihat saat digerakkan dengan panah.
  useEffect(() => {
    if (!open || !menuRef.current) return;
    const el = menuRef.current.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [open, activeIndex]);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      const t = e.target as Node;
      if (btnRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
      // Klik di luar menu hanya menutup menu, TIDAK ikut menutup Modal induk
      // (kalau tidak, form yang sedang diisi ikut hilang). Interaksi pertama
      // setelahnya "ditelan" oleh listener di effect bawah.
      swallowRef.current = true;
      window.setTimeout(() => {
        swallowRef.current = false;
      }, 400);
    }
    function onKey(e: KeyboardEvent) {
      // Escape ditangani di trigger (stopPropagation) supaya Modal tidak ikut
      // tertutup. Ini jaring pengaman bila fokus ada di dalam menu.
      if (e.key === 'Escape') {
        e.stopPropagation();
        setOpen(false);
        btnRef.current?.focus();
      }
    }
    // Menu berposisi fixed: tutup saat halaman bergulir agar tidak melayang.
    function onScroll() {
      setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick, true);
    document.addEventListener('keydown', onKey, true);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);
    return () => {
      document.removeEventListener('mousedown', onDocClick, true);
      document.removeEventListener('keydown', onKey, true);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
    };
  }, [open]);

  // Listener "penelan" dipasang sekali (bukan per-open) supaya tetap hidup
  // setelah menu ditutup — cleanup effect di atas akan menghapusnya bila
  // didaftarkan di sana.
  useEffect(() => {
    function onSwallow(e: Event) {
      if (!swallowRef.current) return;
      swallowRef.current = false;
      e.stopPropagation();
      e.preventDefault();
    }
    document.addEventListener('mousedown', onSwallow, true);
    document.addEventListener('click', onSwallow, true);
    return () => {
      document.removeEventListener('mousedown', onSwallow, true);
      document.removeEventListener('click', onSwallow, true);
    };
  }, []);

  function choose(v: string) {
    onChange(v);
    setOpen(false);
    btnRef.current?.focus();
  }

  function moveActive(delta: number) {
    keyboardNav.current = true;
    setActiveIndex((i) => {
      const next = i + delta;
      if (next < 0) return OPTION_VALUES.length - 1;
      if (next >= OPTION_VALUES.length) return 0;
      return next;
    });
  }

  // Hover hanya mengubah sorotan bila pengguna benar-benar menggerakkan mouse.
  // `onMouseEnter` sengaja TIDAK dipakai: saat menu baru terbuka tepat di bawah
  // kursor, event enter ikut terpicu dan menimpa sorotan hasil navigasi keyboard.
  function onItemMouseMove(index: number) {
    keyboardNav.current = false;
    if (activeIndex !== index) setActiveIndex(index);
  }

  function onTriggerKeyDown(e: React.KeyboardEvent<HTMLButtonElement>) {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (!open) {
          keyboardNav.current = true;
          setOpen(true);
        } else moveActive(1);
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (!open) {
          keyboardNav.current = true;
          setOpen(true);
        } else moveActive(-1);
        break;
      case 'Home':
        if (!open) return;
        e.preventDefault();
        keyboardNav.current = true;
        setActiveIndex(0);
        break;
      case 'End':
        if (!open) return;
        e.preventDefault();
        keyboardNav.current = true;
        setActiveIndex(OPTION_VALUES.length - 1);
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (!open) {
          keyboardNav.current = true;
          setOpen(true);
        } else choose(OPTION_VALUES[activeIndex]);
        break;
      case 'Escape':
        if (!open) return;
        // Hentikan di sini agar Modal tidak ikut tertutup.
        e.preventDefault();
        e.stopPropagation();
        setOpen(false);
        break;
      case 'Tab':
        if (open) setOpen(false);
        break;
      default:
        break;
    }
  }

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className="cts-trigger"
        onClick={() => setOpen((o) => !o)}
        onKeyDown={onTriggerKeyDown}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-activedescendant={open ? `cts-opt-${activeIndex}` : undefined}
        title={selected?.keterangan ?? placeholder}
      >
        <span className="cts-trigger-label">
          <ConnectorIcon value={value} size={20} className="cts-muted" />
          <span>{selected ? selected.value : legacy || placeholder}</span>
        </span>
        <ChevronDown size={14} className="cts-chevron" />
      </button>

      {open && rect && (
        <div
          ref={menuRef}
          className="cts-menu"
          role="listbox"
          style={{ top: rect.top, left: rect.left, width: rect.width }}
        >
          <button
            type="button"
            id="cts-opt-0"
            data-index={0}
            role="option"
            tabIndex={-1}
            aria-selected={value === ''}
            className={`cts-item${value === '' ? ' is-active' : ''}${activeIndex === 0 ? ' is-highlighted' : ''}`}
            onMouseMove={() => onItemMouseMove(0)}
            onClick={() => choose('')}
          >
            <span className="cts-icon">
              <ConnectorIcon value="" size={24} className="cts-muted" />
            </span>
            <span className="cts-text">
              <strong>— Pilih Tipe —</strong>
            </span>
          </button>

          {CONNECTOR_TYPES.map((t, i) => {
            const index = i + 1;
            return (
              <button
                key={t.value}
                type="button"
                id={`cts-opt-${index}`}
                data-index={index}
                role="option"
                tabIndex={-1}
                aria-selected={value === t.value}
                className={`cts-item${value === t.value ? ' is-active' : ''}${activeIndex === index ? ' is-highlighted' : ''}`}
                onMouseMove={() => onItemMouseMove(index)}
                onClick={() => choose(t.value)}
              >
                <span className="cts-icon">
                  <ConnectorIcon value={t.value} size={24} />
                </span>
                <span className="cts-text">
                  <strong>{t.value}</strong>
                  {detailed && <small>{t.ringkas}</small>}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </>
  );
}
