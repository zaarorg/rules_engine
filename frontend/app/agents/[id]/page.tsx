'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { fetchAgents, fetchDecisions, fetchAgentGroups, fetchActionTypes, checkPolicy } from '@/lib/api';
import type { AgentResponse, DecisionLogResponse, GroupResponse, ActionTypeWithDimensionsResponse, CheckResponse } from '@/lib/api';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { EnvelopeView } from '@/components/envelope/EnvelopeView';
import { Bot, Play } from '@/components/Icons';

export default function AgentDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [agent, setAgent] = useState<AgentResponse | null>(null);
  const [groups, setGroups] = useState<GroupResponse[]>([]);
  const [decisions, setDecisions] = useState<DecisionLogResponse[]>([]);
  const [actionTypes, setActionTypes] = useState<ActionTypeWithDimensionsResponse[]>([]);
  const [tab, setTab] = useState<'envelope' | 'decisions' | 'test'>('envelope');
  const [loading, setLoading] = useState(true);

  // Test state
  const [testAction, setTestAction] = useState('');
  const [testContext, setTestContext] = useState<Record<string, string>>({});
  const [testResult, setTestResult] = useState<CheckResponse | null>(null);
  const [testRunning, setTestRunning] = useState(false);

  useEffect(() => {
    Promise.all([
      fetchAgents().then(agents => agents.find(a => a.id === id) || null),
      fetchAgentGroups(id),
      fetchDecisions({ agentId: id, limit: 20 }),
      fetchActionTypes(),
    ])
      .then(([a, g, d, at]) => {
        setAgent(a);
        setGroups(g);
        setDecisions(d);
        setActionTypes(at);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><div className="loading-spinner" /></div>;
  }

  if (!agent) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Agent not found</div>;
  }

  const selectedActionType = actionTypes.find(at => at.id === testAction || at.name === testAction);

  const runTest = async () => {
    if (!selectedActionType || !agent) return;
    setTestRunning(true);
    try {
      const context: Record<string, unknown> = {};
      for (const dim of selectedActionType.dimensions) {
        const val = testContext[dim.dimensionName];
        if (val) {
          if (dim.kind === 'numeric') context[dim.dimensionName] = Number(val);
          else if (dim.kind === 'boolean') context[dim.dimensionName] = val === 'true';
          else context[dim.dimensionName] = val;
        }
      }
      const result = await checkPolicy(
        `Agent::"${agent.name}"`,
        `Action::"${selectedActionType.name}"`,
        'Resource::"default"',
        context
      );
      setTestResult(result);
    } catch (e) {
      setTestResult({ decision: 'error', diagnostics: [(e as Error).message] });
    } finally {
      setTestRunning(false);
    }
  };

  return (
    <div>
      <Breadcrumb crumbs={[
        { label: 'Dashboard', href: '/' },
        { label: 'Agents', href: '/agents' },
        { label: agent.name },
      ]} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 16, marginBottom: 20 }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--accent-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)' }}>
          <Bot />
        </div>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700 }}>{agent.name}</h1>
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <span className={`badge badge-${agent.domain}`}>{agent.domain}</span>
            <span className={`badge ${agent.isActive ? 'badge-permit' : 'badge-muted'}`}>{agent.isActive ? 'active' : 'inactive'}</span>
            {groups.map(g => (
              <span key={g.id} style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>{g.path}</span>
            ))}
          </div>
        </div>
      </div>

      <div className="detail-tabs">
        <button className={`detail-tab ${tab === 'envelope' ? 'active' : ''}`} onClick={() => setTab('envelope')}>Envelope</button>
        <button className={`detail-tab ${tab === 'decisions' ? 'active' : ''}`} onClick={() => setTab('decisions')}>Decisions</button>
        <button className={`detail-tab ${tab === 'test' ? 'active' : ''}`} onClick={() => setTab('test')}>Test</button>
      </div>

      {tab === 'envelope' && <EnvelopeView agentId={id} />}

      {tab === 'decisions' && (
        <div className="neu-panel">
          <div className="panel-header"><span className="panel-title">Decision History</span></div>
          {decisions.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No decisions recorded.</p>
          ) : (
            <table className="rsop-table">
              <thead>
                <tr><th>Outcome</th><th>Reason</th><th>Time</th></tr>
              </thead>
              <tbody>
                {decisions.map(d => (
                  <tr key={d.id}>
                    <td><span className={`badge badge-${d.outcome}`}>{d.outcome}</span></td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{d.reason || '—'}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>
                      {new Date(d.evaluatedAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'test' && (
        <div className="neu-panel">
          <div className="panel-header"><span className="panel-title">Policy Test</span></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <span className="field-label">Action Type</span>
              <select
                value={testAction}
                onChange={e => { setTestAction(e.target.value); setTestContext({}); setTestResult(null); }}
                className="neu-select"
                style={{ width: '100%' }}
              >
                <option value="">Select action...</option>
                {actionTypes.map(at => (
                  <option key={at.id} value={at.name}>{at.name} ({at.domain})</option>
                ))}
              </select>
            </div>

            {selectedActionType && selectedActionType.dimensions.map(dim => (
              <div key={dim.id}>
                <span className="field-label">{dim.dimensionName} <span style={{ color: 'var(--text-muted)', fontWeight: 400, textTransform: 'none' }}>({dim.kind})</span></span>
                {dim.kind === 'boolean' ? (
                  <select
                    value={testContext[dim.dimensionName] || ''}
                    onChange={e => setTestContext(prev => ({ ...prev, [dim.dimensionName]: e.target.value }))}
                    className="neu-select"
                    style={{ width: '100%' }}
                  >
                    <option value="">Not set</option>
                    <option value="true">true</option>
                    <option value="false">false</option>
                  </select>
                ) : dim.kind === 'set' && dim.setMembers ? (
                  <select
                    value={testContext[dim.dimensionName] || ''}
                    onChange={e => setTestContext(prev => ({ ...prev, [dim.dimensionName]: e.target.value }))}
                    className="neu-select"
                    style={{ width: '100%' }}
                  >
                    <option value="">Not set</option>
                    {dim.setMembers.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={dim.kind === 'numeric' ? 'number' : 'text'}
                    value={testContext[dim.dimensionName] || ''}
                    onChange={e => setTestContext(prev => ({ ...prev, [dim.dimensionName]: e.target.value }))}
                    className="neu-input"
                    placeholder={dim.kind === 'numeric' ? `max ${dim.numericMax}` : dim.kind === 'temporal' ? 'HH:MM' : ''}
                  />
                )}
              </div>
            ))}

            <button
              className="neu-btn neu-btn-primary"
              onClick={runTest}
              disabled={!testAction || testRunning}
              style={{ alignSelf: 'flex-start' }}
            >
              <Play /> {testRunning ? 'Evaluating...' : 'Evaluate'}
            </button>

            {testResult && (
              <div className={`result-card`} style={{ background: testResult.decision === 'allow' ? 'var(--permit-surface)' : 'var(--deny-surface)' }}>
                <div className="result-icon" style={{ background: testResult.decision === 'allow' ? 'var(--permit)' : 'var(--deny)', color: 'white' }}>
                  {testResult.decision === 'allow' ? '✓' : '✗'}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{testResult.decision.toUpperCase()}</div>
                  {testResult.diagnostics.length > 0 && (
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                      {testResult.diagnostics.join(', ')}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
