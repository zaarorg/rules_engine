'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { fetchGroups, GroupResponse } from '@/lib/api';
import { EntityList } from '@/components/entity/EntityList';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { CreateGroupFlow } from '@/components/create/CreateGroupFlow';
import { Plus } from '@/components/Icons';

export default function GroupsPage() {
  const [groups, setGroups] = useState<GroupResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const searchParams = useSearchParams();

  useEffect(() => {
    fetchGroups()
      .then(setGroups)
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
      <Breadcrumb crumbs={[{ label: 'Dashboard', href: '/' }, { label: 'Groups' }]} />
      <div className="entity-list-header" style={{ marginTop: 16 }}>
        <h1>Groups</h1>
        <button className="neu-btn neu-btn-primary" onClick={() => setShowCreate(true)}><Plus /> New Group</button>
      </div>
      <EntityList<GroupResponse>
        items={groups}
        getId={g => g.id}
        getHref={g => `/groups/${g.id}`}
        searchKeys={g => `${g.name} ${g.nodeType} ${g.path}`}
        columns={[
          { key: 'name', label: 'Name', render: g => g.name },
          { key: 'type', label: 'Type', render: g => (
            <span className={`badge badge-${g.nodeType}`}>{g.nodeType}</span>
          )},
          { key: 'path', label: 'Path', render: g => (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-muted)' }}>{g.path}</span>
          )},
        ]}
      />
      {showCreate && <CreateGroupFlow onClose={() => setShowCreate(false)} />}
    </div>
  );
}
