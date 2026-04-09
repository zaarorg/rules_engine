package com.rulesengine.services

import com.rulesengine.models.*
import com.rulesengine.plugins.NotFoundException
import com.rulesengine.tables.*
import kotlinx.coroutines.Dispatchers
import kotlinx.serialization.json.*
import org.jetbrains.exposed.sql.*
import org.jetbrains.exposed.sql.transactions.experimental.newSuspendedTransaction
import java.util.UUID

object EnvelopeResolver {

    suspend fun resolve(agentId: UUID): EffectiveEnvelopeResponse {
        return newSuspendedTransaction(Dispatchers.IO) {
            // 1. Verify agent exists
            val agentRow = AgentsTable.selectAll()
                .where { AgentsTable.id eq agentId }
                .singleOrNull() ?: throw NotFoundException("Agent not found")

            val agentName = agentRow[AgentsTable.name]

            // 2. Get agent's direct group memberships
            val directGroups = (AgentGroupMembershipsTable innerJoin GroupsTable)
                .selectAll()
                .where { AgentGroupMembershipsTable.agentId eq agentId }
                .map { it[GroupsTable.id] to it[GroupsTable.path] }

            if (directGroups.isEmpty()) {
                return@newSuspendedTransaction EffectiveEnvelopeResponse(
                    agentId = agentId.toString(),
                    agentName = agentName,
                    actions = emptyList()
                )
            }

            // 3. Find all ancestor groups via ltree @> (path contains)
            // For each direct group path, find all groups whose path is an ancestor
            val allGroupIds = mutableSetOf<UUID>()
            val groupPathMap = mutableMapOf<UUID, String>() // groupId -> path
            val groupNameMap = mutableMapOf<UUID, String>() // groupId -> name

            for ((groupId, path) in directGroups) {
                allGroupIds.add(groupId)
                // Find ancestors: groups whose path is a prefix of this group's path
                // Using ltree: ancestor.path @> descendant.path
                val ancestors = GroupsTable.selectAll()
                    .where {
                        LtreeOp(GroupsTable.path, path)
                    }
                    .map { Triple(it[GroupsTable.id], it[GroupsTable.path], it[GroupsTable.name]) }

                for ((aId, aPath, aName) in ancestors) {
                    allGroupIds.add(aId)
                    groupPathMap[aId] = aPath
                    groupNameMap[aId] = aName
                }
            }

            // 4. Get all policy assignments for these groups + direct agent assignments
            val groupAssignments = PolicyAssignmentsTable
                .selectAll()
                .where { PolicyAssignmentsTable.groupId inList allGroupIds }
                .map { it[PolicyAssignmentsTable.policyVersionId] to it[PolicyAssignmentsTable.groupId] }

            val agentAssignments = PolicyAssignmentsTable
                .selectAll()
                .where { PolicyAssignmentsTable.agentId eq agentId }
                .map { it[PolicyAssignmentsTable.policyVersionId] to null as UUID? }

            val allAssignments = groupAssignments + agentAssignments
            if (allAssignments.isEmpty()) {
                return@newSuspendedTransaction EffectiveEnvelopeResponse(
                    agentId = agentId.toString(),
                    agentName = agentName,
                    actions = emptyList()
                )
            }

            // 5. Load all referenced policy versions with their policies
            val versionIds = allAssignments.map { it.first }.toSet()
            val versionRows = (PolicyVersionsTable innerJoin PoliciesTable)
                .selectAll()
                .where { PolicyVersionsTable.id inList versionIds }

            val versionMap = versionRows.associate { row ->
                row[PolicyVersionsTable.id] to Pair(
                    row[PoliciesTable.name],
                    Pair(row[PoliciesTable.effect].dbValue, row[PolicyVersionsTable.constraints])
                )
            }

            val entries = allAssignments.mapNotNull { (versionId, groupId) ->
                val (policyName, effectAndConstraints) = versionMap[versionId] ?: return@mapNotNull null
                val (effect, constraints) = effectAndConstraints
                PolicyEntry(
                    policyName = policyName,
                    effect = effect,
                    constraints = constraints,
                    groupId = groupId,
                    groupPath = groupId?.let { groupPathMap[it] },
                    groupName = groupId?.let { groupNameMap[it] }
                )
            }

            // 6. Parse constraints and resolve per action type
            val resolvedActions = resolveConstraints(entries, agentName)

            EffectiveEnvelopeResponse(
                agentId = agentId.toString(),
                agentName = agentName,
                actions = resolvedActions
            )
        }
    }

