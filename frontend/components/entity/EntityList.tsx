'use client';

import { useState } from 'react';
import Link from 'next/link';

interface Column<T> {
  key: string;
  label: string;
  render: (item: T) => React.ReactNode;
}

interface EntityListProps<T> {
  items: T[];
  columns: Column<T>[];
  getHref: (item: T) => string;
  getId: (item: T) => string;
  searchKeys: (item: T) => string;
}

export function EntityList<T>({ items, columns, getHref, getId, searchKeys }: EntityListProps<T>) {
  const [search, setSearch] = useState('');

  const filtered = search.trim()
    ? items.filter(item => searchKeys(item).toLowerCase().includes(search.toLowerCase()))
    : items;

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Filter..."
          className="entity-search"
        />
      </div>
      <table className="rsop-table">
        <thead>
          <tr>
            {columns.map(col => (
              <th key={col.key}>{col.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filtered.map(item => (
            <tr key={getId(item)} style={{ cursor: 'pointer' }}>
              {columns.map((col, i) => (
                <td key={col.key}>
                  {i === 0 ? (
                    <Link href={getHref(item)} style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>
                      {col.render(item)}
                    </Link>
                  ) : (
                    col.render(item)
                  )}
                </td>
              ))}
            </tr>
          ))}
          {filtered.length === 0 && (
            <tr>
              <td colSpan={columns.length} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>
                No results found
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
