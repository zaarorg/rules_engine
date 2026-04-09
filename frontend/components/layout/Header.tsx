'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Shield, Search } from '../Icons';
import { SearchDialog } from './SearchDialog';
import {
  PolicyResponse, AgentResponse, GroupResponse,
  fetchPolicies, fetchAgents, fetchGroups,
} from '@/lib/api';

interface HeaderProps {
  children?: React.ReactNode; // breadcrumb slot
}

export function Header({ children }: HeaderProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [stats, setStats] = useState({ policies: 0, agents: 0, groups: 0 });
  const [entities, setEntities] = useState<{
    policies: PolicyResponse[];
    agents: AgentResponse[];
    groups: GroupResponse[];
  }>({ policies: [], agents: [], groups: [] });

  useEffect(() => {
    Promise.all([fetchPolicies(), fetchAgents(), fetchGroups()])
      .then(([p, a, g]) => {
        setStats({ policies: p.length, agents: a.length, groups: g.length });
        setEntities({ policies: p, agents: a, groups: g });
      })
      .catch(() => {});
  }, []);

  // CMD+K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <>
      <header className="app-header">
        <div className="header-left">
          <Link href="/" className="header-logo">
            <Shield />
            <span className="header-title">Governance Console</span>
          </Link>
          {children}
        </div>
        <div className="header-right">
          <nav className="header-nav">
            <Link href="/agents" className="header-nav-link">
              Agents <span className="header-stat">{stats.agents}</span>
            </Link>
            <Link href="/groups" className="header-nav-link">
              Groups <span className="header-stat">{stats.groups}</span>
            </Link>
            <Link href="/policies" className="header-nav-link">
              Policies <span className="header-stat">{stats.policies}</span>
            </Link>
          </nav>
          <button
            className="header-search-btn"
            onClick={() => setSearchOpen(true)}
          >
            <Search />
            <span>Search...</span>
            <kbd>&#8984;K</kbd>
          </button>
          <div className="header-avatar">JS</div>
        </div>
      </header>
      {searchOpen && (
        <SearchDialog
          entities={entities}
          onClose={() => setSearchOpen(false)}
        />
      )}
    </>
  );
}
