# Task 2.4 - Device Connection and Pairing System

**Status:**  COMPLETED
**Agent:** Agent_Backend_Catalog
**Model:** Sonnet 4.5
**Completion Date:** 2025-10-29

---

## Implementation Summary

Successfully implemented the 4-digit code device connection system with four main endpoints:
1. **POST /api/devices/register** - Raspberry Pi registration (no auth)
2. **POST /api/devices/connect** - User pairing with code validation (auth required)
3. **GET /api/devices/:deviceId/status** - Health check and heartbeat (auth required)
4. **POST /api/devices/disconnect** - Session end and basket cleanup (auth required)

---

## Files Created/Modified

### Created Files
1. **backend/src/utils/deviceCodes.js** - Code generation utilities
   - `generateUniqueCode(pool, maxRetries)` - Generates unique 4-digit code with DB collision checking
   - `isCodeExpired(device)` - Checks if code > 4 hours old
   - `isHeartbeatStale(device)` - Checks if heartbeat > 5 minutes old

2. **backend/src/routes/devices.js** - Device route handlers
   - All four endpoints with full error handling and validation
   - Transaction support for disconnect + basket cleanup
   - Comprehensive logging for debugging

### Modified Files
1. **backend/src/server.js**
   - Added device routes import: `const deviceRoutes = require('./routes/devices');`
   - Registered routes: `app.use('/api/devices', deviceRoutes);`

---

## API Endpoint Documentation

### 1. POST /api/devices/register
**Purpose:** Pi registration to receive unique 4-digit pairing code
**Authentication:** None (public endpoint for Raspberry Pi)

**Request Body:**
```json
{
  "deviceId": "uuid-optional",     // Optional: Refresh existing device
  "name": "ShopShadow Pi #1",      // Optional: Device name
  "firmwareVersion": "1.0.0"       // Optional: Current firmware version
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "deviceId": "550e8400-e29b-41d4-a716-446655440000",
    "code": "4235",
    "name": "ShopShadow Pi #1",
    "status": "disconnected",
    "batteryLevel": 100,
    "firmwareVersion": "1.0.0",
    "expiresAt": "2025-10-29T18:00:00.000Z"
  }
}
```

**Error Responses:**
- **404 NOT_FOUND:** Device ID not found for refresh
- **500 REGISTRATION_ERROR:** Code generation or DB error

**Validation:**
-  Generates unique 4-digit code (0000-9999)
-  Checks uniqueness with max 10 retries
-  Creates new device or updates existing device
-  Sets status='disconnected', battery=100
-  Code expires after 4 hours

---

### 2. POST /api/devices/connect
**Purpose:** User pairing with device using 4-digit code
**Authentication:** Required (Bearer token)

**Request Body:**
```json
{
  "code": "4235"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "device": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "ShopShadow Pi #1",
      "status": "connected",
      "batteryLevel": 95,
      "firmwareVersion": "1.0.0",
      "lastHeartbeat": "2025-10-29T14:30:00.000Z"
    }
  }
}
```

**Error Responses:**
- **400 INVALID_CODE_FORMAT:** Code not 4 digits
- **400 CODE_EXPIRED:** Code older than 4 hours
- **400 INVALID_DEVICE_STATE:** Device not in 'disconnected' or 'offline' state
- **404 DEVICE_NOT_FOUND:** No device with that code
- **409 DEVICE_IN_USE:** Device already connected to another user
- **500 CONNECTION_ERROR:** Database error

**Validation:**
-  Validates 4-digit format (/^\d{4}$/)
-  Checks code expiration (4 hours)
-  Prevents multi-user connections (409 error)
-  Verifies device state (disconnected/offline)
-  Updates connected_user_id, status='connected', last_heartbeat=NOW()

---

### 3. GET /api/devices/:deviceId/status
**Purpose:** Health check and status query with heartbeat update
**Authentication:** Required (Bearer token)

