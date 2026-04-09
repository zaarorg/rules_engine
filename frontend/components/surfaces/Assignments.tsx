'use client';

import { useState } from 'react';
import { PolicyResponse, GroupResponse, AgentResponse, AssignmentResponse, createAssignment, deleteAssignment } from '@/lib/api';
import { FileText, Users, Bot, Plus, Trash, Link } from '../Icons';

interface PolicyWithAssignments extends PolicyResponse {
  assignments: AssignmentResponse[];
}

export function Assignments({
  policies,
  groups,
  agents,
  assignmentsByPolicy,
}: {
  policies: PolicyResponse[];
  groups: GroupResponse[];
  agents: AgentResponse[];
  assignmentsByPolicy: Record<string, AssignmentResponse[]>;
}) {
  const [policiesState, setPoliciesState] = useState<PolicyWithAssignments[]>(
    policies.map((p) => ({ ...p, assignments: assignmentsByPolicy[p.id] || [] }))
  );
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [addType, setAddType] = useState<'group' | 'agent'>('group');
  const [addTarget, setAddTarget] = useState('');

  const handleAdd = async (policyId: string) => {
    if (!addTarget) return;
    const policy = policiesState.find((p) => p.id === policyId);
    if (!policy?.activeVersionId) {
      alert('Policy has no active version');
      return;
    }
    try {
      const assignment = await createAssignment({
        policyId,
        policyVersionId: policy.activeVersionId,
        ...(addType === 'group' ? { groupId: addTarget } : { agentId: addTarget }),
      });
      setPoliciesState((prev) =>
        prev.map((p) =>
          p.id === policyId ? { ...p, assignments: [...p.assignments, assignment] } : p
        )
      );
      setAddingTo(null);
      setAddTarget('');
    } catch (e) {
      alert('Failed to create assignment: ' + (e as Error).message);
    }
  };

  const handleRemove = async (policyId: string, assignmentId: string) => {
    try {
      await deleteAssignment(assignmentId);
      setPoliciesState((prev) =>
        prev.map((p) =>
          p.id === policyId ? { ...p, assignments: p.assignments.filter((a) => a.id !== assignmentId) } : p
        )
      );
    } catch (e) {
      alert('Failed to delete assignment: ' + (e as Error).message);
    }
  };

  if (policiesState.length === 0) {
    return (
      <div className="neu-panel" style={{ textAlign: 'center', padding: 40 }}>
        <Link />
        <div className="panel-title" style={{ marginTop: 12 }}>Policy Assignments</div>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 8 }}>No policies found.</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {policiesState.map((policy) => (
        <div key={policy.id} className="assign-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <FileText />
              <span style={{ fontSize: 14, fontWeight: 600 }}>{policy.name}</span>
              <span className={`badge badge-${policy.effect === 'deny' ? 'deny' : 'permit'}`}>{policy.effect}</span>
            </div>
            <span className={`badge badge-${policy.domain}`}>{policy.domain}</span>
          </div>

          <div className="section-label" style={{ marginBottom: 6 }}>Assigned to</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {policy.assignments.length === 0 && (
              <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic', padding: 8 }}>No assignments</div>
            )}
            {policy.assignments.map((a) => {
              const isGroup = !!a.groupId;
              const target = isGroup
                ? groups.find((g) => g.id === a.groupId)
                : agents.find((ag) => ag.id === a.agentId);
              return (
                <div key={a.id} className="assign-target">
                  {isGroup ? <Users /> : <Bot />}
                  <span className={`badge badge-${isGroup ? 'team' : 'agent'}`}>{isGroup ? 'GROUP' : 'AGENT'}</span>
                  <span>{target?.name || (a.groupId || a.agentId || '').slice(0, 8)}</span>
                  <span
                    style={{ marginLeft: 'auto', color: 'var(--text-muted)', cursor: 'pointer', opacity: 0.5 }}
                    onClick={() => handleRemove(policy.id, a.id)}
                    onMouseEnter={(e) => { (e.target as HTMLElement).style.opacity = '1'; (e.target as HTMLElement).style.color = 'var(--deny)'; }}
                    onMouseLeave={(e) => { (e.target as HTMLElement).style.opacity = '0.5'; (e.target as HTMLElement).style.color = 'var(--text-muted)'; }}
                  >
                    <Trash />
                  </span>
                </div>
              );
            })}
          </div>

          {addingTo === policy.id ? (
            <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center' }}>
              <select
                value={addType}
                onChange={(e) => { setAddType(e.target.value as 'group' | 'agent'); setAddTarget(''); }}
                className="neu-select"
                style={{ width: 100, padding: '6px 10px', fontSize: 12 }}
              >
                <option value="group">Group</option>
                <option value="agent">Agent</option>
              </select>
              <select
                value={addTarget}
                onChange={(e) => setAddTarget(e.target.value)}
                className="neu-select"
                style={{ flex: 1, padding: '6px 10px', fontSize: 12 }}
              >
                <option value="">Select...</option>
                {(addType === 'group' ? groups : agents).map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
              <button className="neu-btn neu-btn-primary" style={{ padding: '6px 14px', fontSize: 12 }} onClick={() => handleAdd(policy.id)}>Add</button>
              <button className="neu-btn neu-btn-ghost" style={{ padding: '6px 14px', fontSize: 12 }} onClick={() => setAddingTo(null)}>Cancel</button>
            </div>
          ) : (
            <button
              className="neu-btn neu-btn-ghost"
              style={{ marginTop: 8, padding: '6px 14px', fontSize: 12 }}
              onClick={() => { setAddingTo(policy.id); setAddTarget(''); }}
            >
              <Plus /> Add Assignment
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
