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

// Action Types & Dimensions
export interface DimensionDefResponse {
  id: string;
  dimensionName: string;
  kind: string;
  numericMax: number | null;
  rateWindow: string | null;
  setMembers: string[] | null;
  boolDefault: boolean | null;
  temporalStart: string | null;
  temporalEnd: string | null;
  temporalExpiry: string | null;
}

export interface ActionTypeWithDimensionsResponse {
  id: string;
  domain: string;
  name: string;
  description: string | null;
  dimensions: DimensionDefResponse[];
}

// Group Memberships
export interface GroupMemberResponse {
  agentId: string;
  agentName: string;
  email: string | null;
  domain: string;
  isActive: boolean;
}

// Effective Policies (RSoP)
export interface EffectivePolicyResponse {
  policyId: string;
  policyName: string;
  effect: string;
  domain: string;
  groupPath: string | null;
  groupName: string | null;
  versionNumber: number;
  constraints: string;
}

// Effective Envelope
export interface DimensionSource {
  level: string;
  groupName: string | null;
  value: string;
}

export interface ResolvedDimension {
  dimensionName: string;
  kind: string;
  effectiveMax: number | null;
  effectiveMembers: string[] | null;
  effectiveValue: boolean | null;
  effectiveStart: string | null;
  effectiveEnd: string | null;
  effectiveExpiry: string | null;
  effectiveRate: number | null;
  effectiveWindow: string | null;
  sources: DimensionSource[];
}

export interface ResolvedAction {
  actionType: string;
  actionName: string;
  dimensions: Record<string, ResolvedDimension>;
  hasDenyOverride: boolean;
  denySource: string | null;
}

export interface EffectiveEnvelopeResponse {
  agentId: string;
  agentName: string;
  actions: ResolvedAction[];
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

// Action Types
export const fetchActionTypes = () => get<ActionTypeWithDimensionsResponse[]>(`${API}/action-types`);
export const fetchActionType = (id: string) => get<ActionTypeWithDimensionsResponse>(`${API}/action-types/${id}`);

// Group Memberships
export const fetchGroupMembers = (groupId: string) => get<GroupMemberResponse[]>(`${API}/groups/${groupId}/members`);
export const addGroupMember = (groupId: string, agentId: string) =>
  post<{ status: string }>(`${API}/groups/${groupId}/members`, { agentId });
export const removeGroupMember = (groupId: string, agentId: string) =>
  del(`${API}/groups/${groupId}/members/${agentId}`);

// Agent Groups
export const fetchAgentGroups = (agentId: string) => get<GroupResponse[]>(`${API}/agents/${agentId}/groups`);

// Effective Policies & Envelope
export const fetchEffectivePolicies = (agentId: string) =>
  get<EffectivePolicyResponse[]>(`${API}/agents/${agentId}/effective-policies`);
export const fetchEffectiveEnvelope = (agentId: string) =>
  get<EffectiveEnvelopeResponse>(`${API}/agents/${agentId}/effective-envelope`);

// Cedar Generation
export const generateCedarFromConstraints = (policyId: string, constraints: string, principal?: string, principalType?: string) =>
  post<PolicyVersionResponse>(`${API}/policies/${policyId}/versions/generate`, {
    constraints, principal, principalType: principalType || 'group',
  });

// Create entities
export const createPolicy = (body: { name: string; domain: string; effect: string; orgId: string }) =>
  post<PolicyResponse>(`${API}/policies`, body);
export const createGroup = (body: { name: string; nodeType: string; path: string; orgId: string; parentId?: string }) =>
  post<GroupResponse>(`${API}/groups`, body);
export const createAgent = (body: { name: string; domain: string; orgId: string; email?: string }) =>
  post<AgentResponse>(`${API}/agents`, body);