**URL Parameters:**
- `deviceId` - UUID of device to check

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "device": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "ShopShadow Pi #1",
      "status": "connected",
      "batteryLevel": 95,
      "firmwareVersion": "1.0.0",
      "itemCount": 3,
      "lastHeartbeat": "2025-10-29T14:30:00.000Z"
    }
  }
}
```

**Error Responses:**
- **403 UNAUTHORIZED_DEVICE:** User doesn't own device
- **404 DEVICE_NOT_FOUND:** Device ID not found
- **500 STATUS_CHECK_ERROR:** Database error

**Validation:**
-  Verifies user owns device (connected_user_id === userId)
-  Counts basket items (LEFT JOIN basket_items)
-  Updates last_heartbeat = NOW() if connected
-  Auto-disconnects if heartbeat > 5 minutes (sets status='offline')

---

### 4. POST /api/devices/disconnect
**Purpose:** End shopping session and cleanup basket
**Authentication:** Required (Bearer token)

**Request Body:**
```json
{
  "deviceId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "message": "Device disconnected successfully",
    "itemsCleared": 3
  }
}
```

**Error Responses:**
- **400 MISSING_DEVICE_ID:** No deviceId in request body
- **403 UNAUTHORIZED_DEVICE:** User doesn't own device
- **404 DEVICE_NOT_FOUND:** Device ID not found
- **500 DISCONNECTION_ERROR:** Database error

**Validation:**
-  Verifies user owns device
-  Uses transaction for atomic disconnect + basket cleanup
-  Updates: connected_user_id=NULL, status='disconnected', last_heartbeat=NULL
-  Deletes all basket_items for user-device session
-  Rollback on error

---

## Testing Checklist

### Unit Tests (Manual Validation)
- [x] **Code Generation**
  - [x] Generates 4-digit code (0000-9999)
  - [x] Pads with leading zeros (e.g., 0042)
  - [x] Checks DB uniqueness
  - [x] Retries on collision (max 10 times)
  - [x] Throws error after max retries

- [x] **Code Expiration**
  - [x] isCodeExpired() returns false for codes < 4 hours
  - [x] isCodeExpired() returns true for codes > 4 hours
  - [x] Handles null/undefined created_at

- [x] **Heartbeat Staleness**
  - [x] isHeartbeatStale() returns false for heartbeats < 5 minutes
  - [x] isHeartbeatStale() returns true for heartbeats > 5 minutes
  - [x] Handles null/undefined last_heartbeat

### Integration Tests (Manual with curl/Postman)

#### Test 1: Pi Registration (New Device)
```bash
curl -X POST http://localhost:3001/api/devices/register \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Pi #1", "firmwareVersion": "1.0.0"}'
```
**Expected:** 200 OK with deviceId and 4-digit code

#### Test 2: Pi Registration (Refresh Code)
```bash
curl -X POST http://localhost:3001/api/devices/register \
  -H "Content-Type: application/json" \
  -d '{"deviceId": "<uuid>", "name": "Test Pi #1"}'
```
**Expected:** 200 OK with new code for existing device

#### Test 3: User Pairing (Valid Code)
```bash
curl -X POST http://localhost:3001/api/devices/connect \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"code": "4235"}'
```
**Expected:** 200 OK with device details, status='connected'

#### Test 4: User Pairing (Invalid Code)
```bash
curl -X POST http://localhost:3001/api/devices/connect \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"code": "9999"}'
```
**Expected:** 404 DEVICE_NOT_FOUND

#### Test 5: User Pairing (Expired Code)
1. Register device
2. Wait 4+ hours (or manually UPDATE devices SET created_at = NOW() - INTERVAL '5 hours')
3. Attempt pairing
**Expected:** 400 CODE_EXPIRED

#### Test 6: User Pairing (Already Connected)
1. User A connects to device
2. User B attempts to connect to same device
**Expected:** 409 DEVICE_IN_USE

#### Test 7: Status Check (Happy Path)
```bash
curl -X GET http://localhost:3001/api/devices/<deviceId>/status \
  -H "Authorization: Bearer <token>"
