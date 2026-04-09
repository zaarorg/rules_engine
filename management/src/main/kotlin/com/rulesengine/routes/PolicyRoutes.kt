package com.rulesengine.routes

import com.rulesengine.models.*
import com.rulesengine.plugins.NotFoundException
import com.rulesengine.services.CedarValidator
import com.rulesengine.tables.PoliciesTable
import com.rulesengine.tables.PolicyVersionsTable
import com.rulesengine.tables.DomainEnum
import com.rulesengine.tables.PolicyEffect
import io.ktor.http.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import kotlinx.coroutines.Dispatchers
import org.jetbrains.exposed.sql.*
import org.jetbrains.exposed.sql.SqlExpressionBuilder.eq
import org.jetbrains.exposed.sql.transactions.experimental.newSuspendedTransaction
import java.util.UUID

fun Route.policyRoutes() {
    route("/policies") {
        // GET /policies — list all
        get {
            val policies = newSuspendedTransaction(Dispatchers.IO) {
                PoliciesTable.selectAll().map { it.toPolicyResponse() }
            }
            call.respond(policies)
        }

        // POST /policies — create
        post {
            val req = call.receive<PolicyRequest>()
            val id = UUID.randomUUID()
            val policy = newSuspendedTransaction(Dispatchers.IO) {
                PoliciesTable.insert {
                    it[PoliciesTable.id] = id
                    it[orgId] = UUID.fromString(req.orgId)
                    it[name] = req.name
                    it[domain] = DomainEnum.fromDb(req.domain)
                    it[effect] = PolicyEffect.fromDb(req.effect)
                }
                PoliciesTable.selectAll().where { PoliciesTable.id eq id }.single().toPolicyResponse()
            }
            call.respond(HttpStatusCode.Created, policy)
        }

        // GET /policies/{id}
        get("{id}") {
            val id = UUID.fromString(call.parameters["id"] ?: throw IllegalArgumentException("Missing id"))
            val policy = newSuspendedTransaction(Dispatchers.IO) {
                PoliciesTable.selectAll().where { PoliciesTable.id eq id }.singleOrNull()?.toPolicyResponse()
            } ?: throw NotFoundException("Policy not found")
            call.respond(policy)
        }

        // PUT /policies/{id}
        put("{id}") {
            val id = UUID.fromString(call.parameters["id"] ?: throw IllegalArgumentException("Missing id"))
            val req = call.receive<PolicyRequest>()
            val policy = newSuspendedTransaction(Dispatchers.IO) {
                val updated = PoliciesTable.update({ PoliciesTable.id eq id }) {
                    it[name] = req.name
                    it[domain] = DomainEnum.fromDb(req.domain)
                    it[effect] = PolicyEffect.fromDb(req.effect)
                }
                if (updated == 0) throw NotFoundException("Policy not found")
                PoliciesTable.selectAll().where { PoliciesTable.id eq id }.single().toPolicyResponse()
            }
            call.respond(policy)
        }

        // DELETE /policies/{id}
        delete("{id}") {
            val id = UUID.fromString(call.parameters["id"] ?: throw IllegalArgumentException("Missing id"))
            newSuspendedTransaction(Dispatchers.IO) {
                val deleted = PoliciesTable.deleteWhere { PoliciesTable.id eq id }
                if (deleted == 0) throw NotFoundException("Policy not found")
            }
            call.respond(HttpStatusCode.NoContent)
        }

        // GET /policies/{id}/versions
        get("{id}/versions") {
            val policyId = UUID.fromString(call.parameters["id"] ?: throw IllegalArgumentException("Missing id"))
            val versions = newSuspendedTransaction(Dispatchers.IO) {
                PolicyVersionsTable.selectAll()
                    .where { PolicyVersionsTable.policyId eq policyId }
                    .orderBy(PolicyVersionsTable.versionNumber)
                    .map { it.toVersionResponse() }
            }
            call.respond(versions)
        }

        // POST /policies/{id}/versions — create new version
        post("{id}/versions") {
            val policyId = UUID.fromString(call.parameters["id"] ?: throw IllegalArgumentException("Missing id"))
            val req = call.receive<PolicyVersionRequest>()

            // Validate Cedar source
            val validation = CedarValidator.validate(req.cedarSource)
            if (!validation.valid) {
                throw IllegalArgumentException("Invalid Cedar source: ${validation.errors.joinToString(", ")}")
            }

            val version = newSuspendedTransaction(Dispatchers.IO) {
                // Verify policy exists
                PoliciesTable.selectAll().where { PoliciesTable.id eq policyId }.singleOrNull()
                    ?: throw NotFoundException("Policy not found")

                // Get next version number
                val maxVersion = PolicyVersionsTable
                    .select(PolicyVersionsTable.versionNumber)
                    .where { PolicyVersionsTable.policyId eq policyId }
                    .maxByOrNull { it[PolicyVersionsTable.versionNumber] }
                    ?.get(PolicyVersionsTable.versionNumber) ?: 0
                val nextVersion = maxVersion + 1

                val versionId = UUID.randomUUID()
                PolicyVersionsTable.insert {
                    it[PolicyVersionsTable.id] = versionId
                    it[PolicyVersionsTable.policyId] = policyId
                    it[versionNumber] = nextVersion
                    it[constraints] = req.constraints
                    it[cedarSource] = req.cedarSource
                }

                // Set as active version on the policy
                PoliciesTable.update({ PoliciesTable.id eq policyId }) {
                    it[activeVersionId] = versionId
                }

                PolicyVersionsTable.selectAll()
                    .where { PolicyVersionsTable.id eq versionId }
                    .single()
                    .toVersionResponse()
            }
            call.respond(HttpStatusCode.Created, version)
        }

        // POST /policies/{id}/versions/{versionId}/activate
        post("{id}/versions/{versionId}/activate") {
            val policyId = UUID.fromString(call.parameters["id"] ?: throw IllegalArgumentException("Missing id"))
            val versionId = UUID.fromString(call.parameters["versionId"] ?: throw IllegalArgumentException("Missing versionId"))

            newSuspendedTransaction(Dispatchers.IO) {
                // Verify version exists and belongs to this policy
                val version = PolicyVersionsTable.selectAll()
                    .where { (PolicyVersionsTable.id eq versionId) and (PolicyVersionsTable.policyId eq policyId) }
                    .singleOrNull() ?: throw NotFoundException("Policy version not found")

                PoliciesTable.update({ PoliciesTable.id eq policyId }) {
                    it[activeVersionId] = versionId
                }
            }
            call.respond(HttpStatusCode.OK, mapOf("status" to "activated"))
        }
    }
}

private fun ResultRow.toPolicyResponse() = PolicyResponse(
    id = this[PoliciesTable.id].toString(),
    name = this[PoliciesTable.name],
    domain = this[PoliciesTable.domain].dbValue,
    effect = this[PoliciesTable.effect].dbValue,
    orgId = this[PoliciesTable.orgId].toString(),
    activeVersionId = this[PoliciesTable.activeVersionId]?.toString(),
    createdAt = this[PoliciesTable.createdAt].toString()
)

private fun ResultRow.toVersionResponse() = PolicyVersionResponse(
    id = this[PolicyVersionsTable.id].toString(),
    policyId = this[PolicyVersionsTable.policyId].toString(),
    versionNumber = this[PolicyVersionsTable.versionNumber],
    cedarSource = this[PolicyVersionsTable.cedarSource],
    cedarHash = this[PolicyVersionsTable.cedarHash],
    constraints = this[PolicyVersionsTable.constraints],
    createdAt = this[PolicyVersionsTable.createdAt].toString()
)
