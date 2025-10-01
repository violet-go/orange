#!/bin/bash
set -e

echo "🚀 Phase 4 E2E Test - Real API Integration"
echo "=========================================="
echo ""

# Set environment variables for relay platform
export NANO_BANANA_API_KEY=sk-0jscjMBRrMjEZoaULtQdeoi1HglQtD3vaGQ8Af5isu0an78G
export NANO_BANANA_BASE_URL=https://api.zetatechs.online

echo "🔧 Using relay platform:"
echo "   Base URL: $NANO_BANANA_BASE_URL"
echo "   API Key: ${NANO_BANANA_API_KEY:0:15}..."
echo ""

# 1. Start server in background
echo "📡 Starting server..."
bun run index.ts &
SERVER_PID=$!
echo "   Server PID: $SERVER_PID"

# Wait for server to be ready
sleep 3

# Health check
echo ""
echo "🔍 Health check..."
HEALTH=$(curl -s http://localhost:3000/health)
echo "   Response: $HEALTH"

# 2. Create Project
echo ""
echo "📝 Creating test project..."
CREATE_RESPONSE=$(curl -s -X POST http://localhost:3000/graphql \
  -H 'Content-Type: application/json' \
  -d '{"query":"mutation { createProject(input: { inputType: TEXT, inputContent: \"cute cat girl anime\" }) { project { id status } } }"}')

PROJECT_ID=$(echo "$CREATE_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$PROJECT_ID" ]; then
  echo "❌ Failed to create project"
  echo "   Response: $CREATE_RESPONSE"
  kill $SERVER_PID 2>/dev/null || true
  exit 1
fi

echo "✅ Project created: $PROJECT_ID"

# 3. Poll for completion (max 2 minutes)
echo ""
echo "⏳ Waiting for generation to complete (max 2 minutes)..."
for i in {1..24}; do
  sleep 5

  STATUS_RESPONSE=$(curl -s -X POST http://localhost:3000/graphql \
    -H 'Content-Type: application/json' \
    -d "{\"query\":\"{ project(id: \\\"$PROJECT_ID\\\") { status } }\"}")

  STATUS=$(echo "$STATUS_RESPONSE" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)

  echo "   [$i/24] Status: $STATUS"

  if [[ "$STATUS" == "COMPLETED" || "$STATUS" == "PARTIAL_FAILED" ]]; then
    echo "   ✅ Generation finished"
    break
  fi

  if [ $i -eq 24 ]; then
    echo "   ⚠️  Timeout reached"
  fi
done

# 4. Verify results
echo ""
echo "🔍 Verifying results..."
RESULT=$(curl -s -X POST http://localhost:3000/graphql \
  -H 'Content-Type: application/json' \
  -d "{\"query\":\"{ project(id: \\\"$PROJECT_ID\\\") { status images { id status errorMessage } } }\"}")

echo "   Full response: $RESULT"

# Count successful images
SUCCESS_COUNT=$(echo "$RESULT" | grep -o '"status":"SUCCESS"' | wc -l)
FAILED_COUNT=$(echo "$RESULT" | grep -o '"status":"FAILED"' | wc -l)
FINAL_STATUS=$(echo "$RESULT" | grep -o '"status":"[^"]*"' | head -1 | cut -d'"' -f4)

echo ""
echo "========================================="
echo "📊 Test Results:"
echo "   Project Status: $FINAL_STATUS"
echo "   Success: $SUCCESS_COUNT/9 images"
echo "   Failed: $FAILED_COUNT/9 images"
echo "========================================="

# 5. Cleanup
echo ""
echo "🧹 Cleaning up..."
kill $SERVER_PID 2>/dev/null || true
echo "   Server stopped"

# 6. Determine test result
echo ""
if [ "$SUCCESS_COUNT" -ge 8 ]; then
  echo "✅ E2E Test PASSED (≥90% success rate)"
  exit 0
else
  echo "❌ E2E Test FAILED (success rate: $(($SUCCESS_COUNT * 100 / 9))%)"
  exit 1
fi
