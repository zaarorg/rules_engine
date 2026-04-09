package com.rulesengine.routes

import com.rulesengine.models.*
import com.rulesengine.plugins.NotFoundException
import com.rulesengine.tables.AgentsTable
import com.rulesengine.tables.DomainEnum
import io.ktor.http.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import kotlinx.coroutines.Dispatchers
import org.jetbrains.exposed.sql.*
import org.jetbrains.exposed.sql.SqlExpressionBuilder.eq
import org.jetbrains.exposed.sql.transactions.experimental.newSuspendedTransaction
import java.util.UUID

fun Route.agentRoutes() {
    route("/agents") {
        // GET /agents — list all
        get {
            val agents = newSuspendedTransaction(Dispatchers.IO) {
                AgentsTable.selectAll().map { it.toAgentResponse() }
            }
            call.respond(agents)
        }

        // POST /agents — create
        post {
            val req = call.receive<AgentRequest>()
            val id = UUID.randomUUID()
            val agent = newSuspendedTransaction(Dispatchers.IO) {
                AgentsTable.insert {
                    it[AgentsTable.id] = id
                    it[orgId] = UUID.fromString(req.orgId)
                    it[name] = req.name
                    it[email] = req.email
                    it[domain] = DomainEnum.fromDb(req.domain)
                }
                AgentsTable.selectAll().where { AgentsTable.id eq id }.single().toAgentResponse()
            }
            call.respond(HttpStatusCode.Created, agent)
        }

        // GET /agents/{id}
        get("{id}") {
            val id = UUID.fromString(call.parameters["id"] ?: throw IllegalArgumentException("Missing id"))
            val agent = newSuspendedTransaction(Dispatchers.IO) {
                AgentsTable.selectAll().where { AgentsTable.id eq id }.singleOrNull()?.toAgentResponse()
            } ?: throw NotFoundException("Agent not found")
            call.respond(agent)
        }

        // PUT /agents/{id}
        put("{id}") {
            val id = UUID.fromString(call.parameters["id"] ?: throw IllegalArgumentException("Missing id"))
            val req = call.receive<AgentRequest>()
            val agent = newSuspendedTransaction(Dispatchers.IO) {
                val updated = AgentsTable.update({ AgentsTable.id eq id }) {
                    it[name] = req.name
                    it[email] = req.email
                    it[domain] = DomainEnum.fromDb(req.domain)
                }
                if (updated == 0) throw NotFoundException("Agent not found")
                AgentsTable.selectAll().where { AgentsTable.id eq id }.single().toAgentResponse()
            }
            call.respond(agent)
        }

        // DELETE /agents/{id}
        delete("{id}") {
            val id = UUID.fromString(call.parameters["id"] ?: throw IllegalArgumentException("Missing id"))
            newSuspendedTransaction(Dispatchers.IO) {
                val deleted = AgentsTable.deleteWhere { AgentsTable.id eq id }
                if (deleted == 0) throw NotFoundException("Agent not found")
            }
            call.respond(HttpStatusCode.NoContent)
        }
    }
}

private fun ResultRow.toAgentResponse() = AgentResponse(
    id = this[AgentsTable.id].toString(),
    name = this[AgentsTable.name],
    domain = this[AgentsTable.domain].dbValue,
    orgId = this[AgentsTable.orgId].toString(),
    email = this[AgentsTable.email],
    isActive = this[AgentsTable.isActive],
    createdAt = this[AgentsTable.createdAt].toString()
)
