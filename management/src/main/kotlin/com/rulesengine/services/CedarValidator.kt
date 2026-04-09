package com.rulesengine.services

object CedarValidator {
    fun validate(cedarSource: String): ValidationResult {
        // Phase 1: basic validation — check non-empty and basic Cedar syntax markers
        if (cedarSource.isBlank()) return ValidationResult(false, listOf("Cedar source is empty"))
        // Try to detect basic syntax issues
        val hasPermitOrForbid = cedarSource.contains("permit") || cedarSource.contains("forbid")
        if (!hasPermitOrForbid) return ValidationResult(false, listOf("Cedar policy must contain 'permit' or 'forbid'"))
        return ValidationResult(true, emptyList())
    }
}

data class ValidationResult(val valid: Boolean, val errors: List<String>)
