'use client';

import { DecisionLogResponse, AgentResponse } from '@/lib/api';

interface RecentDecisionsProps {
  decisions: DecisionLogResponse[];
  agents: AgentResponse[];
}

export function RecentDecisions({ decisions, agents }: RecentDecisionsProps) {
  const agentMap = Object.fromEntries(agents.map(a => [a.id, a.name]));

  return (
    <div className="neu-panel">
      <div className="panel-header">
        <span className="panel-title">Recent Decisions</span>
      </div>
      {decisions.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No recent decisions.</p>
      ) : (
        <table className="rsop-table">
          <thead>
            <tr>
              <th>Agent</th>
              <th>Outcome</th>
              <th>Reason</th>
              <th>Time</th>
            </tr>
          </thead>
          <tbody>
            {decisions.slice(0, 8).map(d => (
              <tr key={d.id}>
                <td style={{ fontWeight: 500 }}>{agentMap[d.agentId] || d.agentId.slice(0, 8)}</td>
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
  );
}
