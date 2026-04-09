# Rules Engine — Dev Log

## 2026-04-09 — Project kickoff and architecture decisions

### What we're building

A rules engine prototype that explores how Cedar + OPA-based policy evaluation works end-to-end: authoring rules, assigning them to agents via group hierarchy, testing them against real policy evaluation, and understanding how the system would operate at enterprise scale.

The goal is **depth of understanding**, not a fully wired production system. The UI should be deep enough to reveal what actually needs to be built. The rules engine itself must actually work — real Cedar evaluation, real policy decisions. Assignment and hierarchy can be stubbed, except where the test harness needs to evaluate a rule against a simulated agent identity.

### Architecture decisions

#### Decision 1: Three-language backend

**Gate / PDP sidecar → Rust**
- Cedar is written in Rust. Native integration, no WASM overhead, no FFI boundary.
- Sub-microsecond policy evaluation is realistic with native Cedar.
- Memory safety without GC pauses matters for a security-critical enforcement layer.
- The gate is infrastructure code: written once, changes rarely, must be fast and correct.
- This is the hot path — every agent action is evaluated here.

**Management plane → Java (Kotlin)**
- JNDI for LDAP/AD is built into the Java standard library. Spring Security, Spring LDAP, Kerberos — all battle-tested at Fortune 500 scale.
- Cedar has official Java bindings (`CedarJava` via JNI to the Rust core).
- Enterprise IT shops have JVM expertise. Customer teams can extend and integrate.
- Kotlin specifically: sealed classes for action types, data classes for schemas, coroutines for async. Better domain modeling than plain Java.
- This is the warm path — admin operations, hierarchy sync, rule authoring backend.

**Frontend → TypeScript / React**
- Standard frontend stack. Next.js + Tailwind + shadcn/ui.
- Same language as the agent SDKs (TypeScript SDK is a primary target).

**Why three languages:** The gate/PDP and management plane have fundamentally different runtime profiles. The gate evaluates policy on every agent action (sub-ms latency requirement). The management plane serves admin UIs and syncs with enterprise infrastructure (AD/LDAP integration requirement). These are different problems best solved by different tools. The Check API is the clean boundary between them — different languages on different sides of a well-defined API is natural architecture, not forced polyglot.

**Prototyping note:** Even in the prototype phase, we practice in the environment we'll perform in. The Rust gate, Kotlin backend, and React frontend are all present from the start. Integration complexity is part of what we're learning.

#### Decision 2: Three authoring surfaces (not four)

We are building **three** rule authoring surfaces:

**1. Structured builder (primary)**
An envelope-oriented interface. You see the full constraint space for an agent/group: every dimension, what's inherited vs locally set, what's petitionable vs hard wall. More like editing a configuration object than "creating a rule." Shows the full picture, not one rule at a time.

Chosen over visual builder (questionnaire/slider approach) because the path from structured builder to a simplified visual builder is clearer than the reverse. The structured builder reveals the actual shape of the data. Simplification comes later once we understand what can be simplified.

**2. Code editor**
Raw Cedar/Rego with syntax highlighting, validation, and live preview. For power users, platform engineers, and edge cases the structured builder can't handle. Also serves as the "show your work" view — toggle it on from either of the other surfaces to see what got generated. Gated by review/CI in production.

**3. Agent-assisted builder**
Works within both the structured builder and code editor contexts. Three modes:

- **Natural language → policy generation.** User describes what they want in English. Agent generates Cedar/OPA, presents it in the structured view, user confirms or adjusts. Onboarding accelerator.
- **Policy analysis and explanation.** User points at existing rules and asks "what can agent X actually do?" or "why was this denied?" Agent reads the Cedar policies, resolves inheritance, explains in plain language. Debugging companion.
- **Dashboard and monitoring generation.** User describes what they want to watch. Agent derives monitoring dashboards from the policy — the queries, visualizations, alert thresholds — scoped to the specific policy dimensions the user cares about. The key insight: every rule set implies things worth monitoring. Dashboards emerge from rules rather than being pre-built.

Agent-generated Cedar/OPA goes through the same validation and testing pipeline as hand-authored policies. The agent is a drafter, not an authorizer.

#### Decision 3: Rule versioning with cryptographic checksums

