package com.rulesengine.routes

import com.rulesengine.models.*
import com.rulesengine.plugins.NotFoundException
import com.rulesengine.tables.PolicyAssignmentsTable
import io.ktor.http.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import kotlinx.coroutines.Dispatchers
import org.jetbrains.exposed.sql.*
import org.jetbrains.exposed.sql.SqlExpressionBuilder.eq
import org.jetbrains.exposed.sql.transactions.experimental.newSuspendedTransaction
import java.util.UUID

fun Route.assignmentRoutes() {
    route("/assignments") {
        // POST /assignments — create
        post {
            val req = call.receive<AssignmentRequest>()
            require(req.groupId != null || req.agentId != null) {
                "Either groupId or agentId must be provided"
            }
            require(!(req.groupId != null && req.agentId != null)) {
                "Only one of groupId or agentId can be provided"
            }

            val id = UUID.randomUUID()
            val assignment = newSuspendedTransaction(Dispatchers.IO) {
                PolicyAssignmentsTable.insert {
                    it[PolicyAssignmentsTable.id] = id
                    it[policyId] = UUID.fromString(req.policyId)
                    it[policyVersionId] = UUID.fromString(req.policyVersionId)
                    it[groupId] = req.groupId?.let { gid -> UUID.fromString(gid) }
                    it[agentId] = req.agentId?.let { aid -> UUID.fromString(aid) }
                }
                PolicyAssignmentsTable.selectAll()
                    .where { PolicyAssignmentsTable.id eq id }
                    .single()
                    .toAssignmentResponse()
            }
            call.respond(HttpStatusCode.Created, assignment)
        }

        // DELETE /assignments/{id}
        delete("{id}") {
            val id = UUID.fromString(call.parameters["id"] ?: throw IllegalArgumentException("Missing id"))
            newSuspendedTransaction(Dispatchers.IO) {
                val deleted = PolicyAssignmentsTable.deleteWhere { PolicyAssignmentsTable.id eq id }
                if (deleted == 0) throw NotFoundException("Assignment not found")
            }
            call.respond(HttpStatusCode.NoContent)
        }
    }

    // GET /agents/{agentId}/assignments — list assignments for an agent (direct only for Phase 1)
    route("/agents/{agentId}/assignments") {
        get {
            val agentId = UUID.fromString(
                call.parameters["agentId"] ?: throw IllegalArgumentException("Missing agentId")
            )
            val assignments = newSuspendedTransaction(Dispatchers.IO) {
                PolicyAssignmentsTable.selectAll()
                    .where { PolicyAssignmentsTable.agentId eq agentId }
                    .map { it.toAssignmentResponse() }
            }
            call.respond(assignments)
        }
    }
}

private fun ResultRow.toAssignmentResponse() = AssignmentResponse(
    id = this[PolicyAssignmentsTable.id].toString(),
    policyId = this[PolicyAssignmentsTable.policyId].toString(),
    policyVersionId = this[PolicyAssignmentsTable.policyVersionId].toString(),
    groupId = this[PolicyAssignmentsTable.groupId]?.toString(),
    agentId = this[PolicyAssignmentsTable.agentId]?.toString(),
    assignedAt = this[PolicyAssignmentsTable.assignedAt].toString()
)
