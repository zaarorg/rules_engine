package com.rulesengine.services

import kotlinx.serialization.json.*

object CedarGenerator {

    /**
     * Generate a Cedar policy source from structured constraints.
     *
     * @param constraintsJson JSON array of constraint objects (same format as policy_versions.constraints)
     * @param effect "allow" or "deny"
     * @param principal The principal identifier (agent name or group name)
     * @param principalType "agent" or "group"
     * @param actionType Optional specific action type to filter constraints
     */
    fun generate(
        constraintsJson: String,
        effect: String = "allow",
        principal: String? = null,
        principalType: String = "group",
        actionType: String? = null
    ): String {
        val constraints = try {
            Json.parseToJsonElement(constraintsJson).jsonArray
        } catch (e: Exception) {
            throw IllegalArgumentException("Invalid constraints JSON: ${e.message}")
        }

        if (constraints.isEmpty()) {
            throw IllegalArgumentException("Constraints cannot be empty")
        }

        // Group constraints by action
        val byAction = constraints.groupBy { elem ->
            elem.jsonObject["action"]?.jsonPrimitive?.content
                ?: throw IllegalArgumentException("Each constraint must have an 'action' field")
        }.let { map ->
            if (actionType != null) map.filterKeys { it == actionType } else map
        }

        if (byAction.isEmpty()) {
            throw IllegalArgumentException("No constraints found for action type: $actionType")
        }

        val keyword = if (effect == "deny") "forbid" else "permit"

        val blocks = byAction.map { (action, dims) ->
            generateBlock(keyword, action, principal, principalType, dims)
        }

        return blocks.joinToString("\n\n")
    }

    private fun generateBlock(
        keyword: String,
        action: String,
        principal: String?,
        principalType: String,
        dimensions: List<JsonElement>
    ): String {
        val sb = StringBuilder()

        // Header
        sb.appendLine("$keyword (")

        // Principal clause
        if (principal != null) {
            when (principalType) {
                "agent" -> sb.appendLine("  principal == Agent::\"$principal\",")
                "group" -> sb.appendLine("  principal in Group::\"$principal\",")
                else -> sb.appendLine("  principal,")
            }
        } else {
            sb.appendLine("  principal,")
        }

        // Action clause
        sb.appendLine("  action == Action::\"$action\",")

        // Resource clause
        sb.appendLine("  resource")
        sb.appendLine(")")

        // When conditions from dimensions
        val conditions = dimensions.mapNotNull { elem ->
            val obj = elem.jsonObject
            val kind = obj["kind"]?.jsonPrimitive?.content ?: return@mapNotNull null
            val dimension = obj["dimension"]?.jsonPrimitive?.content ?: return@mapNotNull null
            generateCondition(kind, dimension, obj)
        }

        if (conditions.isNotEmpty()) {
            sb.appendLine("when {")
            conditions.forEachIndexed { index, condition ->
                if (index < conditions.size - 1) {
                    sb.appendLine("  $condition &&")
                } else {
                    sb.appendLine("  $condition")
                }
            }
            sb.appendLine("};")
        } else {
            // Remove the closing paren and add a semicolon
            // Actually, Cedar permits without when clauses just end with )
            // Let's add a semicolon after the closing paren
        }

        return sb.toString().trimEnd()
    }

    private fun generateCondition(kind: String, dimension: String, obj: JsonObject): String? {
        return when (kind) {
            "numeric" -> {
                val max = obj["max"]?.jsonPrimitive?.content ?: return null
                "context.$dimension <= $max"
            }
            "set" -> {
                val members = obj["members"]?.jsonArray?.map {
                    "\"${it.jsonPrimitive.content}\""
                } ?: return null
                if (members.size == 1) {
                    "context.$dimension == ${members[0]}"
                } else {
                    "context.$dimension in [${members.joinToString(", ")}]"
                }
            }
            "boolean" -> {
                val value = obj["value"]?.jsonPrimitive?.booleanOrNull ?: return null
                if (value) "context.$dimension == true" else null
            }
            "temporal" -> {
                val conditions = mutableListOf<String>()
                obj["start"]?.jsonPrimitive?.content?.let {
                    conditions.add("context.time >= \"$it\"")
                }
                obj["end"]?.jsonPrimitive?.content?.let {
                    conditions.add("context.time <= \"$it\"")
                }
                if (conditions.isEmpty()) null
                else conditions.joinToString(" && ")
            }
            "rate" -> {
                val max = obj["max"]?.jsonPrimitive?.content ?: return null
                val window = obj["window"]?.jsonPrimitive?.content ?: "1 day"
                "context.${dimension}_count <= $max"
            }
            else -> null
        }
    }
}
