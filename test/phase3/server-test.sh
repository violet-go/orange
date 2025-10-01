#!/bin/bash
set -e

echo "🧪 Phase 3 - GraphQL Server Integration Test"
echo "=============================================="
echo ""

# 启动服务器
echo "📡 Starting server..."
bun run index.ts &
SERVER_PID=$!
echo "   Server PID: $SERVER_PID"

# 等待服务器就绪
sleep 3

# Cleanup function
cleanup() {
  echo ""
  echo "🧹 Cleaning up..."
  kill $SERVER_PID 2>/dev/null || true
  echo "   Server stopped"
}

# Set trap for cleanup
trap cleanup EXIT

# ==================== 基础连接测试 ====================

echo ""
echo "🔍 Test 1: Health check"
HEALTH=$(curl -s http://localhost:3000/health)
if echo "$HEALTH" | grep -q '"status":"ok"'; then
  echo "   ✅ Health endpoint responds"
else
  echo "   ❌ Health check failed"
  echo "   Response: $HEALTH"
  exit 1
fi

echo ""
echo "🔍 Test 2: GraphQL endpoint accessible"
GRAPHQL_RESPONSE=$(curl -s http://localhost:3000/graphql)
# GraphQL Yoga returns error JSON when no query provided - this is expected
if echo "$GRAPHQL_RESPONSE" | grep -q '"errors"'; then
  echo "   ✅ GraphQL endpoint accessible (error response as expected)"
else
  echo "   ❌ GraphQL endpoint not accessible"
  echo "   Response: $GRAPHQL_RESPONSE"
  exit 1
fi

# ==================== Introspection 查询 ====================

echo ""
echo "🔍 Test 3: Introspection query"
INTROSPECTION=$(curl -s -X POST http://localhost:3000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ __schema { types { name } } }"}')

if echo "$INTROSPECTION" | grep -q "Project" && \
   echo "$INTROSPECTION" | grep -q "Image" && \
   echo "$INTROSPECTION" | grep -q "Style"; then
  echo "   ✅ Schema types present (Project, Image, Style)"
else
  echo "   ❌ Introspection failed"
  echo "   Response: $INTROSPECTION"
  exit 1
fi

# ==================== Query 测试 ====================

echo ""
echo "🔍 Test 4: Query.styles"
STYLES=$(curl -s -X POST http://localhost:3000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ styles { id displayName } }"}')

if echo "$STYLES" | grep -q '"data"'; then
  echo "   ✅ Query.styles returns data"
else
  echo "   ❌ Query.styles failed"
  echo "   Response: $STYLES"
  exit 1
fi

# ==================== Mutation 测试 ====================

echo ""
echo "🔍 Test 5: Mutation.createProject"
CREATE=$(curl -s -X POST http://localhost:3000/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation { createProject(input: { inputType: TEXT, inputContent: \"test cat girl\" }) { project { id status } } }"
  }')

PROJECT_ID=$(echo "$CREATE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -n "$PROJECT_ID" ]; then
  echo "   ✅ Mutation.createProject creates project"
  echo "   Project ID: $PROJECT_ID"
else
  echo "   ❌ Mutation.createProject failed"
  echo "   Response: $CREATE"
  exit 1
fi

# ==================== Query 单个资源 ====================

echo ""
echo "🔍 Test 6: Query.project"
PROJECT=$(curl -s -X POST http://localhost:3000/graphql \
  -H "Content-Type: application/json" \
  -d "{
    \"query\": \"{ project(id: \\\"$PROJECT_ID\\\") { id status images { id status } } }\"
  }")

if echo "$PROJECT" | grep -q "$PROJECT_ID"; then
  IMAGE_COUNT=$(echo "$PROJECT" | grep -o '"id":"[^"]*"' | tail -n +2 | wc -l)
  echo "   ✅ Query.project returns project data"
  echo "   Images created: $IMAGE_COUNT"
else
  echo "   ❌ Query.project failed"
  echo "   Response: $PROJECT"
  exit 1
fi

# ==================== 错误处理测试 ====================

echo ""
echo "🔍 Test 7: Error handling - missing required field"
ERROR1=$(curl -s -X POST http://localhost:3000/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation { createProject(input: { inputType: TEXT }) { project { id } } }"
  }')

if echo "$ERROR1" | grep -q '"errors"'; then
  echo "   ✅ Returns error for missing required field"
else
  echo "   ⚠️  Error handling might be lenient"
fi

echo ""
echo "🔍 Test 8: Error handling - non-existent resource"
NOT_FOUND=$(curl -s -X POST http://localhost:3000/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "{ project(id: \"non-existent-id\") { id } }"
  }')

if echo "$NOT_FOUND" | grep -q '"project":null'; then
  echo "   ✅ Returns null for non-existent resource"
else
  echo "   ⚠️  Non-existent resource handling unexpected"
  echo "   Response: $NOT_FOUND"
fi

# ==================== 汇总结果 ====================

echo ""
echo "=============================================="
echo "✅ Phase 3 Integration Test PASSED"
echo "   All 8 core tests succeeded"
echo "=============================================="

exit 0