    suspend fun effectivePolicies(agentId: UUID): List<EffectivePolicyResponse> {
        return newSuspendedTransaction(Dispatchers.IO) {
            AgentsTable.selectAll()
                .where { AgentsTable.id eq agentId }
                .singleOrNull() ?: throw NotFoundException("Agent not found")

            // Get agent's direct groups
            val directGroups = (AgentGroupMembershipsTable innerJoin GroupsTable)
                .selectAll()
                .where { AgentGroupMembershipsTable.agentId eq agentId }
                .map { it[GroupsTable.id] to it[GroupsTable.path] }

            val allGroupIds = mutableSetOf<UUID>()
            val groupPathMap = mutableMapOf<UUID, String>()
            val groupNameMap = mutableMapOf<UUID, String>()

            for ((_, path) in directGroups) {
                val ancestors = GroupsTable.selectAll()
                    .where { LtreeOp(GroupsTable.path, path) }
                    .map { Triple(it[GroupsTable.id], it[GroupsTable.path], it[GroupsTable.name]) }
                for ((aId, aPath, aName) in ancestors) {
                    allGroupIds.add(aId)
                    groupPathMap[aId] = aPath
                    groupNameMap[aId] = aName
                }
            }

            // Group assignments
            val policyJoin = PolicyAssignmentsTable
                .innerJoin(PolicyVersionsTable, { PolicyAssignmentsTable.policyVersionId }, { PolicyVersionsTable.id })
                .innerJoin(PoliciesTable, { PolicyVersionsTable.policyId }, { PoliciesTable.id })

            val groupResults = if (allGroupIds.isNotEmpty()) {
                policyJoin
                    .selectAll()
                    .where { PolicyAssignmentsTable.groupId inList allGroupIds }
                    .map { row ->
                        val gId = row[PolicyAssignmentsTable.groupId]
                        EffectivePolicyResponse(
                            policyId = row[PoliciesTable.id].toString(),
                            policyName = row[PoliciesTable.name],
                            effect = row[PoliciesTable.effect].dbValue,
                            domain = row[PoliciesTable.domain].dbValue,
                            groupPath = gId?.let { groupPathMap[it] },
                            groupName = gId?.let { groupNameMap[it] },
                            versionNumber = row[PolicyVersionsTable.versionNumber],
                            constraints = row[PolicyVersionsTable.constraints]
                        )
                    }
            } else emptyList()

            // Direct agent assignments
            val agentResults = policyJoin
                .selectAll()
                .where { PolicyAssignmentsTable.agentId eq agentId }
                .map { row ->
                    EffectivePolicyResponse(
                        policyId = row[PoliciesTable.id].toString(),
                        policyName = row[PoliciesTable.name],
                        effect = row[PoliciesTable.effect].dbValue,
                        domain = row[PoliciesTable.domain].dbValue,
                        groupPath = null,
                        groupName = "Direct (agent)",
                        versionNumber = row[PolicyVersionsTable.versionNumber],
                        constraints = row[PolicyVersionsTable.constraints]
                    )
                }

            groupResults + agentResults
        }
    }

    private data class PolicyEntry(
        val policyName: String,
        val effect: String,
        val constraints: String,
        val groupId: UUID?,
        val groupPath: String?,
        val groupName: String?
    )

    private fun resolveConstraints(entries: List<PolicyEntry>, agentName: String): List<ResolvedAction> {
        val allConstraints = mutableListOf<ConstraintEntry>()
        val denyEntries = mutableListOf<PolicyEntry>()

        for (entry in entries) {
            if (entry.effect == "deny") {
                denyEntries.add(entry)
            }
            try {
                val arr = Json.parseToJsonElement(entry.constraints).jsonArray
                for (elem in arr) {
                    val obj = elem.jsonObject
                    val action = obj["action"]?.jsonPrimitive?.content ?: continue
                    val dimension = obj["dimension"]?.jsonPrimitive?.content ?: continue
                    val kind = obj["kind"]?.jsonPrimitive?.content ?: continue
                    allConstraints.add(ConstraintEntry(
                        action = action,
                        dimension = dimension,
                        kind = kind,
                        json = obj,
                        policyName = entry.policyName,
                        effect = entry.effect,
                        groupPath = entry.groupPath,
                        groupName = entry.groupName
                    ))
                }
            } catch (_: Exception) {
                // Skip unparseable constraints
            }
        }

        // Group by action
        val byAction = allConstraints.groupBy { it.action }

        // Check deny entries for action-level deny overrides
        val denyByAction = mutableMapOf<String, String>() // action -> deny policy name
        for (entry in denyEntries) {
            try {
                val arr = Json.parseToJsonElement(entry.constraints).jsonArray
                for (elem in arr) {
                    val action = elem.jsonObject["action"]?.jsonPrimitive?.content ?: continue
                    val isDeny = elem.jsonObject["deny"]?.jsonPrimitive?.booleanOrNull ?: false
                    if (isDeny) {
                        denyByAction[action] = entry.policyName
                    }
                }
            } catch (_: Exception) {}
        }

        return byAction.map { (actionName, constraints) ->
            // Group by dimension within this action
            val byDimension = constraints.groupBy { it.dimension }

            val resolvedDimensions = byDimension.map { (dimName, dimConstraints) ->
                val kind = dimConstraints.first().kind
                resolveDimension(dimName, kind, dimConstraints)
            }.associateBy { it.dimensionName }

            ResolvedAction(
                actionType = actionName,
                actionName = actionName.replace(".", " ").replaceFirstChar { it.uppercase() },
                dimensions = resolvedDimensions,
                hasDenyOverride = denyByAction.containsKey(actionName),
                denySource = denyByAction[actionName]
            )
        }
    }

