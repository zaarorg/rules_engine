use std::sync::Arc;

use axum::extract::State;
use axum::http::StatusCode;
use axum::Json;
use cedar_policy::PolicySet;
use serde_json::json;

use crate::db;
use crate::AppState;

pub async fn check_handler(
    State(state): State<Arc<AppState>>,
    Json(req): Json<engine::evaluator::CheckRequest>,
) -> Result<Json<engine::evaluator::CheckResponse>, (StatusCode, String)> {
    let policies = state.policies.read().await;
    match engine::evaluator::check(&policies, &req) {
        Ok(response) => Ok(Json(response)),
        Err(e) => Err((StatusCode::UNPROCESSABLE_ENTITY, e.to_string())),
    }
}

pub async fn reload_handler(
    State(state): State<Arc<AppState>>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let sources = db::load_policy_sources(&state.pool)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let count = sources.len();
    let combined = sources.join("\n");
    let policy_set: PolicySet = combined
        .parse()
        .map_err(|e: cedar_policy::ParseErrors| {
            (StatusCode::UNPROCESSABLE_ENTITY, e.to_string())
        })?;

    let mut policies = state.policies.write().await;
    *policies = policy_set;

    Ok(Json(json!({ "loaded": count })))
}

pub async fn health_handler() -> &'static str {
    "ok"
}