Every rule edit creates a new immutable version. The policy bundle (the complete set of rules that applied to an agent at a given moment) gets a cryptographic checksum (hash).

**Why this matters beyond basic versioning:** When an agent submits a transaction, the checksum of the active policy bundle is included in the transaction record. This creates a verifiable chain:

- After the fact, you can prove exactly which rules were in effect when an agent acted.
- In a dispute, both parties (agent owner and vendor) can reference the rule set hash to verify whether the purchase was authorized under the policies that were active at that time.
- If someone changes the rules after the fact, the checksum won't match — you can't backdate policy changes to retroactively authorize or deny a transaction.
- Rollback is one click: revert to any previous version, and the checksum trail shows exactly when the revert happened.

This is the "receipt of the whole process" applied to the governance layer itself. Not just "what happened in the transaction" but "what rules governed the transaction, provably."

#### Decision 4: Three domains for the prototype

**Finance** — actions that move or commit money.
| Action | Key dimensions |
|--------|---------------|
| `purchase.initiate` | amount (numeric), vendor (set), category (set), payment_method (set), requires_approval (boolean/threshold) |
| `purchase.recurring` | amount_per_period (numeric), period (temporal), vendor (set), auto_renew (boolean) |
| `budget.allocate` | amount (numeric), recipient_group (set), category (set), duration (temporal) |
| `refund.request` | amount (numeric), original_transaction_id (ref), reason (set) |
| `expense.submit` | amount (numeric), category (set), receipt_required (boolean/threshold) |

**Communication** — actions that send information to humans or external systems.
| Action | Key dimensions |
|--------|---------------|
| `email.send` | recipients (set + count), domain (set: internal/external), attachments (boolean), contains_pii (boolean) |
| `email.read` | mailboxes (set), date_range (temporal) |
| `slack.send` | channels (set), mentions (boolean), external_channels (boolean) |
| `meeting.schedule` | participants (set + count), duration (temporal), external_participants (boolean) |
| `document.share` | classification (set: public/internal/confidential), recipients (set), external (boolean) |

**Agent Delegation** — actions where one agent controls or provisions other agents.
| Action | Key dimensions |
|--------|---------------|
| `agent.provision` | max_child_count (numeric), envelope_scope (subset of parent), ttl (temporal), action_types (set) |
| `agent.delegate` | task_type (set), resource_scope (set), duration (temporal), can_sub_delegate (boolean) |
| `agent.revoke` | target_agent (ref), cascade (boolean) |
| `agent.monitor` | target_agents (set), metrics (set), alert_thresholds (numeric) |

The delegation domain is notable because the rules engine governs itself — the policy about how agents create sub-agents is evaluated by the same engine that evaluates those sub-agents' actions.

#### Decision 5: Conflict visualization

When rules from different hierarchy levels interact, the UI shows where conflicts exist and how they resolve. Not just "deny-overrides" as a principle — actually render it: "this permit from Team:Finance is overridden by this forbid from Org:Global because forbid wins." This is the RSoP (Resultant Set of Policy) view.

#### Decision 6: Test harness as REPL + dry-run mode

**REPL mode:** Select (or type) an agent identity, type an action with params, see the result instantly. Tweak params, run again. Rapid iteration. Batch mode: define N test cases, run all, show pass/fail. Batch becomes the regression suite when rules change.

**Dry-run mode:** Before deploying a rule change, run it against historical actions (from audit logs) and show what would have changed. "This new rule would have denied 3 of the last 100 purchases by the marketing team. Here they are." Safety net for confident rule changes.

### What's stubbed vs real

| Component | Status |
|-----------|--------|
| Cedar policy evaluation | **Real** — Rust-native Cedar engine |
| OPA policy evaluation | **Real** — for quantitative rules |
| Rule authoring (structured builder) | **Real UI** — generates actual Cedar/OPA |
| Rule authoring (code editor) | **Real UI** — edits actual Cedar/OPA with validation |
| Agent-assisted builder | **Real UI** — agent generates actual policies |
| Test harness / REPL | **Real** — evaluates against actual Cedar/OPA engine |
| Policy versioning + checksums | **Real** — immutable versions with hashes |
| Conflict visualization | **Real UI** — resolves actual policy inheritance |
| Dry-run mode | **Real** — replays against actual engine |
| Group hierarchy / org tree | **Stubbed** — sample org structure, not full management |
| Agent assignment | **Stubbed** — mock agent identities for testing |
| AD/LDAP integration | **Stubbed** — Kotlin backend structure in place, connectors not wired |
| Gate / PDP sidecar | **Stubbed** — Rust project structure, Check API defined, not deployed as sidecar |
| Payment / transaction integration | **Out of scope** |
| Storefront SDK | **Out of scope** |

