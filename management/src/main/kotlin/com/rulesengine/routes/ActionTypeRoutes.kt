package com.rulesengine.routes

import com.rulesengine.models.*
import com.rulesengine.plugins.NotFoundException
import com.rulesengine.tables.ActionTypesTable
import com.rulesengine.tables.DimensionDefinitionsTable
import io.ktor.server.response.*
import io.ktor.server.routing.*
import kotlinx.coroutines.Dispatchers
import org.jetbrains.exposed.sql.*
import org.jetbrains.exposed.sql.transactions.experimental.newSuspendedTransaction
import java.util.UUID

fun Route.actionTypeRoutes() {
    route("/action-types") {
        // GET /action-types — all action types with nested dimensions
        get {
            val result = newSuspendedTransaction(Dispatchers.IO) {
                val dimensions = DimensionDefinitionsTable.selectAll().map { it.toDimensionDefResponse() }
                val dimsByActionType = dimensions.groupBy { it.first }

                ActionTypesTable.selectAll().map { row ->
                    val id = row[ActionTypesTable.id].toString()
                    ActionTypeWithDimensionsResponse(
                        id = id,
                        domain = row[ActionTypesTable.domain].dbValue,
                        name = row[ActionTypesTable.name],
                        description = row[ActionTypesTable.description],
                        dimensions = dimsByActionType[id]?.map { it.second } ?: emptyList()
                    )
                }
            }
            call.respond(result)
        }

        // GET /action-types/{id} — single action type with dimensions
        get("{id}") {
            val id = call.uuidParam("id")
            val result = newSuspendedTransaction(Dispatchers.IO) {
                val row = ActionTypesTable.selectAll()
                    .where { ActionTypesTable.id eq id }
                    .singleOrNull() ?: throw NotFoundException("Action type not found")

                val dims = DimensionDefinitionsTable.selectAll()
                    .where { DimensionDefinitionsTable.actionTypeId eq id }
                    .map { it.toDimensionDefResponse().second }

                ActionTypeWithDimensionsResponse(
                    id = row[ActionTypesTable.id].toString(),
                    domain = row[ActionTypesTable.domain].dbValue,
                    name = row[ActionTypesTable.name],
                    description = row[ActionTypesTable.description],
                    dimensions = dims
                )
            }
            call.respond(result)
        }

        // GET /action-types/{id}/dimensions
        get("{id}/dimensions") {
            val actionTypeId = call.uuidParam("id")
            val dims = newSuspendedTransaction(Dispatchers.IO) {
                DimensionDefinitionsTable.selectAll()
                    .where { DimensionDefinitionsTable.actionTypeId eq actionTypeId }
                    .map { it.toDimensionDefResponse().second }
            }
            call.respond(dims)
        }
    }
}

/** Returns Pair<actionTypeId, DimensionDefResponse> for grouping */
private fun ResultRow.toDimensionDefResponse(): Pair<String, DimensionDefResponse> {
    val setMembersRaw = this[DimensionDefinitionsTable.setMembers]
    val setMembers = if (setMembersRaw != null) {
        // PostgreSQL TEXT[] comes as {val1,val2,...} — parse it
        setMembersRaw.trim('{', '}').split(",").filter { it.isNotBlank() }.map { it.trim('"') }
    } else null

    return Pair(
        this[DimensionDefinitionsTable.actionTypeId].toString(),
        DimensionDefResponse(
            id = this[DimensionDefinitionsTable.id].toString(),
            dimensionName = this[DimensionDefinitionsTable.dimensionName],
            kind = this[DimensionDefinitionsTable.kind].dbValue,
            numericMax = this[DimensionDefinitionsTable.numericMax]?.toDouble(),
            rateWindow = this[DimensionDefinitionsTable.rateWindow],
            setMembers = setMembers,
            boolDefault = this[DimensionDefinitionsTable.boolDefault],
            temporalStart = this[DimensionDefinitionsTable.temporalStart]?.toString(),
            temporalEnd = this[DimensionDefinitionsTable.temporalEnd]?.toString(),
            temporalExpiry = this[DimensionDefinitionsTable.temporalExpiry]?.toString()
        )
    )
}
