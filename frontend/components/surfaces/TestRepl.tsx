'use client';

import { useState } from 'react';
import { AgentResponse, DecisionLogResponse, CheckResponse, checkPolicy, fetchDecisions } from '@/lib/api';
import { Terminal, Play, Check, X } from '../Icons';

export function TestRepl({
  agents,
  decisions: initialDecisions,
}: {
  agents: AgentResponse[];
  decisions: DecisionLogResponse[];
}) {
  const [agent, setAgent] = useState('');
  const [action, setAction] = useState('');
  const [resource, setResource] = useState('');
  const [contextStr, setContextStr] = useState('{}');
  const [result, setResult] = useState<CheckResponse | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');
  const [decisions, setDecisions] = useState(initialDecisions);

  const selectedAgent = agents.find((a) => a.id === agent);

  const run = async () => {
    if (!agent || !action) return;
    setRunning(true);
    setError('');
    try {
      let ctx = {};
      try { ctx = JSON.parse(contextStr); } catch { /* empty */ }

      const agentName = selectedAgent?.name || agent;
      const principal = `Agent::"${agentName}"`;
      const actionStr = `Action::"${action}"`;
      const resourceStr = resource || `Resource::"default"`;

      const res = await checkPolicy(principal, actionStr, resourceStr, ctx);
      setResult(res);

      // Refresh recent decisions
      try {
        const recent = await fetchDecisions({ limit: 10 });
        setDecisions(recent);
      } catch { /* ignore */ }
    } catch (e) {
      setError((e as Error).message);
      setResult(null);
    } finally {
      setRunning(false);
    }
  };

  const isAllow = result?.decision === 'Allow';

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, height: '100%' }}>
      {/* Request panel */}
      <div className="neu-panel" style={{ display: 'flex', flexDirection: 'column' }}>
        <div className="panel-header"><Terminal /><span className="panel-title">Request</span></div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <span className="field-label">Agent</span>
            <select value={agent} onChange={(e) => setAgent(e.target.value)} className="neu-select" style={{ width: '100%' }}>
              <option value="">Select agent...</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>{a.name} ({a.domain})</option>
              ))}
            </select>
          </div>
          <div>
            <span className="field-label">Action</span>
            <input
              value={action}
              onChange={(e) => setAction(e.target.value)}
              className="neu-input"
              placeholder="e.g. purchase.initiate"
            />
          </div>
          <div>
            <span className="field-label">Resource</span>
            <input
              value={resource}
              onChange={(e) => setResource(e.target.value)}
              className="neu-input"
              placeholder='e.g. Resource::"vendor-1"'
            />
          </div>
          <div>
            <span className="field-label">Context (JSON)</span>
            <textarea
              value={contextStr}
              onChange={(e) => setContextStr(e.target.value)}
              className="neu-input"
              style={{ minHeight: 80, fontFamily: 'var(--font-mono)', resize: 'vertical' }}
              placeholder='{"amount": 5000}'
            />
          </div>
        </div>
        <button
          onClick={run}
          className="neu-btn neu-btn-primary"
          disabled={!agent || !action || running}
          style={{ width: '100%', marginTop: 16 }}
        >
          {running ? <div className="loading-spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> : <Play />}
          {running ? 'Evaluating...' : 'Evaluate'}
        </button>
      </div>

      {/* Result panel */}
      <div className="neu-panel" style={{ display: 'flex', flexDirection: 'column' }}>
        <div className="panel-header"><span className="panel-title">Result</span></div>

        {error ? (
          <div className="result-card" style={{ borderLeft: '4px solid var(--deny)' }}>
            <div className="result-icon" style={{ color: 'var(--deny)' }}><X /></div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--deny)' }}>Error</div>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{error}</div>
            </div>
          </div>
        ) : result ? (
          <div className="result-card" style={{ borderLeft: `4px solid var(--${isAllow ? 'permit' : 'deny'})` }}>
            <div className="result-icon" style={{ color: `var(--${isAllow ? 'permit' : 'deny'})` }}>
              {isAllow ? <Check /> : <X />}
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, color: `var(--${isAllow ? 'permit' : 'deny'})` }}>
                {result.decision}
              </div>
              {result.diagnostics.length > 0 && (
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                  {result.diagnostics.join('; ')}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="result-card" style={{ borderLeft: '4px solid var(--text-muted)' }}>
            <div className="result-icon" style={{ color: 'var(--text-muted)' }}><Play /></div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-muted)' }}>No evaluation yet</div>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Select an agent and action, then click Evaluate</div>
            </div>
          </div>
        )}

        {/* Diagnostics trace */}
        {result && result.diagnostics.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <div className="section-label">Diagnostics</div>
            {result.diagnostics.map((d, i) => (
              <div key={i} className="trace-row">
                <span style={{ color: 'var(--text-tertiary)', flex: 1 }}>{d}</span>
              </div>
            ))}
          </div>
        )}

        {/* Recent decisions */}
        <div style={{ marginTop: 'auto', paddingTop: 16 }}>
          <div className="section-label">Recent Decisions</div>
          {decisions.length === 0 ? (
            <p style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>No recent decisions</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {decisions.slice(0, 8).map((d) => (
                <div key={d.id} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  fontSize: 12, color: 'var(--text-muted)',
                  padding: '8px 10px', borderRadius: 'var(--radius-md)',
                  background: 'var(--surface)', boxShadow: 'var(--neu-surface-inset-sm)',
                }}>
                  <span style={{
                    width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                    background: d.outcome === 'allow' ? 'var(--permit)' : 'var(--deny)',
                  }} />
                  <span style={{ color: 'var(--text-tertiary)' }}>{d.agentId.slice(0, 8)}</span>
                  <span>{d.outcome}</span>
                  <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                    {new Date(d.evaluatedAt).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
