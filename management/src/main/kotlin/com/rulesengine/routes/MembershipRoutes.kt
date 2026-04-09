package com.rulesengine.routes

import com.rulesengine.models.*
import com.rulesengine.plugins.NotFoundException
import com.rulesengine.tables.AgentGroupMembershipsTable
import com.rulesengine.tables.AgentsTable
import com.rulesengine.tables.GroupsTable
import io.ktor.http.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import kotlinx.coroutines.Dispatchers
import org.jetbrains.exposed.sql.*
import org.jetbrains.exposed.sql.SqlExpressionBuilder.eq
import org.jetbrains.exposed.sql.transactions.experimental.newSuspendedTransaction
import java.util.UUID

fun Route.membershipRoutes() {
    // Group membership endpoints
    route("/groups/{id}/members") {
        // GET /groups/{id}/members — agents in this group
        get {
            val groupId = call.uuidParam("id")
            val members = newSuspendedTransaction(Dispatchers.IO) {
                // Verify group exists
                GroupsTable.selectAll().where { GroupsTable.id eq groupId }.singleOrNull()
                    ?: throw NotFoundException("Group not found")

                (AgentGroupMembershipsTable innerJoin AgentsTable)
                    .selectAll()
                    .where { AgentGroupMembershipsTable.groupId eq groupId }
                    .map {
                        GroupMemberResponse(
                            agentId = it[AgentsTable.id].toString(),
                            agentName = it[AgentsTable.name],
                            email = it[AgentsTable.email],
                            domain = it[AgentsTable.domain].dbValue,
                            isActive = it[AgentsTable.isActive]
                        )
                    }
            }
            call.respond(members)
        }

        // POST /groups/{id}/members — add agent to group
        post {
            val groupId = call.uuidParam("id")
            val req = call.receive<MembershipRequest>()
            val agentId = UUID.fromString(req.agentId)

            newSuspendedTransaction(Dispatchers.IO) {
                // Verify both exist
                GroupsTable.selectAll().where { GroupsTable.id eq groupId }.singleOrNull()
                    ?: throw NotFoundException("Group not found")
                AgentsTable.selectAll().where { AgentsTable.id eq agentId }.singleOrNull()
                    ?: throw NotFoundException("Agent not found")

                // Check for existing membership
                val existing = AgentGroupMembershipsTable.selectAll()
                    .where {
                        (AgentGroupMembershipsTable.agentId eq agentId) and
                        (AgentGroupMembershipsTable.groupId eq groupId)
                    }.singleOrNull()

                if (existing != null) {
                    throw IllegalArgumentException("Agent is already a member of this group")
                }

                AgentGroupMembershipsTable.insert {
                    it[AgentGroupMembershipsTable.agentId] = agentId
                    it[AgentGroupMembershipsTable.groupId] = groupId
                }
            }
            call.respond(HttpStatusCode.Created, mapOf("status" to "added"))
        }

        // DELETE /groups/{id}/members/{agentId}
        delete("{agentId}") {
            val groupId = call.uuidParam("id")
            val agentId = call.uuidParam("agentId")

            newSuspendedTransaction(Dispatchers.IO) {
                val deleted = AgentGroupMembershipsTable.deleteWhere {
                    (AgentGroupMembershipsTable.agentId eq agentId) and
                    (AgentGroupMembershipsTable.groupId eq groupId)
                }
                if (deleted == 0) throw NotFoundException("Membership not found")
            }
            call.respond(HttpStatusCode.NoContent)
        }
    }

    // Agent's groups endpoint
    route("/agents/{id}/groups") {
        get {
            val agentId = call.uuidParam("id")
            val groups = newSuspendedTransaction(Dispatchers.IO) {
                AgentsTable.selectAll().where { AgentsTable.id eq agentId }.singleOrNull()
                    ?: throw NotFoundException("Agent not found")

                (AgentGroupMembershipsTable innerJoin GroupsTable)
                    .selectAll()
                    .where { AgentGroupMembershipsTable.agentId eq agentId }
                    .map {
                        GroupResponse(
                            id = it[GroupsTable.id].toString(),
                            name = it[GroupsTable.name],
                            nodeType = it[GroupsTable.nodeType],
                            path = it[GroupsTable.path],
                            orgId = it[GroupsTable.orgId].toString(),
                            parentId = it[GroupsTable.parentId]?.toString(),
                            createdAt = it[GroupsTable.createdAt].toString()
                        )
                    }
            }
            call.respond(groups)
        }
    }
}
