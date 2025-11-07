# Task 4.2 - Pending Items API Integration

**Agent:** Claude Sonnet 4.5
**Environment:** Claude Code (fresh session)
**Working Directory:** `/Users/aneshkondor/Coding/cursor_projects/ShopShadow`

---

## Your Role

You are implementing **Task 4.2: Pending Items API Integration** for ShopShadow.

This task integrates the NEW FEATURE (low-confidence approval workflow) with the backend API, connecting the `PendingItemsCard` component built in Task 4.1.

**DEPENDENCIES:** Task 4.1 MUST be complete before starting this task.

---

## Prerequisites

**Verify Task 4.1 is complete:**

```bash
# Check component exists
ls frontend/frontend/src/components/PendingItemsCard.tsx

# Check it compiles
cd frontend/frontend
npm run build
```

If missing, **STOP** and complete Task 4.1 first.

---

## Context Files to Read FIRST

1. **Task Assignment:**
   - `PHASE_4_TASK_ASSIGNMENTS.md` (lines 198-492)

2. **Task 4.1 Output:**
   - `frontend/frontend/src/components/PendingItemsCard.tsx` (component to integrate)
   - `apm/Memory/Phase_04_Frontend_Enhancement/Task_4_1_Pending_items_approval_component.md` (understand component)

3. **Backend API:**
   - `backend/src/routes/basket.js` (pending items endpoints)
   - GET `/api/basket/:userId/pending-items`
   - POST `/api/basket/pending-items/:itemId/approve` (body: `{ quantity }`)
   - POST `/api/basket/pending-items/:itemId/decline`

4. **Existing Frontend:**
   - `frontend/frontend/src/components/Dashboard.tsx` (where to integrate)

---

## Deliverables

### 1. Pending Items API Functions
**Path:** `frontend/frontend/src/utils/api.ts` (add to existing)

```typescript
interface PendingItem {
  id: string;
  user_id: string;
  device_id: string;
  product_id: string;
  name: string;
  quantity: number;
  confidence: number;
  status: 'pending' | 'approved' | 'declined';
  timestamp: string;
}

export async function fetchPendingItems(userId: string, token: string): Promise<PendingItem[]> {
  const response = await fetch(`${API_BASE}/api/basket/${userId}/pending-items`, {
    headers: getAuthHeaders(token)
  });
  if (!response.ok) throw new Error('Failed to fetch pending items');
  const data = await response.json();
  return data.pendingItems || [];
}

export async function approvePendingItem(
  itemId: string,
  quantity: number,
  token: string
): Promise<BasketResponse> {
  const response = await fetch(`${API_BASE}/api/basket/pending-items/${itemId}/approve`, {
    method: 'POST',
    headers: getAuthHeaders(token),
    body: JSON.stringify({ quantity })
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to approve item');
  }
  return response.json();
}

export async function declinePendingItem(itemId: string, token: string): Promise<void> {
  const response = await fetch(`${API_BASE}/api/basket/pending-items/${itemId}/decline`, {
    method: 'POST',
    headers: getAuthHeaders(token)
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to decline item');
  }
}
```

### 2. Updated Dashboard Component
**Path:** `frontend/frontend/src/components/Dashboard.tsx`

**Changes Required:**

1. **Import PendingItemsCard:**
   ```typescript
   import { PendingItemsCard } from './PendingItemsCard';
   import { fetchPendingItems, approvePendingItem, declinePendingItem } from '../utils/api';
   ```

2. **Add States:**
   ```typescript
   const [pendingItems, setPendingItems] = useState<PendingItem[]>([]);
   const [isLoadingPending, setIsLoadingPending] = useState(false);
   ```

3. **Implement Pending Items Polling:**
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

4. **Implement Approve Handler:**
   ```typescript
   const handleApprovePending = async (itemId: string, quantity: number) => {
     setIsLoadingPending(true);
     try {
       const updatedBasket = await approvePendingItem(itemId, quantity, authToken);

       // Update basket items state with response
       setItems(updatedBasket.data.items);
       setBasketTotal(updatedBasket.data.total);
       setItemCount(updatedBasket.data.itemCount);

       // Remove approved item from pending list
       setPendingItems(prev => prev.filter(item => item.id !== itemId));

       toast.success('Item approved and added to basket', { duration: 2000 });
     } catch (error: any) {
       toast.error(error.message || 'Failed to approve item. Please try again.', { duration: 3000 });
     } finally {
       setIsLoadingPending(false);
     }
   };
   ```

5. **Implement Decline Handler:**
   ```typescript
   const handleDeclinePending = async (itemId: string) => {
     setIsLoadingPending(true);
     try {
       await declinePendingItem(itemId, authToken);

       // Remove declined item from pending list
       setPendingItems(prev => prev.filter(item => item.id !== itemId));

       toast.success('Item declined', { duration: 2000 });
     } catch (error: any) {
       toast.error(error.message || 'Failed to decline item. Please try again.', { duration: 3000 });
     } finally {
       setIsLoadingPending(false);
     }
   };
   ```

