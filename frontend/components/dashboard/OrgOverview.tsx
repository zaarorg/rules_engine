'use client';

import Link from 'next/link';
import { Shield, Bot, Users, Activity } from '../Icons';

interface OrgOverviewProps {
  policyCount: number;
  agentCount: number;
  groupCount: number;
  decisionCount: number;
}

export function OrgOverview({ policyCount, agentCount, groupCount, decisionCount }: OrgOverviewProps) {
  const cards = [
    { label: 'Policies', value: policyCount, href: '/policies', icon: <Shield /> },
    { label: 'Agents', value: agentCount, href: '/agents', icon: <Bot /> },
    { label: 'Groups', value: groupCount, href: '/groups', icon: <Users /> },
    { label: 'Decisions', value: decisionCount, href: '#', icon: <Activity /> },
  ];

  return (
    <div className="dashboard-grid">
      {cards.map(card => (
        <Link key={card.label} href={card.href} className="stat-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', marginBottom: 8 }}>
            {card.icon}
            <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px' }}>{card.label}</span>
          </div>
          <div className="stat-card-value">{card.value}</div>
        </Link>
      ))}
    </div>
  );
}
