'use client';

import { useState, useEffect } from 'react';
import {
  PolicyResponse, AgentResponse, GroupResponse, AssignmentResponse, DecisionLogResponse,
  fetchPolicies, fetchAgents, fetchGroups, fetchDecisions,
} from '@/lib/api';
import { Sidebar, buildTree, TreeNodeData } from './Sidebar';
import { ChatPanel } from './ChatPanel';
import { Builder } from './surfaces/Builder';
import { CodeEditor } from './surfaces/CodeEditor';
import { TestRepl } from './surfaces/TestRepl';
import { Assignments } from './surfaces/Assignments';
import { RsopView } from './surfaces/RsopView';
import { History } from './surfaces/History';
import { Shield, Code, Terminal, Link, Layers, Clock, Chat } from './Icons';

type TabId = 'builder' | 'code' | 'repl' | 'assign' | 'rsop' | 'history';

const TABS: { id: TabId; label: string; icon: React.FC }[] = [
  { id: 'builder', label: 'Builder', icon: Shield },
  { id: 'code', label: 'Code', icon: Code },
  { id: 'repl', label: 'Test', icon: Terminal },
  { id: 'assign', label: 'Assign', icon: Link },
  { id: 'rsop', label: 'RSoP', icon: Layers },
  { id: 'history', label: 'History', icon: Clock },
];

export default function App() {
  const [view, setView] = useState<TabId>('builder');
  const [chatOpen, setChatOpen] = useState(false);
  const [selectedNode, setSelectedNode] = useState('');

  // Data state
  const [policies, setPolicies] = useState<PolicyResponse[]>([]);
  const [agents, setAgents] = useState<AgentResponse[]>([]);
  const [groups, setGroups] = useState<GroupResponse[]>([]);
  const [decisions, setDecisions] = useState<DecisionLogResponse[]>([]);
  const [tree, setTree] = useState<TreeNodeData | null>(null);
  const [loading, setLoading] = useState(true);

  // Load all data on mount
  useEffect(() => {
    Promise.all([
      fetchPolicies().catch(() => [] as PolicyResponse[]),
      fetchAgents().catch(() => [] as AgentResponse[]),
      fetchGroups().catch(() => [] as GroupResponse[]),
      fetchDecisions({ limit: 20 }).catch(() => [] as DecisionLogResponse[]),
    ]).then(([p, a, g, d]) => {
      setPolicies(p);
      setAgents(a);
      setGroups(g);
      setDecisions(d);
      setTree(buildTree(g, a));
      setLoading(false);
    });
  }, []);

  // Find the org name from root group
  const orgName = groups.find((g) => !g.parentId)?.name || '--';

  const renderSurface = () => {
    switch (view) {
      case 'builder':
        return <Builder policies={policies} />;
      case 'code':
        return <CodeEditor policies={policies} selectedPolicyId={null} />;
      case 'repl':
        return <TestRepl agents={agents} decisions={decisions} />;
      case 'assign':
        return <Assignments policies={policies} groups={groups} agents={agents} assignmentsByPolicy={{}} />;
      case 'rsop':
        return <RsopView agents={agents} policies={policies} groups={groups} />;
      case 'history':
        return <History policies={policies} />;
    }
  };

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 'var(--radius-md)',
            background: 'var(--surface)', boxShadow: 'var(--neu-surface-raised-sm)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--accent)',
          }}>
            <Shield />
          </div>
          <span style={{ fontSize: 17, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>
            Governance Console
          </span>
        </div>
        <div style={{ width: 1, height: 24, background: 'var(--shadow-dark)', margin: '0 20px', opacity: 0.4 }} />
        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          org: <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{orgName}</span>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            {policies.length} policies | {agents.length} agents | {groups.length} groups
          </span>
          <button
            className={`neu-btn ${chatOpen ? 'neu-btn-ghost active' : 'neu-btn-ghost'}`}
            onClick={() => setChatOpen(!chatOpen)}
            style={{ padding: '6px 14px', fontSize: 12 }}
          >
            <Chat /> Assistant
          </button>
          <div style={{
            width: 34, height: 34, borderRadius: '50%',
            background: 'var(--accent)', boxShadow: 'var(--neu-surface-raised-sm)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 600, color: 'white',
          }}>
            U
          </div>
        </div>
      </header>

      {/* Body */}
      <div className="app-body">
        <Sidebar tree={tree} selected={selectedNode} onSelect={setSelectedNode} loading={loading} />

        <main className="main-content">
          {/* Tab bar */}
          <div className="surface-tabs">
            {TABS.map((t) => (
              <button
                key={t.id}
                className={`surface-tab ${view === t.id ? 'active' : ''}`}
                onClick={() => setView(t.id)}
              >
                <t.icon /> {t.label}
              </button>
            ))}
          </div>

          {/* Surface content */}
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
              <div style={{ textAlign: 'center' }}>
                <div className="loading-spinner" style={{ margin: '0 auto 12px' }} />
                <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Loading data from management API...</p>
              </div>
            </div>
          ) : (
            renderSurface()
          )}
        </main>

        <ChatPanel open={chatOpen} onClose={() => setChatOpen(false)} />
      </div>
    </div>
  );
}