6. **Add PendingItemsCard to Layout:**
   ```tsx
   {/* Add ABOVE basket items in main content */}
   {pendingItems.length > 0 && (
     <>
       <PendingItemsCard
         items={pendingItems}
         onApprove={handleApprovePending}
         onDecline={handleDeclinePending}
         isLoading={isLoadingPending}
       />

       {/* Visual separator */}
       <div className="my-6 border-t border-slate-200/50" />
     </>
   )}

   {/* Existing basket items below */}
   ```

### 3. Memory Log
**Path:** `apm/Memory/Phase_04_Frontend_Enhancement/Task_4_2_Pending_items_API_integration.md`

**Requirements (200+ lines):**
- Executive summary
- API integration approach
- Polling strategy (why 5 seconds, same as basket)
- State synchronization logic (approve updates both pending and basket)
- Error handling (network, auth, race conditions)
- Testing evidence (show approve/decline working)
- Edge cases (concurrent approvals, item already approved)
- Git commit hash

---

## Testing Requirements

**Manual Test - CRITICAL:**

1. **Start All Services:**
   ```bash
   # Terminal 1: Backend
   cd backend && npm start

   # Terminal 2: Flask Detection
   cd flask-detection && python main.py

   # Terminal 3: Frontend
   cd frontend/frontend && npm run dev
   ```

2. **Generate Low-Confidence Detection:**
   - Flask service should detect items
   - High confidence (≥70%) → basket automatically
   - Low confidence (<70%) → pending items

   **To simulate low-confidence:**
   - Move object quickly past camera (blurry)
   - Hold object far from camera (small/unclear)
   - Partial occlusion
   - Check Flask logs for confidence scores

3. **Test Approve Flow:**
   - Pending item appears in PendingItemsCard
   - Click "Approve" button
   - Item disappears from pending
   - Item appears in basket
   - Basket total updates
   - Toast notification shows success

4. **Test Decline Flow:**
   - Pending item appears
   - Click "Decline" button
   - Item disappears from pending
   - Item does NOT appear in basket
   - Toast notification shows success

5. **Test Quantity Adjustment:**
   - Adjust quantity with stepper (e.g., 1 → 3)
   - Click "Approve"
   - Basket shows correct quantity (3, not 1)

6. **Test Error Scenarios:**
   - Stop backend → Approve should show error toast
   - Approve same item twice → Handle 404 gracefully

7. **Network Tab Verification:**
   - Open Chrome DevTools → Network
   - See polling: `GET /api/basket/:userId/pending-items` every 5s
   - Click approve → `POST /api/basket/pending-items/:itemId/approve`
   - Response includes updated basket

---

## Validation Checklist

Before committing:

- [ ] PendingItemsCard appears in Dashboard when pending items exist
- [ ] Polling fetches pending items every 5 seconds
- [ ] Approve action adds item to basket
- [ ] Approve action removes item from pending list
- [ ] Basket updates immediately (not wait for next poll)
- [ ] Decline action removes item from pending
- [ ] Quantity adjustment works (1 → 3 reflects in basket)
- [ ] Loading state prevents duplicate actions
- [ ] Error handling works (network failures, auth errors)
- [ ] No pending items → Component not visible
- [ ] Memory log 200+ lines
- [ ] Tested with real Flask service generating low-confidence items

---

## Git Commit

```bash
git add frontend/frontend/src/utils/api.ts frontend/frontend/src/components/Dashboard.tsx apm/Memory/Phase_04_Frontend_Enhancement/Task_4_2_Pending_items_API_integration.md

git commit -m "feat: integrate pending items API into Dashboard (Task 4.2)

- Create pending items API functions (fetch, approve, decline)
- Implement 5-second polling for pending items
- Add approve handler with quantity adjustment support
- Add decline handler
- Integrate PendingItemsCard component into Dashboard
- Synchronize pending and basket state on approval
- Handle concurrent actions with loading state
- Error handling for network failures and auth errors
- Visual separator between pending items and basket
- Comprehensive memory log (200+ lines)

Low-confidence approval workflow fully functional.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

**DO NOT PUSH** - Stay local until Phase 4 complete.

---

## Important Notes

- **Depends on Task 4.1** - PendingItemsCard component must exist
- **Polling = 5 seconds** - Same as basket polling for consistency
- **Approve updates both** - Pending list AND basket state
- **Backend returns updated basket** - Use response to update basket immediately
- **Don't spam toasts** - Only show on user actions, not polling errors

---

## Success Criteria

1. ✅ PendingItemsCard appears when pending items exist
2. ✅ Approve adds to basket and removes from pending
3. ✅ Decline removes from pending
4. ✅ Quantity adjustment works correctly
5. ✅ Basket updates immediately after approve
6. ✅ Loading states prevent duplicate actions
7. ✅ Error handling works
8. ✅ Polling performance good (5-second interval)
9. ✅ Memory log 200+ lines
10. ✅ Tested with real low-confidence detections

---

**BEGIN TASK 4.2 NOW**

Complete the NEW FEATURE integration!
