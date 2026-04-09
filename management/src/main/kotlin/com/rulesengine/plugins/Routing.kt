package com.rulesengine.plugins

import com.rulesengine.routes.*
import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.plugins.cors.routing.*
import io.ktor.server.routing.*

fun Application.configureRouting() {
    install(CORS) {
        anyHost()
        allowHeader(HttpHeaders.ContentType)
    }
    routing {
        route("/api/v1") {
            policyRoutes()
            agentRoutes()
            groupRoutes()
            assignmentRoutes()
            decisionLogRoutes()
        }
        healthRoutes()
    }
}
