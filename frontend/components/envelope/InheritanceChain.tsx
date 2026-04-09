'use client';

import { DimensionSource } from '@/lib/api';

const levelOrder: Record<string, number> = { org: 0, department: 1, team: 2, agent: 3 };

export function InheritanceChain({ sources }: { sources: DimensionSource[] }) {
  if (sources.length === 0) return null;

  const sorted = [...sources].sort((a, b) => (levelOrder[a.level] ?? 99) - (levelOrder[b.level] ?? 99));
  const lastIndex = sorted.length - 1;

  return (
    <div className="inheritance-chain">
      {sorted.map((source, i) => (
        <div key={i}>
          {i > 0 && <div className="chain-connector" />}
          <div className={`chain-node ${i === lastIndex ? 'binding' : ''}`}>
            <span className={`badge badge-${source.level}`} style={{ fontSize: 9, padding: '0 5px' }}>
              {source.level}
            </span>
            <span style={{ fontSize: 11 }}>{source.groupName || 'direct'}</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)', marginLeft: 'auto' }}>
              {source.value}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
