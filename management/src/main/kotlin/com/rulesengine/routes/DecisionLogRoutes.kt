package com.rulesengine.routes

import com.rulesengine.models.*
import com.rulesengine.plugins.NotFoundException
import com.rulesengine.tables.DecisionLogTable
import com.rulesengine.tables.DecisionOutcome
import io.ktor.server.response.*
import io.ktor.server.routing.*
import kotlinx.coroutines.Dispatchers
import org.jetbrains.exposed.sql.*
import org.jetbrains.exposed.sql.transactions.experimental.newSuspendedTransaction
import java.util.UUID

fun Route.decisionLogRoutes() {
    route("/decisions") {
        // GET /decisions — list with optional filters and pagination
        get {
            val agentId = call.request.queryParameters["agentId"]
            val outcome = call.request.queryParameters["outcome"]
            val limit = call.request.queryParameters["limit"]?.toIntOrNull() ?: 50
            val offset = call.request.queryParameters["offset"]?.toLongOrNull() ?: 0L

            val decisions = newSuspendedTransaction(Dispatchers.IO) {
                val query = DecisionLogTable.selectAll()

                if (agentId != null) {
                    query.andWhere { DecisionLogTable.agentId eq UUID.fromString(agentId) }
                }
                if (outcome != null) {
                    query.andWhere { DecisionLogTable.outcome eq DecisionOutcome.fromDb(outcome) }
                }

                query
                    .orderBy(DecisionLogTable.evaluatedAt, SortOrder.DESC)
                    .limit(limit)
                    .offset(offset)
                    .map { it.toDecisionLogResponse() }
            }
            call.respond(decisions)
        }

        // GET /decisions/{id}
        get("{id}") {
            val id = call.uuidParam("id")
            val decision = newSuspendedTransaction(Dispatchers.IO) {
                DecisionLogTable.selectAll()
                    .where { DecisionLogTable.id eq id }
                    .singleOrNull()
                    ?.toDecisionLogResponse()
            } ?: throw NotFoundException("Decision log entry not found")
            call.respond(decision)
        }
    }
}

private fun ResultRow.toDecisionLogResponse() = DecisionLogResponse(
    id = this[DecisionLogTable.id].toString(),
    evaluatedAt = this[DecisionLogTable.evaluatedAt].toString(),
    agentId = this[DecisionLogTable.agentId].toString(),
    actionTypeId = this[DecisionLogTable.actionTypeId].toString(),
    requestContext = this[DecisionLogTable.requestContext],
    bundleHash = this[DecisionLogTable.bundleHash],
    outcome = this[DecisionLogTable.outcome].dbValue,
    reason = this[DecisionLogTable.reason],
    matchedVersionId = this[DecisionLogTable.matchedVersionId]?.toString()
)
