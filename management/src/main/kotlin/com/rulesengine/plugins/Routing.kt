package com.rulesengine.plugins

import com.rulesengine.routes.*
import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.plugins.cors.routing.*
import io.ktor.server.routing.*

fun Application.configureRouting() {
    install(CORS) {
        allowHost("localhost:3100")  // frontend
        allowHost("localhost:3000")  // frontend dev
        allowHost("localhost:8080")  // management self
        allowMethod(HttpMethod.Put)
        allowMethod(HttpMethod.Delete)
        allowMethod(HttpMethod.Patch)
        allowHeader(HttpHeaders.ContentType)
    }
    routing {
        route("/api/v1") {
            policyRoutes()
            agentRoutes()
            groupRoutes()
            assignmentRoutes()
            decisionLogRoutes()
            actionTypeRoutes()
            membershipRoutes()
        }
        healthRoutes()
    }
}
