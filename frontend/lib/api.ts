const API = '/api/v1';
const ENGINE = '/engine';

// Types matching the Kotlin management API responses

export interface PolicyResponse {
  id: string;
  name: string;
  domain: string;
  effect: string;
  orgId: string;
  activeVersionId: string | null;
  createdAt: string;
}

export interface PolicyVersionResponse {
  id: string;
  policyId: string;
  versionNumber: number;
  cedarSource: string;
  cedarHash: string | null;
  constraints: string;
  createdAt: string;
}

export interface AgentResponse {
  id: string;
  name: string;
  domain: string;
  orgId: string;
  email: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface GroupResponse {
  id: string;
  name: string;
  nodeType: string;
  path: string;
  orgId: string;
  parentId: string | null;
  createdAt: string;
}

export interface AssignmentResponse {
  id: string;
  policyId: string;
  policyVersionId: string;
  groupId: string | null;
  agentId: string | null;
  assignedAt: string;
}

export interface DecisionLogResponse {
  id: string;
  evaluatedAt: string;
  agentId: string;
  actionTypeId: string;
  requestContext: string;
  bundleHash: string;
  outcome: string;
  reason: string | null;
  matchedVersionId: string | null;
}

export interface CheckResponse {
  decision: string;
  diagnostics: string[];
}

// Fetch helpers

async function get<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GET ${url} failed: ${res.status}`);
  return res.json();
}

async function post<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST ${url} failed: ${res.status}`);
  return res.json();
}

async function del(url: string): Promise<void> {
  const res = await fetch(url, { method: 'DELETE' });
  if (!res.ok) throw new Error(`DELETE ${url} failed: ${res.status}`);
}

// API functions

export const fetchPolicies = () => get<PolicyResponse[]>(`${API}/policies`);
export const fetchPolicy = (id: string) => get<PolicyResponse>(`${API}/policies/${id}`);
export const fetchPolicyVersions = (policyId: string) => get<PolicyVersionResponse[]>(`${API}/policies/${policyId}/versions`);

export const createPolicyVersion = (policyId: string, cedarSource: string, constraints: string = '[]') =>
  post<PolicyVersionResponse>(`${API}/policies/${policyId}/versions`, { cedarSource, constraints });

export const fetchAgents = () => get<AgentResponse[]>(`${API}/agents`);
export const fetchGroups = () => get<GroupResponse[]>(`${API}/groups`);

export const fetchAssignments = (agentId: string) => get<AssignmentResponse[]>(`${API}/agents/${agentId}/assignments`);

export const createAssignment = (body: { policyId: string; policyVersionId: string; groupId?: string; agentId?: string }) =>
  post<AssignmentResponse>(`${API}/assignments`, body);

export const deleteAssignment = (id: string) => del(`${API}/assignments/${id}`);

export const fetchDecisions = (params?: { agentId?: string; limit?: number }) => {
  const qs = new URLSearchParams();
  if (params?.agentId) qs.set('agentId', params.agentId);
  if (params?.limit) qs.set('limit', String(params.limit));
  return get<DecisionLogResponse[]>(`${API}/decisions?${qs}`);
};

export const checkPolicy = (principal: string, action: string, resource: string, context: Record<string, unknown> = {}) =>
  post<CheckResponse>(`${ENGINE}/check`, { principal, action, resource, context });
