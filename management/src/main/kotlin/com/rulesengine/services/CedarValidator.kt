package com.rulesengine.services

import com.cedarpolicy.model.policy.PolicySet

object CedarValidator {
    fun validate(cedarSource: String): ValidationResult {
        if (cedarSource.isBlank()) return ValidationResult(false, listOf("Cedar source is empty"))

        return try {
            // Use cedar-java to parse the policy source; throws on invalid syntax
            PolicySet.parsePolicies(cedarSource)
            ValidationResult(true, emptyList())
        } catch (e: Exception) {
            // Surface the cedar-java parse error to the caller
            val message = e.message ?: "Cedar parse error"
            ValidationResult(false, listOf(message))
        }
    }
}

data class ValidationResult(val valid: Boolean, val errors: List<String>)
