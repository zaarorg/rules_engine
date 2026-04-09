'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { fetchAgents, AgentResponse } from '@/lib/api';
import { EntityList } from '@/components/entity/EntityList';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { CreateAgentFlow } from '@/components/create/CreateAgentFlow';
import { Plus } from '@/components/Icons';

export default function AgentsPage() {
  const [agents, setAgents] = useState<AgentResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const searchParams = useSearchParams();

  useEffect(() => {
    fetchAgents()
      .then(setAgents)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (searchParams.get('create') === 'true') setShowCreate(true);
  }, [searchParams]);

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><div className="loading-spinner" /></div>;
  }

  return (
    <div>
      <Breadcrumb crumbs={[{ label: 'Dashboard', href: '/' }, { label: 'Agents' }]} />
      <div className="entity-list-header" style={{ marginTop: 16 }}>
        <h1>Agents</h1>
        <button className="neu-btn neu-btn-primary" onClick={() => setShowCreate(true)}><Plus /> New Agent</button>
      </div>
      <EntityList<AgentResponse>
        items={agents}
        getId={a => a.id}
        getHref={a => `/agents/${a.id}`}
        searchKeys={a => `${a.name} ${a.domain} ${a.email || ''}`}
        columns={[
          { key: 'name', label: 'Name', render: a => a.name },
          { key: 'domain', label: 'Domain', render: a => <span className={`badge badge-${a.domain}`}>{a.domain}</span> },
          { key: 'email', label: 'Email', render: a => a.email || '—' },
          { key: 'status', label: 'Status', render: a => (
            <span className={`badge ${a.isActive ? 'badge-permit' : 'badge-muted'}`}>
              {a.isActive ? 'active' : 'inactive'}
            </span>
          )},
        ]}
      />
      {showCreate && <CreateAgentFlow onClose={() => setShowCreate(false)} />}
    </div>
  );
}
