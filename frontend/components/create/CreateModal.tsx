'use client';

import { X } from '../Icons';

interface CreateModalProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

export function CreateModal({ title, onClose, children }: CreateModalProps) {
  return (
    <div className="search-overlay" onClick={onClose}>
      <div className="create-modal" onClick={e => e.stopPropagation()}>
        <div className="create-modal-header">
          <h2 style={{ fontSize: 16, fontWeight: 700 }}>{title}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <X />
          </button>
        </div>
        <div className="create-modal-body">
          {children}
        </div>
      </div>
    </div>
  );
}