```
**Expected:** 200 OK with status, batteryLevel, itemCount, lastHeartbeat

#### Test 8: Status Check (Stale Heartbeat)
1. Connect to device
2. Manually UPDATE devices SET last_heartbeat = NOW() - INTERVAL '6 minutes'
3. Call status endpoint
**Expected:** 200 OK with status='offline' (auto-disconnected)

#### Test 9: Status Check (Unauthorized)
1. User A connects to device
2. User B attempts status check on User A's device
**Expected:** 403 UNAUTHORIZED_DEVICE

#### Test 10: Disconnection (Happy Path)
```bash
curl -X POST http://localhost:3001/api/devices/disconnect \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"deviceId": "<uuid>"}'
```
**Expected:** 200 OK with itemsCleared count

#### Test 11: Disconnection (Basket Cleanup)
1. Connect to device
2. Add items to basket (via Task 2.5 endpoints)
3. Disconnect
4. Verify basket_items deleted
**Expected:** itemsCleared = (number of items added)

---

## Database Verification Queries

### Check Device Registration
```sql
SELECT id, code, name, status, battery_level, connected_user_id, created_at
FROM devices
WHERE code = '4235';
```

### Check Code Expiration
```sql
SELECT id, code, created_at,
       EXTRACT(EPOCH FROM (NOW() - created_at)) / 3600 AS hours_old,
       (EXTRACT(EPOCH FROM (NOW() - created_at)) / 3600) > 4 AS is_expired
FROM devices
WHERE id = '<deviceId>';
```

### Check Heartbeat Staleness
```sql
SELECT id, status, last_heartbeat,
       EXTRACT(EPOCH FROM (NOW() - last_heartbeat)) / 60 AS minutes_since_heartbeat,
       (EXTRACT(EPOCH FROM (NOW() - last_heartbeat)) / 60) > 5 AS is_stale
FROM devices
WHERE id = '<deviceId>';
```

### Check Connected Devices
```sql
SELECT d.id, d.code, d.name, d.status, u.email AS connected_user
FROM devices d
LEFT JOIN users u ON u.id = d.connected_user_id
WHERE d.status = 'connected';
```

### Check Basket Items After Disconnect
```sql
SELECT COUNT(*) AS remaining_items
FROM basket_items
WHERE user_id = '<userId>' AND device_id = '<deviceId>';
-- Expected: 0 after successful disconnect
```

---

## Integration Points

### With Task 2.5 (Basket Management)
- Disconnect endpoint calls basket cleanup via transaction
- Status endpoint counts basket_items for itemCount
- Future: May need to export `cleanupBasket(userId, deviceId)` utility

### With Task 3.5 (Flask Pi Service)
- Flask service will call POST /api/devices/register on boot
- Display 4-digit code on Pi screen
- Send periodic heartbeat via status endpoint

### With Frontend (ShopShadow-Web)
- User enters 4-digit code in pairing UI
- Frontend calls POST /api/devices/connect
- Poll GET /api/devices/:deviceId/status for real-time updates
- Call POST /api/devices/disconnect when user ends session

---

## Completion Checklist

- [x] Create `backend/src/utils/deviceCodes.js` with code generation utilities
- [x] Create `backend/src/routes/devices.js` with all four endpoints
- [x] Integrate device routes into `backend/src/server.js`
- [x] Implement Pi registration with unique code generation
- [x] Implement user pairing with code validation and expiration
- [x] Implement status check with heartbeat updates and auto-disconnect
- [x] Implement disconnection with transaction-safe basket cleanup
- [x] Add comprehensive error handling and validation
- [x] Add structured logging for all operations
- [x] Create test documentation with curl examples
- [x] Document database verification queries
- [x] Document integration points with other tasks

---

## Git Commit Message

```
feat: implement device connection and pairing system

- Added Pi registration with 4-digit code generation
- Implemented user pairing with code validation and expiration
- Built status check endpoint with heartbeat updates
- Created disconnection handler with basket cleanup integration
- Code expires after 4 hours, auto-disconnect after 5min no heartbeat

> Generated with [Claude Code](https://claude.com/claude-code)
Co-Authored-By: Claude <noreply@anthropic.com>
```