    private data class ConstraintEntry(
        val action: String,
        val dimension: String,
        val kind: String,
        val json: JsonObject,
        val policyName: String,
        val effect: String,
        val groupPath: String?,
        val groupName: String?
    )

    private fun resolveDimension(
        dimName: String,
        kind: String,
        constraints: List<ConstraintEntry>
    ): ResolvedDimension {
        val sources = constraints.map { c ->
            val level = c.groupPath?.count { it == '.' }?.let { depth ->
                when (depth) {
                    0 -> "org"
                    1 -> "department"
                    else -> "team"
                }
            } ?: "agent"
            DimensionSource(
                level = level,
                groupName = c.groupName,
                value = formatSourceValue(c.kind, c.json)
            )
        }

        return when (kind) {
            "numeric" -> {
                // Intersection: take minimum max value
                val maxValues = constraints.mapNotNull {
                    it.json["max"]?.jsonPrimitive?.doubleOrNull
                }
                ResolvedDimension(
                    dimensionName = dimName,
                    kind = kind,
                    effectiveMax = maxValues.minOrNull(),
                    sources = sources
                )
            }
            "set" -> {
                // Intersection: only keep members present in ALL sets
                val sets = constraints.mapNotNull { c ->
                    c.json["members"]?.jsonArray?.map { it.jsonPrimitive.content }?.toSet()
                }
                val intersection = if (sets.isNotEmpty()) {
                    sets.reduce { acc, s -> acc.intersect(s) }
                } else emptySet()
                ResolvedDimension(
                    dimensionName = dimName,
                    kind = kind,
                    effectiveMembers = intersection.toList(),
                    sources = sources
                )
            }
            "boolean" -> {
                // OR: if any policy requires approval, it's required
                val values = constraints.mapNotNull {
                    it.json["value"]?.jsonPrimitive?.booleanOrNull
                }
                ResolvedDimension(
                    dimensionName = dimName,
                    kind = kind,
                    effectiveValue = values.any { it },
                    sources = sources
                )
            }
            "temporal" -> {
                // Tightest window: latest start, earliest end
                val starts = constraints.mapNotNull { it.json["start"]?.jsonPrimitive?.content }
                val ends = constraints.mapNotNull { it.json["end"]?.jsonPrimitive?.content }
                val expiries = constraints.mapNotNull { it.json["expiry"]?.jsonPrimitive?.content }
                ResolvedDimension(
                    dimensionName = dimName,
                    kind = kind,
                    effectiveStart = starts.maxOrNull(), // latest start
                    effectiveEnd = ends.minOrNull(),     // earliest end
                    effectiveExpiry = expiries.minOrNull(), // earliest expiry
                    sources = sources
                )
            }
            "rate" -> {
                // Take minimum rate limit
                val rates = constraints.mapNotNull { it.json["max"]?.jsonPrimitive?.intOrNull }
                val windows = constraints.mapNotNull { it.json["window"]?.jsonPrimitive?.content }
                ResolvedDimension(
                    dimensionName = dimName,
                    kind = kind,
                    effectiveRate = rates.minOrNull(),
                    effectiveWindow = windows.firstOrNull(),
                    sources = sources
                )
            }
            else -> ResolvedDimension(dimensionName = dimName, kind = kind, sources = sources)
        }
    }

    private fun formatSourceValue(kind: String, json: JsonObject): String {
        return when (kind) {
            "numeric" -> json["max"]?.jsonPrimitive?.content?.let { "max $it" } ?: "—"
            "set" -> json["members"]?.jsonArray?.joinToString(", ") { it.jsonPrimitive.content } ?: "—"
            "boolean" -> json["value"]?.jsonPrimitive?.content ?: "—"
            "temporal" -> {
                val start = json["start"]?.jsonPrimitive?.content ?: "?"
                val end = json["end"]?.jsonPrimitive?.content ?: "?"
                "$start–$end"
            }
            "rate" -> {
                val max = json["max"]?.jsonPrimitive?.content ?: "?"
                val window = json["window"]?.jsonPrimitive?.content ?: "?"
                "$max per $window"
            }
            else -> "—"
        }
    }
}

/**
 * Custom Exposed expression for ltree ancestor query: column @> value
 * Returns TRUE if column's path is an ancestor of (or equal to) the given descendant path.
 */
class LtreeOp(
    private val column: Column<String>,
    private val descendantPath: String
) : Op<Boolean>() {
    override fun toQueryBuilder(queryBuilder: QueryBuilder) {
        queryBuilder {
            append(column)
            append(" @> '")
            append(descendantPath)
            append("'::ltree")
        }
    }
}
