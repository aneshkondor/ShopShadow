# Task 4.3 - Real-Time Basket Polling

**Agent:** Claude Sonnet 4.5
**Environment:** Claude Code (fresh session)
**Working Directory:** `/Users/aneshkondor/Coding/cursor_projects/ShopShadow`

---

## Your Role

You are implementing **Task 4.3: Real-Time Basket Polling** for ShopShadow.

This task **removes ALL mock data** from the Dashboard and creates the complete **Flask detection → Backend → Frontend** real-time flow.

**CRITICAL:** This is the core integration that makes the entire system work end-to-end.

---

## Context Files to Read FIRST

1. **Task Assignment:**
   - `PHASE_4_TASK_ASSIGNMENTS.md` (lines 492-700)

2. **Backend API:**
   - `backend/src/routes/basket.js` (GET /api/basket/:userId endpoint)
   - Backend returns: `{ success, data: { items: [], total, itemCount } }`

3. **Existing Frontend:**
   - `frontend/frontend/src/components/Dashboard.tsx` (has mock data to replace)
   - `frontend/frontend/src/03-api-endpoints-and-data.md` (API spec)

4. **Reference:**
   - `apm/Memory/Phase_03_Flask_Detection_Service/Task_3_6_Detection_loop_orchestration.md` (Flask side that sends detections)

---

## Deliverables

### 1. API Utility File
**Path:** `frontend/frontend/src/utils/api.ts`

Create if doesn't exist. Add basket API functions:

```typescript
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const getAuthHeaders = (token: string) => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${token}`
});

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

### 2. Updated Dashboard Component
**Path:** `frontend/frontend/src/components/Dashboard.tsx`

**Changes Required:**

1. **Remove Mock Data:**
   - Delete `const mockItems: BasketItem[] = [...]`
   - Change to: `const [items, setItems] = useState<BasketItem[]>([])`

2. **Add States:**
   ```typescript
   const [items, setItems] = useState<BasketItem[]>([]);
   const [isLoadingBasket, setIsLoadingBasket] = useState(true);
   const [basketTotal, setBasketTotal] = useState(0);
   const [itemCount, setItemCount] = useState(0);
   const [authToken, setAuthToken] = useState<string | null>(null);
   const userId = 'user-id-from-context'; // Get from props/context
   ```

3. **Implement Polling:**
   ```typescript
   useEffect(() => {
     if (!userId || !authToken) return;

     const fetchBasketData = async () => {
       try {
         const basketResponse = await fetchBasket(userId, authToken);
         setItems(basketResponse.data.items);
         setBasketTotal(basketResponse.data.total);
         setItemCount(basketResponse.data.itemCount);
         setIsLoadingBasket(false);
       } catch (error) {
         console.error('Failed to fetch basket:', error);
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

4. **Update Remove Handler:**
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

5. **Add Loading State UI:**
   ```tsx
   {isLoadingBasket ? (
     <div className="space-y-3">
       {[1, 2, 3].map(i => (
         <div key={i} className="h-20 bg-slate-200/50 animate-pulse rounded-lg" />
       ))}
     </div>
   ) : items.length === 0 ? (
     <EmptyState />
   ) : (
     // Actual basket items
   )}
   ```

6. **Update Total Calculation:**
   - Use `basketTotal` from API instead of calculating client-side
   - Display in checkout footer

### 3. Environment Variable
**Path:** `frontend/frontend/.env` (create if doesn't exist)

```
VITE_API_URL=http://localhost:3001
```

### 4. Memory Log
**Path:** `apm/Memory/Phase_04_Frontend_Enhancement/Task_4_3_Real_time_basket_polling.md`

**Requirements (200+ lines):**
- Executive summary
- Polling strategy (why 5 seconds)
- State management approach
- Synchronization with Flask service
- Error handling strategy
- Performance optimizations
- Testing evidence (show API calls in Network tab)
- Edge cases handled
- Git commit hash

---

## Testing Requirements

**Manual Test - CRITICAL:**

1. **Start Backend:**
   ```bash
   cd backend
   npm start
   # Should run on http://localhost:3001
   ```

2. **Start Flask Detection Service:**
   ```bash
   cd flask-detection
   python main.py
   # Should register device and start detecting
   ```

3. **Start Frontend:**
   ```bash
   cd frontend/frontend
   npm run dev
   # Should run on http://localhost:5173
   ```

4. **Test Flow:**
   - Login as demo user (demo@email.com / 1234)
   - Dashboard should load (empty basket initially)
   - Hold object in front of camera (e.g., apple, banana)
   - Wait 5-10 seconds
   - Item should appear in basket automatically (high confidence ≥70%)
   - Remove item → API call → item disappears
   - Basket total updates correctly

5. **Network Tab Verification:**
   - Open Chrome DevTools → Network tab
   - See polling requests every 5 seconds: `GET /api/basket/:userId`
   - Requests should complete <200ms
   - No duplicate requests within 5-second window

---

## Validation Checklist

Before committing:

- [ ] No mock data remains in Dashboard
- [ ] Polling fetches basket every 5 seconds
- [ ] Items from Flask service appear automatically
- [ ] Remove item calls backend API
- [ ] Basket total accurate
- [ ] Loading skeleton shows on initial load
- [ ] Empty state shows when basket empty
- [ ] Network tab shows clean polling (no duplicates)
- [ ] No console errors
- [ ] TypeScript compiles
- [ ] Memory log 200+ lines
- [ ] Tested with real backend + Flask service

---

## Git Commit

```bash
git add frontend/frontend/src/utils/api.ts frontend/frontend/src/components/Dashboard.tsx frontend/frontend/.env apm/Memory/Phase_04_Frontend_Enhancement/Task_4_3_Real_time_basket_polling.md

git commit -m "feat: implement real-time basket polling with Flask integration (Task 4.3)

- Remove all mock data from Dashboard
- Create API utility functions (fetchBasket, removeBasket)
- Implement 5-second polling synchronized with Flask detection
- Add loading states with skeleton UI
- Update remove item to call backend API
- Use backend-provided total instead of client-side calculation
- Handle empty basket state
- Error handling for network failures and auth errors
- Performance optimization (AbortController, memoization)
- Comprehensive memory log (200+ lines)

Complete detection → backend → frontend flow working.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

**DO NOT PUSH** - Stay local until Phase 4 complete.

---

## Important Notes

- **Polling interval = 5 seconds** (matches Flask detection interval)
- **Use AbortController** to cancel previous fetch if new one starts
- **Don't show toast on polling errors** (only on initial load failure)
- **Auth handling:** For demo, use mock token or localStorage
- **Demo credentials:** demo@email.com / 1234

---

## Success Criteria

**This task is complete when:**

1. ✅ Dashboard shows real basket data from backend
2. ✅ Polling updates basket every 5 seconds
3. ✅ Flask-detected items appear automatically
4. ✅ Remove item works via API
5. ✅ Loading states during initial fetch
6. ✅ Empty state when no items
7. ✅ No mock data in codebase
8. ✅ Network performance good (no duplicates)
9. ✅ Memory log 200+ lines
10. ✅ Tested end-to-end with Flask service

---

**BEGIN TASK 4.3 NOW**

This is the CORE integration. Make it rock-solid.
