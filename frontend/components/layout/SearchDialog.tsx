'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PolicyResponse, AgentResponse, GroupResponse } from '@/lib/api';
import { Shield, Bot, Users, Search } from '../Icons';

interface SearchDialogProps {
  entities: {
    policies: PolicyResponse[];
    agents: AgentResponse[];
    groups: GroupResponse[];
  };
  onClose: () => void;
}

interface SearchResult {
  id: string;
  name: string;
  type: 'agent' | 'group' | 'policy';
  detail: string;
  href: string;
}

export function SearchDialog({ entities, onClose }: SearchDialogProps) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Build searchable items
  const allItems: SearchResult[] = [
    ...entities.agents.map(a => ({
      id: a.id, name: a.name, type: 'agent' as const,
      detail: `${a.domain} agent${a.email ? ` - ${a.email}` : ''}`,
      href: `/agents/${a.id}`,
    })),
    ...entities.groups.map(g => ({
      id: g.id, name: g.name, type: 'group' as const,
      detail: `${g.nodeType} - ${g.path}`,
      href: `/groups/${g.id}`,
    })),
    ...entities.policies.map(p => ({
      id: p.id, name: p.name, type: 'policy' as const,
      detail: `${p.domain} - ${p.effect}`,
      href: `/policies/${p.id}`,
    })),
  ];

  const filtered = query.trim()
    ? allItems.filter(item =>
        item.name.toLowerCase().includes(query.toLowerCase()) ||
        item.detail.toLowerCase().includes(query.toLowerCase())
      )
    : allItems.slice(0, 10);

  const navigate = (href: string) => {
    onClose();
    router.push(href);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { onClose(); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => Math.min(s + 1, filtered.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)); }
    if (e.key === 'Enter' && filtered[selected]) { navigate(filtered[selected].href); }
  };

  const typeIcon = (type: string) => {
    switch (type) {
      case 'agent': return <Bot />;
      case 'group': return <Users />;
      case 'policy': return <Shield />;
      default: return null;
    }
  };

  return (
    <div className="search-overlay" onClick={onClose}>
      <div className="search-dialog" onClick={e => e.stopPropagation()}>
        <div className="search-input-wrapper">
          <Search />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => { setQuery(e.target.value); setSelected(0); }}
            onKeyDown={handleKeyDown}
            placeholder="Search agents, groups, policies..."
            className="search-input"
          />
        </div>
        <div className="search-results">
          {filtered.length === 0 ? (
            <div className="search-empty">No results found</div>
          ) : (
            filtered.map((item, i) => (
              <button
                key={item.id}
                className={`search-result-item ${i === selected ? 'selected' : ''}`}
                onClick={() => navigate(item.href)}
                onMouseEnter={() => setSelected(i)}
              >
                <span className="search-result-icon">{typeIcon(item.type)}</span>
                <div className="search-result-text">
                  <span className="search-result-name">{item.name}</span>
                  <span className="search-result-detail">{item.detail}</span>
                </div>
                <span className={`badge badge-${item.type === 'policy' ? item.detail.split(' - ')[1] : item.type}`}>
                  {item.type}
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
