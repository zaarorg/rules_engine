'use client';

import { useState, useEffect } from 'react';
import { AgentResponse, PolicyResponse, GroupResponse, AssignmentResponse, fetchPolicies, fetchGroups } from '@/lib/api';
import { Layers, Shield } from '../Icons';

interface RsopRow {
  level: string;
  source: string;
  policy: string;
  effect: string;
  domain: string;
}

export function RsopView({
  agents,
  policies,
  groups,
}: {
  agents: AgentResponse[];
  policies: PolicyResponse[];
  groups: GroupResponse[];
}) {
  const [selectedAgent, setSelectedAgent] = useState('');
  const [rsopRows, setRsopRows] = useState<RsopRow[]>([]);

  // Build a simplified RSoP view from policies and their assignments
  // In Phase 1, we don't have a server-side RSoP endpoint, so we derive it client-side
  useEffect(() => {
    if (!selectedAgent) { setRsopRows([]); return; }

    // For Phase 1, show all policies as they apply at the org level
    // Real RSoP resolution (via ltree hierarchy) is Phase 2
    const rows: RsopRow[] = policies.map((p) => {
      // Find which group this policy is most relevant to
      const groupNames = groups.reduce<Record<string, string>>((acc, g) => {
        acc[g.id] = g.name;
        return acc;
      }, {});

      return {
        level: 'org',
        source: 'Acme Corp',
        policy: p.name,
        effect: p.effect,
        domain: p.domain,
      };
    });

    setRsopRows(rows);
  }, [selectedAgent, policies, groups]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 16 }}>
      {/* Agent selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span className="field-label" style={{ marginBottom: 0 }}>Agent</span>
        <select
          value={selectedAgent}
          onChange={(e) => setSelectedAgent(e.target.value)}
          className="neu-select"
          style={{ flex: 1 }}
        >
          <option value="">Select agent to view RSoP...</option>
          {agents.map((a) => (
            <option key={a.id} value={a.id}>{a.name} ({a.domain})</option>
          ))}
        </select>
      </div>

      {/* RSoP table */}
      <div className="neu-panel" style={{ flex: 1, overflow: 'auto', padding: '12px 16px' }}>
        {rsopRows.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
            <Layers />
            <p style={{ marginTop: 8 }}>Select an agent to see their resolved policy set.</p>
          </div>
        ) : (
          <table className="rsop-table">
            <thead>
              <tr>
                <th style={{ width: 72 }}>Level</th>
                <th>Source</th>
                <th>Policy</th>
                <th>Effect</th>
                <th>Domain</th>
                <th style={{ width: 64 }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {rsopRows.map((r, i) => (
                <tr key={i}>
                  <td><span className={`badge badge-${r.level}`}>{r.level.toUpperCase()}</span></td>
                  <td>{r.source}</td>
                  <td style={{ fontWeight: 500 }}>{r.policy}</td>
                  <td><span className={`badge badge-${r.effect === 'deny' ? 'deny' : 'permit'}`}>{r.effect}</span></td>
                  <td><span className={`badge badge-${r.domain}`}>{r.domain}</span></td>
                  <td>
                    {r.effect === 'deny'
                      ? <span style={{ color: 'var(--deny)', fontSize: 11, fontWeight: 600 }}>WINS</span>
                      : <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>active</span>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Effective envelope placeholder */}
      <div style={{ background: 'var(--surface)', boxShadow: 'var(--neu-raised)', borderRadius: 'var(--radius-lg)', padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, color: 'var(--accent)' }}>
          <Shield />
          <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>Effective Envelope</span>
        </div>
        {!selectedAgent ? (
          <p style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>No agent selected</p>
        ) : (
          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Envelope resolution (hierarchy-based constraint intersection) coming in Phase 2.
          </p>
        )}
      </div>
    </div>
  );
}
