'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { fetchPolicies, PolicyResponse } from '@/lib/api';
import { EntityList } from '@/components/entity/EntityList';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { CreatePolicyFlow } from '@/components/create/CreatePolicyFlow';
import { Plus } from '@/components/Icons';

export default function PoliciesPage() {
  const [policies, setPolicies] = useState<PolicyResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const searchParams = useSearchParams();

  useEffect(() => {
    fetchPolicies()
      .then(setPolicies)
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
      <Breadcrumb crumbs={[{ label: 'Dashboard', href: '/' }, { label: 'Policies' }]} />
      <div className="entity-list-header" style={{ marginTop: 16 }}>
        <h1>Policies</h1>
        <button className="neu-btn neu-btn-primary" onClick={() => setShowCreate(true)}><Plus /> New Policy</button>
      </div>
      <EntityList<PolicyResponse>
        items={policies}
        getId={p => p.id}
        getHref={p => `/policies/${p.id}`}
        searchKeys={p => `${p.name} ${p.domain} ${p.effect}`}
        columns={[
          { key: 'name', label: 'Name', render: p => p.name },
          { key: 'domain', label: 'Domain', render: p => <span className={`badge badge-${p.domain}`}>{p.domain}</span> },
          { key: 'effect', label: 'Effect', render: p => (
            <span className={`badge badge-${p.effect === 'deny' ? 'deny' : 'permit'}`}>{p.effect}</span>
          )},
          { key: 'version', label: 'Active Version', render: p => (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-muted)' }}>
              {p.activeVersionId ? p.activeVersionId.slice(0, 8) : 'none'}
            </span>
          )},
        ]}
      />
      {showCreate && <CreatePolicyFlow onClose={() => setShowCreate(false)} />}
    </div>
  );
}
