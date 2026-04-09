'use client';

import { ResolvedDimension } from '@/lib/api';

export function DimensionDisplay({ dimension }: { dimension: ResolvedDimension }) {
  switch (dimension.kind) {
    case 'numeric':
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="envelope-dim-value">
            {dimension.effectiveMax != null ? `<= ${dimension.effectiveMax.toLocaleString()}` : '—'}
          </span>
        </div>
      );

    case 'set':
      return (
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {dimension.effectiveMembers?.map(m => (
            <span key={m} className="badge badge-accent">{m}</span>
          )) || <span style={{ color: 'var(--text-muted)' }}>—</span>}
        </div>
      );

    case 'boolean':
      return (
        <span className={`badge ${dimension.effectiveValue ? 'badge-deny' : 'badge-permit'}`}>
          {dimension.effectiveValue ? 'required' : 'not required'}
        </span>
      );

    case 'temporal':
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="envelope-dim-value">
            {dimension.effectiveStart || '?'} – {dimension.effectiveEnd || '?'}
          </span>
          {dimension.effectiveExpiry && (
            <span className="badge badge-muted">expires {dimension.effectiveExpiry}</span>
          )}
        </div>
      );

    case 'rate':
      return (
        <span className="envelope-dim-value">
          {dimension.effectiveRate != null ? `${dimension.effectiveRate} per ${dimension.effectiveWindow || 'period'}` : '—'}
        </span>
      );

    default:
      return <span style={{ color: 'var(--text-muted)' }}>—</span>;
  }
}
