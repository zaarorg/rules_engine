'use client';

import Link from 'next/link';
import { Plus, Shield, Bot, Users } from '../Icons';

export function QuickActions() {
  return (
    <div className="neu-panel">
      <div className="panel-header">
        <span className="panel-title">Quick Actions</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Link href="/policies?create=true" className="neu-btn neu-btn-ghost" style={{ justifyContent: 'flex-start', textDecoration: 'none' }}>
          <Plus /> New Policy
        </Link>
        <Link href="/agents?create=true" className="neu-btn neu-btn-ghost" style={{ justifyContent: 'flex-start', textDecoration: 'none' }}>
          <Plus /> New Agent
        </Link>
        <Link href="/groups?create=true" className="neu-btn neu-btn-ghost" style={{ justifyContent: 'flex-start', textDecoration: 'none' }}>
          <Plus /> New Group
        </Link>
      </div>
    </div>
  );
}
