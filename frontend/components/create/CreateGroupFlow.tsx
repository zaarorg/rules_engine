'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CreateModal } from './CreateModal';
import { fetchGroups, createGroup } from '@/lib/api';
import type { GroupResponse } from '@/lib/api';

interface CreateGroupFlowProps {
  onClose: () => void;
}

const ORG_ID = '00000000-0000-0000-0000-000000000001';

export function CreateGroupFlow({ onClose }: CreateGroupFlowProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [name, setName] = useState('');
  const [nodeType, setNodeType] = useState('team');
  const [parentId, setParentId] = useState('');
  const [groups, setGroups] = useState<GroupResponse[]>([]);

  useEffect(() => {
    fetchGroups().then(setGroups).catch(() => {});
  }, []);

  const parentGroup = groups.find(g => g.id === parentId);
  const generatedPath = parentGroup
    ? `${parentGroup.path}.${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`
    : name.toLowerCase().replace(/[^a-z0-9]/g, '_');

  const handleSave = async () => {
    if (!name || !nodeType) return;
    setSaving(true);
    setError('');
    try {
      const group = await createGroup({
        name,
        nodeType,
        path: generatedPath,
        orgId: ORG_ID,
        parentId: parentId || undefined,
      });

      onClose();
      router.push(`/groups/${group.id}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <CreateModal title="New Group" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <span className="field-label">Group Name</span>
          <input className="neu-input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Compliance" />
        </div>
        <div>
          <span className="field-label">Type</span>
          <select className="neu-select" style={{ width: '100%' }} value={nodeType} onChange={e => setNodeType(e.target.value)}>
            <option value="department">department</option>
            <option value="team">team</option>
          </select>
        </div>
        <div>
          <span className="field-label">Parent Group</span>
          <select className="neu-select" style={{ width: '100%' }} value={parentId} onChange={e => setParentId(e.target.value)}>
            <option value="">None (top-level)</option>
            {groups.map(g => (
              <option key={g.id} value={g.id}>{g.name} ({g.path})</option>
            ))}
          </select>
        </div>
        <div>
          <span className="field-label">Generated Path</span>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-muted)', padding: '8px 14px', background: 'var(--surface)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--neu-surface-inset-sm)' }}>
            {generatedPath || '—'}
          </div>
        </div>

        {error && <p style={{ color: 'var(--deny)', fontSize: 12 }}>{error}</p>}

        <button className="neu-btn neu-btn-primary" disabled={!name || saving} onClick={handleSave}>
          {saving ? 'Creating...' : 'Create Group'}
        </button>
      </div>
    </CreateModal>
  );
}
