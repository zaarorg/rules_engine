'use client';

import { Ban } from '../Icons';

export function DenyBanner({ policyName }: { policyName: string }) {
  return (
    <div className="deny-banner">
      <Ban />
      <span>Blocked by <strong>{policyName}</strong> — deny overrides all child policies.</span>
    </div>
  );
}
