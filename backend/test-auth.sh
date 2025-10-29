#!/bin/bash
API="http://localhost:3001"

echo "=== Testing Authentication Flow ==="
echo

# Test signup with new user
echo "1. Testing signup with new user..."
SIGNUP_RESPONSE=$(curl -s -X POST $API/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"Test1234"}')
echo "Signup response: $SIGNUP_RESPONSE"
echo

# Extract token from signup
TOKEN=$(echo $SIGNUP_RESPONSE | jq -r '.token')
echo "Extracted token: ${TOKEN:0:50}..."
echo

# Test login with demo user
echo "2. Testing login with demo user..."
LOGIN_RESPONSE=$(curl -s -X POST $API/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@email.com","password":"1234"}')
echo "Login response: $LOGIN_RESPONSE"
echo

# Extract token from login
DEMO_TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.token')
DEMO_REFRESH=$(echo $LOGIN_RESPONSE | jq -r '.refreshToken')

# Test invalid credentials
echo "3. Testing login with wrong password..."
INVALID_RESPONSE=$(curl -s -X POST $API/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@email.com","password":"wrong"}')
echo "Invalid login response: $INVALID_RESPONSE"
echo

# Test refresh token
echo "4. Testing token refresh..."
REFRESH_RESPONSE=$(curl -s -X POST $API/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\":\"$DEMO_REFRESH\"}")
echo "Refresh response: $REFRESH_RESPONSE"
echo

# Test logout
echo "5. Testing logout with valid token..."
LOGOUT_RESPONSE=$(curl -s -X POST $API/api/auth/logout \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $DEMO_TOKEN")
echo "Logout response: $LOGOUT_RESPONSE"
echo

# Test protected route with no token
echo "6. Testing protected route without token (should fail)..."
NO_TOKEN_RESPONSE=$(curl -s -X POST $API/api/auth/logout \
  -H "Content-Type: application/json")
echo "No token response: $NO_TOKEN_RESPONSE"
echo

# Test protected route with invalid token
echo "7. Testing protected route with invalid token (should fail)..."
INVALID_TOKEN_RESPONSE=$(curl -s -X POST $API/api/auth/logout \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer invalid_token_here")
echo "Invalid token response: $INVALID_TOKEN_RESPONSE"
echo

echo "=== Authentication tests complete ==="