---

## 2026-04-09 — Research synthesis: resolving open questions

Four open questions from the kickoff, researched against existing systems and prior art. Findings and decisions below.

### Q1: How does the agent-assisted builder validate its output?

**What exists:**
- **Apple's Prose2Policy** (NL → Rego pipeline) auto-generates test cases and measures: 82.2% positive test accuracy, 98.9% negative test accuracy, 95.3% compilation rate. The pattern: generate the policy, then generate test cases that exercise the policy's intent, run them automatically.
- **Cedar's formal verification** uses SMT solvers to prove properties like "forbid overrides permit" mathematically. Combined with differential random testing (100M tests nightly) against a verified Dafny specification.
- **OPA's `opa test` framework** with mock data injection via `with` keyword — standard CI/CD integration.
- **Microsoft AGT** runs sub-millisecond deterministic policy evaluation as a runtime gate — policies are validated on every action.

**Decision: Three-tier validation stack.**
1. **Tier 1 — Auto-generated test cases.** When the agent generates a policy from NL, it also generates positive and negative test cases ("this should be permitted," "this should be denied") derived from the user's description. These run automatically before the user sees the result. The user sees: "Here's what I generated. Here are 8 test cases I ran. All passed. Here are 2 edge cases I want you to review."
2. **Tier 2 — Cedar formal analysis.** Run Cedar's SMT solver to check logical consistency (no contradictions, forbid/permit conflicts identified, unreachable rules flagged). This catches structural errors the test cases might miss.
3. **Tier 3 — Plain-language summary + diff.** The agent presents a plain-language explanation of what the policy does alongside the structured/code view. The user confirms intent matches output. If editing an existing policy, show a diff of what changed in both Cedar and plain language.

The agent is a drafter with a built-in QA step. It never presents unvalidated output.

### Q2: Checksum algorithm and what's included in the hash

**What exists:**
- **OPA's `.signatures.json`** — JWT containing SHA-256 hashes of all policy files in a bundle. Hashes verified on load; bundles fail to activate if signatures don't match. Decision logs capture bundle ID + revision with each query result.
- **Certificate Transparency (RFC 6962)** — Merkle tree append-only logs with Signed Certificate Timestamps (SCTs) proving inclusion at decision time.
- **AWS Verified Permissions** — logs every authorization decision with policy version info via CloudTrail.
- **SOX compliance** — requires logging "what changed, by whom, when, why."

**Decision: OPA's bundle signature model as baseline.**
- **Algorithm:** SHA-256 (industry standard, used by OPA, CT logs, and every major audit system).
- **What's in the hash:** Policy source files only (Cedar + OPA Rego). Entity/relationship data and schema versions are versioned separately — they change at different rates and for different reasons. Including them in the policy hash would cause unnecessary hash churn.
- **What the gate stamps on each decision:** `bundle_id + bundle_hash + timestamp + decision + reason_code`. The full policy source is never sent over the wire — only the hash reference. If you need to retrieve the policy that governed a specific decision, you query the policy version store by hash.
- **Append-only decision log:** Every gate decision is logged immutably. Merkle consistency proofs (RFC 6962 style) available if cryptographic log integrity is needed at audit time (e.g., for regulatory disputes).
- **Transaction record includes:** `policy_bundle_hash + decision_timestamp + gate_instance_id`. This is the non-repudiation chain — you can prove which rules governed any historical action.

**Key principle: policy hash and entity data hash are separate.** Don't mix them. Policy changes are governance decisions (audited, versioned, reviewed). Entity data changes are operational (agents added/removed, group memberships updated). Different audit trails.

### Q3: Dry-run mode for stateful rules (budgets, rate limits)

