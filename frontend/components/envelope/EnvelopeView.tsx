'use client';

import { useState, useEffect } from 'react';
import { fetchEffectiveEnvelope, EffectiveEnvelopeResponse, ResolvedAction } from '@/lib/api';
import { InheritanceChain } from './InheritanceChain';
import { DimensionDisplay } from './DimensionDisplay';
import { DenyBanner } from './DenyBanner';
import { ChevDown, ChevRight } from '../Icons';

export function EnvelopeView({ agentId }: { agentId: string }) {
  const [envelope, setEnvelope] = useState<EffectiveEnvelopeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchEffectiveEnvelope(agentId)
      .then(e => {
        setEnvelope(e);
        // Expand first action by default
        if (e.actions.length > 0) {
          setExpanded({ [e.actions[0].actionType]: true });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [agentId]);

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div className="loading-spinner" /></div>;
  }

  if (!envelope || envelope.actions.length === 0) {
    return (
      <div className="neu-panel" style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
        No policies apply to this agent.
      </div>
    );
  }

  const toggle = (actionType: string) => {
    setExpanded(prev => ({ ...prev, [actionType]: !prev[actionType] }));
  };

  return (
    <div className="stagger">
      {envelope.actions.map(action => (
        <ActionCard
          key={action.actionType}
          action={action}
          expanded={!!expanded[action.actionType]}
          onToggle={() => toggle(action.actionType)}
        />
      ))}
    </div>
  );
}

function ActionCard({ action, expanded, onToggle }: { action: ResolvedAction; expanded: boolean; onToggle: () => void }) {
  return (
    <div className="envelope-card">
      {action.hasDenyOverride && (
        <DenyBanner policyName={action.denySource || 'Unknown policy'} />
      )}
      <div className="envelope-card-header" onClick={onToggle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {expanded ? <ChevDown /> : <ChevRight />}
          <span className="envelope-card-title">{action.actionName}</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>
            {action.actionType}
          </span>
        </div>
        <span className="badge badge-accent">
          {Object.keys(action.dimensions).length} dimensions
        </span>
      </div>
      {expanded && (
        <div>
          {Object.values(action.dimensions).map(dim => (
            <div key={dim.dimensionName} className="envelope-dim-row">
              <div className="envelope-dim-label">{dim.dimensionName}</div>
              <div style={{ flex: 1 }}>
                <DimensionDisplay dimension={dim} />
              </div>
              <div className="envelope-dim-sources">
                <InheritanceChain sources={dim.sources} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
