'use client';

import { useState, useEffect } from 'react';
import { PolicyResponse, PolicyVersionResponse, fetchPolicyVersions, createPolicyVersion } from '@/lib/api';
import { Code, Check } from '../Icons';

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

export function CodeEditor({ policies, selectedPolicyId }: { policies: PolicyResponse[]; selectedPolicyId: string | null }) {
  const [versions, setVersions] = useState<PolicyVersionResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPolicy, setSelectedPolicy] = useState<string>(selectedPolicyId || '');
  const [editMode, setEditMode] = useState(false);
  const [editSource, setEditSource] = useState('');

  useEffect(() => {
    if (selectedPolicyId) setSelectedPolicy(selectedPolicyId);
  }, [selectedPolicyId]);

  useEffect(() => {
    if (!selectedPolicy) { setVersions([]); return; }
    setLoading(true);
    fetchPolicyVersions(selectedPolicy)
      .then(setVersions)
      .catch(() => setVersions([]))
      .finally(() => setLoading(false));
  }, [selectedPolicy]);

  const activeVersion = versions.length > 0 ? versions[versions.length - 1] : null;
  const cedarSource = activeVersion?.cedarSource || '';

  const handleSave = async () => {
    if (!selectedPolicy || !editSource.trim()) return;
    try {
      await createPolicyVersion(selectedPolicy, editSource);
      const updated = await fetchPolicyVersions(selectedPolicy);
      setVersions(updated);
      setEditMode(false);
    } catch (e) {
      alert('Failed to save: ' + (e as Error).message);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Policy selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span className="field-label" style={{ marginBottom: 0 }}>Policy</span>
        <select
          value={selectedPolicy}
          onChange={(e) => setSelectedPolicy(e.target.value)}
          className="neu-select"
          style={{ flex: 1 }}
        >
          <option value="">Select a policy...</option>
          {policies.map((p) => (
            <option key={p.id} value={p.id}>{p.name} ({p.domain})</option>
          ))}
        </select>
      </div>

      {/* Editor panel */}
      <div className="neu-panel" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 400 }}>
        <div style={{ display: 'flex', alignItems: 'center', padding: '8px 12px', gap: 12 }}>
          <div style={{ display: 'flex', gap: 4 }}>
            <button className="code-tab active"><Code /> Cedar</button>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
            {activeVersion && (
              <>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--permit)', fontWeight: 500 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--permit)' }} /> Valid
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>
                  v{activeVersion.versionNumber} {activeVersion.cedarHash ? `#${activeVersion.cedarHash.slice(0, 8)}` : ''}
                </span>
              </>
            )}
            {!editMode ? (
              <button className="neu-btn neu-btn-ghost" style={{ padding: '6px 14px', fontSize: 12 }}
                onClick={() => { setEditMode(true); setEditSource(cedarSource); }}
                disabled={!selectedPolicy}
              >Edit</button>
            ) : (
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="neu-btn neu-btn-primary" style={{ padding: '6px 14px', fontSize: 12 }}
                  onClick={handleSave}>Save</button>
                <button className="neu-btn neu-btn-ghost" style={{ padding: '6px 14px', fontSize: 12 }}
                  onClick={() => setEditMode(false)}>Cancel</button>
              </div>
            )}
          </div>
        </div>

        {loading ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="loading-spinner" />
          </div>
        ) : editMode ? (
          <textarea
            value={editSource}
            onChange={(e) => setEditSource(e.target.value)}
            style={{
              flex: 1, padding: 16, fontFamily: 'var(--font-mono)', fontSize: 13,
              lineHeight: 1.8, background: 'var(--surface-high)', border: 'none',
              outline: 'none', resize: 'none', color: 'var(--text-primary)',
              boxShadow: 'var(--neu-surface-inset)',
            }}
          />
        ) : cedarSource ? (
          <div className="code-area">
            {cedarSource.split('\n').map((line, i) => (
              <div key={i} className="code-line">
                <span className="code-line-num">{i + 1}</span>
                <span dangerouslySetInnerHTML={{ __html: highlightCedar(line) }} />
              </div>
            ))}
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
            <div style={{ textAlign: 'center' }}>
              <Code />
              <p style={{ marginTop: 8 }}>Select a policy to view its Cedar source.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
