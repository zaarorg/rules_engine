package com.rulesengine.routes

import com.rulesengine.models.*
import com.rulesengine.plugins.NotFoundException
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

fun Route.groupRoutes() {
    route("/groups") {
        // GET /groups — list all
        get {
            val groups = newSuspendedTransaction(Dispatchers.IO) {
                GroupsTable.selectAll().map { it.toGroupResponse() }
            }
            call.respond(groups)
        }

        // POST /groups — create
        post {
            val req = call.receive<GroupRequest>()
            val id = UUID.randomUUID()
            val group = newSuspendedTransaction(Dispatchers.IO) {
                GroupsTable.insert {
                    it[GroupsTable.id] = id
                    it[orgId] = UUID.fromString(req.orgId)
                    it[name] = req.name
                    it[nodeType] = req.nodeType
                    it[path] = req.path
                    it[parentId] = req.parentId?.let { pid -> UUID.fromString(pid) }
                }
                GroupsTable.selectAll().where { GroupsTable.id eq id }.single().toGroupResponse()
            }
            call.respond(HttpStatusCode.Created, group)
        }

        // GET /groups/{id}
        get("{id}") {
            val id = call.uuidParam("id")
            val group = newSuspendedTransaction(Dispatchers.IO) {
                GroupsTable.selectAll().where { GroupsTable.id eq id }.singleOrNull()?.toGroupResponse()
            } ?: throw NotFoundException("Group not found")
            call.respond(group)
        }

        // DELETE /groups/{id}
        delete("{id}") {
            val id = call.uuidParam("id")
            newSuspendedTransaction(Dispatchers.IO) {
                val deleted = GroupsTable.deleteWhere { GroupsTable.id eq id }
                if (deleted == 0) throw NotFoundException("Group not found")
            }
            call.respond(HttpStatusCode.NoContent)
        }
    }
}

private fun ResultRow.toGroupResponse() = GroupResponse(
    id = this[GroupsTable.id].toString(),
    name = this[GroupsTable.name],
    nodeType = this[GroupsTable.nodeType],
    path = this[GroupsTable.path],
    orgId = this[GroupsTable.orgId].toString(),
    parentId = this[GroupsTable.parentId]?.toString(),
    createdAt = this[GroupsTable.createdAt].toString()
)