**What exists:**
- **Nobody does this well.** The research found no system that explicitly simulates stateful progression across replayed historical actions.
- **Financial backtesting** solves an analogous problem via strict chronological event replay through a matching engine. Each event updates cumulative state. This is event sourcing.
- **OPA** snapshots external data at decision time in decision logs, but doesn't simulate state progression.
- **AD RSoP** simulates future policy application to a specific target — static composition, not stateful replay.
- **Envoy/nginx rate limiting** offers shadow mode (evaluate without enforcing) but requires live traffic, not historical replay.
- **XState** stores events in an immutable log and rebuilds state by replaying events sequentially to a fresh actor.

**Decision: Event sourcing approach for dry-run.**
- **Stateless rules (Cedar permit/deny):** Trivial replay. Re-evaluate each historical action independently against the new rule set. Show which decisions changed.
- **Stateful rules (OPA budgets, rate limits):** Treat state changes as events in an ordered log. Replay historical actions chronologically through a fresh OPA instance with zeroed counters. Each action updates the cumulative state (spend tracker, rate counter) before evaluating the next. This is the financial backtesting model applied to policy evaluation.
- **What the user sees:** "I replayed 100 historical actions against your proposed rule change. 97 decisions unchanged. 3 would have been denied (action #34, #67, #89). Here they are, with the state at each point." For stateful rules, also show the state trajectory: "Budget counter hit $45K at action #67, which triggered the new $45K cap — under the old $50K cap this would have been permitted."
- **Implementation:** The decision log already captures inputs for every action. Dry-run spins up a temporary OPA instance, seeds it with initial state (or zero state), replays the action sequence, collects decisions and state snapshots at each step.

This is computationally more expensive than stateless replay but bounded — you're replaying a finite historical window, not running indefinitely.

### Q4: Rendering subset relationships in a form (structured builder for delegation)

**What exists:**

Multiple proven patterns from enterprise admin UIs:

- **AD Group Policy RSoP** — shows which GPO contributes each setting at each scope level. The admin sees the "stack" of policy sources that produce the final result. Gold standard for inheritance visualization.
- **AWS IAM Permissions Boundaries** — the boundary is a ceiling; the effective permission is the *intersection* of the boundary and the granted policy. Visually, the boundary operates as a filter over what's granted.
- **Azure RBAC blade** — each scope level (management group → subscription → resource group → resource) is explicit, with inherited assignments visually distinct from local assignments.
- **Firebase Rules simulator** — shows evaluation traces; you can mouseover subexpressions to see which rules evaluated to allow/deny. Real-time feedback as the admin types.
- **Salesforce Combined Security Report** — layers profile permissions with each permission set, showing cumulative grants.

**Core UX pattern: none of these show a blank form.** All provide context alongside the editor.

**Decision: Two-panel envelope editor with real-time validation.**

Left panel (read-only): the parent's effective envelope. Every dimension shown with its current bound. Color-coded: green = locally set by parent, blue = inherited from grandparent+. This is the ceiling — the child cannot exceed anything shown here.

Right panel (editable): the child's envelope. Each dimension shows:
- The parent's bound (grayed out, as reference)
- The child's current value (editable)
- A visual indicator if the child's value equals the parent's (fully inherited) vs. is narrower (locally tightened)
- **Red validation** if the edit would violate the parent's bound — the save button is disabled, with an explanation ("amount ceiling of $30,000 exceeds parent's $25,000 limit")

For set-type dimensions (e.g., allowed vendors): the parent's set is the universe. The child can only select from within that universe. Disabled checkboxes for items not in the parent's set.

For the delegation domain specifically (`agent.provision` where envelope_scope must be subset of parent): render it as a **nested envelope preview**. The admin configures the child's proposed envelope, and a collapsed summary shows "this child would be able to: [purchase up to $X from vendors Y, Z] [send email to internal only] [no further delegation]" — derived from the envelope, not hand-written.

**The key insight from the research:** show the evaluation result as the admin edits, not after submission. Real-time validation makes the subset constraint feel like a natural boundary, not an error message.

---

## 2026-04-09 — Prior art and competitive landscape

### What we're borrowing from (25+ years of directory/policy management)

