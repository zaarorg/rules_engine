'use client';

import { useState } from 'react';
import { Chat, X, Send } from './Icons';

export function ChatPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [input, setInput] = useState('');

  if (!open) return null;

  return (
    <div className="chat-sidebar">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>
          <Chat /> Policy Assistant
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
          <X />
        </button>
      </div>
      <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
        <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)', fontSize: 13 }}>
          <p>Describe a rule in plain English to generate Cedar policy, test cases, and structured constraints.</p>
          <p style={{ marginTop: 8, fontSize: 11, fontFamily: 'var(--font-mono)' }}>
            AI assistant coming in Phase 2
          </p>
        </div>
      </div>
      <div style={{ padding: 12 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'var(--surface)',
          boxShadow: 'var(--neu-surface-inset)',
          borderRadius: 'var(--radius-lg)',
          padding: '10px 14px',
        }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="AI assistant coming in Phase 2"
            disabled
            style={{
              flex: 1, background: 'none', border: 'none',
              fontSize: 13, color: 'var(--text-primary)',
              outline: 'none', fontFamily: 'var(--font-sans)',
            }}
          />
          <button disabled style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'not-allowed', opacity: 0.5 }}>
            <Send />
          </button>
        </div>
      </div>
    </div>
  );
}
