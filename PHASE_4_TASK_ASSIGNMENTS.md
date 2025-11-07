# ShopShadow - Phase 4 Task Assignments

**Phase:** Frontend Enhancement & Integration
**Total Tasks:** 6
**Agent:** Agent_Frontend
**Dependencies:** Phase 2 (Backend API), Phase 3 (Flask Detection Service)
**Date Created:** October 30, 2025

---

## Phase 4 Overview

**Objective:** Integrate the low-confidence approval workflow into the frontend, connect the React app to the backend API, and enhance the user experience with real-time basket updates and detection analytics.

**Critical Missing Feature:** The low-confidence approval workflow (<70% confidence) was implemented in Phase 2 backend but has NO frontend UI. Users currently cannot see or approve/decline pending items.

**Backend Endpoints Available:**
- `GET /api/basket/:userId/pending-items` - Fetch pending items
- `POST /api/basket/pending-items/:itemId/approve` - Approve with quantity
- `POST /api/basket/pending-items/:itemId/decline` - Decline item
- `GET /api/basket/:userId` - Fetch current basket
- `POST /api/devices/register` - Device pairing
- All admin endpoints from Phase 2

**Frontend Status:**
- Complete React app exists at `frontend/frontend/src/`
- Uses Radix UI components, Tailwind CSS, Framer Motion
- Current state: Mock data in Dashboard, no backend integration
- Components: Dashboard, ProductCatalog, CheckoutPage, ConnectionPage, Admin panels

---

## Task 4.1 – Create Pending Items Approval Component │ Agent_Frontend

**Objective:** Build a new React component `PendingItemsCard` to display low-confidence detections (<70%) awaiting user approval/decline with confidence scores, product details, and quantity adjustment controls.

**Output:**
- `frontend/frontend/src/components/PendingItemsCard.tsx` (150-200 lines)
- Uses existing GlassCard, GlassButton, and Radix UI components
- Integrates with Dashboard component

**Guidance:** This is the UI for the NEW FEATURE from Phase 2. The component should match the existing glassmorphic design language and provide clear approve/decline actions.

### Detailed Sub-Tasks:

1. **Create Component File and Interface:**
   - Create `frontend/frontend/src/components/PendingItemsCard.tsx`
   - Define TypeScript interface:
     ```typescript
     interface PendingItem {
       id: string;
       product_id: string;
       name: string;
       quantity: number;
       confidence: number; // 0-1 scale (e.g., 0.65 = 65%)
       timestamp: string;
       device_id: string;
       status: 'pending' | 'approved' | 'declined';
     }

     interface PendingItemsCardProps {
       items: PendingItem[];
       onApprove: (itemId: string, quantity: number) => Promise<void>;
       onDecline: (itemId: string) => Promise<void>;
       isLoading?: boolean;
     }
     ```
   - Import dependencies: `motion/react`, `lucide-react` icons, `GlassCard`, `GlassButton`, `toast` from `sonner`

2. **Design Card Layout:**
   - Use `GlassCard` wrapper with amber/yellow accent (indicates "needs attention")
   - Header section with AlertCircle icon, "Items Awaiting Approval" title, count badge
   - Conditional rendering: Show empty state if `items.length === 0`
   - Empty state message: "All detections confirmed! No items need approval."

3. **Build Individual Pending Item Row:**
   - For each item, display card with:
     - Product name (bold, primary text)
     - Confidence score with color coding:
       - 60-69%: Yellow/amber (`bg-amber-100`, `text-amber-700`)
       - 50-59%: Orange (`bg-orange-100`, `text-orange-700`)
       - <50%: Red (`bg-red-100`, `text-red-700`)
     - Detected quantity (e.g., "Detected: 2 items")
     - Timestamp (relative time: "2 minutes ago")
     - Confidence badge with percentage (e.g., "65% confident")

4. **Implement Quantity Adjustment:**
   - Add quantity stepper controls (minus/plus buttons)
   - Local state for adjusted quantity: `const [qty, setQty] = useState(item.quantity)`
   - Min: 1, Max: item.quantity * 2 (allow correction if detection undercounted)
   - Display current quantity in input field (read-only or editable)
   - Use Radix UI `Button` or custom GlassButton

5. **Create Action Buttons:**
   - Two-button layout: "Approve" (primary, green accent) and "Decline" (secondary, red accent)
   - Approve button:
     - Calls `onApprove(item.id, qty)` with adjusted quantity
     - Show loading spinner during API call
     - Disable both buttons while loading
     - Success toast: "Item approved and added to basket"
   - Decline button:
     - Calls `onDecline(item.id)`
     - Show loading spinner
     - Success toast: "Item declined"
   - Use Framer Motion for button press animations

