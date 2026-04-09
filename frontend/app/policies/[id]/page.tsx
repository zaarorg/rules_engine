'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { fetchPolicies, fetchPolicyVersions } from '@/lib/api';
import type { PolicyResponse, PolicyVersionResponse } from '@/lib/api';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { Shield, Code } from '@/components/Icons';

function highlightCedar(line: string): string {
  const tokens: string[] = [];
  const re = /(\/\/.*|#.*)|((?:Action|Agent|Group|Resource)::"[^"]*")|("(?:[^"\\]|\\.)*")|\b(permit|forbid|when|unless|in|package|deny|import|true|false)\b|\b(context|principal|action|resource|input|data)\b|\b(\d+)\b|(&&|\|\||==|<=|>=|<|>|:=|\+)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line)) !== null) {
    if (m.index > last) tokens.push(escapeHtml(line.slice(last, m.index)));
    if (m[1]) tokens.push(`<span class="cedar-comment">${escapeHtml(m[1])}</span>`);
    else if (m[2]) tokens.push(`<span class="cedar-entity">${escapeHtml(m[2])}</span>`);
    else if (m[3]) tokens.push(`<span class="cedar-string">${escapeHtml(m[3])}</span>`);
    else if (m[4]) tokens.push(`<span class="cedar-keyword">${escapeHtml(m[4])}</span>`);
    else if (m[5]) tokens.push(`<span class="cedar-entity">${escapeHtml(m[5])}</span>`);
    else if (m[6]) tokens.push(`<span class="cedar-number">${escapeHtml(m[6])}</span>`);
    else if (m[7]) tokens.push(`<span class="cedar-operator">${escapeHtml(m[7])}</span>`);
    last = re.lastIndex;
  }
  if (last < line.length) tokens.push(escapeHtml(line.slice(last)));
  return tokens.join('') || '&nbsp;';
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export default function PolicyDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [policy, setPolicy] = useState<PolicyResponse | null>(null);
  const [versions, setVersions] = useState<PolicyVersionResponse[]>([]);
  const [tab, setTab] = useState<'constraints' | 'code' | 'history'>('constraints');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetchPolicies().then(policies => policies.find(p => p.id === id) || null),
      fetchPolicyVersions(id),
    ])
      .then(([p, v]) => {
        setPolicy(p);
        setVersions([...v].sort((a, b) => b.versionNumber - a.versionNumber));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><div className="loading-spinner" /></div>;
  }

  if (!policy) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Policy not found</div>;
  }

  const activeVersion = versions[0];
  const constraints = activeVersion ? (() => {
    try { return JSON.parse(activeVersion.constraints); } catch { return []; }
  })() : [];

  return (
    <div>
      <Breadcrumb crumbs={[
        { label: 'Dashboard', href: '/' },
        { label: 'Policies', href: '/policies' },
        { label: policy.name },
      ]} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 16, marginBottom: 20 }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--accent-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)' }}>
          <Shield />
        </div>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700 }}>{policy.name}</h1>
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <span className={`badge badge-${policy.domain}`}>{policy.domain}</span>
            <span className={`badge badge-${policy.effect === 'deny' ? 'deny' : 'permit'}`}>{policy.effect}</span>
            {activeVersion && (
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>
                v{activeVersion.versionNumber} #{activeVersion.cedarHash?.slice(0, 8)}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="detail-tabs">
        <button className={`detail-tab ${tab === 'constraints' ? 'active' : ''}`} onClick={() => setTab('constraints')}>Constraints</button>
        <button className={`detail-tab ${tab === 'code' ? 'active' : ''}`} onClick={() => setTab('code')}>
          <Code /> Cedar
        </button>
        <button className={`detail-tab ${tab === 'history' ? 'active' : ''}`} onClick={() => setTab('history')}>History ({versions.length})</button>
      </div>

      {tab === 'constraints' && (
        <div className="neu-panel">
          {constraints.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No constraints defined.</p>
          ) : (
            <table className="rsop-table">
              <thead>
                <tr><th>Action</th><th>Dimension</th><th>Kind</th><th>Value</th></tr>
              </thead>
              <tbody>
                {constraints.map((c: Record<string, unknown>, i: number) => (
                  <tr key={i}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{String(c.action || '')}</td>
                    <td style={{ fontWeight: 500 }}>{String(c.dimension || '')}</td>
                    <td><span className="badge badge-accent">{String(c.kind || '')}</span></td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                      {formatConstraintValue(c)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'code' && activeVersion && (
        <div className="neu-panel" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '8px 16px', borderBottom: '1px solid rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--permit)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--permit)' }} /> Valid
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>
              v{activeVersion.versionNumber}
            </span>
          </div>
          <div className="code-area">
            {activeVersion.cedarSource.split('\n').map((line, i) => (
              <div key={i} className="code-line">
                <span className="code-line-num">{i + 1}</span>
                <span dangerouslySetInnerHTML={{ __html: highlightCedar(line) }} />
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'history' && (
        <div className="timeline">
          <div className="timeline-line" />
          {versions.map((v, i) => (
            <div key={v.id} className="timeline-item">
              <div className={`timeline-dot ${i === 0 ? 'active' : 'inactive'}`} />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>Version {v.versionNumber}</span>
                  {i === 0 && <span className="badge badge-accent" style={{ marginLeft: 8 }}>active</span>}
                </div>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>
                  {v.cedarHash?.slice(0, 12)}
                </span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                {new Date(v.createdAt).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function formatConstraintValue(c: Record<string, unknown>): string {
  switch (c.kind) {
    case 'numeric': return `max ${c.max}`;
    case 'set': return Array.isArray(c.members) ? c.members.join(', ') : '—';
    case 'boolean': return String(c.value);
    case 'temporal': return `${c.start || '?'} – ${c.end || '?'}${c.expiry ? ` (exp ${c.expiry})` : ''}`;
    case 'rate': return `${c.max} per ${c.window || 'period'}`;
    default: return '—';
  }
}
