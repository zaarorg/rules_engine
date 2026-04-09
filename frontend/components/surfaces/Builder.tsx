'use client';

import { useState, useEffect } from 'react';
import { PolicyResponse, PolicyVersionResponse, fetchPolicyVersions, createPolicyVersion } from '@/lib/api';
import { Shield, Lock, Check } from '../Icons';

export function Builder({ policies }: { policies: PolicyResponse[] }) {
  const [selectedPolicy, setSelectedPolicy] = useState('');
  const [versions, setVersions] = useState<PolicyVersionResponse[]>([]);
  const [loading, setLoading] = useState(false);

  // Constraint editing state
  const [constraints, setConstraints] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!selectedPolicy) { setVersions([]); setConstraints({}); return; }
    setLoading(true);
    fetchPolicyVersions(selectedPolicy)
      .then((v) => {
        const sorted = [...v].sort((a, b) => b.versionNumber - a.versionNumber);
        setVersions(sorted);
        if (sorted[0]) {
          try {
            const parsed = JSON.parse(sorted[0].constraints);
            setConstraints(typeof parsed === 'object' && parsed !== null ? parsed : {});
          } catch {
            setConstraints({});
          }
        }
      })
      .catch(() => setVersions([]))
      .finally(() => setLoading(false));
  }, [selectedPolicy]);

  const activeVersion = versions[0];
  const policy = policies.find((p) => p.id === selectedPolicy);

  const handleSave = async () => {
    if (!selectedPolicy || !activeVersion) return;
    setSaving(true);
    try {
      await createPolicyVersion(selectedPolicy, activeVersion.cedarSource, JSON.stringify(constraints));
      const updated = await fetchPolicyVersions(selectedPolicy);
      const sorted = [...updated].sort((a, b) => b.versionNumber - a.versionNumber);
      setVersions(sorted);
    } catch (e) {
      alert('Save failed: ' + (e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (!selectedPolicy) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
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
        <div className="neu-panel" style={{ textAlign: 'center', padding: 40 }}>
          <Shield />
          <div className="panel-title" style={{ marginTop: 12 }}>Structured Builder</div>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 8 }}>
            Select a policy to view and edit its structured constraints.
          </p>
        </div>
      </div>
    );
  }

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

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
          <div className="loading-spinner" />
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {/* Left panel: Policy info (read-only) */}
          <div className="neu-panel">
            <div className="panel-header">
              <Lock />
              <span className="panel-title">Policy Details</span>
              <span className="badge badge-muted">read-only</span>
            </div>
            {policy && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Name</div>
                  <div style={{ fontSize: 15, fontWeight: 600, marginTop: 4 }}>{policy.name}</div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Domain</div>
                    <div style={{ marginTop: 4 }}><span className={`badge badge-${policy.domain}`}>{policy.domain}</span></div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Effect</div>
                    <div style={{ marginTop: 4 }}><span className={`badge badge-${policy.effect === 'deny' ? 'deny' : 'permit'}`}>{policy.effect}</span></div>
                  </div>
                </div>
                {activeVersion && (
                  <div style={{
                    background: 'var(--surface)', boxShadow: 'var(--neu-surface-inset)',
                    borderRadius: 'var(--radius-md)', padding: 14, marginTop: 8,
                  }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
                      Active Version
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 500 }}>Version</div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--accent)', fontWeight: 500 }}>v{activeVersion.versionNumber}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 500 }}>Hash</div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--accent)', fontWeight: 500 }}>
                          {activeVersion.cedarHash ? activeVersion.cedarHash.slice(0, 12) : '--'}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {/* Cedar source preview */}
                {activeVersion && (
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>
                      Cedar Source Preview
                    </div>
                    <pre style={{
                      background: 'var(--surface-high)', borderRadius: 'var(--radius-md)',
                      padding: 12, fontSize: 11, fontFamily: 'var(--font-mono)',
                      lineHeight: 1.6, color: 'var(--text-secondary)',
                      boxShadow: 'var(--neu-surface-inset-sm)',
                      whiteSpace: 'pre-wrap', maxHeight: 200, overflow: 'auto',
                    }}>
                      {activeVersion.cedarSource.length > 400
                        ? activeVersion.cedarSource.slice(0, 400) + '...'
                        : activeVersion.cedarSource}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right panel: Constraints editor */}
          <div className="neu-panel" style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 600 }}>Constraints</span>
                <span className="badge badge-accent">editable</span>
              </div>
              <button
                className="neu-btn neu-btn-primary"
                onClick={handleSave}
                disabled={saving || !activeVersion}
                style={{ padding: '8px 16px' }}
              >
                {saving ? 'Saving...' : 'Save Version'}
              </button>
            </div>
            <div style={{ flex: 1 }}>
              <span className="field-label">Constraints JSON</span>
              <textarea
                value={JSON.stringify(constraints, null, 2)}
                onChange={(e) => {
                  try {
                    setConstraints(JSON.parse(e.target.value));
                  } catch {
                    // Allow invalid JSON during editing
                  }
                }}
                className="neu-input"
                style={{
                  width: '100%', minHeight: 300, fontFamily: 'var(--font-mono)',
                  fontSize: 12, lineHeight: 1.6, resize: 'vertical',
                }}
              />
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
                Edit the JSON constraints for this policy. Saving creates a new immutable version.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