6. **Add Visual Feedback:**
   - Animate item entry with `motion.div` (slide-in from top)
   - Animate item exit when approved/declined (slide-out with fade)
   - Use `AnimatePresence` from Framer Motion for smooth transitions
   - Loading states: Disable buttons, show spinner icon
   - Error handling: Display error toast if API call fails, keep item visible

7. **Accessibility & Responsive Design:**
   - ARIA labels on all interactive elements
   - Keyboard navigation support (Tab, Enter, Escape)
   - Mobile-responsive: Stack buttons vertically on small screens
   - Touch-friendly button sizes (min 44px height)
   - Screen reader announcements for approve/decline actions

8. **Styling:**
   - Match existing Dashboard glassmorphic aesthetic
   - Use Tailwind utility classes
   - Amber/yellow header to differentiate from regular basket (blue/slate)
   - Confidence badge with gradient background
   - Subtle box-shadow and backdrop-filter blur
   - Hover states on action buttons

**Dependencies:** None (component only, no API integration yet)

**Acceptance Criteria:**
- ✅ Component renders list of pending items
- ✅ Displays confidence scores with color-coded badges
- ✅ Quantity adjustment works (min 1, max 2x detected)
- ✅ Approve/decline buttons trigger callbacks
- ✅ Loading states and animations work smoothly
- ✅ Empty state displays when no pending items
- ✅ Mobile-responsive layout
- ✅ Matches existing design language (glassmorphism)

**Agent Notes:**
- Reference `Dashboard.tsx` for design patterns
- Reference `GlassCard.tsx` and `GlassButton.tsx` for styling
- Use `toast` from `sonner` for notifications (already imported in Dashboard)
- See `frontend/frontend/src/01-user-flows-and-states.md` for UX patterns

---

## Task 4.2 – Integrate Pending Items API into Dashboard │ Agent_Frontend

**Objective:** Connect the PendingItemsCard component to the backend API, implement polling for real-time updates, and handle approve/decline actions with proper state management.

**Output:**
- Updated `frontend/frontend/src/components/Dashboard.tsx` (add ~100 lines)
- API utility functions in `frontend/frontend/src/utils/api.ts` (if not exists, create it)
- Working approve/decline flow with backend integration

**Guidance:** This task integrates the NEW FEATURE with the backend. Must handle authentication, polling, error states, and synchronize with basket updates.

### Detailed Sub-Tasks:

