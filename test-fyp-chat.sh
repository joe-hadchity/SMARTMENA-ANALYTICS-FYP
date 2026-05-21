#!/bin/bash

# Test Fyp Chat Endpoint Directly
# This tests the consultant without SmartMENA integration

CLIENT_ID="c218eadd-6861-45b3-8fc3-8af5691d080c"
FYP_URL="http://localhost:3001"

echo "======================================"
echo "Testing Fyp Chat Endpoint"
echo "======================================"
echo ""

# Test 1: Simple greeting (should be fast)
echo "Test 1: Simple greeting message"
echo "--------------------------------------"
curl -X POST "$FYP_URL/chat" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Hello",
    "clientId": "'$CLIENT_ID'",
    "enableWriteTools": false
  }' \
  -w "\n\nTime: %{time_total}s\n" \
  -o /tmp/response1.json

echo ""
echo "Response saved to /tmp/response1.json"
cat /tmp/response1.json | jq '.'
echo ""
echo ""

# Test 2: Ask about campaigns (requires MCP tool)
echo "Test 2: Ask about campaigns (MCP tool call)"
echo "--------------------------------------"
curl -X POST "$FYP_URL/chat" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "List my campaigns",
    "clientId": "'$CLIENT_ID'",
    "enableWriteTools": false
  }' \
  -w "\n\nTime: %{time_total}s\n" \
  -o /tmp/response2.json \
  --max-time 60

echo ""
echo "Response saved to /tmp/response2.json"
cat /tmp/response2.json | jq '.'
echo ""
echo ""

# Test 3: Campaign creation request (write tools enabled)
echo "Test 3: Campaign creation flow"
echo "--------------------------------------"
curl -X POST "$FYP_URL/chat" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "I want to create a new campaign. Goal: Sales, Budget: $50/day, Audience: Ages 25-54 in Lebanon, Duration: Ongoing",
    "clientId": "'$CLIENT_ID'",
    "enableWriteTools": true
  }' \
  -w "\n\nTime: %{time_total}s\n" \
  -o /tmp/response3.json \
  --max-time 180

echo ""
echo "Response saved to /tmp/response3.json"
cat /tmp/response3.json | jq '.'
echo ""
