# Shop Shadow - User Flows & Screen States Documentation

## Table of Contents
1. [Landing Page](#1-landing-page)
2. [Login Page](#2-login-page)
3. [Signup Page](#3-signup-page)
4. [Connection Page](#4-connection-page)
5. [User Dashboard](#5-user-dashboard)
6. [Product Catalog](#6-product-catalog)
7. [Checkout Page](#7-checkout-page)
8. [Orders History](#8-orders-history)
9. [Admin Overview](#9-admin-overview)
10. [Admin Orders](#10-admin-orders)
11. [Admin Products](#11-admin-products)
12. [Admin Users](#12-admin-users)

---

## 1. Landing Page

### Screen Name & Purpose
**Landing Page** - First screen users see when opening Shop Shadow. Marketing page that introduces the app and directs users to sign in or try the demo.

### User Flow
1. User lands on the page and sees hero section with app branding
2. User reads tagline: "Shopping, Reimagined"
3. User views three feature cards (Instant Detection, Secure Payments, Smart Integration)
4. User can choose from:
   - Click "Get Started" → Navigate to Login Page
   - Click "Sign In" (header button) → Navigate to Login Page
   - Click "Try Demo" → Navigate to Login Page with demo mode enabled

### All Possible States
- **Default State**: Page fully loaded with all content visible
- **Loading State**: Initial page load with animations (fade-in/slide-up effects)
- **Hover States**: Interactive hover effects on buttons and feature cards

### Transitions
| From State | Trigger | To State | Next Screen |
|------------|---------|----------|-------------|
| Default | Click "Get Started" | - | Login Page |
| Default | Click "Sign In" | - | Login Page |
| Default | Click "Try Demo" | - | Login Page (Demo Mode) |

---

## 2. Login Page

### Screen Name & Purpose
**Login Page** - Authentication screen where users enter credentials to access their account.

### User Flow
1. User sees glassmorphic login card with email and password fields
2. User enters email address
3. User enters password
4. User clicks "Sign In" button
5. System validates credentials:
   - **Regular User**: `demo@email.com` / `1234`
   - **Admin User**: `admin@email.com` / `1111`
6. On success:
   - Regular users → Navigate to Connection Page
   - Admin users → Navigate to Admin Dashboard
7. On failure: Show error toast notification

### All Possible States
- **Idle State**: Form ready for input, no validation errors
- **Validation Error State**: Shows error toast with message "Invalid credentials. Try demo@email.com / 1234 or admin@email.com / 1111"
- **Success State**: Shows success toast, transitions to next screen
- **Input Focus States**: Individual fields show focus styling when active

### Transitions
| From State | Trigger | To State | Next Screen |
|------------|---------|----------|-------------|
| Idle | Click "Sign In" with valid user credentials | Success | Connection Page |
| Idle | Click "Sign In" with valid admin credentials | Success | Admin Dashboard |
| Idle | Click "Sign In" with invalid credentials | Error | Stay on Login |
| Any | Click "Create an account" | - | Signup Page |
| Any | Click "Back" | - | Landing Page |

### Error Handling
- **Invalid Credentials**: Toast notification for 5 seconds
- **Empty Fields**: Browser native validation (HTML5 required attribute)

---

## 3. Signup Page

### Screen Name & Purpose
**Signup Page** - New user registration screen for creating an account.

### User Flow
1. User sees signup form with name, email, and password fields
2. User enters full name
3. User enters email address
4. User enters password
5. User clicks "Create Account" button
6. System processes signup (currently logs to console - ready for PostgreSQL integration)
7. Shows success toast and navigates to Connection Page

### All Possible States
- **Idle State**: Form ready for input
- **Processing State**: Account creation in progress
- **Success State**: Shows success toast, transitions to Connection Page
- **Input Focus States**: Individual fields show focus styling when active

### Transitions
| From State | Trigger | To State | Next Screen |
|------------|---------|----------|-------------|
| Idle | Click "Create Account" | Processing → Success | Connection Page |
| Any | Click "Already have an account?" | - | Login Page |
| Any | Click "Back" | - | Landing Page |

### Notes
- Currently uses hardcoded credentials validation
- TODO: Integrate with PostgreSQL database for actual user creation
- Password requirements not enforced yet (ready for implementation)

---

## 4. Connection Page

### Screen Name & Purpose
**Connection Page** - Device pairing screen where users enter a 4-digit code to connect their smart basket (Raspberry Pi device).

### User Flow
1. User sees connection card with WiFi icon
2. If demo mode: Shows hint "Use code 0000 for demo"
3. User enters 4-digit connection code
4. "Connect" button becomes enabled when 4 digits entered
5. User clicks "Connect"
6. System validates code (must be "0000" for demo)
7. If valid:
   - Shows "Connecting..." state for 2 seconds (simulates Pi connection)
   - Shows success toast
   - Navigates to Dashboard
8. If invalid: Shows error toast

### All Possible States
- **Idle State**: Form ready, button disabled (< 4 digits)
- **Ready State**: 4 digits entered, button enabled
- **Connecting State**: Loading state, button disabled, shows "Connecting..."
- **Success State**: Shows success toast, transitions to Dashboard
- **Error State**: Shows error toast, resets to Idle

### Transitions
| From State | Trigger | To State | Next Screen |
|------------|---------|----------|-------------|
| Idle | Enter 4th digit | Ready | - |
| Ready | Click "Connect" with code "0000" | Connecting → Success | Dashboard |
| Ready | Click "Connect" with wrong code | Error → Idle | Stay on Connection |
| Any | Click "Logout" | - | Landing Page |

### Error Handling
- **Invalid Code**: Toast notification for 3 seconds
- **Input Validation**: Only accepts numeric input, max 4 digits

### Technical Notes
- Demo code: `0000`
- Connection timeout: 2 seconds (simulated)
- Real implementation: Will connect to Raspberry Pi via WebSocket/HTTP

---

## 5. User Dashboard

### Screen Name & Purpose
**User Dashboard** - Main screen showing real-time detected basket items with prices and checkout functionality. This is the core experience where users monitor items added/removed by the Raspberry Pi.

### User Flow
1. User sees header with Shop Shadow branding and connection status (green dot = connected)
2. Navigation buttons visible:
   - **Desktop**: Small icon buttons (Products, Orders, Logout) in header
   - **Mobile**: Large touch-friendly buttons below header with icons + labels
3. User views list of detected basket items:
   - Each item shows: Name, Quantity, Price per unit, Total price
   - Delete button visible (demo only - marked for removal in production)
4. Bottom section shows:
   - Total amount
   - Total item count
   - "Proceed to Checkout" button
5. User can:
   - View item details
   - Remove items (demo only)
   - Click "Proceed to Checkout" → Navigate to Checkout Page
   - Click "Products" → Navigate to Product Catalog
   - Click "Orders" → Navigate to Orders History (non-demo users only)
   - Click "Logout" → Navigate to Landing Page

### All Possible States
- **Connected with Items**: Default state showing basket contents
- **Connected Empty**: No items in basket, shows EmptyState component
- **Disconnected**: Connection lost (shows disconnected status indicator)
- **Demo Mode**: Shows "Demo Mode" label in header
- **Mobile View**: Shows mobile-optimized navigation buttons
- **Desktop View**: Shows compact icon-only buttons

### Transitions
| From State | Trigger | To State | Next Screen |
|------------|---------|----------|-------------|
| Connected with Items | Click "Proceed to Checkout" | - | Checkout Page |
| Any | Click "Products" | - | Product Catalog |
| Any (non-demo) | Click "Orders" | - | Orders History |
| Any | Click "Logout" | - | Landing Page |
| Connected with Items | Remove all items | Connected Empty | - |
| Connected Empty | Item detected by Pi | Connected with Items | - |

### Real-time Updates (Production)
Items update automatically when:
- **Raspberry Pi detects new item** → Item appears in list
- **Raspberry Pi detects item removed** → Item disappears from list
- **Connection lost** → Status indicator turns red

### Critical Security Note
**IMPORTANT**: The manual delete button is for demo purposes only.
- **Demo Environment**: Users can manually remove items
- **Production Environment**: Items ONLY removed when Raspberry Pi detects physical removal
- **Rationale**: Prevents checkout fraud (user removing expensive items from app but keeping in physical basket)

### UI Responsiveness
| Viewport | Navigation Style | Button Size | Layout |
|----------|-----------------|-------------|---------|
| Mobile (< 640px) | Grid of 3 buttons below header | Large touch targets (py-3) | Single column |
| Desktop (≥ 640px) | Compact icon buttons in header | Small icons (w-5 h-5) | Flexible width |

---

## 6. Product Catalog

### Screen Name & Purpose
**Product Catalog** - Browse and search all available products with prices and stock status. Allows users to check prices before shopping.

### User Flow
1. User sees header with "Product Catalog" title and back button
2. Search bar at top with search icon
3. Category filter chips below search (All, Fruits, Dairy, Bakery, etc.)
4. User can:
   - Type in search bar → Filters products by name in real-time
   - Click category chip → Filters products by category
   - Scroll through product grid
5. Each product card shows:
   - Product name
   - Category
   - Price
   - Stock status badge (In Stock = green, Out of Stock = gray)
6. Product count shows above grid: "X products found"
7. Click "Back" → Return to Dashboard

### All Possible States
- **Default State**: All products visible (15 products)
- **Search Active**: Filtered by search query
- **Category Filtered**: Filtered by selected category
- **Combined Filter**: Search + category filter applied
- **No Results**: Search/filter returns 0 products
- **Loading State**: Products loading (animation on mount)

### Transitions
| From State | Trigger | To State | Next Screen |
|------------|---------|----------|-------------|
| Any | Type in search | Search Active | - |
| Any | Click category chip | Category Filtered | - |
| Any | Clear search + select "All" | Default State | - |
| Any | Click "Back" | - | Dashboard |

### Available Categories
- All (default)
- Fruits
- Dairy
- Bakery
- Meat
- Seafood
- Vegetables
- Beverages
- Pantry

### Product Data Structure
```
- Product ID (e.g., P001)
- Product Name
- Category
- Price (decimal)
- Stock Status (boolean)
```

### Technical Notes
- **Data Source**: Currently hardcoded, ready for PostgreSQL integration
- **Filtering**: Client-side (case-insensitive search)
- **Grid Layout**: Responsive (1 column mobile, 2 tablet, 3 desktop)
- **Animation**: Staggered entry animation (50ms delay per item)

---

## 7. Checkout Page

### Screen Name & Purpose
**Checkout Page** - Payment processing screen where users review order and complete purchase using Credit Card or Apple Pay.

### User Flow

#### Order Review
1. User sees "Order Summary" card at top
2. All basket items listed with quantities and prices
3. Total amount shown at bottom

#### Payment Method Selection
4. User sees two payment options:
   - Credit/Debit Card
   - Apple Pay
5. User clicks one option → Selected state (border becomes dark, background tinted)

#### Credit Card Flow
6. If card selected: Card details form expands
7. User enters:
   - Card number (auto-formatted with spaces: 1234 5678 9012 3456)
   - Cardholder name
   - Expiry date (auto-formatted: MM/YY)
   - CVV (3 digits)
8. User clicks "Pay $XX.XX" button
9. Shows "Processing..." state for 2 seconds
10. Shows success screen with checkmark animation
11. After 2 seconds → Navigate to Dashboard (basket cleared)

#### Apple Pay Flow
6. If Apple Pay selected: Large Apple Pay button appears
7. User clicks "Pay $XX.XX with Apple Pay"
8. Shows "Processing..." state for 2 seconds
9. Shows success screen with checkmark animation
10. After 2 seconds → Navigate to Dashboard (basket cleared)

### All Possible States
- **Review State**: Order summary visible, no payment method selected
- **Card Selected State**: Card option highlighted, form not visible yet
- **Apple Pay Selected State**: Apple Pay option highlighted
- **Card Form Visible**: Card details form expanded and ready for input
- **Processing State**: Payment being processed (button disabled, shows "Processing...")
- **Success State**: Full-screen success animation with checkmark
- **Error State**: Payment failed (not currently implemented)

### Transitions
| From State | Trigger | To State | Next Screen |
|------------|---------|----------|-------------|
| Review | Click "Credit Card" | Card Selected | - |
| Review | Click "Apple Pay" | Apple Pay Selected | - |
| Card Selected | Auto-expand | Card Form Visible | - |
| Card Form Visible | Click "Pay" (form valid) | Processing → Success | Dashboard |
| Apple Pay Selected | Click "Pay with Apple Pay" | Processing → Success | Dashboard |
| Any | Click "Back to Basket" | - | Dashboard |

### Form Validation
- **Card Number**: Auto-formatted, accepts only digits, max 16
- **Expiry Date**: Auto-formatted MM/YY, max 4 digits
- **CVV**: Numeric only, max 3 digits
- **Cardholder Name**: Text, required
- **Submit Button**: Disabled during processing

### Success Screen
- Large checkmark icon in emerald circle
- "Payment Complete!" heading
- "Thank you for your purchase" subtext
- Auto-redirect after 2 seconds
- Entry animation: Scale + fade

### Technical Notes
- **Payment Processing**: Currently simulated (2-second timeout)
- **TODO**: Integrate real payment gateway (Stripe/PayPal)
- **TODO**: Save order to database with basket photo
- **Security**: Never stores actual card details (PCI compliance)

---

## 8. Orders History

### Screen Name & Purpose
**Orders History** - View past orders with itemized details and basket verification photos taken at checkout.

### User Flow
1. User sees header with "Order History" and back button
2. Count of previous orders shown: "X previous orders"
3. List of order cards, each showing:
   - Order ID (e.g., ORD-001)
   - Order date (formatted: October 28, 2025)
   - Total amount
   - Status badge (green = completed)
   - First 3 items preview ("+X more items" if > 3)
   - Two action buttons:
     - "View Details" → Opens detail modal
     - "View Photo" → Opens photo modal

#### View Details Flow
4. User clicks "View Details"
5. Modal opens with:
   - Full order ID and date
   - All items with quantities and prices
   - Total amount
   - "View Basket Photo" button
   - Close button (X)

#### View Photo Flow
6. User clicks "View Photo" (from list or detail modal)
7. Photo modal opens with:
   - Dark overlay (80% black)
   - Large basket verification photo
   - Order ID in header
   - "Photo taken: [date]" caption
   - Close button

8. User clicks close or overlay → Modal closes

### All Possible States
- **List View**: Default state showing all orders
- **Detail Modal Open**: Order details modal visible, backdrop shown
- **Photo Modal Open**: Basket photo modal visible, dark backdrop shown
- **Loading State**: Orders loading (animation on mount)
- **Empty State**: No orders yet (not currently implemented)

### Transitions
| From State | Trigger | To State | Next Screen |
|------------|---------|----------|-------------|
| List View | Click "View Details" | Detail Modal Open | - |
| List View | Click "View Photo" | Photo Modal Open | - |
| Detail Modal | Click "View Basket Photo" | Photo Modal Open | - |
| Detail Modal | Click X or backdrop | List View | - |
| Photo Modal | Click X or backdrop | List View (or Detail if came from there) | - |
| Any | Click "Back" | - | Dashboard |

### Order Data Structure
```
- Order ID (string)
- Date (ISO date string)
- Total (number)
- Status (completed/pending)
- Items Array:
  - Item ID
  - Item Name
  - Quantity
  - Price per unit
- Basket Photo URL (Unsplash for demo)
```

### Modal Interaction
- **Backdrop Click**: Closes modal
- **X Button**: Closes modal
- **Escape Key**: Should close modal (not implemented)
- **Photo Modal**: Darker backdrop (80% vs 40%) for better photo visibility

### Technical Notes
- **Data Source**: Currently 3 hardcoded mock orders
- **TODO**: Fetch from PostgreSQL orders table
- **Photos**: Currently Unsplash images, will be real Raspberry Pi camera photos
- **Animation**: Staggered list entry (100ms delay per order)
- **Responsive**: Photo modal adjusts to screen size (max-w-3xl)

---

## 9. Admin Overview

### Screen Name & Purpose
**Admin Overview** - Analytics dashboard for administrators showing business metrics, charts, and recent activity.

### User Flow
1. Admin sees sidebar navigation (persistent across admin pages)
2. Welcome message: "Dashboard Overview"
3. Four metric cards at top:
   - Total Revenue ($4,290, +12.5%)
   - Total Orders (125, +8.2%)
   - Products Sold (342, +15.3%)
   - Avg Order Value ($34.32, +4.1%)
4. Four chart sections below:
   - **Weekly Revenue** (Line chart)
   - **Weekly Orders** (Bar chart)
   - **Sales by Category** (Pie chart)
   - **Recent Activity** (List of recent actions)
5. Admin can navigate to other sections via sidebar:
   - Overview (current)
   - Orders Management
   - Products
   - Users

### All Possible States
- **Default State**: All charts and metrics loaded
- **Loading State**: Initial data load (animations stagger in)
- **Hover States**: Interactive tooltips on charts
- **Chart Interaction**: Hover over data points shows values

### Chart Details

#### Weekly Revenue (Line Chart)
- X-axis: Days of week (Mon-Sun)
- Y-axis: Revenue ($)
- Data: 7 days of revenue data
- Color: Blue (#0ea5e9)
- Interactive tooltips

#### Weekly Orders (Bar Chart)
- X-axis: Days of week (Mon-Sun)
- Y-axis: Number of orders
- Data: 7 days of order counts
- Color: Purple (#8b5cf6)
- Rounded top corners

#### Sales by Category (Pie Chart)
- Categories: Fruits (30%), Dairy (25%), Meat (20%), Beverages (15%), Other (10%)
- Shows percentage labels
- 5 color scheme
- Interactive tooltips

#### Recent Activity
- Last 4 activities shown
- Format: Action • User • Time
- Shows amount for orders
- Border between items

### Transitions
| From State | Trigger | To State | Next Screen |
|------------|---------|----------|-------------|
| Any | Click "Orders" in sidebar | - | Admin Orders |
| Any | Click "Products" in sidebar | - | Admin Products |
| Any | Click "Users" in sidebar | - | Admin Users |
| Any | Click "Overview" in sidebar | Default | - |
| Any | Click "Logout" in sidebar | - | Landing Page |

### Metric Cards
Each card shows:
- Label (e.g., "Total Revenue")
- Large value (e.g., "$4,290")
- Change percentage with color (green = positive)
- Icon with colored background

### Technical Notes
- **Data Source**: Currently hardcoded mock data
- **TODO**: Fetch real-time data from PostgreSQL analytics queries
- **Chart Library**: Recharts (responsive)
- **Responsive**: 4 columns desktop, 2 tablet, 1 mobile
- **Animation**: Staggered entry (100ms delay per element)

---

## 10. Admin Orders

### Screen Name & Purpose
**Admin Orders Management** - View and manage all customer orders with filtering, search, and status updates.

### User Flow
1. Admin sees sidebar navigation
2. Header shows "Orders Management"
3. Search bar at top with filter chips:
   - All Orders
   - Pending
   - Completed
   - Cancelled
4. Admin can:
   - Type in search bar → Filters orders by ID or customer
   - Click status chip → Filters by order status
   - View order statistics at top
5. Orders table shows:
   - Order ID
   - Customer name
   - Date
   - Total amount
   - Status (with colored badge)
   - Items count
   - Actions (View Details button)
6. Admin can click "View Details" to see full order

### All Possible States
- **All Orders View**: Default, showing all orders
- **Filtered by Status**: Only showing selected status
- **Search Active**: Filtered by search query
- **Order Details Open**: Modal with full order information
- **Status Update In Progress**: Updating order status
- **Empty Results**: No orders match filters

### Transitions
| From State | Trigger | To State | Next Screen |
|------------|---------|----------|-------------|
| Any | Type in search | Search Active | - |
| Any | Click status filter | Filtered by Status | - |
| Any | Click "View Details" | Order Details Open | - |
| Order Details | Click "Update Status" | Status Update In Progress | - |
| Order Details | Click X or backdrop | Previous state | - |

### Order Status Options
- **Pending**: Yellow/amber badge
- **Completed**: Green/emerald badge
- **Cancelled**: Red badge
- **Processing**: Blue badge

### Technical Notes
- **Data Source**: PostgreSQL orders table (currently mock data)
- **Permissions**: Admin-only access
- **Real-time**: Should update when new orders placed (WebSocket/polling)
- **Export**: TODO - Add CSV export functionality

---

## 11. Admin Products

### Screen Name & Purpose
**Admin Products Management** - Manage product catalog with CRUD operations (Create, Read, Update, Delete).

### User Flow
1. Admin sees sidebar navigation
2. Header shows "Product Management"
3. "Add New Product" button at top right
4. Search bar and category filters
5. Products table/grid shows:
   - Product image placeholder
   - Product name
   - Category
   - Price
   - Stock quantity
   - Status (In Stock/Out of Stock)
   - Actions (Edit, Delete)

#### Add Product Flow
6. Admin clicks "Add New Product"
7. Modal opens with form:
   - Product name
   - Category (dropdown)
   - Price
   - Stock quantity
   - Status toggle
8. Admin fills form and clicks "Save"
9. Product added to database and appears in list

#### Edit Product Flow
6. Admin clicks "Edit" on existing product
7. Modal opens pre-filled with current data
8. Admin updates fields and clicks "Save"
9. Product updated in database

#### Delete Product Flow
6. Admin clicks "Delete"
7. Confirmation dialog appears
8. Admin confirms → Product removed from database

### All Possible States
- **List View**: Default product list
- **Add Product Modal Open**: Empty form for new product
- **Edit Product Modal Open**: Pre-filled form for existing product
- **Delete Confirmation Open**: Confirmation dialog visible
- **Saving State**: Form submission in progress
- **Search/Filter Active**: Products filtered by criteria

### Transitions
| From State | Trigger | To State | Next Screen |
|------------|---------|----------|-------------|
| List View | Click "Add New Product" | Add Product Modal | - |
| List View | Click "Edit" | Edit Product Modal | - |
| List View | Click "Delete" | Delete Confirmation | - |
| Add/Edit Modal | Click "Save" | Saving → List View | - |
| Delete Confirmation | Click "Confirm" | List View (product removed) | - |
| Any Modal | Click Cancel/X | List View | - |

### Form Validation
- **Name**: Required, max 100 characters
- **Category**: Required, dropdown selection
- **Price**: Required, decimal, minimum 0.01
- **Stock**: Integer, minimum 0

### Technical Notes
- **Data Source**: PostgreSQL products table
- **TODO**: Image upload functionality
- **TODO**: Bulk operations (bulk update, delete)
- **TODO**: Product history/audit log

---

## 12. Admin Users

### Screen Name & Purpose
**Admin Users Management** - Manage user accounts, view user activity, and handle permissions.

### User Flow
1. Admin sees sidebar navigation
2. Header shows "User Management"
3. Search bar at top
4. User statistics cards:
   - Total Users
   - Active Users
   - New Users (this month)
5. Users table shows:
   - User ID
   - Name
   - Email
   - Registration date
   - Account status (Active/Inactive/Suspended)
   - Total orders
   - Total spent
   - Actions (View Details, Edit, Suspend)

#### View User Details Flow
6. Admin clicks "View Details"
7. Modal opens showing:
   - Full user profile
   - Order history
   - Account activity
   - Spending statistics

#### Edit User Flow
6. Admin clicks "Edit"
7. Modal opens with editable fields:
   - Name
   - Email
   - Account status
   - Role (User/Admin)
8. Admin updates and saves

#### Suspend User Flow
6. Admin clicks "Suspend"
7. Confirmation dialog appears
8. Admin confirms → User account suspended

### All Possible States
- **List View**: Default user list
- **Search Active**: Filtered by search query
- **User Details Modal**: Full user information displayed
- **Edit User Modal**: Edit form visible
- **Suspend Confirmation**: Confirmation dialog open
- **Saving State**: Update in progress

### Transitions
| From State | Trigger | To State | Next Screen |
|------------|---------|----------|-------------|
| List View | Click "View Details" | User Details Modal | - |
| List View | Click "Edit" | Edit User Modal | - |
| List View | Click "Suspend" | Suspend Confirmation | - |
| Edit Modal | Click "Save" | Saving → List View | - |
| Suspend Confirmation | Click "Confirm" | List View (user suspended) | - |
| Any Modal | Click Cancel/X | List View | - |

### User Roles
- **User**: Regular customer (can shop, view orders)
- **Admin**: Full system access (can manage products, users, view analytics)

### Account Status Options
- **Active**: Green badge, can log in and shop
- **Inactive**: Gray badge, account created but not verified
- **Suspended**: Red badge, cannot log in

### Security Considerations
- Admin cannot delete their own account
- Admin cannot demote the last admin user
- User deletion requires confirmation
- Suspended users cannot access the system
- Email changes require verification (TODO)

### Technical Notes
- **Data Source**: PostgreSQL users table
- **TODO**: User activity logs
- **TODO**: Email notification system
- **TODO**: Role-based permissions matrix
- **TODO**: User export functionality

---

## Global State Management

### Authentication State
- **Logged Out**: Landing, Login, Signup pages accessible
- **Logged In (User)**: Dashboard, Products, Checkout, Orders accessible
- **Logged In (Admin)**: Admin pages accessible
- **Demo Mode**: Special mode with limited features

### Connection State (User Dashboard)
- **Connected**: Green dot indicator, real-time updates enabled
- **Disconnected**: Red dot indicator, shows reconnection message
- **Connecting**: Yellow dot indicator, attempting to reconnect

### Modal/Overlay States
All modals share common patterns:
- **Background Blur**: Backdrop with blur effect
- **Click Outside**: Closes modal (except confirmations)
- **Escape Key**: Should close modal (not all implemented)
- **Animations**: Fade + scale on enter/exit

---

## Error Handling Patterns

### Toast Notifications
Used for temporary messages:
- **Success**: Green border, 2-3 seconds
- **Error**: Red border, 5 seconds
- **Info**: Blue border, 3 seconds
- Position: Bottom-right
- Style: Glassmorphism with blur

### Validation Errors
- **Form Fields**: Red border, error text below field
- **Required Fields**: Browser native validation (HTML5)
- **Format Validation**: Real-time during input (e.g., card number formatting)

### Network Errors
- **Connection Lost**: Status indicator changes to red
- **Timeout**: Toast notification with retry option
- **API Errors**: Toast with error message

---

## Loading Patterns

### Page Load
- **Entry Animation**: Fade in + slide up (Motion/Framer)
- **Staggered Lists**: Each item delays 50-100ms
- **Skeleton Screens**: Not implemented (TODO)

### Button Loading States
- **Text Changes**: "Submit" → "Processing..."
- **Disabled State**: Button grayed out, cursor not-allowed
- **Spinner**: Not implemented (TODO - could add spinner icon)

### Data Loading
- **Initial Load**: Animation on mount
- **Refresh**: Smooth transition, no flash
- **Pagination**: Not implemented (all data loads at once)

---

## Responsive Breakpoints

### Tailwind Breakpoints Used
- `sm`: 640px - Small tablets
- `md`: 768px - Tablets
- `lg`: 1024px - Small laptops
- `xl`: 1280px - Desktops

### Mobile-First Approach
All screens designed mobile-first, then enhanced for larger screens:
- **Mobile**: Single column, large touch targets, bottom navigation
- **Tablet**: 2-column grids, medium buttons
- **Desktop**: Multi-column, compact navigation, hover states

---

## Database Schema (Ready for PostgreSQL Integration)

### Users Table
```sql
- id (UUID)
- name (VARCHAR)
- email (VARCHAR, unique)
- password_hash (VARCHAR)
- role (ENUM: user, admin)
- status (ENUM: active, inactive, suspended)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

### Products Table
```sql
- id (UUID)
- name (VARCHAR)
- category (VARCHAR)
- price (DECIMAL)
- stock_quantity (INTEGER)
- in_stock (BOOLEAN)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

### Orders Table
```sql
- id (UUID)
- user_id (UUID, FK)
- total (DECIMAL)
- status (ENUM: pending, completed, cancelled)
- basket_photo_url (VARCHAR)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

### Order Items Table
```sql
- id (UUID)
- order_id (UUID, FK)
- product_id (UUID, FK)
- quantity (INTEGER)
- price_at_purchase (DECIMAL)
```

---

## Future State Enhancements (TODO)

### User Dashboard
- [ ] Real-time WebSocket connection to Raspberry Pi
- [ ] Remove manual delete button (security)
- [ ] Connection error recovery flow
- [ ] Basket weight validation
- [ ] Item confidence scores from ML model

### Checkout
- [ ] Real payment gateway integration (Stripe)
- [ ] Receipt email generation
- [ ] Split payment options
- [ ] Discount codes/coupons
- [ ] Saved payment methods

### Admin
- [ ] Real-time dashboard updates
- [ ] Export reports (CSV, PDF)
- [ ] Advanced analytics (trends, predictions)
- [ ] User activity logs
- [ ] System health monitoring

### General
- [ ] Dark mode support
- [ ] Multi-language support (i18n)
- [ ] Accessibility improvements (ARIA labels)
- [ ] Progressive Web App (PWA)
- [ ] Offline support

---

## Accessibility Considerations

### Current Implementation
- Semantic HTML (header, main, footer)
- Focus states on interactive elements
- Color contrast meets WCAG AA standards
- Keyboard navigation partially supported

### TODO
- [ ] ARIA labels for screen readers
- [ ] Skip navigation links
- [ ] Focus trap in modals
- [ ] Keyboard shortcuts
- [ ] Alt text for all images
- [ ] Focus management on route changes

---

## Performance Optimization

### Current
- Code splitting by route (React)
- Image lazy loading (ImageWithFallback)
- Animation optimization (Motion/Framer GPU acceleration)
- Minimal re-renders (proper React keys)

### TODO
- [ ] Virtual scrolling for long lists
- [ ] Image optimization (WebP, srcset)
- [ ] Service worker caching
- [ ] Bundle size optimization
- [ ] Lighthouse score > 90

---

**Document Version**: 1.0  
**Last Updated**: October 29, 2025  
**Status**: ✅ Complete - All screens documented

This document serves as the source of truth for Shop Shadow's user experience and should be updated whenever new screens or states are added.
