'use client';

import { useState } from 'react';
import { GroupResponse, AgentResponse } from '@/lib/api';
import { Folder, Users, Bot, ChevDown, ChevRight } from './Icons';

export interface TreeNodeData {
  id: string;
  name: string;
  type: 'org' | 'department' | 'team';
  policyCount?: number;
  children: TreeNodeData[];
  agents?: AgentResponse[];
}

function TreeNode({
  node,
  selected,
  onSelect,
  depth = 0,
}: {
  node: TreeNodeData;
  selected: string;
  onSelect: (id: string) => void;
  depth?: number;
}) {
  const [expanded, setExpanded] = useState(depth < 2);
  const hasChildren = node.children.length > 0 || (node.agents && node.agents.length > 0);
  const Icon = node.type === 'org' ? Folder : Users;

  return (
    <div>
      <div
        className={`tree-node ${selected === node.id ? 'selected' : ''}`}
        style={{ paddingLeft: 10 + depth * 14 }}
        onClick={() => onSelect(node.id)}
      >
        <span
          className="tree-toggle"
          onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
        >
          {hasChildren ? (expanded ? <ChevDown /> : <ChevRight />) : ''}
        </span>
        <span style={{ flexShrink: 0 }}><Icon /></span>
        <span style={{ flex: 1 }}>{node.name}</span>
        {node.policyCount && node.policyCount > 0 && (
          <span className="tree-badge">{node.policyCount}</span>
        )}
      </div>
      {hasChildren && expanded && (
        <div className="tree-children">
          {node.children.map((child) => (
            <TreeNode key={child.id} node={child} selected={selected} onSelect={onSelect} depth={depth + 1} />
          ))}
          {node.agents?.map((agent) => (
            <div
              key={agent.id}
              className={`tree-node ${selected === agent.id ? 'selected' : ''}`}
              style={{ paddingLeft: 10 + (depth + 1) * 14 }}
              onClick={() => onSelect(agent.id)}
            >
              <span className="tree-toggle" />
              <span style={{ flexShrink: 0 }}><Bot /></span>
              <span style={{ flex: 1 }}>{agent.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function buildTree(groups: GroupResponse[], agents: AgentResponse[]): TreeNodeData | null {
  if (groups.length === 0) return null;

  const nodeMap = new Map<string, TreeNodeData>();
  for (const g of groups) {
    nodeMap.set(g.id, {
      id: g.id,
      name: g.name,
      type: g.nodeType as 'org' | 'department' | 'team',
      children: [],
      agents: [],
    });
  }

  let root: TreeNodeData | null = null;
  for (const g of groups) {
    const node = nodeMap.get(g.id)!;
    if (g.parentId && nodeMap.has(g.parentId)) {
      nodeMap.get(g.parentId)!.children.push(node);
    } else {
      root = node;
    }
  }

  // Attach agents to leaf groups (teams) for now — since we don't have agent_group_memberships endpoint,
  // just show them under the root
  if (root && agents.length > 0) {
    // Find teams (leaf nodes) and distribute agents
    const teams = groups.filter(g => g.nodeType === 'team');
    if (teams.length > 0) {
      // distribute agents round-robin to teams for display
      agents.forEach((agent, i) => {
        const team = nodeMap.get(teams[i % teams.length].id);
        if (team) team.agents!.push(agent);
      });
    } else {
      root.agents = agents;
    }
  }

  return root;
}

export function Sidebar({
  tree,
  selected,
  onSelect,
  loading,
}: {
  tree: TreeNodeData | null;
  selected: string;
  onSelect: (id: string) => void;
  loading: boolean;
}) {
  return (
    <nav className="sidebar">
      <div className="sidebar-section-label">Organization</div>
      {loading ? (
        <div style={{ padding: '16px 8px', display: 'flex', justifyContent: 'center' }}>
          <div className="loading-spinner" />
        </div>
      ) : tree ? (
        <TreeNode node={tree} selected={selected} onSelect={onSelect} />
      ) : (
        <div style={{ padding: '16px 8px', color: 'var(--text-muted)', fontSize: 12 }}>
          No organization loaded.
        </div>
      )}
    </nav>
  );
}