1. **Create API Utility Functions:**
   - Create `frontend/frontend/src/utils/api.ts` (if doesn't exist)
   - Define base API URL: `const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001'`
   - Implement authentication helper:
     ```typescript
     const getAuthHeaders = (token: string) => ({
       'Content-Type': 'application/json',
       'Authorization': `Bearer ${token}`
     });
     ```
   - Add pending items API functions:
     - `fetchPendingItems(userId: string, token: string): Promise<PendingItem[]>`
     - `approvePendingItem(itemId: string, quantity: number, token: string): Promise<BasketResponse>`
     - `declinePendingItem(itemId: string, token: string): Promise<void>`
   - Include error handling and type-safe responses

2. **Update Dashboard Component State:**
   - Import `PendingItemsCard` component
   - Add state: `const [pendingItems, setPendingItems] = useState<PendingItem[]>([])`
   - Add state: `const [isLoadingPending, setIsLoadingPending] = useState(false)`
   - Add state: `const [authToken, setAuthToken] = useState<string | null>(null)` (or use context)
   - Get userId from user context/props (currently using mock auth)

3. **Implement Pending Items Polling:**
   - Create `useEffect` hook for polling:
     ```typescript
     useEffect(() => {
       if (!userId || !authToken) return;

       const fetchPending = async () => {
         try {
           const items = await fetchPendingItems(userId, authToken);
           setPendingItems(items);
         } catch (error) {
           console.error('Failed to fetch pending items:', error);
           // Don't show toast for polling errors to avoid spam
         }
       };

       fetchPending(); // Initial fetch
       const interval = setInterval(fetchPending, 5000); // Poll every 5s
       return () => clearInterval(interval);
     }, [userId, authToken]);
     ```
   - Match polling interval with basket polling (5 seconds from Phase 2 design)

4. **Implement Approve Handler:**
   - Create `handleApprovePending` function:
     ```typescript
     const handleApprovePending = async (itemId: string, quantity: number) => {
       setIsLoadingPending(true);
       try {
         const updatedBasket = await approvePendingItem(itemId, quantity, authToken);
         // Update basket items state with response
         setItems(updatedBasket.data.items);
         // Remove approved item from pending list
         setPendingItems(prev => prev.filter(item => item.id !== itemId));
         toast.success(`Item approved and added to basket`, { duration: 2000 });
       } catch (error) {
         toast.error('Failed to approve item. Please try again.', { duration: 3000 });
       } finally {
         setIsLoadingPending(false);
       }
     };
     ```
   - Update basket total after approval

5. **Implement Decline Handler:**
   - Create `handleDeclinePending` function:
     ```typescript
     const handleDeclinePending = async (itemId: string) => {
       setIsLoadingPending(true);
       try {
         await declinePendingItem(itemId, authToken);
         setPendingItems(prev => prev.filter(item => item.id !== itemId));
         toast.success('Item declined', { duration: 2000 });
       } catch (error) {
         toast.error('Failed to decline item. Please try again.', { duration: 3000 });
       } finally {
         setIsLoadingPending(false);
       }
     };
     ```

6. **Add PendingItemsCard to Dashboard Layout:**
   - Position PendingItemsCard ABOVE basket items in main content
   - Conditional rendering: Only show if `pendingItems.length > 0`
   - Pass props:
     ```tsx
     {pendingItems.length > 0 && (
       <PendingItemsCard
         items={pendingItems}
         onApprove={handleApprovePending}
         onDecline={handleDeclinePending}
         isLoading={isLoadingPending}
       />
     )}
     ```
   - Add visual separator between pending items and basket

7. **Handle Authentication State:**
   - For demo mode: Use mock token or skip auth
   - For production: Retrieve token from localStorage or context
   - Handle 401 Unauthorized: Clear token, redirect to login
   - Handle 403 Forbidden: Show error toast

8. **Error Handling & Edge Cases:**
   - Network errors: Show toast, retry on next poll
   - Empty response: Set `pendingItems = []`
   - Item already approved/declined: Handle 400/404 gracefully
   - Concurrent actions: Disable buttons during loading
   - Stale data: Refresh both pending items and basket after action

9. **Testing Scenarios:**
   - Approve item with default quantity → Should appear in basket
   - Approve item with adjusted quantity → Basket should reflect new quantity
   - Decline item → Should disappear from pending list
   - Multiple pending items → All should be independently actionable
   - Network failure → User sees error, can retry

**Dependencies:**
- Task 4.1 Output (PendingItemsCard component)
- Phase 2 backend endpoints (already deployed)

**Acceptance Criteria:**
- ✅ PendingItemsCard appears in Dashboard when pending items exist
- ✅ Polling fetches pending items every 5 seconds
- ✅ Approve action adds item to basket and removes from pending
- ✅ Decline action removes item from pending
- ✅ Basket updates in real-time after approval
- ✅ Error handling works (network failures, auth errors)
- ✅ Loading states prevent duplicate actions
- ✅ Works in demo mode without authentication

**Agent Notes:**
- Use existing toast notifications (sonner) for user feedback
- Match error handling patterns from existing components
- Consider creating a Context Provider for auth state if not exists
- Test with real backend (npm start in backend/)

---

## Task 4.3 – Implement Real-Time Basket Polling │ Agent_Frontend

**Objective:** Replace mock basket data in Dashboard with real backend API integration, implement 5-second polling for basket updates synchronized with Flask detection service, and handle basket state management.

**Output:**
- Updated `frontend/frontend/src/components/Dashboard.tsx` (replace mock data with API calls)
- Basket API functions in `frontend/frontend/src/utils/api.ts`
- Real-time synchronization with Flask detection service

**Guidance:** This task removes ALL mock data and creates the full detection → backend → frontend flow. Critical for end-to-end functionality.

### Detailed Sub-Tasks:

1. **Create Basket API Functions:**
   - Add to `frontend/frontend/src/utils/api.ts`:
     ```typescript
     interface BasketItem {
       id: string;
       productId: string;
       name: string;
       price: number;
       category: string;
       imageUrl: string;
       quantity: number;
       confidence: number | null;
       subtotal: number;
       addedAt: string;
       deviceId: string;
     }

     interface BasketResponse {
       success: boolean;
       data: {
         items: BasketItem[];
         total: number;
         itemCount: number;
       };
     }

     export async function fetchBasket(userId: string, token: string): Promise<BasketResponse> {
       const response = await fetch(`${API_BASE}/api/basket/${userId}`, {
         headers: getAuthHeaders(token)
       });
       if (!response.ok) throw new Error('Failed to fetch basket');
       return response.json();
     }

     export async function removeBasketItem(itemId: string, token: string): Promise<void> {
       const response = await fetch(`${API_BASE}/api/basket/items/${itemId}`, {
         method: 'DELETE',
         headers: getAuthHeaders(token)
       });
       if (!response.ok) throw new Error('Failed to remove item');
     }
     ```

2. **Remove Mock Data from Dashboard:**
   - Delete mock items array: `const mockItems: BasketItem[] = [...]`
   - Change initial state: `const [items, setItems] = useState<BasketItem[]>([])`
   - Add loading state: `const [isLoadingBasket, setIsLoadingBasket] = useState(true)`

3. **Implement Basket Polling:**
   - Create `useEffect` for basket polling:
     ```typescript
     useEffect(() => {
       if (!userId || !authToken) return;

       const fetchBasketData = async () => {
         try {
           const basketResponse = await fetchBasket(userId, authToken);
           setItems(basketResponse.data.items);
           setIsLoadingBasket(false);
         } catch (error) {
           console.error('Failed to fetch basket:', error);
           // Only show toast on initial load, not polling errors
           if (isLoadingBasket) {
             toast.error('Failed to load basket');
           }
         }
       };

       fetchBasketData(); // Initial fetch
       const interval = setInterval(fetchBasketData, 5000); // Poll every 5s
       return () => clearInterval(interval);
     }, [userId, authToken]);
     ```
   - Polling interval matches Flask detection interval (5 seconds)

4. **Update Remove Item Handler:**
   - Modify `handleRemoveItem` to call backend API:
     ```typescript
     const handleRemoveItem = async (id: string) => {
       try {
         await removeBasketItem(id, authToken);
         setItems(items.filter(item => item.id !== id));
         toast.success('Item removed from basket', { duration: 2000 });
       } catch (error) {
         toast.error('Failed to remove item. Please try again.', { duration: 3000 });
       }
     };
     ```
   - Keep TODO comment about security concern (manual deletion in production)

5. **Update Total Calculation:**
   - Use backend-provided total instead of calculating client-side:
     ```typescript
     const [basketTotal, setBasketTotal] = useState(0);
     const [itemCount, setItemCount] = useState(0);

     // Update in fetchBasketData:
     setBasketTotal(basketResponse.data.total);
     setItemCount(basketResponse.data.itemCount);
     ```
   - Fallback: Calculate client-side if backend doesn't provide

6. **Add Loading States:**
   - Show skeleton UI while `isLoadingBasket === true`
   - Use Radix UI `Skeleton` component or custom loading state
   - Skeleton for basket items:
     ```tsx
     {isLoadingBasket ? (
       <div className="space-y-3">
         {[1, 2, 3].map(i => (
           <div key={i} className="h-20 bg-slate-200/50 animate-pulse rounded-lg" />
         ))}
       </div>
     ) : (
       // Actual basket items
     )}
     ```

7. **Handle Empty Basket State:**
   - Keep existing `EmptyState` component
   - Show when `items.length === 0 && !isLoadingBasket`
   - Message: "Your basket is empty. Start shopping or connect a device to begin!"

8. **Synchronization Logic:**
   - Ensure basket updates immediately after:
     - Pending item approval (Task 4.2)
     - Flask detection service adds item
     - Manual item removal
   - No duplicate polling requests (cancel previous request if new one starts)
   - Handle race conditions (use AbortController or debounce)

9. **Connection Status Integration:**
   - Update `isConnected` state based on device pairing status
   - Fetch device status from backend: `GET /api/devices/:userId/status`
   - Show "Disconnected" if no active device
   - Disable checkout if not connected

10. **Error Handling:**
    - 401 Unauthorized → Redirect to login
    - 403 Forbidden → Show permission error
    - 404 Not Found → Empty basket
    - 500 Server Error → Show error toast, retry on next poll
    - Network offline → Show offline indicator

11. **Performance Optimization:**
    - Memoize basket items with `useMemo`
    - Debounce rapid state updates
    - Use React.memo for BasketItem components to prevent unnecessary re-renders
    - Cancel fetch requests on component unmount

**Dependencies:**
- Phase 2 backend basket endpoints
- Phase 3 Flask detection service (running)

**Acceptance Criteria:**
- ✅ Dashboard shows real basket data from backend
- ✅ Basket updates every 5 seconds automatically
- ✅ New items from Flask detection appear in real-time
- ✅ Remove item calls backend and updates UI
- ✅ Total and item count accurate
- ✅ Loading states during initial fetch
- ✅ Empty state shows when basket is empty
- ✅ Error handling for all API failure scenarios
- ✅ No mock data remaining in Dashboard

**Agent Notes:**
- Test with Flask detection service running (`python flask-detection/main.py`)
- Backend must be running (`npm start` in backend/)
- Use demo user: `demo@email.com` / `1234`
- Verify polling doesn't cause performance issues (check Network tab)

---

## Task 4.4 – Device Connection Integration │ Agent_Frontend

**Objective:** Connect the ConnectionPage component to the backend device pairing API, implement 4-digit code entry and validation, display connection status in Dashboard, and handle device disconnection scenarios.

**Output:**
- Updated `frontend/frontend/src/components/ConnectionPage.tsx` (integrate with backend API)
- Updated `frontend/frontend/src/components/ConnectionStatus.tsx` (show real device status)
- Device API functions in `frontend/frontend/src/utils/api.ts`

**Guidance:** This task enables users to pair their mobile app with the detection device (Raspberry Pi or MacBook camera running Flask service).

### Detailed Sub-Tasks:

1. **Create Device API Functions:**
   - Add to `frontend/frontend/src/utils/api.ts`:
     ```typescript
     interface Device {
       id: string;
       code: string;
       userId: string | null;
       status: 'active' | 'inactive' | 'pending';
       lastHeartbeat: string;
       createdAt: string;
     }

     export async function connectDevice(code: string, token: string): Promise<Device> {
       const response = await fetch(`${API_BASE}/api/devices/connect`, {
         method: 'POST',
         headers: getAuthHeaders(token),
         body: JSON.stringify({ code })
       });
       if (!response.ok) {
         const error = await response.json();
         throw new Error(error.error || 'Failed to connect device');
       }
       return response.json();
     }

     export async function getDeviceStatus(userId: string, token: string): Promise<Device | null> {
       const response = await fetch(`${API_BASE}/api/devices/${userId}/status`, {
         headers: getAuthHeaders(token)
       });
       if (!response.ok) return null;
       const data = await response.json();
       return data.device || null;
     }

     export async function disconnectDevice(deviceId: string, token: string): Promise<void> {
       const response = await fetch(`${API_BASE}/api/devices/${deviceId}/disconnect`, {
         method: 'POST',
         headers: getAuthHeaders(token)
       });
       if (!response.ok) throw new Error('Failed to disconnect device');
     }
     ```

2. **Update ConnectionPage Component:**
   - Remove mock connection logic
   - Add state: `const [code, setCode] = useState('')` (4 digits)
   - Add state: `const [isConnecting, setIsConnecting] = useState(false)`
   - Add state: `const [error, setError] = useState<string | null>(null)`
   - Use Radix UI `InputOTP` component for code entry (already imported)

3. **Implement 4-Digit Code Entry:**
   - Use `InputOTP` component with 4 slots:
     ```tsx
     <InputOTP
       maxLength={4}
       value={code}
       onChange={(value) => setCode(value)}
       pattern="^[0-9]*$"
     >
       <InputOTPGroup>
         <InputOTPSlot index={0} />
         <InputOTPSlot index={1} />
         <InputOTPSlot index={2} />
         <InputOTPSlot index={3} />
       </InputOTPGroup>
     </InputOTP>
     ```
   - Auto-submit when 4 digits entered
   - Numeric keyboard on mobile

4. **Implement Connection Handler:**
   - Create `handleConnect` function:
     ```typescript
     const handleConnect = async () => {
       if (code.length !== 4) {
         setError('Please enter a 4-digit code');
         return;
       }

       setIsConnecting(true);
       setError(null);

       try {
         const device = await connectDevice(code, authToken);
         toast.success(`Device connected! ID: ${device.id}`, { duration: 3000 });
         onConnect(device); // Navigate to Dashboard
       } catch (error: any) {
         setError(error.message || 'Invalid code. Please try again.');
         setCode(''); // Clear input
         toast.error('Connection failed', { duration: 3000 });
       } finally {
         setIsConnecting(false);
       }
     };
     ```

5. **Add Code Display for Demo:**
   - For demo mode: Display available device code from backend
   - Fetch from `GET /api/devices/available` (returns list of pending devices)
   - Show hint: "Demo code: 1234" (if demo device exists)

6. **Update ConnectionStatus Component:**
   - Modify to show real device status
   - Fetch device status on mount and poll every 10 seconds
   - Display states:
     - "Connected" (green dot) - device active, heartbeat <60s ago
     - "Disconnected" (red dot) - no device or heartbeat >60s ago
     - "Pending" (yellow dot) - device paired but no heartbeat yet
   - Add click handler to show device details (ID, last heartbeat)

7. **Implement Device Status Polling in Dashboard:**
   - Add `useEffect` in Dashboard for device status:
     ```typescript
     useEffect(() => {
       if (!userId || !authToken) return;

       const checkDeviceStatus = async () => {
         const device = await getDeviceStatus(userId, authToken);
         setConnectedDevice(device);
         setIsConnected(device?.status === 'active');
       };

       checkDeviceStatus();
       const interval = setInterval(checkDeviceStatus, 10000); // Poll every 10s
       return () => clearInterval(interval);
     }, [userId, authToken]);
     ```

8. **Handle Disconnection:**
   - Add "Disconnect Device" option in Dashboard settings/menu
   - Confirm dialog before disconnecting:
     ```tsx
     <AlertDialog>
       <AlertDialogTrigger>Disconnect Device</AlertDialogTrigger>
       <AlertDialogContent>
         <AlertDialogTitle>Disconnect Device?</AlertDialogTitle>
         <AlertDialogDescription>
           Your basket items will be saved, but new detections will stop.
         </AlertDialogDescription>
         <AlertDialogAction onClick={handleDisconnect}>Disconnect</AlertDialogAction>
         <AlertDialogCancel>Cancel</AlertDialogCancel>
       </AlertDialogContent>
     </AlertDialog>
     ```
   - Clear device state after disconnection

9. **Error States:**
   - Invalid code (not found) → "Invalid code. Please check and try again."
   - Code already in use → "This device is already connected to another user."
   - Network error → "Connection failed. Please check your internet."
   - Device inactive → Show reconnect option

10. **UX Enhancements:**
    - Animate code entry with Framer Motion
    - Shake animation on error
    - Success animation on connection
    - Visual feedback during connection attempt
    - Skip connection page if already connected (check on mount)

**Dependencies:**
- Phase 2 device pairing endpoints

**Acceptance Criteria:**
- ✅ User can enter 4-digit code to connect device
- ✅ Valid code connects and navigates to Dashboard
- ✅ Invalid code shows error and allows retry
- ✅ ConnectionStatus shows real device status (green/red/yellow)
- ✅ Dashboard polls device status every 10 seconds
- ✅ User can disconnect device from Dashboard
- ✅ Connection status updates in real-time
- ✅ Error handling for all connection scenarios
- ✅ Demo mode shows available device codes

**Agent Notes:**
- Test with Flask detection service registered device
- Backend device pairing: `POST /api/devices/register` (Flask calls this)
- User connects: `POST /api/devices/connect` with code
- See Phase 2 Task 2.4 memory log for device pairing logic

---

## Task 4.5 – Admin Detection Analytics Dashboard │ Agent_Frontend

**Objective:** Enhance the admin dashboard with detection analytics, including high/low confidence detection breakdown, device activity monitoring, pending items queue overview, and real-time detection stats.

**Output:**
- Updated `frontend/frontend/src/components/admin/AdminOverview.tsx` (add detection analytics section)
- New component `frontend/frontend/src/components/admin/DetectionAnalytics.tsx` (optional, or inline)
- Admin API functions for detection stats

**Guidance:** Provides admin visibility into the detection system performance, pending approvals across all users, and device health monitoring.

### Detailed Sub-Tasks:

1. **Create Admin Detection Stats API:**
   - Add to backend (if not exists): `GET /api/admin/detection-stats` (requires admin auth)
   - Response format:
     ```typescript
     interface DetectionStats {
       totalDetections: number;
       highConfidence: number;
       lowConfidence: number;
       pendingApprovals: number;
       approvalRate: number; // percentage of pending items approved
       avgConfidence: number;
       detectionsToday: number;
       detectionsByHour: { hour: string, count: number }[];
       deviceActivity: {
         deviceId: string;
         lastHeartbeat: string;
         detectionCount: number;
         status: 'active' | 'inactive';
       }[];
     }
     ```
   - Or use existing analytics endpoint from Phase 2 Task 2.8

2. **Fetch Detection Stats:**
   - Add to `frontend/frontend/src/utils/api.ts`:
     ```typescript
     export async function getDetectionStats(token: string): Promise<DetectionStats> {
       const response = await fetch(`${API_BASE}/api/admin/detection-stats`, {
         headers: getAuthHeaders(token)
       });
       if (!response.ok) throw new Error('Failed to fetch detection stats');
       return response.json();
     }
     ```

3. **Update AdminOverview Component:**
   - Import `Chart` components from Radix UI or use existing chart library (recharts)
   - Add state: `const [detectionStats, setDetectionStats] = useState<DetectionStats | null>(null)`
   - Fetch stats on mount and poll every 15 seconds

4. **Create Detection Overview Cards:**
   - Add 4 stat cards in grid layout:
     - **Total Detections Today:** Large number with trend indicator
     - **High Confidence:** Count and percentage (green accent)
     - **Low Confidence:** Count and percentage (amber accent)
     - **Pending Approvals:** Count with link to pending items queue
   - Use GlassCard for each stat
   - Add icon for each metric (CheckCircle, AlertCircle, Clock, TrendingUp)

5. **Build Confidence Distribution Chart:**
   - Use recharts `BarChart` or `PieChart`
   - Show split between high confidence (≥70%) and low confidence (<70%)
   - Color coding: Green for high, Amber for low
   - Display percentages on chart

6. **Create Detections Timeline Chart:**
   - Use recharts `LineChart` or `AreaChart`
   - X-axis: Hours (last 24 hours)
   - Y-axis: Detection count
   - Show peak detection times

7. **Add Device Activity Monitor:**
   - Table showing all registered devices:
     - Device ID (truncated with tooltip for full ID)
     - Last Heartbeat (relative time: "2 minutes ago")
     - Detection Count (today)
     - Status indicator (green dot = active, red dot = inactive)
   - Sort by last heartbeat (most recent first)
   - Highlight inactive devices (heartbeat >5 minutes ago)

8. **Create Pending Approvals Queue:**
   - Table of all pending items across all users:
     - User email
     - Product name
     - Confidence score
     - Time pending
     - Quick view button (modal with item details)
   - Filter by confidence range
   - Sort by time pending (oldest first)

9. **Add Real-Time Updates:**
   - Implement polling (15-second interval)
   - Auto-refresh charts and stats
   - Visual indicator when data updates (subtle flash or badge)

10. **Performance Metrics:**
    - Add "Approval Rate" metric: `(approved / (approved + declined)) * 100`
    - Add "Avg Confidence" metric: Average of all detections
    - Show improvement trends (comparison to yesterday)

11. **Export Functionality (Optional Enhancement):**
    - "Export Report" button
    - Download CSV with detection stats
    - Date range selector

**Dependencies:**
- Phase 2 admin endpoints
- Phase 3 Flask detection service

**Acceptance Criteria:**
- ✅ Admin can view total detections breakdown (high/low confidence)
- ✅ Charts display confidence distribution and timeline
- ✅ Device activity monitor shows all devices with status
- ✅ Pending approvals queue visible across all users
- ✅ Stats auto-refresh every 15 seconds
- ✅ Mobile-responsive layout
- ✅ Admin-only access (requires admin token)

**Agent Notes:**
- Test with admin user: `admin@email.com` / `1111`
- Use existing recharts library (already in package.json)
- Reference AdminOrders.tsx for table layout patterns
- May need to add backend endpoint if detection stats API doesn't exist

---

## Task 4.6 – End-to-End Integration Testing & Polish │ Agent_Frontend

**Objective:** Test the complete user flow from device connection → detection → pending approval → basket → checkout, fix any integration bugs, improve error handling, add loading states, and polish the UX.

**Output:**
- Integration test documentation in `frontend/frontend/src/INTEGRATION_TEST_RESULTS.md`
- Bug fixes and UX improvements across all Phase 4 components
- Updated error handling and loading states
- Final QA checklist

**Guidance:** This is a comprehensive testing task to ensure all pieces work together. Focus on edge cases, error scenarios, and user experience polish.

### Detailed Sub-Tasks:

1. **Create Test Plan Document:**
   - Create `frontend/frontend/src/INTEGRATION_TEST_RESULTS.md`
   - Document test scenarios:
     - Happy path (full flow works)
     - Error scenarios (network failures, auth errors)
     - Edge cases (empty states, concurrent actions)
     - Performance (polling performance, memory leaks)
     - Cross-browser compatibility

2. **Test Complete User Flow (Happy Path):**
   - **Step 1:** User logs in (`demo@email.com` / `1234`)
   - **Step 2:** User navigates to ConnectionPage
   - **Step 3:** User enters 4-digit device code
   - **Step 4:** User connects successfully → Dashboard loads
   - **Step 5:** Flask detection service detects item (run `python flask-detection/main.py`)
   - **Step 6:** High confidence item (≥70%) appears in basket automatically
   - **Step 7:** Low confidence item (<70%) appears in PendingItemsCard
   - **Step 8:** User approves pending item with quantity adjustment
   - **Step 9:** Approved item moves to basket
   - **Step 10:** User declines another pending item
   - **Step 11:** Declined item disappears
   - **Step 12:** User removes item from basket
   - **Step 13:** User proceeds to checkout
   - **Step 14:** Order created successfully
   - **Expected:** All steps complete without errors

3. **Test Error Scenarios:**
   - **Network Failure:**
     - Disconnect internet during basket polling
     - Expected: Show offline indicator, retry on reconnect
   - **Invalid Auth Token:**
     - Manually clear localStorage token
     - Expected: Redirect to login with error message
   - **Device Disconnection:**
     - Stop Flask service (simulate device going offline)
     - Expected: ConnectionStatus shows red, user can reconnect
   - **Duplicate Approval:**
     - Approve item, then try approving same item again (race condition)
     - Expected: Handle 404 gracefully, show error toast
   - **Concurrent Actions:**
     - Approve multiple pending items rapidly
     - Expected: Queue actions, prevent duplicate requests

4. **Test Edge Cases:**
   - **Empty States:**
     - Empty basket → EmptyState displays
     - No pending items → PendingItemsCard hidden or shows empty message
     - No products in catalog → EmptyState in ProductCatalog
   - **Maximum Quantities:**
     - Approve pending item with max quantity (2x detected)
     - Expected: Basket reflects correct quantity
   - **Rapid Polling:**
     - Check Network tab for duplicate requests
     - Expected: No duplicate requests within polling interval
   - **Stale Data:**
     - Approve item, check if basket updates immediately (not wait for next poll)
     - Expected: Optimistic update or immediate refresh

5. **Performance Testing:**
   - **Memory Leaks:**
     - Run app for 5 minutes with polling active
     - Check Chrome DevTools Memory tab
     - Expected: No memory growth over time
   - **Polling Performance:**
     - Open Network tab, observe polling requests
     - Expected: Requests complete <500ms, no errors
   - **Component Re-renders:**
     - Use React DevTools Profiler
     - Expected: Minimal unnecessary re-renders

6. **Cross-Browser Testing:**
   - Test on Chrome, Safari, Firefox
   - Test on mobile (iOS Safari, Chrome Android)
   - Verify glassmorphic styling works (backdrop-filter support)
   - Test touch interactions on mobile

7. **Fix Identified Bugs:**
   - Document each bug in test results document
   - Create GitHub issues or fix immediately
   - Prioritize critical bugs (breaks user flow) vs. minor bugs (cosmetic)

8. **UX Polish Improvements:**
   - **Loading States:**
     - Add skeleton loaders for initial basket load
     - Spinner during pending item actions
     - Disabled state on buttons during API calls
   - **Error Messages:**
     - User-friendly error messages (avoid technical jargon)
     - Actionable errors (e.g., "Retry" button)
   - **Animations:**
     - Smooth transitions between states
     - Framer Motion animations for item entry/exit
     - Loading spinner animations
   - **Empty States:**
     - Helpful messages with next actions
     - Icons to make empty states visually appealing

9. **Accessibility Audit:**
   - Run Lighthouse accessibility audit
   - Check keyboard navigation (Tab through all interactive elements)
   - Test screen reader (VoiceOver on Mac, NVDA on Windows)
   - Verify ARIA labels on all custom components
   - Color contrast check (WCAG AA compliance)

10. **Create Final QA Checklist:**
    - Document all tested scenarios
    - List known issues (if any remain)
    - Recommendation: "Ready for production" or "Needs fixes"
    - Include screenshots of key flows

11. **Documentation Updates:**
    - Update `01-user-flows-and-states.md` with pending items flow
    - Update `03-api-endpoints-and-data.md` if API changes made
    - Add screenshots to README (optional)

**Dependencies:**
- Tasks 4.1, 4.2, 4.3, 4.4, 4.5 complete

**Acceptance Criteria:**
- ✅ Complete user flow tested end-to-end
- ✅ All error scenarios handled gracefully
- ✅ Edge cases identified and tested
- ✅ Performance metrics acceptable (no memory leaks, fast polling)
- ✅ Cross-browser testing complete
- ✅ All critical bugs fixed
- ✅ UX improvements implemented
- ✅ Accessibility audit passed
- ✅ Test results documented
- ✅ QA checklist completed

**Agent Notes:**
- Use manual testing (no automated test framework required for this task)
- Focus on real-world scenarios users will encounter
- Prioritize user experience over perfect code
- Document everything for future reference
- Consider creating video demo of full flow

---

## Phase 4 Summary

**Total Tasks:** 6
**Estimated Effort:** 3-4 days (if done sequentially)
**Agent:** Agent_Frontend (all tasks)
**Models Recommended:**
- Sonnet 4.5 for Tasks 4.2, 4.3, 4.4 (complex state management)
- Haiku for Tasks 4.1, 4.5 (component creation)
- Human QA for Task 4.6 (testing & polish)

**Critical Dependencies:**
- Phase 2 backend must be running (`npm start` in backend/)
- Phase 3 Flask detection service should be available for testing

**Success Metrics:**
- ✅ Low-confidence approval workflow fully functional
- ✅ Real-time basket updates from Flask service
- ✅ Device connection working end-to-end
- ✅ Admin can monitor detection analytics
- ✅ Zero critical bugs in user flow
- ✅ All frontend components integrated with backend API

**Next Phase:** Phase 5 - Testing & Quality Assurance (5 tasks)

---

**Document Created:** October 30, 2025
**Created By:** Manager Agent (Claude Sonnet 4.5)
**For:** ShopShadow APM - Phase 4 Frontend Enhancement
