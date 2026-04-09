'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CreateModal } from './CreateModal';
import { fetchGroups, createAgent, addGroupMember } from '@/lib/api';
import type { GroupResponse } from '@/lib/api';

interface CreateAgentFlowProps {
  onClose: () => void;
}

const ORG_ID = '00000000-0000-0000-0000-000000000001';

export function CreateAgentFlow({ onClose }: CreateAgentFlowProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [domain, setDomain] = useState('');
  const [groupId, setGroupId] = useState('');
  const [groups, setGroups] = useState<GroupResponse[]>([]);

  useEffect(() => {
    fetchGroups().then(setGroups).catch(() => {});
  }, []);

  const handleSave = async () => {
    if (!name || !domain) return;
    setSaving(true);
    setError('');
    try {
      const agent = await createAgent({
        name,
        domain,
        orgId: ORG_ID,
        email: email || undefined,
      });

      if (groupId) {
        await addGroupMember(groupId, agent.id);
      }

      onClose();
      router.push(`/agents/${agent.id}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <CreateModal title="New Agent" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <span className="field-label">Agent Name</span>
          <input className="neu-input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. treasury-agent-3" />
        </div>
        <div>
          <span className="field-label">Email</span>
          <input className="neu-input" value={email} onChange={e => setEmail(e.target.value)} placeholder="agent@acme.corp (optional)" />
        </div>
        <div>
          <span className="field-label">Domain</span>
          <select className="neu-select" style={{ width: '100%' }} value={domain} onChange={e => setDomain(e.target.value)}>
            <option value="">Select...</option>
            <option value="finance">finance</option>
            <option value="communication">communication</option>
            <option value="agent_delegation">agent_delegation</option>
          </select>
        </div>
        <div>
          <span className="field-label">Initial Group</span>
          <select className="neu-select" style={{ width: '100%' }} value={groupId} onChange={e => setGroupId(e.target.value)}>
            <option value="">None (assign later)</option>
            {groups.map(g => (
              <option key={g.id} value={g.id}>{g.name} ({g.path})</option>
            ))}
          </select>
        </div>

        {error && <p style={{ color: 'var(--deny)', fontSize: 12 }}>{error}</p>}

        <button className="neu-btn neu-btn-primary" disabled={!name || !domain || saving} onClick={handleSave}>
          {saving ? 'Creating...' : 'Create Agent'}
        </button>
      </div>
    </CreateModal>
  );
}
