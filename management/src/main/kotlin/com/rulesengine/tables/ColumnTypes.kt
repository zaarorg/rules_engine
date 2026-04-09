package com.rulesengine.tables

import org.jetbrains.exposed.sql.Column
import org.jetbrains.exposed.sql.StringColumnType
import org.jetbrains.exposed.sql.Table

// Custom LTREE column type for PostgreSQL hierarchical paths
class LtreeColumnType : StringColumnType() {
    override fun sqlType(): String = "LTREE"
}

fun Table.ltree(name: String): Column<String> =
    registerColumn(name, LtreeColumnType())

// PostgreSQL native enum helper
inline fun <reified T : Enum<T>> Table.pgEnum(
    name: String,
    enumTypeName: String,
    noinline fromDb: (String) -> T,
    noinline toDb: (T) -> String
): Column<T> {
    return customEnumeration(name, enumTypeName, { fromDb(it as String) }, { toDb(it) })
}

// Kotlin enum types matching the PostgreSQL enums.
// Each enum uses the same fromDb()/dbValue pattern — intentionally kept explicit per-enum for readability.
enum class DomainEnum(val dbValue: String) {
    finance("finance"),
    communication("communication"),
    agent_delegation("agent_delegation");

    companion object {
        fun fromDb(value: String): DomainEnum = entries.first { it.dbValue == value }
    }
}

enum class PolicyEffect(val dbValue: String) {
    allow("allow"),
    deny("deny");

    companion object {
        fun fromDb(value: String): PolicyEffect = entries.first { it.dbValue == value }
    }
}

enum class DecisionOutcome(val dbValue: String) {
    allow("allow"),
    deny("deny"),
    not_applicable("not_applicable"),
    error("error");

    companion object {
        fun fromDb(value: String): DecisionOutcome = entries.first { it.dbValue == value }
    }
}

enum class DimensionKind(val dbValue: String) {
    numeric("numeric"),
    rate("rate"),
    set("set"),
    boolean("boolean"),
    temporal("temporal");

    companion object {
        fun fromDb(value: String): DimensionKind = entries.first { it.dbValue == value }
    }
}
