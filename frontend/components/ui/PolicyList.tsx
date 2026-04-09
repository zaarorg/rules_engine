'use client';

interface Policy {
  id: string;
  name: string;
  domain: string;
  effect: string;
  activeVersionId: string | null;
  createdAt: string;
}

const domainColors: Record<string, string> = {
  finance: 'bg-blue-100 text-blue-800',
  communication: 'bg-purple-100 text-purple-800',
  agent_delegation: 'bg-amber-100 text-amber-800',
};

const effectColors: Record<string, string> = {
  allow: 'bg-green-100 text-green-800',
  deny: 'bg-red-100 text-red-800',
};

export function PolicyList({ policies }: { policies: Policy[] }) {
  if (policies.length === 0) {
    return (
      <div className="border border-dashed border-gray-300 rounded-lg p-8 text-center text-gray-400">
        No policies loaded. Is the management service running?
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold text-gray-700">
        Policies ({policies.length})
      </h2>
      <ul className="divide-y divide-gray-200 border border-gray-200 rounded-lg bg-white">
        {policies.map((policy) => (
          <li key={policy.id} className="px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="font-medium">{policy.name}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${domainColors[policy.domain] || 'bg-gray-100 text-gray-600'}`}>
                {policy.domain}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${effectColors[policy.effect] || 'bg-gray-100 text-gray-600'}`}>
                {policy.effect}
              </span>
            </div>
            <span className="text-xs text-gray-400 font-mono">
              {policy.id.slice(0, 8)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
