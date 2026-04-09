pub async fn load_policy_sources(pool: &sqlx::PgPool) -> Result<Vec<String>, sqlx::Error> {
    let rows: Vec<(String,)> = sqlx::query_as(
        "SELECT pv.cedar_source FROM policy_versions pv JOIN policies p ON p.active_version_id = pv.id",
    )
    .fetch_all(pool)
    .await?;

    Ok(rows.into_iter().map(|(source,)| source).collect())
}
