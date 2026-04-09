use cedar_policy::{Authorizer, Context, Entities, EntityUid, PolicySet, Request};
use serde::{Deserialize, Serialize};
use thiserror::Error;

#[derive(Debug, Deserialize)]
pub struct CheckRequest {
    pub principal: String,
    pub action: String,
    pub resource: String,
    pub context: serde_json::Value,
}

#[derive(Debug, Serialize)]
pub struct CheckResponse {
    pub decision: String,
    pub diagnostics: Vec<String>,
}

#[derive(Debug, Error)]
pub enum EvalError {
    #[error("parse error: {0}")]
    ParseError(String),
    #[error("request error: {0}")]
    RequestError(String),
    #[error("context error: {0}")]
    ContextError(String),
}

pub fn check(policy_set: &PolicySet, request: &CheckRequest) -> Result<CheckResponse, EvalError> {
    let principal: EntityUid = request
        .principal
        .parse()
        .map_err(|e: cedar_policy::ParseErrors| EvalError::ParseError(format!("principal: {e}")))?;

    let action: EntityUid = request
        .action
        .parse()
        .map_err(|e: cedar_policy::ParseErrors| EvalError::ParseError(format!("action: {e}")))?;

    let resource: EntityUid = request
        .resource
        .parse()
        .map_err(|e: cedar_policy::ParseErrors| EvalError::ParseError(format!("resource: {e}")))?;

    let context = if request.context.is_null() || request.context == serde_json::json!({}) {
        Context::empty()
    } else {
        Context::from_json_value(request.context.clone(), None)
            .map_err(|e| EvalError::ContextError(e.to_string()))?
    };

    let cedar_request = Request::new(principal, action, resource, context, None)
        .map_err(|e| EvalError::RequestError(e.to_string()))?;

    let authorizer = Authorizer::new();
    let response = authorizer.is_authorized(&cedar_request, policy_set, &Entities::empty());

    let decision = match response.decision() {
        cedar_policy::Decision::Allow => "Allow".to_string(),
        cedar_policy::Decision::Deny => "Deny".to_string(),
    };

    let mut diagnostics: Vec<String> = response
        .diagnostics()
        .reason()
        .map(|id| id.to_string())
        .collect();

    for err in response.diagnostics().errors() {
        diagnostics.push(format!("error: {err}"));
    }

    Ok(CheckResponse {
        decision,
        diagnostics,
    })
}
