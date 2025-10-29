# Shop Shadow - API Endpoints & Data Structures

## Table of Contents
1. [Base Configuration](#base-configuration)
2. [Authentication Endpoints](#authentication-endpoints)
3. [Device Connection Endpoints](#device-connection-endpoints)
4. [WebSocket Protocol](#websocket-protocol)
5. [Product Endpoints](#product-endpoints)
6. [Order & Checkout Endpoints](#order--checkout-endpoints)
7. [Payment Processing Endpoints](#payment-processing-endpoints)
8. [Admin Endpoints](#admin-endpoints)
9. [Data Structures](#data-structures)
10. [Error Handling](#error-handling)
11. [Rate Limiting](#rate-limiting)

---

## Base Configuration

### API Base URL
```
Production: https://api.shopshadow.com
Development: http://localhost:3001
Staging: https://staging-api.shopshadow.com
```

### Common Headers
```
Content-Type: application/json
Authorization: Bearer {jwt_token}  // For authenticated requests
X-Device-ID: {device_uuid}         // For device-specific requests
```

### HTTP Status Codes Used
- `200` - OK (Success)
- `201` - Created
- `204` - No Content
- `400` - Bad Request (Client error)
- `401` - Unauthorized (Invalid/missing token)
- `403` - Forbidden (Insufficient permissions)
- `404` - Not Found
- `409` - Conflict (Duplicate resource)
- `422` - Unprocessable Entity (Validation error)
- `429` - Too Many Requests (Rate limit exceeded)
- `500` - Internal Server Error
- `503` - Service Unavailable

---

## Authentication Endpoints

### 1. User Login

**Endpoint Name**: User Login  
**Purpose**: Authenticate user and receive JWT token

**HTTP Method**: `POST`  
**Endpoint Path**: `/api/auth/login`

**When It's Called**: When user submits login form

**Authentication Required**: No

**Request Body**:
```json
{
  "email": "demo@email.com",
  "password": "1234"
}
```

**Response Format**:
```typescript
{
  success: boolean;
  token: string;
  refreshToken?: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: 'user' | 'admin';
    createdAt: string;
  }
}
```

**Success Example (200)**:
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "refresh_token_here",
  "user": {
    "id": "usr_01HF9XZQJ7",
    "name": "Demo User",
    "email": "demo@email.com",
    "role": "user",
    "createdAt": "2025-10-01T10:30:00Z"
  }
}
```

**Error Example (401)**:
```json
{
  "success": false,
  "error": "Invalid credentials",
  "code": "INVALID_CREDENTIALS",
  "message": "The email or password you entered is incorrect"
}
```

**Error Example (422)**:
```json
{
  "success": false,
  "error": "Validation error",
  "code": "VALIDATION_ERROR",
  "fields": {
    "email": "Invalid email format",
    "password": "Password is required"
  }
}
```

**Timeout/Retry Logic**:
- Timeout: 10 seconds
- Retry: Do not retry automatically (user must re-submit)
- Rate Limit: 5 attempts per minute per IP
- Lockout: After 5 failed attempts, wait 15 minutes

**Notes**:
- Password must be hashed on client before sending (bcrypt)
- Token expires after 24 hours
- Refresh token expires after 30 days

---

### 2. User Signup

**Endpoint Name**: User Registration  
**Purpose**: Create new user account

**HTTP Method**: `POST`  
**Endpoint Path**: `/api/auth/signup`

**When It's Called**: When user submits signup form

**Authentication Required**: No

**Request Body**:
```json
{
  "name": "John Doe",
  "email": "john@email.com",
  "password": "securePassword123"
}
```

**Response Format**:
```typescript
{
  success: boolean;
  token: string;
  refreshToken?: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: 'user';
    createdAt: string;
  }
}
```

**Success Example (201)**:
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "refresh_token_here",
  "user": {
    "id": "usr_01HF9XZQJ8",
    "name": "John Doe",
    "email": "john@email.com",
    "role": "user",
    "createdAt": "2025-10-29T15:23:00Z"
  }
}
```

**Error Example (409)**:
```json
{
  "success": false,
  "error": "Email already exists",
  "code": "DUPLICATE_EMAIL",
  "message": "An account with this email already exists"
}
```

**Error Example (422)**:
```json
{
  "success": false,
  "error": "Validation error",
  "code": "VALIDATION_ERROR",
  "fields": {
    "password": "Password must be at least 8 characters and contain one uppercase letter, one lowercase letter, and one number"
  }
}
```

**Timeout/Retry Logic**:
- Timeout: 10 seconds
- Retry: Do not retry (user must re-submit)
- Rate Limit: 3 signups per hour per IP

**Notes**:
- Email verification could be added later
- Password requirements: min 8 chars, 1 uppercase, 1 lowercase, 1 number

---

### 3. User Logout

**Endpoint Name**: User Logout  
**Purpose**: Invalidate user token and end session

**HTTP Method**: `POST`  
**Endpoint Path**: `/api/auth/logout`

**When It's Called**: When user clicks logout button

**Authentication Required**: Yes

**Request Body**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "deviceId": "dev_01HF9XZQ" // Optional: if user is connected to a device
}
```

**Response Format**:
```typescript
{
  success: boolean;
  message: string;
}
```

**Success Example (200)**:
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

**Error Example (401)**:
```json
{
  "success": false,
  "error": "Invalid token",
  "code": "INVALID_TOKEN"
}
```

**Timeout/Retry Logic**:
- Timeout: 5 seconds
- Retry: 1 retry if network error
- On failure: Clear token locally anyway (client-side logout)

**Notes**:
- Token is blacklisted in database
- If deviceId provided, disconnect from basket
- Always succeed on client-side even if API fails

---

### 4. Refresh Token

**Endpoint Name**: Refresh Authentication Token  
**Purpose**: Get new JWT token using refresh token

**HTTP Method**: `POST`  
**Endpoint Path**: `/api/auth/refresh`

**When It's Called**: When JWT expires (before making API calls)

**Authentication Required**: No (uses refresh token)

**Request Body**:
```json
{
  "refreshToken": "refresh_token_here"
}
```

**Response Format**:
```typescript
{
  success: boolean;
  token: string;
  refreshToken: string;
}
```

**Success Example (200)**:
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "new_refresh_token_here"
}
```

**Error Example (401)**:
```json
{
  "success": false,
  "error": "Refresh token expired",
  "code": "REFRESH_TOKEN_EXPIRED",
  "message": "Please log in again"
}
```

**Timeout/Retry Logic**:
- Timeout: 5 seconds
- Retry: 1 retry
- On failure: Redirect to login page

---

## Device Connection Endpoints

### 5. Connect to Basket

**Endpoint Name**: Connect Smart Basket  
**Purpose**: Pair user account with smart basket device

**HTTP Method**: `POST`  
**Endpoint Path**: `/api/devices/connect`

**When It's Called**: When user enters connection code and clicks "Connect"

**Authentication Required**: Yes

**Request Body**:
```json
{
  "code": "0000",
  "userId": "usr_01HF9XZQJ7"
}
```

**Response Format**:
```typescript
{
  success: boolean;
  device: {
    id: string;
    name: string;
    code: string;
    status: 'connected' | 'disconnected';
    batteryLevel: number;
    firmwareVersion: string;
    lastSync: string;
  };
  websocketUrl: string;
}
```

**Success Example (200)**:
```json
{
  "success": true,
  "device": {
    "id": "dev_01HF9XZQK1",
    "name": "Smart Basket #0000",
    "code": "0000",
    "status": "connected",
    "batteryLevel": 85,
    "firmwareVersion": "1.2.3",
    "lastSync": "2025-10-29T15:30:00Z"
  },
  "websocketUrl": "wss://ws.shopshadow.com/basket/dev_01HF9XZQK1?token=eyJhbGci..."
}
```

**Error Example (404)**:
```json
{
  "success": false,
  "error": "Invalid connection code",
  "code": "INVALID_CODE",
  "message": "No basket found with this code. Please check and try again."
}
```

**Error Example (409)**:
```json
{
  "success": false,
  "error": "Device already connected",
  "code": "DEVICE_IN_USE",
  "message": "This basket is already connected to another account",
  "connectedUntil": "2025-10-29T18:00:00Z"
}
```

**Timeout/Retry Logic**:
- Timeout: 15 seconds
- Retry: 2 retries with 2-second delay
- On failure: Show error toast, stay on connection page
- On timeout: "Unable to connect. Make sure basket is powered on."

**Notes**:
- Connection code is 4 digits
- Basket can only be connected to one account at a time
- Connection expires after 4 hours of inactivity

---

### 6. Disconnect from Basket

**Endpoint Name**: Disconnect Smart Basket  
**Purpose**: End connection with smart basket

**HTTP Method**: `POST`  
**Endpoint Path**: `/api/devices/disconnect`

**When It's Called**: 
- When user logs out
- When user manually disconnects
- After successful checkout

**Authentication Required**: Yes

**Request Body**:
```json
{
  "deviceId": "dev_01HF9XZQK1",
  "userId": "usr_01HF9XZQJ7"
}
```

**Response Format**:
```typescript
{
  success: boolean;
  message: string;
}
```

**Success Example (200)**:
```json
{
  "success": true,
  "message": "Device disconnected successfully"
}
```

**Error Example (404)**:
```json
{
  "success": false,
  "error": "Device not found",
  "code": "DEVICE_NOT_FOUND"
}
```

**Timeout/Retry Logic**:
- Timeout: 5 seconds
- Retry: No retry needed
- On failure: Disconnect locally anyway

**Notes**:
- Basket is available for other users after disconnect
- Any items in basket are cleared
- WebSocket connection is closed

---

### 7. Get Device Status

**Endpoint Name**: Check Basket Status  
**Purpose**: Get current status of connected basket

**HTTP Method**: `GET`  
**Endpoint Path**: `/api/devices/:deviceId/status`

**When It's Called**: 
- Every 30 seconds while connected
- After reconnection
- Before checkout

**Authentication Required**: Yes

**Request Body**: None

**Response Format**:
```typescript
{
  success: boolean;
  device: {
    id: string;
    status: 'connected' | 'disconnected' | 'low_battery' | 'offline';
    batteryLevel: number;
    itemCount: number;
    lastHeartbeat: string;
    signalStrength: number; // 0-100
  }
}
```

**Success Example (200)**:
```json
{
  "success": true,
  "device": {
    "id": "dev_01HF9XZQK1",
    "status": "connected",
    "batteryLevel": 72,
    "itemCount": 5,
    "lastHeartbeat": "2025-10-29T15:30:45Z",
    "signalStrength": 85
  }
}
```

**Error Example (404)**:
```json
{
  "success": false,
  "error": "Device not connected",
  "code": "DEVICE_NOT_CONNECTED"
}
```

**Timeout/Retry Logic**:
- Timeout: 5 seconds
- Retry: 2 retries
- On failure: Show "Connection lost" indicator
- Polling interval: 30 seconds

**Notes**:
- Used to maintain connection indicator
- Battery warning at < 20%
- Auto-disconnect if no heartbeat for 5 minutes

---

## WebSocket Protocol

### 8. WebSocket Connection

**Endpoint Name**: Real-time Basket Updates  
**Purpose**: Receive live updates when items added/removed from basket

**Protocol**: WebSocket  
**Endpoint Path**: `wss://ws.shopshadow.com/basket/:deviceId`

**Connection URL**:
```
wss://ws.shopshadow.com/basket/dev_01HF9XZQK1?token=eyJhbGci...
```

**When It's Connected**: Immediately after successful device connection

**Authentication**: JWT token in query parameter

---

#### Event: item_added

**Purpose**: Raspberry Pi detected new item in basket

**Event Data**:
```typescript
{
  event: 'item_added';
  timestamp: string;
  item: {
    id: string;
    productId: string;
    name: string;
    category: string;
    quantity: number;
    price: number;
    confidence: number; // ML model confidence 0-1
    imageUrl?: string;
  }
}
```

**Example**:
```json
{
  "event": "item_added",
  "timestamp": "2025-10-29T15:31:22Z",
  "item": {
    "id": "item_temp_001",
    "productId": "P001",
    "name": "Organic Apples",
    "category": "Fruits",
    "quantity": 1,
    "price": 1.99,
    "confidence": 0.96,
    "imageUrl": "https://storage.shopshadow.com/items/..."
  }
}
```

**Client Action**:
1. Add item to basket state
2. Show toast notification: "Item added: {name}"
3. Update total price
4. Animate item card entrance

---

#### Event: item_removed

**Purpose**: Raspberry Pi detected item removed from basket

**Event Data**:
```typescript
{
  event: 'item_removed';
  timestamp: string;
  itemId: string;
  reason?: 'user_removed' | 'system_correction';
}
```

**Example**:
```json
{
  "event": "item_removed",
  "timestamp": "2025-10-29T15:32:10Z",
  "itemId": "item_temp_001",
  "reason": "user_removed"
}
```

**Client Action**:
1. Remove item from basket state
2. Show toast notification: "Item removed"
3. Update total price
4. Animate item card exit

---

#### Event: quantity_updated

**Purpose**: Item quantity changed (multiple of same item detected)

**Event Data**:
```typescript
{
  event: 'quantity_updated';
  timestamp: string;
  itemId: string;
  productId: string;
  newQuantity: number;
  oldQuantity: number;
}
```

**Example**:
```json
{
  "event": "quantity_updated",
  "timestamp": "2025-10-29T15:32:45Z",
  "itemId": "item_temp_001",
  "productId": "P001",
  "newQuantity": 3,
  "oldQuantity": 1
}
```

**Client Action**:
1. Update item quantity in state
2. Update total price
3. Animate quantity change

---

#### Event: connection_status

**Purpose**: Basket connection status changed

**Event Data**:
```typescript
{
  event: 'connection_status';
  timestamp: string;
  status: 'connected' | 'disconnected' | 'reconnecting';
  batteryLevel: number;
  reason?: string;
}
```

**Example**:
```json
{
  "event": "connection_status",
  "timestamp": "2025-10-29T15:33:00Z",
  "status": "connected",
  "batteryLevel": 85
}
```

**Client Action**:
1. Update connection indicator color
2. If disconnected: Show warning banner
3. If reconnecting: Show reconnecting message

---

#### Event: error

**Purpose**: Error occurred on basket side

**Event Data**:
```typescript
{
  event: 'error';
  timestamp: string;
  code: string;
  message: string;
  severity: 'warning' | 'error' | 'critical';
}
```

**Example**:
```json
{
  "event": "error",
  "timestamp": "2025-10-29T15:34:00Z",
  "code": "LOW_BATTERY",
  "message": "Basket battery below 15%",
  "severity": "warning"
}
```

**Client Action**:
1. Show error toast
2. If critical: Disable checkout
3. Log error for debugging

---

**WebSocket Timeout/Retry Logic**:
- Initial connect timeout: 10 seconds
- Heartbeat interval: 30 seconds
- Reconnect on disconnect: Yes
- Max reconnection attempts: 5
- Reconnection delay: Exponential backoff (1s, 2s, 4s, 8s, 16s)
- After max attempts: Show error, require manual reconnect

**WebSocket Notes**:
- Send ping every 30 seconds
- Expect pong within 5 seconds
- Automatic reconnection on network issues
- Buffer messages during reconnection
- Clear buffer after 100 messages or 5 minutes

---

## Product Endpoints

### 9. Get All Products

**Endpoint Name**: Fetch Product Catalog  
**Purpose**: Get list of all available products

**HTTP Method**: `GET`  
**Endpoint Path**: `/api/products`

**When It's Called**: 
- When user opens Product Catalog page
- Every 5 minutes to refresh prices/stock

**Authentication Required**: No (public endpoint)

**Query Parameters**:
```
?category={category}    // Optional: Filter by category
&search={query}         // Optional: Search by name
&inStock={boolean}      // Optional: Only show in-stock items
&page={number}          // Optional: Pagination (default: 1)
&limit={number}         // Optional: Items per page (default: 50)
```

**Request Body**: None

**Response Format**:
```typescript
{
  success: boolean;
  products: Array<{
    id: string;
    name: string;
    category: string;
    price: number;
    stock: number;
    inStock: boolean;
    imageUrl?: string;
    description?: string;
    barcode?: string;
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  categories: string[]; // List of all categories
}
```

**Success Example (200)**:
```json
{
  "success": true,
  "products": [
    {
      "id": "P001",
      "name": "Organic Apples",
      "category": "Fruits",
      "price": 1.99,
      "stock": 150,
      "inStock": true,
      "imageUrl": "https://cdn.shopshadow.com/products/P001.jpg",
      "description": "Fresh organic apples",
      "barcode": "1234567890123"
    },
    {
      "id": "P002",
      "name": "Fresh Milk (1L)",
      "category": "Dairy",
      "price": 3.49,
      "stock": 85,
      "inStock": true,
      "imageUrl": "https://cdn.shopshadow.com/products/P002.jpg",
      "barcode": "1234567890124"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 15,
    "totalPages": 1
  },
  "categories": ["Fruits", "Dairy", "Bakery", "Meat", "Seafood", "Vegetables", "Beverages", "Pantry"]
}
```

**Error Example (500)**:
```json
{
  "success": false,
  "error": "Database error",
  "code": "DB_ERROR",
  "message": "Unable to fetch products"
}
```

**Timeout/Retry Logic**:
- Timeout: 10 seconds
- Retry: 2 retries with 1-second delay
- On failure: Show cached products if available
- Cache TTL: 5 minutes

**Notes**:
- Public endpoint, no auth required
- Results cached on CDN for 5 minutes
- Real-time stock updates via separate endpoint

---

### 10. Get Single Product

**Endpoint Name**: Fetch Product Details  
**Purpose**: Get detailed information about a specific product

**HTTP Method**: `GET`  
**Endpoint Path**: `/api/products/:productId`

**When It's Called**: When user clicks on product for details (future feature)

**Authentication Required**: No

**Request Body**: None

**Response Format**:
```typescript
{
  success: boolean;
  product: {
    id: string;
    name: string;
    category: string;
    price: number;
    stock: number;
    inStock: boolean;
    imageUrl?: string;
    images?: string[]; // Multiple product images
    description?: string;
    barcode?: string;
    nutritionFacts?: object;
    allergens?: string[];
    weight?: string;
    dimensions?: string;
  }
}
```

**Success Example (200)**:
```json
{
  "success": true,
  "product": {
    "id": "P001",
    "name": "Organic Apples",
    "category": "Fruits",
    "price": 1.99,
    "stock": 150,
    "inStock": true,
    "imageUrl": "https://cdn.shopshadow.com/products/P001.jpg",
    "images": [
      "https://cdn.shopshadow.com/products/P001-1.jpg",
      "https://cdn.shopshadow.com/products/P001-2.jpg"
    ],
    "description": "Fresh organic apples from local farms",
    "barcode": "1234567890123",
    "weight": "1 lb",
    "nutritionFacts": {
      "calories": 95,
      "protein": "0.5g",
      "carbs": "25g"
    },
    "allergens": []
  }
}
```

**Error Example (404)**:
```json
{
  "success": false,
  "error": "Product not found",
  "code": "PRODUCT_NOT_FOUND"
}
```

**Timeout/Retry Logic**:
- Timeout: 5 seconds
- Retry: 1 retry
- Cache: 10 minutes

---

## Order & Checkout Endpoints

### 11. Create Order

**Endpoint Name**: Complete Checkout  
**Purpose**: Create order after successful payment

**HTTP Method**: `POST`  
**Endpoint Path**: `/api/orders`

**When It's Called**: After payment is successful

**Authentication Required**: Yes

**Request Body**:
```json
{
  "userId": "usr_01HF9XZQJ7",
  "deviceId": "dev_01HF9XZQK1",
  "items": [
    {
      "productId": "P001",
      "name": "Organic Apples",
      "quantity": 3,
      "price": 1.99
    },
    {
      "productId": "P002",
      "name": "Fresh Milk (1L)",
      "quantity": 2,
      "price": 3.49
    }
  ],
  "total": 12.95,
  "paymentId": "ch_3O7xFG2eZvKYlo2C0y1fHdJr",
  "paymentMethod": "card",
  "basketPhotoBase64": "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
}
```

**Response Format**:
```typescript
{
  success: boolean;
  order: {
    id: string;
    userId: string;
    deviceId: string;
    total: number;
    status: 'completed' | 'pending' | 'failed';
    items: Array<{
      id: string;
      productId: string;
      name: string;
      quantity: number;
      price: number;
    }>;
    basketPhotoUrl: string;
    paymentId: string;
    receiptUrl: string;
    createdAt: string;
  }
}
```

**Success Example (201)**:
```json
{
  "success": true,
  "order": {
    "id": "ORD-001",
    "userId": "usr_01HF9XZQJ7",
    "deviceId": "dev_01HF9XZQK1",
    "total": 12.95,
    "status": "completed",
    "items": [
      {
        "id": "item_001",
        "productId": "P001",
        "name": "Organic Apples",
        "quantity": 3,
        "price": 1.99
      },
      {
        "id": "item_002",
        "productId": "P002",
        "name": "Fresh Milk (1L)",
        "quantity": 2,
        "price": 3.49
      }
    ],
    "basketPhotoUrl": "https://storage.shopshadow.com/orders/ORD-001/basket.jpg",
    "paymentId": "ch_3O7xFG2eZvKYlo2C0y1fHdJr",
    "receiptUrl": "https://storage.shopshadow.com/receipts/ORD-001.pdf",
    "createdAt": "2025-10-29T15:40:00Z"
  }
}
```

**Error Example (400)**:
```json
{
  "success": false,
  "error": "Invalid order data",
  "code": "INVALID_ORDER",
  "fields": {
    "items": "Items array cannot be empty"
  }
}
```

**Error Example (409)**:
```json
{
  "success": false,
  "error": "Insufficient stock",
  "code": "INSUFFICIENT_STOCK",
  "products": [
    {
      "productId": "P002",
      "requested": 10,
      "available": 5
    }
  ]
}
```

**Timeout/Retry Logic**:
- Timeout: 30 seconds
- Retry: 1 retry with 3-second delay
- On failure: Show error, keep items in basket
- Idempotency: Use idempotency key to prevent duplicate orders

**Notes**:
- Order ID is generated server-side
- Basket photo uploaded to cloud storage
- Receipt generated asynchronously
- Email sent to user with receipt
- Disconnect from basket after successful order

---

### 12. Get User Orders

**Endpoint Name**: Fetch Order History  
**Purpose**: Get list of user's past orders

**HTTP Method**: `GET`  
**Endpoint Path**: `/api/orders/user/:userId`

**When It's Called**: 
- When user opens Orders History page
- Pull-to-refresh on orders page

**Authentication Required**: Yes (must be the user or admin)

**Query Parameters**:
```
?page={number}           // Optional: Pagination
&limit={number}          // Optional: Orders per page (default: 20)
&status={status}         // Optional: Filter by status
&startDate={date}        // Optional: Filter from date
&endDate={date}          // Optional: Filter to date
```

**Request Body**: None

**Response Format**:
```typescript
{
  success: boolean;
  orders: Array<{
    id: string;
    date: string;
    total: number;
    status: 'completed' | 'pending' | 'cancelled';
    itemCount: number;
    items: Array<{
      id: string;
      name: string;
      quantity: number;
      price: number;
    }>;
    basketPhotoUrl: string;
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  summary: {
    totalOrders: number;
    totalSpent: number;
    averageOrder: number;
  }
}
```

**Success Example (200)**:
```json
{
  "success": true,
  "orders": [
    {
      "id": "ORD-001",
      "date": "2025-10-29T15:40:00Z",
      "total": 23.45,
      "status": "completed",
      "itemCount": 4,
      "items": [
        {
          "id": "item_001",
          "name": "Organic Apples",
          "quantity": 3,
          "price": 1.99
        }
      ],
      "basketPhotoUrl": "https://storage.shopshadow.com/orders/ORD-001/basket.jpg"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 12,
    "totalPages": 1
  },
  "summary": {
    "totalOrders": 12,
    "totalSpent": 456.78,
    "averageOrder": 38.07
  }
}
```

**Error Example (403)**:
```json
{
  "success": false,
  "error": "Unauthorized",
  "code": "UNAUTHORIZED",
  "message": "You can only view your own orders"
}
```

**Timeout/Retry Logic**:
- Timeout: 10 seconds
- Retry: 2 retries
- Cache: 1 minute
- On failure: Show cached orders if available

---

### 13. Get Single Order

**Endpoint Name**: Fetch Order Details  
**Purpose**: Get detailed information about a specific order

**HTTP Method**: `GET`  
**Endpoint Path**: `/api/orders/:orderId`

**When It's Called**: When user clicks "View Details" on an order

**Authentication Required**: Yes (must be order owner or admin)

**Request Body**: None

**Response Format**:
```typescript
{
  success: boolean;
  order: {
    id: string;
    userId: string;
    date: string;
    total: number;
    status: 'completed' | 'pending' | 'cancelled';
    items: Array<{
      id: string;
      productId: string;
      name: string;
      category: string;
      quantity: number;
      price: number;
      subtotal: number;
    }>;
    basketPhotoUrl: string;
    paymentMethod: string;
    paymentId: string;
    receiptUrl: string;
    createdAt: string;
    updatedAt: string;
  }
}
```

**Success Example (200)**:
```json
{
  "success": true,
  "order": {
    "id": "ORD-001",
    "userId": "usr_01HF9XZQJ7",
    "date": "2025-10-29T15:40:00Z",
    "total": 23.45,
    "status": "completed",
    "items": [
      {
        "id": "item_001",
        "productId": "P001",
        "name": "Organic Apples",
        "category": "Fruits",
        "quantity": 3,
        "price": 1.99,
        "subtotal": 5.97
      }
    ],
    "basketPhotoUrl": "https://storage.shopshadow.com/orders/ORD-001/basket.jpg",
    "paymentMethod": "card",
    "paymentId": "ch_3O7xFG2eZvKYlo2C0y1fHdJr",
    "receiptUrl": "https://storage.shopshadow.com/receipts/ORD-001.pdf",
    "createdAt": "2025-10-29T15:40:00Z",
    "updatedAt": "2025-10-29T15:40:00Z"
  }
}
```

**Error Example (404)**:
```json
{
  "success": false,
  "error": "Order not found",
  "code": "ORDER_NOT_FOUND"
}
```

**Timeout/Retry Logic**:
- Timeout: 5 seconds
- Retry: 1 retry
- Cache: 5 minutes

---

## Payment Processing Endpoints

### 14. Process Payment

**Endpoint Name**: Charge Payment  
**Purpose**: Process payment through payment gateway (Stripe)

**HTTP Method**: `POST`  
**Endpoint Path**: `/api/payments/charge`

**When It's Called**: When user submits payment form

**Authentication Required**: Yes

**Request Body**:
```json
{
  "userId": "usr_01HF9XZQJ7",
  "amount": 23.45,
  "currency": "USD",
  "paymentMethod": {
    "type": "card",
    "token": "tok_1O7xFG2eZvKYlo2C0y1fHdJr"
  },
  "description": "Shop Shadow Order",
  "metadata": {
    "deviceId": "dev_01HF9XZQK1",
    "itemCount": 4
  }
}
```

**Response Format**:
```typescript
{
  success: boolean;
  charge: {
    id: string;
    amount: number;
    currency: string;
    status: 'succeeded' | 'pending' | 'failed';
    receiptUrl?: string;
    created: string;
  }
}
```

**Success Example (200)**:
```json
{
  "success": true,
  "charge": {
    "id": "ch_3O7xFG2eZvKYlo2C0y1fHdJr",
    "amount": 23.45,
    "currency": "USD",
    "status": "succeeded",
    "receiptUrl": "https://stripe.com/receipts/...",
    "created": "2025-10-29T15:40:00Z"
  }
}
```

**Error Example (402)**:
```json
{
  "success": false,
  "error": "Payment declined",
  "code": "CARD_DECLINED",
  "message": "Your card was declined. Please try another payment method.",
  "declineCode": "insufficient_funds"
}
```

**Error Example (422)**:
```json
{
  "success": false,
  "error": "Invalid payment details",
  "code": "INVALID_PAYMENT",
  "fields": {
    "card": "Card number is invalid"
  }
}
```

**Timeout/Retry Logic**:
- Timeout: 30 seconds
- Retry: DO NOT retry (could cause duplicate charges)
- On failure: Show error, allow user to retry manually
- Idempotency: Use idempotency key

**Notes**:
- Use Stripe.js to tokenize card before sending to backend
- Never send raw card numbers to backend
- PCI compliance required
- 3D Secure authentication for cards requiring it

---

### 15. Process Apple Pay

**Endpoint Name**: Apple Pay Payment  
**Purpose**: Process payment through Apple Pay

**HTTP Method**: `POST`  
**Endpoint Path**: `/api/payments/apple-pay`

**When It's Called**: When user confirms Apple Pay

**Authentication Required**: Yes

**Request Body**:
```json
{
  "userId": "usr_01HF9XZQJ7",
  "amount": 23.45,
  "currency": "USD",
  "paymentMethod": {
    "type": "apple_pay",
    "token": "apple_pay_token_here"
  },
  "description": "Shop Shadow Order"
}
```

**Response Format**: Same as Process Payment endpoint

**Success Example (200)**:
```json
{
  "success": true,
  "charge": {
    "id": "ch_3O7xFG2eZvKYlo2C0y1fHdJr",
    "amount": 23.45,
    "currency": "USD",
    "status": "succeeded",
    "created": "2025-10-29T15:40:00Z"
  }
}
```

**Error Example (402)**:
```json
{
  "success": false,
  "error": "Payment declined",
  "code": "APPLE_PAY_DECLINED"
}
```

**Timeout/Retry Logic**: Same as card payment

**Notes**:
- Requires Apple Pay merchant certificate
- Only works on supported devices/browsers
- Fallback to card payment if unavailable

---

## Admin Endpoints

### 16. Admin - Get All Orders

**Endpoint Name**: Admin View All Orders  
**Purpose**: Get list of all orders across all users

**HTTP Method**: `GET`  
**Endpoint Path**: `/api/admin/orders`

**When It's Called**: When admin opens Orders Management page

**Authentication Required**: Yes (Admin role)

**Query Parameters**:
```
?page={number}
&limit={number}
&status={status}
&search={query}        // Search by order ID, customer name, email
&startDate={date}
&endDate={date}
&sortBy={field}        // total, date, status
&sortOrder={asc|desc}
```

**Request Body**: None

**Response Format**:
```typescript
{
  success: boolean;
  orders: Array<{
    id: string;
    userId: string;
    userName: string;
    userEmail: string;
    date: string;
    total: number;
    status: 'completed' | 'pending' | 'processing' | 'cancelled';
    itemCount: number;
    basketPhotoUrl: string;
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  stats: {
    totalOrders: number;
    totalRevenue: number;
    averageOrderValue: number;
  }
}
```

**Success Example (200)**:
```json
{
  "success": true,
  "orders": [
    {
      "id": "ORD-001",
      "userId": "usr_01HF9XZQJ7",
      "userName": "John Doe",
      "userEmail": "john@email.com",
      "date": "2025-10-29T15:40:00Z",
      "total": 23.45,
      "status": "completed",
      "itemCount": 4,
      "basketPhotoUrl": "https://storage.shopshadow.com/orders/ORD-001/basket.jpg"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 125,
    "totalPages": 7
  },
  "stats": {
    "totalOrders": 125,
    "totalRevenue": 4290.50,
    "averageOrderValue": 34.32
  }
}
```

**Error Example (403)**:
```json
{
  "success": false,
  "error": "Forbidden",
  "code": "ADMIN_REQUIRED",
  "message": "Admin access required"
}
```

**Timeout/Retry Logic**:
- Timeout: 15 seconds
- Retry: 2 retries
- Cache: 30 seconds

---

### 17. Admin - Get All Products

**Endpoint Name**: Admin View All Products  
**Purpose**: Get list of all products with management capabilities

**HTTP Method**: `GET`  
**Endpoint Path**: `/api/admin/products`

**When It's Called**: When admin opens Products Management page

**Authentication Required**: Yes (Admin role)

**Query Parameters**:
```
?page={number}
&limit={number}
&search={query}
&category={category}
&inStock={boolean}
&sortBy={field}
&sortOrder={asc|desc}
```

**Request Body**: None

**Response Format**:
```typescript
{
  success: boolean;
  products: Array<{
    id: string;
    name: string;
    category: string;
    price: number;
    stock: number;
    inStock: boolean;
    sold: number;          // Total units sold
    revenue: number;       // Total revenue from this product
    createdAt: string;
    updatedAt: string;
  }>;
  pagination: object;
}
```

**Success Example (200)**:
```json
{
  "success": true,
  "products": [
    {
      "id": "P001",
      "name": "Organic Apples",
      "category": "Fruits",
      "price": 1.99,
      "stock": 150,
      "inStock": true,
      "sold": 342,
      "revenue": 680.58,
      "createdAt": "2025-09-01T10:00:00Z",
      "updatedAt": "2025-10-29T15:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 12,
    "totalPages": 1
  }
}
```

**Timeout/Retry Logic**:
- Timeout: 10 seconds
- Retry: 2 retries

---

### 18. Admin - Create Product

**Endpoint Name**: Admin Add Product  
**Purpose**: Create new product in catalog

**HTTP Method**: `POST`  
**Endpoint Path**: `/api/admin/products`

**When It's Called**: When admin submits "Add Product" form

**Authentication Required**: Yes (Admin role)

**Request Body**:
```json
{
  "name": "Greek Yogurt",
  "category": "Dairy",
  "price": 4.49,
  "stock": 100,
  "inStock": true,
  "description": "Creamy Greek yogurt",
  "barcode": "1234567890125",
  "imageUrl": "https://cdn.shopshadow.com/products/new-product.jpg"
}
```

**Response Format**:
```typescript
{
  success: boolean;
  product: {
    id: string;
    name: string;
    category: string;
    price: number;
    stock: number;
    inStock: boolean;
    createdAt: string;
  }
}
```

**Success Example (201)**:
```json
{
  "success": true,
  "product": {
    "id": "P016",
    "name": "Greek Yogurt",
    "category": "Dairy",
    "price": 4.49,
    "stock": 100,
    "inStock": true,
    "createdAt": "2025-10-29T16:00:00Z"
  }
}
```

**Error Example (409)**:
```json
{
  "success": false,
  "error": "Product already exists",
  "code": "DUPLICATE_PRODUCT",
  "field": "barcode"
}
```

**Error Example (422)**:
```json
{
  "success": false,
  "error": "Validation error",
  "code": "VALIDATION_ERROR",
  "fields": {
    "price": "Price must be greater than 0",
    "stock": "Stock must be a positive integer"
  }
}
```

**Timeout/Retry Logic**:
- Timeout: 10 seconds
- Retry: 1 retry
- On failure: Show error, keep form data

---

### 19. Admin - Update Product

**Endpoint Name**: Admin Edit Product  
**Purpose**: Update existing product details

**HTTP Method**: `PUT`  
**Endpoint Path**: `/api/admin/products/:productId`

**When It's Called**: When admin submits edit product form

**Authentication Required**: Yes (Admin role)

**Request Body**:
```json
{
  "name": "Greek Yogurt (Updated)",
  "category": "Dairy",
  "price": 4.99,
  "stock": 150,
  "inStock": true
}
```

**Response Format**:
```typescript
{
  success: boolean;
  product: {
    id: string;
    name: string;
    category: string;
    price: number;
    stock: number;
    inStock: boolean;
    updatedAt: string;
  }
}
```

**Success Example (200)**:
```json
{
  "success": true,
  "product": {
    "id": "P016",
    "name": "Greek Yogurt (Updated)",
    "category": "Dairy",
    "price": 4.99,
    "stock": 150,
    "inStock": true,
    "updatedAt": "2025-10-29T16:05:00Z"
  }
}
```

**Error Example (404)**:
```json
{
  "success": false,
  "error": "Product not found",
  "code": "PRODUCT_NOT_FOUND"
}
```

**Timeout/Retry Logic**:
- Timeout: 10 seconds
- Retry: 1 retry

---

### 20. Admin - Delete Product

**Endpoint Name**: Admin Delete Product  
**Purpose**: Remove product from catalog

**HTTP Method**: `DELETE`  
**Endpoint Path**: `/api/admin/products/:productId`

**When It's Called**: When admin confirms product deletion

**Authentication Required**: Yes (Admin role)

**Request Body**: None

**Response Format**:
```typescript
{
  success: boolean;
  message: string;
}
```

**Success Example (200)**:
```json
{
  "success": true,
  "message": "Product deleted successfully"
}
```

**Error Example (409)**:
```json
{
  "success": false,
  "error": "Cannot delete product",
  "code": "PRODUCT_IN_USE",
  "message": "This product has active orders and cannot be deleted",
  "affectedOrders": 12
}
```

**Timeout/Retry Logic**:
- Timeout: 5 seconds
- Retry: No retry (requires new confirmation)

**Notes**:
- Soft delete (mark as deleted, don't actually remove from DB)
- Cannot delete if product has orders in last 90 days
- Admin must confirm deletion

---

### 21. Admin - Get All Users

**Endpoint Name**: Admin View All Users  
**Purpose**: Get list of all registered users

**HTTP Method**: `GET`  
**Endpoint Path**: `/api/admin/users`

**When It's Called**: When admin opens Users Management page

**Authentication Required**: Yes (Admin role)

**Query Parameters**:
```
?page={number}
&limit={number}
&search={query}        // Search by name, email, ID
&status={status}       // active, inactive
&sortBy={field}
&sortOrder={asc|desc}
```

**Request Body**: None

**Response Format**:
```typescript
{
  success: boolean;
  users: Array<{
    id: string;
    name: string;
    email: string;
    role: 'user' | 'admin';
    status: 'active' | 'inactive' | 'suspended';
    totalOrders: number;
    totalSpent: number;
    joinDate: string;
    lastLogin?: string;
  }>;
  pagination: object;
  stats: {
    totalUsers: number;
    activeUsers: number;
    totalRevenue: number;
  }
}
```

**Success Example (200)**:
```json
{
  "success": true,
  "users": [
    {
      "id": "usr_01HF9XZQJ7",
      "name": "John Doe",
      "email": "john@email.com",
      "role": "user",
      "status": "active",
      "totalOrders": 12,
      "totalSpent": 456.78,
      "joinDate": "2025-09-15T10:00:00Z",
      "lastLogin": "2025-10-29T14:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 156,
    "totalPages": 4
  },
  "stats": {
    "totalUsers": 156,
    "activeUsers": 142,
    "totalRevenue": 15678.90
  }
}
```

**Timeout/Retry Logic**:
- Timeout: 10 seconds
- Retry: 2 retries

---

### 22. Admin - Get Dashboard Analytics

**Endpoint Name**: Admin Dashboard Stats  
**Purpose**: Get analytics data for admin dashboard

**HTTP Method**: `GET`  
**Endpoint Path**: `/api/admin/analytics/dashboard`

**When It's Called**: 
- When admin opens Overview page
- Every 5 minutes for refresh

**Authentication Required**: Yes (Admin role)

**Query Parameters**:
```
?period={week|month|year}    // Time period for data
&startDate={date}            // Optional: Custom date range
&endDate={date}              // Optional: Custom date range
```

**Request Body**: None

**Response Format**:
```typescript
{
  success: boolean;
  stats: {
    totalRevenue: number;
    totalOrders: number;
    productsSold: number;
    avgOrderValue: number;
    revenueChange: number;     // Percentage change from previous period
    ordersChange: number;
  };
  charts: {
    revenueByDay: Array<{
      date: string;
      revenue: number;
      orders: number;
    }>;
    salesByCategory: Array<{
      category: string;
      value: number;
      percentage: number;
    }>;
  };
  recentActivity: Array<{
    action: string;
    user: string;
    time: string;
    amount?: number;
  }>;
}
```

**Success Example (200)**:
```json
{
  "success": true,
  "stats": {
    "totalRevenue": 4290.00,
    "totalOrders": 125,
    "productsSold": 342,
    "avgOrderValue": 34.32,
    "revenueChange": 12.5,
    "ordersChange": 8.2
  },
  "charts": {
    "revenueByDay": [
      {
        "date": "Mon",
        "revenue": 450,
        "orders": 12
      },
      {
        "date": "Tue",
        "revenue": 520,
        "orders": 15
      }
    ],
    "salesByCategory": [
      {
        "category": "Fruits",
        "value": 30,
        "percentage": 30
      }
    ]
  },
  "recentActivity": [
    {
      "action": "New order placed",
      "user": "John Doe",
      "time": "2 mins ago",
      "amount": 45.99
    }
  ]
}
```

**Timeout/Retry Logic**:
- Timeout: 15 seconds
- Retry: 2 retries
- Cache: 5 minutes

---

## Data Structures

### User
```typescript
interface User {
  id: string;                    // UUID
  name: string;
  email: string;                 // Unique
  passwordHash: string;          // bcrypt hash
  role: 'user' | 'admin';
  status: 'active' | 'inactive' | 'suspended';
  createdAt: string;             // ISO 8601
  updatedAt: string;
  lastLogin?: string;
  emailVerified: boolean;
}
```

**PostgreSQL Table**:
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  email_verified BOOLEAN DEFAULT false,
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
```

---

### Product
```typescript
interface Product {
  id: string;                    // e.g., P001
  name: string;
  category: string;
  price: number;                 // Decimal
  stock: number;
  inStock: boolean;
  description?: string;
  barcode?: string;              // Unique
  imageUrl?: string;
  weight?: string;
  createdAt: string;
  updatedAt: string;
}
```

**PostgreSQL Table**:
```sql
CREATE TABLE products (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  price DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  in_stock BOOLEAN GENERATED ALWAYS AS (stock > 0) STORED,
  description TEXT,
  barcode VARCHAR(50) UNIQUE,
  image_url TEXT,
  weight VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_barcode ON products(barcode);
CREATE INDEX idx_products_in_stock ON products(in_stock);
```

---

### Device (Smart Basket)
```typescript
interface Device {
  id: string;                    // UUID
  code: string;                  // 4-digit code, unique
  name: string;
  status: 'connected' | 'disconnected' | 'offline';
  batteryLevel: number;          // 0-100
  firmwareVersion: string;
  connectedUserId?: string;      // FK to users
  lastHeartbeat: string;
  createdAt: string;
  updatedAt: string;
}
```

**PostgreSQL Table**:
```sql
CREATE TABLE devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(4) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  status VARCHAR(20) DEFAULT 'disconnected' CHECK (status IN ('connected', 'disconnected', 'offline')),
  battery_level INTEGER CHECK (battery_level >= 0 AND battery_level <= 100),
  firmware_version VARCHAR(20),
  connected_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  last_heartbeat TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_devices_code ON devices(code);
CREATE INDEX idx_devices_user ON devices(connected_user_id);
CREATE INDEX idx_devices_status ON devices(status);
```

---

### Order
```typescript
interface Order {
  id: string;                    // e.g., ORD-001
  userId: string;                // FK to users
  deviceId: string;              // FK to devices
  total: number;
  status: 'pending' | 'processing' | 'completed' | 'cancelled' | 'failed';
  paymentMethod: 'card' | 'apple_pay';
  paymentId: string;             // Stripe charge ID
  basketPhotoUrl: string;
  receiptUrl?: string;
  createdAt: string;
  updatedAt: string;
}
```

**PostgreSQL Table**:
```sql
CREATE TABLE orders (
  id VARCHAR(50) PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  device_id UUID REFERENCES devices(id),
  total DECIMAL(10, 2) NOT NULL CHECK (total >= 0),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'cancelled', 'failed')),
  payment_method VARCHAR(20) CHECK (payment_method IN ('card', 'apple_pay')),
  payment_id VARCHAR(255),
  basket_photo_url TEXT,
  receipt_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_date ON orders(created_at DESC);
```

---

### OrderItem
```typescript
interface OrderItem {
  id: string;                    // UUID
  orderId: string;               // FK to orders
  productId: string;             // FK to products
  name: string;                  // Snapshot at time of order
  category: string;
  quantity: number;
  price: number;                 // Price at time of order
  subtotal: number;
}
```

**PostgreSQL Table**:
```sql
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id VARCHAR(50) NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id VARCHAR(50) NOT NULL REFERENCES products(id),
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  price DECIMAL(10, 2) NOT NULL,
  subtotal DECIMAL(10, 2) GENERATED ALWAYS AS (quantity * price) STORED
);

CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_items_product ON order_items(product_id);
```

---

### Session (Authentication)
```typescript
interface Session {
  id: string;                    // UUID
  userId: string;                // FK to users
  token: string;                 // JWT
  refreshToken: string;
  expiresAt: string;
  createdAt: string;
}
```

**PostgreSQL Table**:
```sql
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_token ON sessions(token);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);
```

---

## Error Handling

### Standard Error Response Format
```typescript
interface ErrorResponse {
  success: false;
  error: string;                 // Human-readable error message
  code: string;                  // Machine-readable error code
  message?: string;              // Detailed message
  fields?: Record<string, string>; // Field-specific validation errors
  timestamp: string;
  requestId?: string;            // For debugging
}
```

### Error Codes Reference

#### Authentication Errors (4xx)
- `INVALID_CREDENTIALS` - Wrong email/password
- `INVALID_TOKEN` - JWT token invalid or expired
- `REFRESH_TOKEN_EXPIRED` - Refresh token expired, re-login required
- `UNAUTHORIZED` - Not logged in
- `FORBIDDEN` - Logged in but insufficient permissions
- `ADMIN_REQUIRED` - Admin role required

#### Validation Errors (422)
- `VALIDATION_ERROR` - One or more fields failed validation
- `INVALID_EMAIL` - Email format invalid
- `WEAK_PASSWORD` - Password doesn't meet requirements
- `REQUIRED_FIELD` - Required field missing

#### Resource Errors (404, 409)
- `USER_NOT_FOUND` - User doesn't exist
- `PRODUCT_NOT_FOUND` - Product doesn't exist
- `ORDER_NOT_FOUND` - Order doesn't exist
- `DEVICE_NOT_FOUND` - Device doesn't exist
- `DUPLICATE_EMAIL` - Email already registered
- `DUPLICATE_PRODUCT` - Product barcode already exists
- `DEVICE_IN_USE` - Basket already connected

#### Device/Connection Errors
- `INVALID_CODE` - Connection code wrong
- `DEVICE_NOT_CONNECTED` - Not connected to basket
- `CONNECTION_LOST` - WebSocket disconnected
- `DEVICE_OFFLINE` - Basket is offline

#### Payment Errors (402)
- `PAYMENT_DECLINED` - Card declined
- `CARD_DECLINED` - Specific card decline
- `INSUFFICIENT_FUNDS` - Not enough money
- `INVALID_PAYMENT` - Payment details invalid
- `APPLE_PAY_DECLINED` - Apple Pay declined

#### Business Logic Errors
- `INSUFFICIENT_STOCK` - Not enough product in stock
- `PRODUCT_IN_USE` - Cannot delete product with orders
- `EMPTY_BASKET` - Cannot checkout with no items
- `INVALID_ORDER` - Order data invalid

#### System Errors (5xx)
- `DB_ERROR` - Database error
- `INTERNAL_ERROR` - Unexpected server error
- `SERVICE_UNAVAILABLE` - Service temporarily down
- `EXTERNAL_API_ERROR` - Third-party API failed

---

## Rate Limiting

### Rate Limit Configuration

**Public Endpoints** (no auth):
- `GET /api/products` - 100 requests/hour per IP
- `GET /api/products/:id` - 100 requests/hour per IP

**Authentication Endpoints**:
- `POST /api/auth/login` - 5 requests/minute per IP
- `POST /api/auth/signup` - 3 requests/hour per IP
- `POST /api/auth/refresh` - 10 requests/minute per token

**User Endpoints** (authenticated):
- `GET /api/orders/*` - 60 requests/minute per user
- `POST /api/orders` - 10 requests/minute per user
- `POST /api/payments/*` - 5 requests/minute per user

**Admin Endpoints** (admin auth):
- All admin endpoints - 1000 requests/hour per admin
- `DELETE` operations - 100 requests/hour per admin

**WebSocket**:
- No rate limit (connection-based)
- Max 1 connection per user
- Auto-disconnect after 4 hours

### Rate Limit Headers
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1699123456
Retry-After: 60  // Seconds until reset (when limited)
```

### Rate Limit Error Response (429)
```json
{
  "success": false,
  "error": "Too many requests",
  "code": "RATE_LIMIT_EXCEEDED",
  "message": "You have exceeded the rate limit. Please try again later.",
  "retryAfter": 60,
  "limit": 100,
  "resetAt": "2025-10-29T16:00:00Z"
}
```

---

## Retry & Timeout Strategies

### Timeout Policies
- **Authentication**: 10 seconds
- **Product Fetch**: 10 seconds
- **Order Creation**: 30 seconds
- **Payment Processing**: 30 seconds
- **WebSocket Connect**: 10 seconds
- **Admin Endpoints**: 15 seconds

### Retry Policies

**Automatic Retry** (idempotent operations):
- GET requests: 2 retries with exponential backoff
- WebSocket: 5 reconnection attempts
- Delay: 1s, 2s, 4s, 8s, 16s

**No Automatic Retry** (non-idempotent):
- POST /api/auth/login (security)
- POST /api/payments/* (prevent duplicate charges)
- POST /api/orders (prevent duplicate orders)
- DELETE operations (must confirm again)

**User-Triggered Retry**:
- Show error message
- Provide "Try Again" button
- Preserve form data

### Exponential Backoff Formula
```javascript
delay = min(baseDelay * 2^attempt, maxDelay)
baseDelay = 1000ms
maxDelay = 16000ms
```

---

## Idempotency

### Idempotency Keys
Used for payment and order endpoints to prevent duplicate operations.

**Header**:
```
Idempotency-Key: uuid-v4-here
```

**Example**:
```javascript
// Client generates idempotency key
const idempotencyKey = crypto.randomUUID();

fetch('/api/payments/charge', {
  method: 'POST',
  headers: {
    'Idempotency-Key': idempotencyKey,
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify(paymentData)
});
```

**Server Behavior**:
- If key seen before within 24 hours: Return cached response
- If new key: Process request and cache response
- Keys expire after 24 hours

---

## Environment Variables

```env
# API
API_BASE_URL=https://api.shopshadow.com
WS_BASE_URL=wss://ws.shopshadow.com

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/shopshadow
DB_POOL_MIN=2
DB_POOL_MAX=10

# Authentication
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=24h
REFRESH_TOKEN_EXPIRES_IN=30d

# Payment (Stripe)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Storage (AWS S3 or similar)
STORAGE_BUCKET=shopshadow-prod
STORAGE_REGION=us-east-1
STORAGE_ACCESS_KEY=...
STORAGE_SECRET_KEY=...

# Redis (for caching, sessions)
REDIS_URL=redis://localhost:6379

# Email (SendGrid or similar)
EMAIL_API_KEY=...
EMAIL_FROM=noreply@shopshadow.com

# Rate Limiting
RATE_LIMIT_WINDOW=60000  // 1 minute in ms
RATE_LIMIT_MAX=100       // Max requests per window
```

---

## Security Considerations

### HTTPS Only
All API endpoints must use HTTPS in production.

### CORS Configuration
```javascript
{
  origin: ['https://shopshadow.com', 'https://app.shopshadow.com'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key']
}
```

### Request Size Limits
- JSON body: 10 MB
- File uploads: 50 MB
- Query string: 2048 characters

### Input Sanitization
- Strip HTML tags from user input
- Validate email formats
- Escape SQL (use parameterized queries)
- Validate JWT signatures

### Password Requirements
- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 lowercase letter
- At least 1 number
- Optional: 1 special character

---

**Document Version**: 1.0  
**Last Updated**: October 29, 2025  
**Status**: ✅ Complete - Ready for backend implementation

This document provides the complete API specification for Shop Shadow. All endpoints are ready for Supabase/PostgreSQL integration and Raspberry Pi WebSocket communication.
