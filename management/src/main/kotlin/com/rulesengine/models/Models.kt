package com.rulesengine.models

import kotlinx.serialization.Serializable

// Policies
@Serializable
data class PolicyRequest(val name: String, val domain: String, val effect: String, val orgId: String)

@Serializable
data class PolicyResponse(
    val id: String,
    val name: String,
    val domain: String,
    val effect: String,
    val orgId: String,
    val activeVersionId: String? = null,
    // Serialized via OffsetDateTime.toString() which produces ISO 8601 (e.g. 2024-01-15T10:30:00+00:00).
    // May omit trailing second/sub-second zeros. Add a custom serializer if clients need strict RFC 3339.
    val createdAt: String
)

// Policy Versions
@Serializable
data class PolicyVersionRequest(val cedarSource: String, val constraints: String = "[]")

@Serializable
data class PolicyVersionResponse(
    val id: String,
    val policyId: String,
    val versionNumber: Int,
    val cedarSource: String,
    val cedarHash: String? = null,
    val constraints: String,
    val createdAt: String
)

// Agents
@Serializable
data class AgentRequest(val name: String, val domain: String, val orgId: String, val email: String? = null)

@Serializable
data class AgentResponse(
    val id: String,
    val name: String,
    val domain: String,
    val orgId: String,
    val email: String? = null,
    val isActive: Boolean,
    val createdAt: String
)

// Groups
@Serializable
data class GroupRequest(
    val name: String,
    val nodeType: String,
    val path: String,
    val orgId: String,
    val parentId: String? = null
)

@Serializable
data class GroupResponse(
    val id: String,
    val name: String,
    val nodeType: String,
    val path: String,
    val orgId: String,
    val parentId: String? = null,
    val createdAt: String
)

// Assignments
@Serializable
data class AssignmentRequest(
    val policyId: String,
    val policyVersionId: String,
    val groupId: String? = null,
    val agentId: String? = null
)

@Serializable
data class AssignmentResponse(
    val id: String,
    val policyId: String,
    val policyVersionId: String,
    val groupId: String? = null,
    val agentId: String? = null,
    val assignedAt: String
)

// Decision Log
@Serializable
data class DecisionLogResponse(
    val id: String,
    val evaluatedAt: String,
    val agentId: String,
    val actionTypeId: String,
    val requestContext: String,
    val bundleHash: String,
    val outcome: String,
    val reason: String? = null,
    val matchedVersionId: String? = null
)

// Action Types
@Serializable
data class ActionTypeResponse(
    val id: String,
    val domain: String,
    val name: String,
    val description: String? = null
)

@Serializable
data class DimensionDefResponse(
    val id: String,
    val dimensionName: String,
    val kind: String,
    val numericMax: Double? = null,
    val rateWindow: String? = null,
    val setMembers: List<String>? = null,
    val boolDefault: Boolean? = null,
    val temporalStart: String? = null,
    val temporalEnd: String? = null,
    val temporalExpiry: String? = null
)

@Serializable
data class ActionTypeWithDimensionsResponse(
    val id: String,
    val domain: String,
    val name: String,
    val description: String? = null,
    val dimensions: List<DimensionDefResponse>
)

// Memberships
@Serializable
data class GroupMemberResponse(
    val agentId: String,
    val agentName: String,
    val email: String? = null,
    val domain: String,
    val isActive: Boolean
)

@Serializable
data class MembershipRequest(
    val agentId: String
)

// Effective Policies (RSoP)
@Serializable
data class EffectivePolicyResponse(
    val policyId: String,
    val policyName: String,
    val effect: String,
    val domain: String,
    val groupPath: String? = null,
    val groupName: String? = null,
    val versionNumber: Int,
    val constraints: String
)

// Effective Envelope
@Serializable
data class DimensionSource(
    val level: String,
    val groupName: String?,
    val value: String
)

@Serializable
data class ResolvedDimension(
    val dimensionName: String,
    val kind: String,
    val effectiveMax: Double? = null,
    val effectiveMembers: List<String>? = null,
    val effectiveValue: Boolean? = null,
    val effectiveStart: String? = null,
    val effectiveEnd: String? = null,
    val effectiveExpiry: String? = null,
    val effectiveRate: Int? = null,
    val effectiveWindow: String? = null,
    val sources: List<DimensionSource> = emptyList()
)

@Serializable
data class ResolvedAction(
    val actionType: String,
    val actionName: String,
    val dimensions: Map<String, ResolvedDimension>,
    val hasDenyOverride: Boolean = false,
    val denySource: String? = null
)

@Serializable
data class EffectiveEnvelopeResponse(
    val agentId: String,
    val agentName: String,
    val actions: List<ResolvedAction>
)

// Cedar Generation
@Serializable
data class CedarGenerateRequest(
    val constraints: String,
    val principal: String? = null,
    val principalType: String = "group",
    val actionType: String? = null
)

@Serializable
data class CedarGenerateResponse(
    val cedarSource: String
)

// Health
@Serializable
data class HealthResponse(val status: String = "ok")

// Error
@Serializable
data class ErrorResponse(val error: String)
