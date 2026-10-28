import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Search } from 'lucide-react';

export interface Column<T> {
  header: string;
  render: (row: T) => ReactNode;
  // Nilai teks/angka polos untuk pencarian & pengurutan (opsional).
  value?: (row: T) => string | number;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  rowKey: (row: T, index: number) => string | number;
  searchPlaceholder?: string;
  pageSize?: number;
}

export default function DataTable<T>({
  columns,
  data,
  rowKey,
  searchPlaceholder = 'Cari…',
  pageSize = 10,
}: DataTableProps<T>) {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<number | null>(null);
  const [sortDesc, setSortDesc] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let rows = data;
    if (q) {
      rows = data.filter((row) =>
        columns.some((c) => {
          const v = c.value ? c.value(row) : String(c.render(row) ?? '');
          return String(v).toLowerCase().includes(q);
        })
      );
    }
    if (sortKey != null) {
      const col = columns[sortKey];
      rows = [...rows].sort((a, b) => {
        const va = col.value ? col.value(a) : String(col.render(a) ?? '');
        const vb = col.value ? col.value(b) : String(col.render(b) ?? '');
        const na = typeof va === 'number' ? va : String(va).toLowerCase();
        const nb = typeof vb === 'number' ? vb : String(vb).toLowerCase();
        if (na < nb) return sortDesc ? 1 : -1;
        if (na > nb) return sortDesc ? -1 : 1;
        return 0;
      });
    }
    return rows;
  }, [data, query, columns, sortKey, sortDesc]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const pageRows = filtered.slice(start, start + pageSize);

  function toggleSort(i: number) {
    if (sortKey === i) setSortDesc((d) => !d);
    else {
      setSortKey(i);
      setSortDesc(false);
    }
    setPage(1);
  }

  return (
    <div className="datatable">
      <div className="dt-toolbar">
        <div className="dt-search">
          <Search size={16} />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder={searchPlaceholder}
          />
        </div>
        <span className="dt-count">{filtered.length} data</span>
      </div>

      <table>
        <thead>
          <tr>
            {columns.map((c, i) => (
              <th
                key={i}
                className={c.value ? 'sortable' : ''}
                onClick={c.value ? () => toggleSort(i) : undefined}
              >
                {c.header}
                {sortKey === i && (sortDesc ? ' ▲' : ' ▼')}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {pageRows.map((row, i) => (
            <tr key={rowKey(row, i)}>
              {columns.map((c, j) => (
                <td key={j}>{c.render(row)}</td>
              ))}
            </tr>
          ))}
          {pageRows.length === 0 && (
            <tr>
              <td colSpan={columns.length}>Tidak ada data</td>
            </tr>
          )}
        </tbody>
      </table>

      {totalPages > 1 && (
        <div className="dt-pagination">
          <button
            type="button"
            className="ghost"
            disabled={safePage <= 1}
            onClick={() => setPage(safePage - 1)}
          >
            ‹ Sebelumnya
          </button>
          <span>
            Halaman {safePage} / {totalPages}
          </span>
          <button
            type="button"
            className="ghost"
            disabled={safePage >= totalPages}
            onClick={() => setPage(safePage + 1)}
          >
            Berikutnya ›
          </button>
        </div>
      )}
    </div>
  );
}
