# Shop Shadow - Component Interactions Documentation

## Table of Contents
1. [Landing Page Components](#landing-page-components)
2. [Authentication Components](#authentication-components)
3. [Connection Page Components](#connection-page-components)
4. [Dashboard Components](#dashboard-components)
5. [Checkout Components](#checkout-components)
6. [Product Catalog Components](#product-catalog-components)
7. [Orders History Components](#orders-history-components)
8. [Admin Components](#admin-components)
9. [Shared Components](#shared-components)
10. [API Reference](#api-reference)

---

## Landing Page Components

### 1. Sign In Button (Header)

**Component Name**: Sign In Button  
**Location**: Top-right header  
**Type**: GlassButton (variant: secondary)

#### User Action
- **Click/Tap**: User clicks the "Sign In" button

#### System Response
1. Immediate navigation to Login Page
2. No loading state (instant transition)

#### API Call Triggered
- **None** - Client-side routing only

#### Visual Feedback
- **Hover**: Slight background opacity change
- **Active**: Button press animation
- **Transition**: Page fade transition

#### Error Handling
- N/A - No API calls

---

### 2. Get Started Button (Hero)

**Component Name**: Get Started Button  
**Location**: Hero section center  
**Type**: GlassButton (variant: primary)

#### User Action
- **Click/Tap**: User clicks "Get Started" button

#### System Response
1. Navigate to Login Page
2. No state persistence needed

#### API Call Triggered
- **None** - Client-side routing only

#### Visual Feedback
- **Hover**: Background color intensifies, slight scale
- **Active**: Scale down slightly
- **Icon**: Arrow right icon animates

#### Error Handling
- N/A - No API calls

---

### 3. Try Demo Button

**Component Name**: Try Demo Button  
**Location**: Hero section, below "Get Started"  
**Type**: GlassButton (variant: secondary)

#### User Action
- **Click/Tap**: User clicks "Try Demo" button

#### System Response
1. Navigate to Login Page
2. Set `isDemo` flag to `true`
3. Pre-populate demo credentials hint

#### API Call Triggered
- **None** - Client-side routing with flag

#### Visual Feedback
- **Hover**: Background opacity change
- **Active**: Button press animation

#### Error Handling
- N/A - No API calls

---

### 4. Feature Cards (Grid)

**Component Name**: Feature Cards  
**Location**: Below hero section  
**Type**: GlassCard (hover enabled)

#### User Action
- **Hover**: Mouse over card

#### System Response
1. Card elevates (shadow increases)
2. Slight scale transformation

#### API Call Triggered
- **None** - Pure CSS/animation

#### Visual Feedback
- **Hover**: Scale 1.02, shadow increases
- **Animation**: Staggered entry on page load (0.4s + index * 0.1s)

#### Error Handling
- N/A - Static content

---

## Authentication Components

### 5. Login Form

**Component Name**: Login Form  
**Location**: Login Page  
**Type**: Form with email and password inputs

#### User Action
- **Type**: User enters email and password
- **Submit**: Click "Sign In" or press Enter

#### System Response
1. **Validation**:
   - Check if fields are not empty
   - Validate against hardcoded credentials
2. **Success Path**:
   - If `demo@email.com/1234` → Navigate to Connection Page (user)
   - If `admin@email.com/1111` → Navigate to Admin Dashboard (admin)
3. **Error Path**:
   - Show error toast for 5 seconds

#### API Call Triggered (Future)
```
Endpoint: POST /api/auth/login
Method: POST

Request:
{
  "email": "user@email.com",
  "password": "hashedPassword"
}

Response Success (200):
{
  "success": true,
  "token": "jwt_token_here",
  "user": {
    "id": "uuid",
    "name": "John Doe",
    "email": "user@email.com",
    "role": "user" | "admin"
  }
}

Response Error (401):
{
  "success": false,
  "error": "Invalid credentials"
}
```

#### Visual Feedback
- **Focus**: Input fields show focus ring
- **Error Toast**: Red-bordered toast, bottom-right, 5s duration
  - Message: "Invalid credentials. Try demo@email.com / 1234 or admin@email.com / 1111"
- **Success Toast**: Green-bordered toast, 3s duration
  - Message: "Welcome back!"

#### Error Handling
- **Invalid Credentials**: Show error toast, stay on login page
- **Empty Fields**: Browser validation (HTML5 required)
- **Network Error** (future): "Unable to connect. Please try again."

---

### 6. Signup Form

**Component Name**: Signup Form  
**Location**: Signup Page  
**Type**: Form with name, email, password inputs

#### User Action
- **Type**: User enters name, email, and password
- **Submit**: Click "Create Account"

#### System Response
1. **Current**: Console log form data, show success toast
2. **Navigate**: To Connection Page after 1 second

#### API Call Triggered (Future)
```
Endpoint: POST /api/auth/signup
Method: POST

Request:
{
  "name": "John Doe",
  "email": "user@email.com",
  "password": "securePassword123"
}

Response Success (201):
{
  "success": true,
  "message": "Account created successfully",
  "user": {
    "id": "uuid",
    "name": "John Doe",
    "email": "user@email.com",
    "role": "user"
  },
  "token": "jwt_token_here"
}

Response Error (400):
{
  "success": false,
  "error": "Email already exists"
}
```

#### Visual Feedback
- **Focus**: Input fields show focus ring
- **Success Toast**: Green-bordered toast, 3s duration
  - Message: "Account created successfully!"
- **Error Toast** (future): Red-bordered toast
  - Message: "Email already registered" or validation error

#### Error Handling
- **Duplicate Email** (future): "This email is already registered"
- **Weak Password** (future): "Password must be at least 8 characters"
- **Network Error** (future): "Unable to create account. Try again."

---

## Connection Page Components

### 7. Connection Code Input

**Component Name**: Connection Code Input  
**Location**: Connection Page center  
**Type**: Input field (numeric only)

#### User Action
- **Type**: User enters 4-digit code
- **Auto-format**: Only accepts numbers, max 4 digits

#### System Response
1. Filter input to numbers only
2. Limit to 4 characters
3. Enable "Connect" button when length === 4

#### API Call Triggered
- **None** during typing

#### Visual Feedback
- **Input Style**: Large text (text-2xl), center-aligned, tracking-widest
- **Hint** (demo mode): "Hint: Use code 0000 for demo"
- **Character Limit**: Visual feedback at 4 characters (button enables)

#### Error Handling
- **Non-numeric**: Filtered out on input
- **Paste**: Non-numeric characters stripped

---

### 8. Connect Button

**Component Name**: Connect Button  
**Location**: Below connection code input  
**Type**: GlassButton (variant: primary)

#### User Action
- **Click**: User clicks "Connect" with 4-digit code entered

#### System Response
1. **Validation**: Check if code === "0000"
2. **Success Path**:
   - Show "Connecting..." text
   - Disable button
   - Simulate 2-second connection
   - Show success toast
   - Navigate to Dashboard
3. **Error Path**:
   - Show error toast
   - Reset to idle state

#### API Call Triggered (Future)
```
Endpoint: POST /api/devices/connect
Method: POST

Request:
{
  "code": "0000",
  "userId": "user_uuid"
}

Response Success (200):
{
  "success": true,
  "device": {
    "id": "device_uuid",
    "name": "Smart Basket #0000",
    "status": "connected",
    "batteryLevel": 85
  },
  "websocketUrl": "wss://api.shopshadow.com/ws/basket/device_uuid"
}

Response Error (404):
{
  "success": false,
  "error": "Invalid connection code"
}
```

#### Visual Feedback
- **Idle**: "Connect" text, enabled
- **Connecting**: "Connecting..." text, disabled, cursor wait
- **Success Toast**: Green-bordered, 3s duration
  - Message: "Successfully connected to basket!"
- **Error Toast**: Red-bordered, 3s duration
  - Message: "Invalid connection code. Please try again."

#### Error Handling
- **Invalid Code**: Show error toast, stay on page
- **Connection Timeout** (future): "Unable to connect. Check basket is powered on."
- **Already Connected** (future): "This basket is already connected to another account"

---

### 9. Logout Button (Connection Page)

**Component Name**: Logout Button  
**Location**: Top-right corner  
**Type**: Button with icon

#### User Action
- **Click**: User clicks logout button

#### System Response
1. Clear authentication state
2. Navigate to Landing Page
3. No confirmation required at this stage

#### API Call Triggered (Future)
```
Endpoint: POST /api/auth/logout
Method: POST

Request:
{
  "token": "jwt_token"
}

Response Success (200):
{
  "success": true,
  "message": "Logged out successfully"
}
```

#### Visual Feedback
- **Hover**: Color change to slate-800
- **Transition**: Instant navigation

#### Error Handling
- N/A - Always succeeds locally

---

## Dashboard Components

### 10. Item Card

**Component Name**: Basket Item Card  
**Location**: Dashboard main content area  
**Type**: GlassCard with hover effect

#### User Action
- **View**: User sees detected items
- **Hover**: Mouse over card

#### System Response
1. Display item details (name, quantity, price)
2. Hover effect (subtle elevation)

#### API Call Triggered
- **None** on hover
- **WebSocket** (future) receives real-time updates

#### WebSocket Events (Future)
```
Event: item_added
Data:
{
  "event": "item_added",
  "item": {
    "id": "uuid",
    "name": "Organic Apples",
    "quantity": 1,
    "price": 1.99,
    "detectedAt": "2025-10-29T10:30:00Z",
    "confidence": 0.95
  }
}

Event: item_removed
Data:
{
  "event": "item_removed",
  "itemId": "uuid"
}

Event: quantity_updated
Data:
{
  "event": "quantity_updated",
  "itemId": "uuid",
  "newQuantity": 3
}
```

#### Visual Feedback
- **Hover**: Slight scale and shadow increase
- **Animation**: Fade in on addition
- **Layout**: Responsive flex layout

#### Error Handling
- **Missing Data**: Show placeholder "Unknown Item"
- **Invalid Price**: Default to $0.00

---

### 11. Delete Item Button (Demo Only)

**Component Name**: Delete Item Button  
**Location**: Right side of each item card  
**Type**: Button with trash icon

#### User Action
- **Click**: User clicks trash icon

#### System Response
1. Remove item from local state
2. Show success toast
3. Update total price

#### API Call Triggered
- **None** - Client-side only (DEMO ONLY)
- **Production**: This button should be REMOVED

#### Visual Feedback
- **Hover**: Icon color changes to rose-500
- **Click**: Item fades out with animation
- **Toast**: Success message, 2s duration
  - Message: "Item removed from basket"

#### Error Handling
- N/A - Always succeeds

#### Security Warning
```
⚠️ CRITICAL: Remove in Production
This manual delete allows users to remove items from the app
while keeping them in the physical basket, enabling checkout fraud.

Production: Items ONLY removed via Raspberry Pi detection.
```

---

### 12. Checkout Button

**Component Name**: Checkout Button  
**Location**: Bottom of dashboard (fixed position)  
**Type**: GlassButton (variant: primary)

#### User Action
- **Click**: User clicks "Proceed to Checkout"

#### System Response
1. Check if basket has items (length > 0)
2. Navigate to Checkout Page
3. Pass items and total as props

#### API Call Triggered
- **None** - Client-side navigation

#### Visual Feedback
- **Hover**: Background color intensifies
- **Disabled State**: Grayed out when basket is empty
- **Shows**: "Proceed to Checkout • $XX.XX"

#### Error Handling
- **Empty Basket**: Button disabled
- **Disconnected Device** (future): Warning toast before checkout

---

### 13. Products Navigation Button

**Component Name**: Products Button  
**Location**: 
- **Mobile**: Large button in navigation grid below header
- **Desktop**: Small icon button in header

#### User Action
- **Click**: User clicks Products button

#### System Response
1. Navigate to Product Catalog page
2. Maintain connection state

#### API Call Triggered
- **None** - Client-side routing

#### Visual Feedback
- **Mobile**: 
  - Large button with icon + "Products" label
  - py-3 padding for touch targets
- **Desktop**: 
  - Compact icon-only (w-5 h-5)
  - Tooltip on hover (not implemented)
- **Hover**: Background color change

#### Error Handling
- N/A - Navigation only

---

### 14. Orders Navigation Button

**Component Name**: Orders Button  
**Location**: Same as Products button  
**Visibility**: Hidden in demo mode

#### User Action
- **Click**: User clicks Orders button

#### System Response
1. Navigate to Orders History page
2. Fetch order history (future)

#### API Call Triggered (Future)
```
Endpoint: GET /api/orders/user/:userId
Method: GET

Response Success (200):
{
  "success": true,
  "orders": [
    {
      "id": "ORD-001",
      "date": "2025-10-29T14:30:00Z",
      "total": 23.45,
      "status": "completed",
      "items": [...],
      "basketPhotoUrl": "https://..."
    }
  ]
}
```

#### Visual Feedback
- **Mobile**: Large button with icon + "Orders" label
- **Desktop**: Icon only
- **Hover**: Background color change

#### Error Handling
- **Demo Mode**: Button not rendered
- **No Orders** (future): Show empty state on Orders page

---

### 15. Logout Navigation Button

**Component Name**: Logout Button  
**Location**: Same as other navigation buttons

#### User Action
- **Click**: User clicks Logout button

#### System Response
1. Clear authentication state
2. Disconnect from basket (if connected)
3. Navigate to Landing Page

#### API Call Triggered (Future)
```
Endpoint: POST /api/auth/logout
Method: POST

Request:
{
  "token": "jwt_token",
  "deviceId": "device_uuid" // If connected
}

Response Success (200):
{
  "success": true,
  "message": "Logged out and device disconnected"
}
```

#### Visual Feedback
- **Mobile**: Large button with icon + "Logout" label (red text)
- **Desktop**: Icon only
- **Hover**: Color changes to darker red

#### Error Handling
- Always succeeds locally
- Network errors ignored (logout happens client-side)

---

### 16. Connection Status Indicator

**Component Name**: Connection Status Indicator  
**Location**: Header, next to "Shop Shadow" text  
**Type**: Colored dot with pulse animation

#### User Action
- **View**: User sees connection status

#### System Response
1. Display green dot when connected
2. Display red dot when disconnected
3. Display yellow dot when connecting

#### API Call Triggered
- **None** - Reflects WebSocket connection state

#### Visual Feedback
- **Connected**: Green dot (#10b981) with pulse animation
- **Disconnected**: Red dot (#ef4444) steady
- **Connecting**: Yellow dot (#f59e0b) pulse animation
- **Size**: 8px diameter (w-2 h-2)

#### Error Handling
- **Connection Lost**: Auto-show reconnection attempt
- **Reconnection Failed**: Show error toast with retry option

---

### 17. Empty State Component

**Component Name**: Empty State  
**Location**: Dashboard main content (when no items)  
**Type**: Centered message with icon

#### User Action
- **View**: User sees when basket is empty

#### System Response
1. Display shopping basket icon
2. Show message: "Your basket is empty"
3. Show hint: "Start shopping and items will appear here automatically"

#### API Call Triggered
- **None** - Static display

#### Visual Feedback
- **Icon**: Large shopping basket icon (64px)
- **Text**: Slate gray colors
- **Layout**: Centered vertically and horizontally

#### Error Handling
- N/A - Static content

---

## Checkout Components

### 18. Payment Method Selector

**Component Name**: Payment Method Buttons  
**Location**: Checkout Page, below order summary  
**Type**: Two button cards (Credit Card, Apple Pay)

#### User Action
- **Click**: User selects payment method

#### System Response
1. Update selected state
2. Apply active styling (dark border, tinted background)
3. Expand relevant payment form/button

#### API Call Triggered
- **None** - UI state only

#### Visual Feedback
- **Unselected**: Light border (slate-300/50), white background
- **Selected**: Dark border (slate-800), tinted background (slate-800/5)
- **Hover**: Border color change to slate-400
- **Icons**: Credit card or Apple icon

#### Error Handling
- N/A - Pure UI state

---

### 19. Credit Card Form

**Component Name**: Card Payment Form  
**Location**: Checkout Page, appears after selecting Credit Card  
**Type**: Form with 4 inputs

#### User Action
- **Type**: User enters card details
- **Submit**: Click "Pay $XX.XX" button

#### System Response
1. **Auto-formatting**:
   - Card number: Format as "1234 5678 9012 3456"
   - Expiry: Format as "MM/YY"
   - CVV: Numeric only, max 3 digits
2. **Validation**: Check all fields filled
3. **Processing**: 
   - Show "Processing..." text
   - Disable button
   - Simulate 2-second payment processing
4. **Success**: Show success screen, redirect to dashboard

#### API Call Triggered (Future)
```
Endpoint: POST /api/payments/charge
Method: POST

Request:
{
  "userId": "user_uuid",
  "amount": 23.45,
  "currency": "USD",
  "items": [...],
  "paymentMethod": {
    "type": "card",
    "token": "stripe_token_here" // From Stripe.js
  },
  "basketPhotoUrl": "base64_or_url"
}

Response Success (200):
{
  "success": true,
  "orderId": "ORD-001",
  "chargeId": "ch_xxxxx",
  "amount": 23.45,
  "receipt": {
    "url": "https://...",
    "emailSent": true
  }
}

Response Error (402):
{
  "success": false,
  "error": "Payment declined",
  "code": "card_declined"
}
```

#### Visual Feedback
- **Focus**: Input fields show blue focus ring
- **Auto-format**: Real-time formatting as user types
- **Processing**: Button shows "Processing...", disabled
- **Success Screen**: 
  - Full-screen overlay
  - Large green checkmark with scale animation
  - "Payment Complete!" heading
  - "Thank you for your purchase" subtext
  - Auto-redirect after 2 seconds

#### Error Handling
- **Incomplete Form**: Browser validation (required fields)
- **Payment Declined** (future): "Payment declined. Please try another card."
- **Network Error** (future): "Connection lost. Please try again."
- **Invalid Card** (future): "Please check your card details"

---

### 20. Apple Pay Button

**Component Name**: Apple Pay Payment Button  
**Location**: Checkout Page, appears after selecting Apple Pay  
**Type**: GlassButton (variant: primary)

#### User Action
- **Click**: User clicks "Pay $XX.XX with Apple Pay"

#### System Response
1. Show "Processing..." state
2. Simulate 2-second payment processing
3. Show success screen
4. Redirect to dashboard

#### API Call Triggered (Future)
```
Endpoint: POST /api/payments/charge
Method: POST

Request:
{
  "userId": "user_uuid",
  "amount": 23.45,
  "currency": "USD",
  "items": [...],
  "paymentMethod": {
    "type": "apple_pay",
    "token": "apple_pay_token"
  },
  "basketPhotoUrl": "base64_or_url"
}

Response: Same as card payment above
```

#### Visual Feedback
- **Button**: Large (py-6), Apple icon + text
- **Hover**: Background color intensifies
- **Processing**: "Processing..." text, disabled
- **Success**: Same success screen as card payment

#### Error Handling
- **Not Available** (future): Check browser support, hide if unavailable
- **Cancelled**: Return to payment selection
- **Declined** (future): Same as card declined error

---

### 21. Back to Basket Button

**Component Name**: Back Button  
**Location**: Top of Checkout Page  
**Type**: Text button with arrow icon

#### User Action
- **Click**: User clicks "Back to Basket"

#### System Response
1. Navigate back to Dashboard
2. Preserve basket state

#### API Call Triggered
- **None** - Client-side navigation

#### Visual Feedback
- **Hover**: Text color changes to slate-800
- **Icon**: Left arrow

#### Error Handling
- N/A - Navigation only

---

## Product Catalog Components

### 22. Product Search Input

**Component Name**: Product Search Bar  
**Location**: Top of Product Catalog page  
**Type**: Input with search icon

#### User Action
- **Type**: User enters search query
- **Real-time**: Filters as user types

#### System Response
1. Filter products by name (case-insensitive)
2. Update displayed product count
3. Re-render product grid

#### API Call Triggered
- **None** - Client-side filtering
- **Future**: Debounced API search for large catalogs

#### API Call (Future - Optional)
```
Endpoint: GET /api/products/search?q={query}
Method: GET

Response Success (200):
{
  "success": true,
  "results": [...],
  "count": 15,
  "query": "apple"
}
```

#### Visual Feedback
- **Icon**: Magnifying glass on left
- **Placeholder**: "Search products..."
- **Real-time**: Products filter immediately
- **Count Update**: "X products found" updates

#### Error Handling
- **No Results**: Show "No products found" message
- **Empty Query**: Show all products

---

### 23. Category Filter Chips

**Component Name**: Category Filter Buttons  
**Location**: Below search bar  
**Type**: Horizontal scrolling chip buttons

#### User Action
- **Click**: User clicks category chip
- **Scroll**: User scrolls horizontally on mobile

#### System Response
1. Update selected category state
2. Filter products by category
3. Apply active styling to selected chip

#### API Call Triggered
- **None** - Client-side filtering

#### Visual Feedback
- **Unselected**: White/40 background, slate-700 text
- **Selected**: Slate-800 background, white text, shadow
- **Hover**: White/60 background
- **Layout**: Horizontal scroll with pb-2

#### Error Handling
- **No Results**: Show "No products in this category"

---

### 24. Product Card

**Component Name**: Product Information Card  
**Location**: Product Catalog grid  
**Type**: GlassCard with hover effect

#### User Action
- **View**: User sees product details
- **Hover**: Mouse over card

#### System Response
1. Display product info (name, category, price, stock)
2. Hover effect (elevation)

#### API Call Triggered
- **None** - Display only
- **Future**: Click could add to wishlist or view details

#### Visual Feedback
- **Hover**: Scale and shadow increase
- **Stock Badge**: 
  - Green (In Stock): bg-emerald-100, text-emerald-700
  - Gray (Out of Stock): bg-slate-200, text-slate-600
- **Price**: Large text (text-2xl)
- **Animation**: Staggered entry (50ms delay per item)

#### Error Handling
- **Missing Data**: Show "N/A" for missing fields

---

### 25. Back Button (Product Catalog)

**Component Name**: Back to Dashboard Button  
**Location**: Top-left of Product Catalog  
**Type**: Button with arrow icon

#### User Action
- **Click**: User clicks "Back"

#### System Response
1. Navigate to Dashboard
2. Preserve connection state

#### API Call Triggered
- **None** - Client-side routing

#### Visual Feedback
- **Hover**: Text color change to slate-800

#### Error Handling
- N/A - Navigation only

---

## Orders History Components

### 26. Order Card

**Component Name**: Past Order Card  
**Location**: Orders History list  
**Type**: GlassCard with hover effect

#### User Action
- **View**: User sees order summary
- **Hover**: Mouse over card

#### System Response
1. Display order info (ID, date, total, items preview)
2. Hover effect
3. Show action buttons

#### API Call Triggered
- **On Page Load** (future):
```
Endpoint: GET /api/orders/user/:userId
Method: GET

Response Success (200):
{
  "success": true,
  "orders": [
    {
      "id": "ORD-001",
      "date": "2025-10-29T14:30:00Z",
      "total": 23.45,
      "status": "completed",
      "items": [...],
      "basketPhotoUrl": "https://..."
    }
  ],
  "count": 12,
  "page": 1,
  "totalPages": 2
}
```

#### Visual Feedback
- **Hover**: Card elevation increases
- **Status Badge**: Color-coded by status
  - Completed: Green
  - Pending: Yellow
- **Items Preview**: Shows first 3 items, "+X more" if > 3
- **Animation**: Staggered entry (100ms delay per order)

#### Error Handling
- **Load Error** (future): "Unable to load orders. Please try again."
- **Empty State**: "No orders yet. Start shopping!"

---

### 27. View Details Button

**Component Name**: Order Details Button  
**Location**: Inside each order card  
**Type**: GlassButton (variant: secondary)

#### User Action
- **Click**: User clicks "View Details"

#### System Response
1. Open order details modal
2. Display full order information
3. Show backdrop overlay

#### API Call Triggered
- **None** - Data already loaded
- **Future**: Fetch detailed order if needed

#### Visual Feedback
- **Modal**: 
  - Fade + scale animation
  - Glassmorphic card (max-w-lg)
  - Backdrop blur
- **Content**: Full item list, customer info, total

#### Error Handling
- **Missing Data**: Show "Unable to load order details"

---

### 28. View Photo Button

**Component Name**: Basket Photo Button  
**Location**: Inside each order card  
**Type**: GlassButton (variant: primary)

#### User Action
- **Click**: User clicks "View Photo"

#### System Response
1. Open photo modal
2. Display basket verification photo
3. Show dark backdrop (80% opacity)

#### API Call Triggered
- **None** - Image URL already loaded

#### Visual Feedback
- **Modal**: 
  - Fade + scale animation
  - Dark backdrop (bg-black/80)
  - Large image display (max-w-3xl)
  - Close button top-right
- **Image**: 
  - Rounded corners
  - Slate background while loading

#### Error Handling
- **Image Load Error**: Fallback image via ImageWithFallback component
- **Missing URL**: Show placeholder image

---

### 29. Modal Close Actions

**Component Name**: Modal Close Interactions  
**Location**: Order details and photo modals  
**Type**: Multiple close mechanisms

#### User Action
- **Click X Button**: User clicks close icon
- **Click Backdrop**: User clicks outside modal
- **Escape Key**: User presses ESC (not implemented)

#### System Response
1. Close modal with exit animation
2. Return to orders list
3. Clear selected order state

#### API Call Triggered
- **None** - UI state only

#### Visual Feedback
- **Exit Animation**: Fade + scale down
- **Backdrop**: Fades out
- **Duration**: 200ms

#### Error Handling
- N/A - Always succeeds

---

## Admin Components

### 30. Admin Sidebar Navigation

**Component Name**: Admin Navigation Sidebar  
**Location**: Left side of all admin pages  
**Type**: Persistent navigation menu

#### User Action
- **Click**: User clicks navigation item

#### System Response
1. Update active page state
2. Navigate to selected admin section
3. Update active styling

#### API Call Triggered
- **None** - Client-side routing

#### Visual Feedback
- **Active**: Darker background, different text color
- **Hover**: Background color change
- **Icons**: Each nav item has associated icon
- **Sections**: Overview, Orders, Products, Users, Logout

#### Error Handling
- N/A - Navigation only

---

### 31. Admin Order Search

**Component Name**: Order Search Input (Admin)  
**Location**: Admin Orders page, top  
**Type**: Input with search icon

#### User Action
- **Type**: Admin enters search query
- **Real-time**: Filters orders as typing

#### System Response
1. Filter orders by:
   - Order ID
   - Customer name
   - Customer email
2. Update table display

#### API Call Triggered (Future)
```
Endpoint: GET /api/admin/orders/search?q={query}
Method: GET
Headers: Authorization: Bearer {admin_token}

Response Success (200):
{
  "success": true,
  "results": [...],
  "count": 15
}
```

#### Visual Feedback
- **Icon**: Search icon on left
- **Placeholder**: "Search by order ID, customer name, or email..."
- **Results**: Table updates in real-time
- **Count**: "Showing X of Y orders" updates

#### Error Handling
- **No Results**: Show "No orders found"
- **API Error** (future): Show error toast, keep last results

---

### 32. View Order Details (Admin)

**Component Name**: Order Details Eye Button  
**Location**: Admin Orders table, Actions column  
**Type**: Icon button

#### User Action
- **Click**: Admin clicks eye icon

#### System Response
1. Open order details modal
2. Display comprehensive order information:
   - Customer details (name, email, user ID)
   - Order items with prices
   - Total amount
   - Basket photo access

#### API Call Triggered (Future)
```
Endpoint: GET /api/admin/orders/:orderId
Method: GET
Headers: Authorization: Bearer {admin_token}

Response Success (200):
{
  "success": true,
  "order": {
    "id": "ORD-001",
    "user": {...},
    "items": [...],
    "total": 23.45,
    "status": "completed",
    "basketPhotoUrl": "...",
    "createdAt": "...",
    "paymentMethod": "card",
    "paymentId": "ch_xxxxx"
  }
}
```

#### Visual Feedback
- **Hover**: Icon color changes to slate-900
- **Modal**: 
  - Large modal (max-w-2xl)
  - Max height with scroll (max-h-90vh)
  - Structured sections (customer, items, total)
- **Photo Button**: Access basket photo

#### Error Handling
- **Load Error**: "Unable to load order details"
- **Unauthorized**: Redirect to login

---

### 33. Admin Product Search

**Component Name**: Product Search Input (Admin)  
**Location**: Admin Products page, top  
**Type**: Input with search icon

#### User Action
- **Type**: Admin enters search query

#### System Response
1. Filter products by:
   - Product ID
   - Product name
   - Category
2. Update table display

#### API Call Triggered (Future)
```
Endpoint: GET /api/admin/products/search?q={query}
Method: GET
Headers: Authorization: Bearer {admin_token}

Response Success (200):
{
  "success": true,
  "products": [...],
  "count": 15
}
```

#### Visual Feedback
- **Icon**: Search icon
- **Placeholder**: "Search products..."
- **Results**: Table updates instantly
- **Count**: "Showing X of Y products"

#### Error Handling
- **No Results**: "No products found"

---

### 34. Add Product Button

**Component Name**: Add Product Button  
**Location**: Admin Products page, top-right  
**Type**: GlassButton (variant: primary) with Plus icon

#### User Action
- **Click**: Admin clicks "Add Product"

#### System Response
1. Open add product modal
2. Show empty form with fields:
   - Product name
   - Category (dropdown)
   - Price
   - Stock quantity
   - In stock toggle

#### API Call Triggered (Future - On Form Submit)
```
Endpoint: POST /api/admin/products
Method: POST
Headers: Authorization: Bearer {admin_token}

Request:
{
  "name": "New Product",
  "category": "Fruits",
  "price": 3.99,
  "stock": 100,
  "inStock": true
}

Response Success (201):
{
  "success": true,
  "product": {
    "id": "P016",
    "name": "New Product",
    "category": "Fruits",
    "price": 3.99,
    "stock": 100,
    "inStock": true,
    "createdAt": "2025-10-29T..."
  }
}

Response Error (400):
{
  "success": false,
  "error": "Product name already exists",
  "field": "name"
}
```

#### Visual Feedback
- **Hover**: Background color intensifies
- **Modal**: (Not currently implemented)
  - Should show form
  - Save button
  - Cancel button
- **Success Toast**: "Product added successfully"
- **Error Toast**: Validation or server errors

#### Error Handling
- **Validation Errors**: Show field-specific errors
- **Duplicate Product**: "Product already exists"
- **Network Error**: "Unable to add product. Try again."

#### Current Status
⚠️ **Not Fully Implemented**: Button exists but modal not created

---

### 35. Edit Product Button

**Component Name**: Edit Product Icon Button  
**Location**: Admin Products table, Actions column  
**Type**: Icon button (Edit icon)

#### User Action
- **Click**: Admin clicks edit icon

#### System Response
1. Open edit product modal
2. Pre-fill form with current product data

#### API Call Triggered (Future - On Form Submit)
```
Endpoint: PUT /api/admin/products/:productId
Method: PUT
Headers: Authorization: Bearer {admin_token}

Request:
{
  "name": "Updated Product Name",
  "category": "Fruits",
  "price": 4.99,
  "stock": 150,
  "inStock": true
}

Response Success (200):
{
  "success": true,
  "product": {...}
}

Response Error (404):
{
  "success": false,
  "error": "Product not found"
}
```

#### Visual Feedback
- **Hover**: Icon color changes to blue-600
- **Modal**: (Not currently implemented)
  - Pre-filled form
  - Update button
  - Cancel button
- **Success Toast**: "Product updated successfully"

#### Error Handling
- **Not Found**: "Product no longer exists"
- **Validation Errors**: Show field errors
- **Network Error**: "Update failed. Try again."

#### Current Status
⚠️ **Not Fully Implemented**: Icon exists but modal not created

---

### 36. Delete Product Button

**Component Name**: Delete Product Icon Button  
**Location**: Admin Products table, Actions column  
**Type**: Icon button (Trash icon)

#### User Action
- **Click**: Admin clicks trash icon

#### System Response
1. Show confirmation dialog
2. If confirmed:
   - Send delete request
   - Remove from list
   - Show success message

#### API Call Triggered (Future)
```
Endpoint: DELETE /api/admin/products/:productId
Method: DELETE
Headers: Authorization: Bearer {admin_token}

Response Success (200):
{
  "success": true,
  "message": "Product deleted successfully"
}

Response Error (409):
{
  "success": false,
  "error": "Cannot delete product with active orders"
}
```

#### Visual Feedback
- **Hover**: Icon color changes to rose-600
- **Confirmation Dialog**: (Not currently implemented)
  - Warning message
  - "Are you sure?" text
  - Cancel button
  - Delete button (red)
- **Success Toast**: "Product deleted"
- **Error Toast**: Constraint violations

#### Error Handling
- **Active Orders**: "Cannot delete product with existing orders"
- **Not Found**: "Product not found"
- **Network Error**: "Delete failed. Try again."

#### Current Status
⚠️ **Not Fully Implemented**: Icon exists but no confirmation or API call

---

### 37. Admin User Search

**Component Name**: User Search Input (Admin)  
**Location**: Admin Users page, top  
**Type**: Input with search icon

#### User Action
- **Type**: Admin enters search query

#### System Response
1. Filter users by:
   - User ID
   - Name
   - Email
2. Update table display

#### API Call Triggered (Future)
```
Endpoint: GET /api/admin/users/search?q={query}
Method: GET
Headers: Authorization: Bearer {admin_token}

Response Success (200):
{
  "success": true,
  "users": [...],
  "count": 15
}
```

#### Visual Feedback
- **Icon**: Search icon
- **Placeholder**: "Search users..."
- **Results**: Table updates instantly
- **Count**: "Showing X of Y users"

#### Error Handling
- **No Results**: "No users found"
- **API Error**: Keep last results, show error toast

---

### 38. User Statistics Cards

**Component Name**: User Stats Cards  
**Location**: Admin Users page, below search  
**Type**: GlassCard (3 cards in grid)

#### User Action
- **View**: Admin sees user statistics

#### System Response
1. Calculate from data:
   - Total Users count
   - Active Users count (status === 'active')
   - Total Revenue sum

#### API Call Triggered (Future)
```
Endpoint: GET /api/admin/stats/users
Method: GET
Headers: Authorization: Bearer {admin_token}

Response Success (200):
{
  "success": true,
  "stats": {
    "totalUsers": 4,
    "activeUsers": 3,
    "inactiveUsers": 1,
    "totalRevenue": 1707.13,
    "averageOrderValue": 34.32
  }
}
```

#### Visual Feedback
- **Layout**: 3-column grid (1 col mobile, 3 desktop)
- **Cards**: White background with glassmorphism
- **Numbers**: Large text (text-3xl)
- **Labels**: Small text (text-sm)

#### Error Handling
- **Load Error**: Show "N/A" for failed metrics
- **Zero Data**: Show "0" or "$0.00"

---

### 39. Admin Chart Interactions

**Component Name**: Analytics Charts (Overview Page)  
**Location**: Admin Overview page  
**Type**: Recharts components (Line, Bar, Pie)

#### User Action
- **Hover**: Mouse over data points
- **View**: See chart visualizations

#### System Response
1. **Hover**: Show tooltip with exact values
2. **Display**: Render chart data

#### API Call Triggered (Future)
```
Endpoint: GET /api/admin/analytics/dashboard
Method: GET
Headers: Authorization: Bearer {admin_token}

Response Success (200):
{
  "success": true,
  "data": {
    "revenueByDay": [...],
    "ordersByDay": [...],
    "salesByCategory": [...],
    "recentActivity": [...]
  },
  "period": "week"
}
```

#### Visual Feedback
- **Line Chart** (Revenue):
  - Blue line (#0ea5e9)
  - Dots on data points
  - Grid lines
  - Tooltip on hover
- **Bar Chart** (Orders):
  - Purple bars (#8b5cf6)
  - Rounded top corners
  - Tooltip on hover
- **Pie Chart** (Categories):
  - 5 color segments
  - Percentage labels
  - Tooltip with exact values

#### Error Handling
- **No Data**: Show empty chart with message
- **Load Error**: Show error state in chart area

---

### 40. Admin Logout Button

**Component Name**: Admin Logout Button  
**Location**: Bottom of admin sidebar  
**Type**: Navigation item (red text)

#### User Action
- **Click**: Admin clicks "Logout"

#### System Response
1. Clear admin authentication
2. Clear any cached data
3. Navigate to Landing Page

#### API Call Triggered (Future)
```
Endpoint: POST /api/admin/auth/logout
Method: POST
Headers: Authorization: Bearer {admin_token}

Response Success (200):
{
  "success": true,
  "message": "Admin logged out"
}
```

#### Visual Feedback
- **Hover**: Background color change
- **Icon**: LogOut icon
- **Color**: Red text for danger action
- **Transition**: Instant navigation

#### Error Handling
- Always succeeds locally
- Network errors ignored

---

## Shared Components

### 41. GlassCard Component

**Component Name**: GlassCard  
**Location**: Used throughout app  
**Type**: Reusable container component

#### Props
- `hover`: boolean (enables hover effect)
- `className`: string (additional Tailwind classes)
- `children`: ReactNode

#### Visual Feedback
- **Default**: 
  - White/50 background
  - Backdrop blur (20px)
  - Subtle border (slate-300/30)
  - Rounded corners (xl)
- **Hover** (when enabled):
  - Increased shadow
  - Slight scale (1.01)
  - Border color intensifies

#### Usage Examples
- Landing page feature cards
- Dashboard item cards
- Admin table containers
- Modal containers

---

### 42. GlassButton Component

**Component Name**: GlassButton  
**Location**: Used throughout app  
**Type**: Reusable button component

#### Props
- `variant`: "primary" | "secondary"
- `disabled`: boolean
- `onClick`: function
- `className`: string
- `children`: ReactNode

#### Visual Feedback
- **Primary Variant**:
  - Slate-800 background
  - White text
  - Shadow effect
  - Hover: Darker background
- **Secondary Variant**:
  - White/40 background
  - Slate-700 text
  - Border
  - Hover: White/60 background
- **Disabled**:
  - Opacity 50%
  - Cursor not-allowed
  - No hover effects

#### Usage Examples
- Login/Signup buttons
- Navigation buttons
- Checkout button
- Admin action buttons

---

### 43. ImageWithFallback Component

**Component Name**: ImageWithFallback  
**Location**: components/figma/ImageWithFallback.tsx  
**Type**: Image wrapper with error handling

#### Props
- `src`: string (image URL)
- `alt`: string (alt text)
- `className`: string

#### User Action
- **View**: User sees image

#### System Response
1. Try to load image from src
2. If fails: Show fallback placeholder
3. Monitor load errors

#### Visual Feedback
- **Loading**: Shows while image loads
- **Success**: Display image
- **Error**: Gray placeholder with image icon
- **Fallback Color**: slate-200 background

#### Error Handling
- **404 Not Found**: Show placeholder
- **Network Error**: Show placeholder
- **Timeout**: Show placeholder after 10s

#### Usage Examples
- Order basket photos
- Admin order photo modals
- Future product images

---

### 44. Toast Notifications

**Component Name**: Toast System  
**Location**: Global, managed by Sonner  
**Type**: Temporary notification system

#### Trigger Points
- Login success/error
- Signup success
- Connection success/error
- Item removal (dashboard)
- Payment success
- Admin actions (add/edit/delete)

#### Props (toast.success / toast.error)
- `message`: string
- `duration`: number (ms)
- `position`: 'bottom-right' | 'top-right' | etc.
- `style`: object

#### Visual Feedback
- **Success**:
  - Green border tint
  - White/95 background
  - Backdrop blur
  - 2-3 second duration
- **Error**:
  - Red border tint
  - White/95 background
  - Backdrop blur
  - 5 second duration
- **Position**: Bottom-right corner
- **Animation**: Slide in from right

#### Error Handling
- Auto-dismisses after duration
- Click to dismiss immediately
- Max 3 toasts visible at once

---

## API Reference

### Authentication Endpoints (Future Implementation)

#### POST /api/auth/login
**Purpose**: Authenticate user credentials  
**Auth Required**: No  
**Request Body**:
```json
{
  "email": "user@email.com",
  "password": "securePassword"
}
```
**Success Response (200)**:
```json
{
  "success": true,
  "token": "jwt_token_here",
  "user": {
    "id": "uuid",
    "name": "John Doe",
    "email": "user@email.com",
    "role": "user"
  }
}
```
**Error Response (401)**:
```json
{
  "success": false,
  "error": "Invalid credentials"
}
```

#### POST /api/auth/signup
**Purpose**: Create new user account  
**Auth Required**: No  
**Request Body**:
```json
{
  "name": "John Doe",
  "email": "user@email.com",
  "password": "securePassword123"
}
```
**Success Response (201)**:
```json
{
  "success": true,
  "message": "Account created",
  "user": {...},
  "token": "jwt_token"
}
```
**Error Response (400)**:
```json
{
  "success": false,
  "error": "Email already exists"
}
```

#### POST /api/auth/logout
**Purpose**: Logout user and invalidate token  
**Auth Required**: Yes  
**Request Body**:
```json
{
  "token": "jwt_token"
}
```
**Success Response (200)**:
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

### Device Connection Endpoints (Future)

#### POST /api/devices/connect
**Purpose**: Connect user to smart basket device  
**Auth Required**: Yes  
**Request Body**:
```json
{
  "code": "0000",
  "userId": "user_uuid"
}
```
**Success Response (200)**:
```json
{
  "success": true,
  "device": {
    "id": "device_uuid",
    "name": "Smart Basket #0000",
    "status": "connected",
    "batteryLevel": 85
  },
  "websocketUrl": "wss://api.shopshadow.com/ws/basket/device_uuid"
}
```
**Error Response (404)**:
```json
{
  "success": false,
  "error": "Invalid connection code"
}
```

#### DELETE /api/devices/disconnect/:deviceId
**Purpose**: Disconnect from smart basket  
**Auth Required**: Yes  
**Success Response (200)**:
```json
{
  "success": true,
  "message": "Device disconnected"
}
```

---

### WebSocket Events (Future)

#### Connection URL
```
wss://api.shopshadow.com/ws/basket/{deviceId}?token={jwt_token}
```

#### Event: item_added
```json
{
  "event": "item_added",
  "item": {
    "id": "uuid",
    "name": "Organic Apples",
    "quantity": 1,
    "price": 1.99,
    "detectedAt": "2025-10-29T10:30:00Z",
    "confidence": 0.95
  }
}
```

#### Event: item_removed
```json
{
  "event": "item_removed",
  "itemId": "uuid",
  "removedAt": "2025-10-29T10:35:00Z"
}
```

#### Event: quantity_updated
```json
{
  "event": "quantity_updated",
  "itemId": "uuid",
  "newQuantity": 3,
  "updatedAt": "2025-10-29T10:32:00Z"
}
```

#### Event: connection_status
```json
{
  "event": "connection_status",
  "status": "connected" | "disconnected" | "reconnecting",
  "batteryLevel": 85
}
```

---

### Order Endpoints (Future)

#### GET /api/orders/user/:userId
**Purpose**: Get user's order history  
**Auth Required**: Yes  
**Success Response (200)**:
```json
{
  "success": true,
  "orders": [
    {
      "id": "ORD-001",
      "date": "2025-10-29T14:30:00Z",
      "total": 23.45,
      "status": "completed",
      "items": [...],
      "basketPhotoUrl": "https://..."
    }
  ],
  "count": 12,
  "page": 1,
  "totalPages": 2
}
```

#### POST /api/payments/charge
**Purpose**: Process payment and create order  
**Auth Required**: Yes  
**Request Body**:
```json
{
  "userId": "user_uuid",
  "amount": 23.45,
  "currency": "USD",
  "items": [...],
  "paymentMethod": {
    "type": "card" | "apple_pay",
    "token": "payment_token"
  },
  "basketPhotoUrl": "base64_or_url"
}
```
**Success Response (200)**:
```json
{
  "success": true,
  "orderId": "ORD-001",
  "chargeId": "ch_xxxxx",
  "amount": 23.45,
  "receipt": {
    "url": "https://...",
    "emailSent": true
  }
}
```
**Error Response (402)**:
```json
{
  "success": false,
  "error": "Payment declined",
  "code": "card_declined"
}
```

---

### Product Endpoints (Future)

#### GET /api/products
**Purpose**: Get all products  
**Auth Required**: No  
**Query Params**: `?category={cat}&search={query}`  
**Success Response (200)**:
```json
{
  "success": true,
  "products": [...],
  "count": 15
}
```

#### GET /api/products/:productId
**Purpose**: Get single product details  
**Auth Required**: No  
**Success Response (200)**:
```json
{
  "success": true,
  "product": {
    "id": "P001",
    "name": "Organic Apples",
    "category": "Fruits",
    "price": 1.99,
    "stock": 150,
    "inStock": true
  }
}
```

---

### Admin Endpoints (Future)

#### GET /api/admin/orders
**Purpose**: Get all orders (admin)  
**Auth Required**: Yes (Admin)  
**Headers**: `Authorization: Bearer {admin_token}`  
**Query Params**: `?status={status}&search={query}&page={page}`  
**Success Response (200)**:
```json
{
  "success": true,
  "orders": [...],
  "count": 125,
  "page": 1,
  "totalPages": 5
}
```

#### POST /api/admin/products
**Purpose**: Create new product  
**Auth Required**: Yes (Admin)  
**Request Body**:
```json
{
  "name": "New Product",
  "category": "Fruits",
  "price": 3.99,
  "stock": 100,
  "inStock": true
}
```
**Success Response (201)**:
```json
{
  "success": true,
  "product": {...}
}
```

#### PUT /api/admin/products/:productId
**Purpose**: Update existing product  
**Auth Required**: Yes (Admin)  
**Request Body**: Same as POST  
**Success Response (200)**:
```json
{
  "success": true,
  "product": {...}
}
```

#### DELETE /api/admin/products/:productId
**Purpose**: Delete product  
**Auth Required**: Yes (Admin)  
**Success Response (200)**:
```json
{
  "success": true,
  "message": "Product deleted"
}
```
**Error Response (409)**:
```json
{
  "success": false,
  "error": "Cannot delete product with active orders"
}
```

#### GET /api/admin/stats/dashboard
**Purpose**: Get dashboard analytics  
**Auth Required**: Yes (Admin)  
**Success Response (200)**:
```json
{
  "success": true,
  "stats": {
    "totalRevenue": 4290.00,
    "totalOrders": 125,
    "productsSold": 342,
    "avgOrderValue": 34.32
  },
  "charts": {
    "revenueByDay": [...],
    "ordersByDay": [...],
    "salesByCategory": [...]
  }
}
```

#### GET /api/admin/users
**Purpose**: Get all users (admin)  
**Auth Required**: Yes (Admin)  
**Query Params**: `?search={query}&status={status}&page={page}`  
**Success Response (200)**:
```json
{
  "success": true,
  "users": [...],
  "count": 156,
  "page": 1,
  "totalPages": 4
}
```

---

## Rate Limiting (Future)

### API Rate Limits
- **Authentication**: 5 requests per minute per IP
- **Public API**: 100 requests per hour per token
- **Admin API**: 1000 requests per hour per admin token
- **WebSocket**: Unlimited (connection-based)

### Headers
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1699123456
```

---

## Error Codes Reference

### HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized (invalid/missing token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (duplicate/constraint violation)
- `429` - Too Many Requests (rate limit)
- `500` - Internal Server Error

### Custom Error Codes
```json
{
  "error": "validation_error",
  "code": "INVALID_EMAIL",
  "field": "email",
  "message": "Email format is invalid"
}
```

**Common Codes**:
- `INVALID_EMAIL` - Email format invalid
- `WEAK_PASSWORD` - Password doesn't meet requirements
- `DUPLICATE_EMAIL` - Email already registered
- `INVALID_CODE` - Connection code invalid
- `DEVICE_IN_USE` - Basket already connected
- `PAYMENT_DECLINED` - Card declined
- `INSUFFICIENT_STOCK` - Product out of stock
- `ORDER_NOT_FOUND` - Order doesn't exist
- `UNAUTHORIZED_ACTION` - Admin action without permission

---

## Security Considerations

### Authentication
- **JWT Tokens**: Expire after 24 hours
- **Refresh Tokens**: Expire after 30 days
- **Password Hashing**: bcrypt with 10 rounds
- **HTTPS Only**: All API calls encrypted

### Payment Security
- **PCI Compliance**: Never store card details
- **Tokenization**: Use Stripe/PayPal tokens only
- **3D Secure**: Enable for card payments
- **Apple Pay**: Use official SDK

### Admin Access
- **Role-Based**: Admin role required for admin APIs
- **Audit Logs**: Track all admin actions
- **IP Whitelist**: Restrict admin access by IP (optional)

### Data Protection
- **Personal Data**: Encrypted at rest
- **Basket Photos**: Auto-delete after 90 days
- **Order History**: User can request deletion (GDPR)

---

## Performance Optimization

### Client-Side
- **Debouncing**: Search inputs debounced 300ms
- **Lazy Loading**: Images load on demand
- **Code Splitting**: Route-based chunks
- **Memoization**: Expensive calculations cached

### Server-Side (Future)
- **Caching**: Redis for product catalog (5 min TTL)
- **Database Indexing**: On frequently queried fields
- **CDN**: Static assets and images
- **WebSocket**: Single persistent connection per user

---

## Testing Checklist

### Component Testing
- [ ] All buttons have correct hover states
- [ ] Forms validate input correctly
- [ ] Modals open and close properly
- [ ] Toasts appear at right position
- [ ] Charts render with correct data
- [ ] Images have fallback handling

### Integration Testing
- [ ] Login flow works end-to-end
- [ ] Device connection successful
- [ ] Items appear in dashboard
- [ ] Checkout completes successfully
- [ ] Orders show in history
- [ ] Admin can view all data

### API Testing (Future)
- [ ] All endpoints return correct status codes
- [ ] Authentication validates tokens
- [ ] Rate limiting enforced
- [ ] Error messages are clear
- [ ] WebSocket events deliver

### Security Testing
- [ ] XSS prevention in all inputs
- [ ] CSRF tokens on mutations
- [ ] SQL injection prevention
- [ ] Authentication required for protected routes
- [ ] Admin actions require admin role

---

**Document Version**: 1.0  
**Last Updated**: October 29, 2025  
**Status**: ✅ Complete - All interactive components documented

This document serves as the complete technical reference for component interactions and API integration. Update this document when new components or endpoints are added.
