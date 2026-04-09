package com.rulesengine.routes

import io.ktor.server.application.ApplicationCall
import java.util.UUID

/** Extract a UUID path parameter by name, throwing IllegalArgumentException if missing or malformed. */
fun ApplicationCall.uuidParam(name: String): UUID =
    UUID.fromString(parameters[name] ?: throw IllegalArgumentException("Missing $name"))
