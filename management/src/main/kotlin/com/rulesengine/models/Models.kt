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

// Health
@Serializable
data class HealthResponse(val status: String = "ok")

// Error
@Serializable
data class ErrorResponse(val error: String)
