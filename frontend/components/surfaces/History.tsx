'use client';

import { useState, useEffect } from 'react';
import { PolicyResponse, PolicyVersionResponse, fetchPolicyVersions, createPolicyVersion } from '@/lib/api';
import { Clock, Hash, Undo } from '../Icons';

export function History({ policies }: { policies: PolicyResponse[] }) {
  const [selectedPolicy, setSelectedPolicy] = useState('');
  const [versions, setVersions] = useState<PolicyVersionResponse[]>([]);
  const [selectedVersion, setSelectedVersion] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedPolicy) { setVersions([]); return; }
    setLoading(true);
    fetchPolicyVersions(selectedPolicy)
      .then((v) => {
        // Sort by version number descending
        const sorted = [...v].sort((a, b) => b.versionNumber - a.versionNumber);
        setVersions(sorted);
        if (sorted.length > 0) setSelectedVersion(sorted[0].id);
      })
      .catch(() => setVersions([]))
      .finally(() => setLoading(false));
  }, [selectedPolicy]);

  const policy = policies.find((p) => p.id === selectedPolicy);
  const activeVersionId = policy?.activeVersionId;

  const handleRollback = async (version: PolicyVersionResponse) => {
    if (!selectedPolicy) return;
    try {
      await createPolicyVersion(selectedPolicy, version.cedarSource, version.constraints);
      // Reload versions
      const updated = await fetchPolicyVersions(selectedPolicy);
      const sorted = [...updated].sort((a, b) => b.versionNumber - a.versionNumber);
      setVersions(sorted);
      if (sorted.length > 0) setSelectedVersion(sorted[0].id);
    } catch (e) {
      alert('Rollback failed: ' + (e as Error).message);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 16 }}>
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
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="loading-spinner" />
        </div>
      ) : versions.length === 0 ? (
        <div className="neu-panel" style={{ textAlign: 'center', padding: 40 }}>
          <Clock />
          <div className="panel-title" style={{ marginTop: 12 }}>Version History</div>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 8 }}>
            {selectedPolicy ? 'No versions found for this policy.' : 'Select a policy to view its version history.'}
          </p>
        </div>
      ) : (
        <div style={{ flex: 1, overflow: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Clock /><span className="panel-title">Version Timeline</span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 'auto' }}>
              {versions.length} version{versions.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="timeline">
            <div className="timeline-line" />
            <div className="stagger">
              {versions.map((v) => {
                const isActive = v.id === activeVersionId;
                const isSelected = v.id === selectedVersion;
                return (
                  <div
                    key={v.id}
                    className={`timeline-item ${isSelected ? 'selected' : ''}`}
                    onClick={() => setSelectedVersion(v.id)}
                  >
                    <div className={`timeline-dot ${isActive ? 'active' : 'inactive'}`} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                      <span style={{ fontSize: 15, fontWeight: 600 }}>v{v.versionNumber}</span>
                      {isActive && <span className="badge badge-accent">ACTIVE</span>}
                      <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)' }}>
                        {new Date(v.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Hash /> {v.cedarHash ? v.cedarHash.slice(0, 12) : 'no hash'}
                      </span>
                      {!isActive && isSelected && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleRollback(v); }}
                          style={{
                            marginLeft: 'auto', color: 'var(--accent)', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: 4,
                            background: 'none', border: 'none', fontSize: 12, fontWeight: 500,
                          }}
                        >
                          <Undo /> Rollback
                        </button>
                      )}
                    </div>
                    {/* Show Cedar source preview when selected */}
                    {isSelected && (
                      <div className="diff-box" style={{ marginTop: 10 }}>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 6, fontWeight: 600 }}>
                          Cedar Source
                        </div>
                        <pre style={{ fontSize: 11, lineHeight: 1.6, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', margin: 0 }}>
                          {v.cedarSource.length > 500 ? v.cedarSource.slice(0, 500) + '...' : v.cedarSource}
                        </pre>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
