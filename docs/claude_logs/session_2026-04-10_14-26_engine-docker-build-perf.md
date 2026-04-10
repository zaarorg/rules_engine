# Session Log: Rules Engine Docker Build Performance Fix

**Date:** 2026-04-10 ~14:00
**Duration:** ~30 minutes
**Focus:** Fix slow Rust engine Docker container startup (12+ minute cold compilation)

## What Got Done

- Diagnosed root cause of slow engine container startup: bare `Dockerfile.dev` with no dependency caching, recompiling all Rust dependencies from scratch on every cold start
- Rewrote `engine/Dockerfile.dev` to use multi-stage `cargo-chef` build with pre-compiled dependency seeding
- Created `engine/entrypoint-dev.sh` to seed the Docker target volume from a pre-built cache on first run
- Iterated through three Dockerfile revisions to fix volume mount and toolchain compatibility issues
- Final approach: same `lukemathwalker/cargo-chef:latest-rust-1` base image across all stages, cache stored at `/tmp/target-cache`, entrypoint copies to volume-mounted `/app/target` on first run

## Issues & Troubleshooting

- **Problem:** Engine container took 12+ minutes to become healthy on cold start
  - **Cause:** `Dockerfile.dev` was `FROM rust:1-bookworm` with `cargo watch` — no dependency pre-compilation. Every `docker compose up` with an empty target volume triggered full compilation of cedar-policy, sqlx, axum, tokio, etc.
  - **Fix:** Multi-stage Dockerfile using `cargo-chef` to pre-compile dependencies into the image, then seed the named volume at container startup

- **Problem:** First fix attempt tried `cargo install cargo-watch` inside Dockerfile, adding another 15+ minute compilation
  - **Cause:** `cargo-watch` has a massive dependency tree when compiled from source
  - **Fix:** Download pre-built `cargo-watch` binary from GitHub releases instead (`v8.5.3-x86_64-unknown-linux-gnu.tar.xz`)

- **Problem:** Pre-compiled deps stored at `/app/target-cache` were invisible at runtime
  - **Cause:** Docker Compose volume mount `./engine:/app` shadows the entire `/app` directory, including `target-cache` baked into the image
  - **Fix:** Store cache at `/tmp/target-cache` (outside the mount path), copy into `/app/target` via entrypoint script

- **Problem:** Seeded cache compiled but produced `error[E0463]: can't find crate for sqlx` at runtime
  - **Cause:** Builder stage used `lukemathwalker/cargo-chef:latest-rust-1` but final stage used `rust:1-bookworm` — different Rust compiler versions produce incompatible artifacts
  - **Fix:** Use `FROM chef AS dev` for the final stage so all stages share the exact same Rust toolchain

- **Problem:** `curl -sf http://localhost:3002/health` returned empty response
  - **Cause:** Engine was still compiling when health check was hit. The port was open (Docker mapped it) but `cargo watch` hadn't finished building and starting the server yet
  - **Fix:** The build caching fix addresses this — with seeded deps, only app crates need compilation (~seconds not minutes)

## Decisions Made

- **Use `cargo-chef` for dev Dockerfile** (same pattern as production `Dockerfile`): consistent approach, proven caching strategy, handles dependency fingerprinting correctly
- **Download pre-built `cargo-watch` binary** rather than `cargo install`: avoids 15+ minutes of compilation for a dev tool
- **Entrypoint seeding pattern** rather than baking deps directly into `/app/target`: necessary because Docker Compose volume mounts override image contents, so we store the cache outside the mount path and copy on first run
- **Same base image across all stages**: critical for Rust artifact compatibility — even minor toolchain differences invalidate the entire cache

## Current State

- **Build in progress:** Final `docker compose build engine` is running with the corrected Dockerfile (same base image across all stages). Chef/planner/builder layers are cached from previous builds, so only the final stage needs rebuilding.
- **Not yet verified:** Need to confirm the engine starts successfully with the seeded cache and `curl http://localhost:3002/health` returns `ok`
- **Other services working:** postgres (healthy), management (healthy), frontend were all running fine — only the engine had the slow startup issue

## Next Steps

1. Verify the current build completes and engine starts with fast cold boot (should only compile `engine` + `api-server` crates, not all deps)
2. Test `curl http://localhost:3002/health` returns `ok`
3. Test `docker compose down && docker volume rm rules_engine_engine_target && docker compose up -d` to confirm full cold start is fast
4. Test that `cargo watch` still picks up source changes and hot-reloads correctly with the new Dockerfile
5. Consider adding `.dockerignore` to `engine/` to exclude `target/` from build context (reduces COPY transfer time)
