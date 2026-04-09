'use client';

import { useState, useEffect } from 'react';
import { fetchPolicies, fetchAgents, fetchGroups, fetchDecisions } from '@/lib/api';
import type { PolicyResponse, AgentResponse, GroupResponse, DecisionLogResponse } from '@/lib/api';
import { OrgOverview } from '@/components/dashboard/OrgOverview';
import { RecentDecisions } from '@/components/dashboard/RecentDecisions';
import { QuickActions } from '@/components/dashboard/QuickActions';

export default function Dashboard() {
  const [policies, setPolicies] = useState<PolicyResponse[]>([]);
  const [agents, setAgents] = useState<AgentResponse[]>([]);
  const [groups, setGroups] = useState<GroupResponse[]>([]);
  const [decisions, setDecisions] = useState<DecisionLogResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetchPolicies(),
      fetchAgents(),
      fetchGroups(),
      fetchDecisions({ limit: 10 }),
    ])
      .then(([p, a, g, d]) => {
        setPolicies(p);
        setAgents(a);
        setGroups(g);
        setDecisions(d);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
        <div className="loading-spinner" />
      </div>
    );
  }

  return (
    <div className="stagger">
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 20 }}>Dashboard</h1>

      <OrgOverview
        policyCount={policies.length}
        agentCount={agents.length}
        groupCount={groups.length}
        decisionCount={decisions.length}
      />

      <div className="dashboard-row">
        <RecentDecisions decisions={decisions} agents={agents} />
        <QuickActions />
      </div>
    </div>
  );
}
