package com.rulesengine.routes

import com.rulesengine.models.HealthResponse
import io.ktor.server.response.*
import io.ktor.server.routing.*

fun Route.healthRoutes() {
    get("/health") {
        call.respond(HealthResponse())
    }
}
