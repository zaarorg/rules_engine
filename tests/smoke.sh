#!/usr/bin/env bash
set -euo pipefail

MGMT="http://localhost:8080"
ENGINE="http://localhost:3001"
NEXT="http://localhost:3000"
PASS=0
FAIL=0

check() {
  local name=$1; shift
  if "$@" &>/dev/null; then
    echo "  PASS  $name"; ((PASS++))
  else
    echo "  FAIL  $name"; ((FAIL++))
  fi
}

echo "=== Health Checks ==="
check "management /health"    curl -sf "$MGMT/health"
check "engine /health"        curl -sf "$ENGINE/health"
check "frontend reachable"    curl -sf "$NEXT"

echo ""
echo "=== Database & Migrations ==="
check "policies table exists" \
  docker compose exec -T postgres \
    psql -U rules rules_engine -c "SELECT 1 FROM policies LIMIT 1" -tAq

check "ltree extension loaded" \
  docker compose exec -T postgres \
    psql -U rules rules_engine -c "SELECT 1 FROM pg_extension WHERE extname='ltree'" -tAq

check "pgcrypto extension loaded" \
  docker compose exec -T postgres \
    psql -U rules rules_engine -c "SELECT 1 FROM pg_extension WHERE extname='pgcrypto'" -tAq

echo ""
echo "=== Seed Data ==="
POLICY_COUNT=$(curl -sf "$MGMT/api/v1/policies" | python3 -c "import sys,json; print(len(json.load(sys.stdin)))")
check "7 policies seeded"     [ "$POLICY_COUNT" -eq 7 ]

AGENT_COUNT=$(curl -sf "$MGMT/api/v1/agents" | python3 -c "import sys,json; print(len(json.load(sys.stdin)))")
check "agents seeded (>=10)"  [ "$AGENT_COUNT" -ge 10 ]

GROUP_COUNT=$(curl -sf "$MGMT/api/v1/groups" | python3 -c "import sys,json; print(len(json.load(sys.stdin)))")
check "groups seeded (>=5)"   [ "$GROUP_COUNT" -ge 5 ]

echo ""
echo "=== Kotlin CRUD ==="
# Create a test policy
ORG_ID="00000000-0000-0000-0000-000000000001"
NEW_POLICY=$(curl -sf -X POST "$MGMT/api/v1/policies" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"smoke-test-policy\",\"domain\":\"finance\",\"effect\":\"deny\",\"orgId\":\"$ORG_ID\"}")
NEW_ID=$(echo "$NEW_POLICY" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")
check "policy create returns id" [ -n "$NEW_ID" ] && [ "$NEW_ID" != "null" ]

# Read it back
FETCHED_NAME=$(curl -sf "$MGMT/api/v1/policies/$NEW_ID" | python3 -c "import sys,json; print(json.load(sys.stdin)['name'])")
check "policy read-back matches" [ "$FETCHED_NAME" = "smoke-test-policy" ]

# Create a version
VERSION=$(curl -sf -X POST "$MGMT/api/v1/policies/$NEW_ID/versions" \
  -H "Content-Type: application/json" \
  -d '{"cedarSource":"forbid (principal, action, resource);","constraints":"[]"}')
VERSION_ID=$(echo "$VERSION" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")
check "version create works"   [ -n "$VERSION_ID" ] && [ "$VERSION_ID" != "null" ]

# Delete test policy
curl -sf -X DELETE "$MGMT/api/v1/policies/$NEW_ID" > /dev/null 2>&1 || true

echo ""
echo "=== Cedar Engine ==="
# The engine loads policies from DB. Test with a basic check.
# Using the seeded Cedar policies which use Group::"acme" and Agent::"ap-agent-1"
PERMIT_RESULT=$(curl -sf -X POST "$ENGINE/check" \
  -H "Content-Type: application/json" \
  -d '{
    "principal": "Agent::\"20000000-0000-0000-0000-000000000001\"",
    "action": "Action::\"purchase.initiate\"",
    "resource": "Resource::\"any\"",
    "context": {"amount": 100, "vendor": "AWS", "hour": 10, "request_date": "2026-01-01", "requires_human_approval": true, "daily_send_count": 0}
  }' 2>/dev/null || echo '{"decision":"ERROR"}')
DECISION=$(echo "$PERMIT_RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('decision','ERROR'))" 2>/dev/null || echo "ERROR")
check "engine /check responds"  [ "$DECISION" != "ERROR" ]

echo ""
echo "================================"
echo "Results: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ] || exit 1
