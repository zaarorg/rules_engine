use std::sync::Arc;

use axum::Router;
use axum::routing::{get, post};
use cedar_policy::PolicySet;
use sqlx::postgres::PgPool;
use tokio::sync::RwLock;
use tower_http::cors::CorsLayer;
use tracing_subscriber::EnvFilter;

mod db;
mod routes;

#[derive(Clone)]
pub struct AppState {
    pub pool: PgPool,
    pub policies: Arc<RwLock<PolicySet>>,
}

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt()
        .with_env_filter(EnvFilter::from_default_env())
        .init();

    let database_url =
        std::env::var("DATABASE_URL").expect("DATABASE_URL must be set");

    let pool = PgPool::connect(&database_url)
        .await
        .expect("Failed to connect to database");

    // Retry policy loading — Flyway migrations run from the management service,
    // so tables may not exist yet when the engine starts.
    let mut policy_set: PolicySet = "".parse().unwrap_or_else(|_| {
        // Empty string may not parse; this is a fallback
        panic!("Failed to create empty PolicySet")
    });
    for attempt in 1..=30 {
        match db::load_policy_sources(&pool).await {
            Ok(sources) => {
                let combined = sources.join("\n");
                match combined.parse::<PolicySet>() {
                    Ok(ps) => {
                        policy_set = ps;
                        tracing::info!("Loaded {} Cedar policy source(s)", sources.len());
                        break;
                    }
                    Err(e) => {
                        tracing::warn!("Failed to parse Cedar policies (attempt {attempt}/30): {e}");
                    }
                }
            }
            Err(e) => {
                tracing::warn!("Failed to load policies (attempt {attempt}/30): {e}");
            }
        }
        if attempt == 30 {
            tracing::warn!("Could not load policies after 30 attempts — starting with empty policy set (default deny)");
        } else {
            tokio::time::sleep(std::time::Duration::from_secs(2)).await;
        }
    }

    let state = Arc::new(AppState {
        pool,
        policies: Arc::new(RwLock::new(policy_set)),
    });

    let app = Router::new()
        .route("/check", post(routes::check_handler))
        .route("/reload", post(routes::reload_handler))
        .route("/health", get(routes::health_handler))
        .with_state(state)
        .layer(CorsLayer::permissive());

    let listener = tokio::net::TcpListener::bind("0.0.0.0:3001")
        .await
        .expect("Failed to bind to port 3001");

    tracing::info!("Cedar engine listening on 0.0.0.0:3001");
    axum::serve(listener, app).await.expect("Server error");
}