**Active Directory Group Policy** remains the blueprint. The core pattern works: GPOs linked to OUs, inheritance cascading down, RSoP for audit, GPMC for centralized authoring. Enterprises manage hundreds to thousands of GPOs. Known pain points we should avoid:
- **GPO sprawl** — too many fine-grained policies become unmanageable. Our answer: templates, group-level policies, envelope inheritance reducing per-agent configuration.
- **Inheritance confusion** — unclear which policies apply where. Our answer: real-time RSoP-style effective envelope preview, conflict visualization.
- **Testing difficulty** — no good way to test policy changes before deployment. Our answer: REPL test harness, dry-run replay, auto-generated test cases.
- **Slow replication** — policy changes take time to propagate. Our answer: versioned bundles with explicit rollout (canary → full), not background replication.

**FreeIPA / Red Hat IdM** replicates AD's model for Linux. Adds nothing fundamentally new to the abstraction. Confirms the pattern is universal, not Windows-specific.

**Modern cloud directories (JumpCloud, Okta, Azure Entra ID)** rebrand the pattern with better UX: templated policy creation, dynamic group membership rules, multi-platform support, delegated administration. The core model is identical. Entra ID adds management groups (hierarchy above subscriptions). JumpCloud adds cross-OS. None have solved the "hierarchical constraint envelope" problem for agents.

### What exists for AI agent governance specifically

**Microsoft Agent Governance Toolkit (April 2026)** — current state of the art for enterprise agent governance. First toolkit to address all 10 OWASP agentic AI risks. Sub-millisecond deterministic enforcement. Supports YAML + OPA Rego + Cedar. Compliance mapping (EU AI Act, HIPAA, SOC2). Admin model mirrors traditional policy engines: define policies, apply to agent groups, audit via logging. **Closest to what we're building, but lacks:** hierarchical envelope model, delegation workflows, admin UX for non-engineers, testing/staging workflows, cross-org federation.

**AWS Bedrock AgentCore (March 2026 GA)** — Cedar-based policy authoring with NL-to-Cedar transpilation. Two modes: log-only vs. enforce. Scoped to gateways. Less mature admin surface than AGT. **Notable:** they're already using Cedar for agent governance, validating our engine choice.

**OpenAI ChatGPT Enterprise** — simple workspace-scoped RBAC. Admin controls per app (enable/disable toggle). No declarative policies, no fine-grained constraints. Role-based feature gates, not policy-as-code.

**Startups (Knostic, Lasso, Prompt Security, Robust Intelligence)** — focused narrowly on data access controls, LLM I/O filtering, supply-chain risk (MCP servers). None offer hierarchical group policy or enterprise-scale admin delegation.

**NIST AI Agent Standards Initiative (Feb 2026)** — calls for enterprise-grade agent identity, least-privilege task scoping, just-in-time access. No prescriptive tooling guidance yet.

**OWASP Top 10 for Agentic Applications (Dec 2025)** — identifies the risks. Microsoft AGT is the first complete solution attempt.

### The gap we're filling

There's a 20-year sophistication gap between AD's policy management and current agent governance UIs. Nobody yet combines:
1. **Hierarchical group policies** with agent fleet management (AGT has it partially; startups don't)
2. **Envelope-based constraints** with admin delegation workflows (none do this)
3. **Multi-language policy support** (Cedar/Rego) with intuitive authoring for non-engineers (AWS NL-to-Cedar is a start)
4. **Testing/staging workflows** for policies before fleet-wide rollout (AD has RSoP; AGT has log-only mode; neither is mature)
5. **Agent-assisted policy creation** with auto-validation (nobody)
6. **Cross-org federated verification** with portable agent identity (nobody)

We're building at a moment when the industry is borrowing AD's abstractions but hasn't figured out the admin UX. The abstractions are proven. The UX is the open problem.

### Open questions for next sessions

- What does the project structure look like for a Rust + Kotlin + React monorepo? Cargo workspace + Gradle + Next.js?
- Which Cedar SDK do we start with — Rust native for the gate prototype, or CedarJava for the Kotlin management plane? Both?
- How do we wire Cedar WASM into the React frontend for the test harness REPL (client-side evaluation for instant feedback)?
- What's the minimal data model to support the three domains (finance, communication, delegation) with envelope inheritance?
