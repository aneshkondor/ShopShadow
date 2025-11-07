# Task 4.4 - Device Connection Integration

**Agent:** Claude Sonnet 4.5
**Environment:** Claude Code (fresh session)
**Working Directory:** `/Users/aneshkondor/Coding/cursor_projects/ShopShadow`

---

## Your Role

You are implementing **Task 4.4: Device Connection Integration** for ShopShadow.

This task connects the frontend device pairing flow to the backend API, enabling users to pair their phone with the Flask detection device (Raspberry Pi or MacBook camera).

---

## Context Files to Read FIRST

1. **Task Assignment:**
   - `PHASE_4_TASK_ASSIGNMENTS.md` (lines 700-880)

2. **Backend API:**
   - `backend/src/routes/devices.js` (device pairing endpoints)
   - Phase 2 Task 2.4 memory log (device pairing logic)

3. **Existing Frontend:**
   - `frontend/frontend/src/components/ConnectionPage.tsx` (has mock connection)
   - `frontend/frontend/src/components/ConnectionStatus.tsx` (shows fake status)

4. **Reference:**
   - Flask service calls `POST /api/devices/register` on startup
   - Returns 4-digit code for user to enter

---

## Deliverables

### 1. Device API Functions
**Path:** `frontend/frontend/src/utils/api.ts` (add to existing file)

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
  const data = await response.json();
  return data.device;
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

### 2. Updated ConnectionPage Component
**Path:** `frontend/frontend/src/components/ConnectionPage.tsx`

**Changes Required:**

1. **Remove Mock Logic:**
   - Delete mock connection handler
   - Replace with real API call

2. **Add States:**
   ```typescript
   const [code, setCode] = useState('');
   const [isConnecting, setIsConnecting] = useState(false);
   const [error, setError] = useState<string | null>(null);
   ```

3. **Implement Connection Handler:**
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

4. **Use InputOTP Component:**
   ```tsx
   import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';

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

5. **Auto-Submit on 4 Digits:**
   ```typescript
   useEffect(() => {
     if (code.length === 4) {
       handleConnect();
     }
   }, [code]);
   ```

### 3. Updated ConnectionStatus Component
**Path:** `frontend/frontend/src/components/ConnectionStatus.tsx`

**Changes Required:**

1. **Remove Mock Status:**
   - Replace `const [isConnected] = useState(true)` with real API

2. **Add Device Polling:**
   ```typescript
   const [device, setDevice] = useState<Device | null>(null);

   useEffect(() => {
     if (!userId || !authToken) return;

     const checkDeviceStatus = async () => {
       const deviceData = await getDeviceStatus(userId, authToken);
       setDevice(deviceData);
     };

     checkDeviceStatus();
     const interval = setInterval(checkDeviceStatus, 10000); // Poll every 10s
     return () => clearInterval(interval);
   }, [userId, authToken]);
   ```

3. **Display Real Status:**
   ```typescript
   const getStatusColor = () => {
     if (!device) return 'bg-red-500'; // Disconnected

     const lastHeartbeat = new Date(device.lastHeartbeat).getTime();
     const now = Date.now();
     const secondsSinceHeartbeat = (now - lastHeartbeat) / 1000;

     if (secondsSinceHeartbeat < 60 && device.status === 'active') {
       return 'bg-green-500'; // Connected
     }
     if (device.status === 'pending') {
       return 'bg-yellow-500'; // Pending
     }
     return 'bg-red-500'; // Disconnected
   };

   const getStatusText = () => {
     if (!device) return 'Disconnected';
     if (device.status === 'pending') return 'Pending';

     const lastHeartbeat = new Date(device.lastHeartbeat).getTime();
     const secondsSinceHeartbeat = (Date.now() - lastHeartbeat) / 1000;

     return secondsSinceHeartbeat < 60 ? 'Connected' : 'Disconnected';
   };
   ```

### 4. Dashboard Device Polling
**Path:** `frontend/frontend/src/components/Dashboard.tsx` (add to existing)

```typescript
const [connectedDevice, setConnectedDevice] = useState<Device | null>(null);
const [isConnected, setIsConnected] = useState(false);

useEffect(() => {
  if (!userId || !authToken) return;

  const checkDeviceStatus = async () => {
    const device = await getDeviceStatus(userId, authToken);
    setConnectedDevice(device);
    setIsConnected(device?.status === 'active');
  };

  checkDeviceStatus();
  const interval = setInterval(checkDeviceStatus, 10000);
  return () => clearInterval(interval);
}, [userId, authToken]);
```

### 5. Disconnect Functionality
**Path:** `frontend/frontend/src/components/Dashboard.tsx` (add button)

```tsx
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

const handleDisconnect = async () => {
  if (!connectedDevice) return;

  try {
    await disconnectDevice(connectedDevice.id, authToken);
    setConnectedDevice(null);
    setIsConnected(false);
    toast.success('Device disconnected');
  } catch (error) {
    toast.error('Failed to disconnect device');
  }
};

// In JSX:
<AlertDialog>
  <AlertDialogTrigger asChild>
    <button className="text-slate-600 hover:text-slate-800">
      Disconnect Device
    </button>
  </AlertDialogTrigger>
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

### 6. Memory Log
**Path:** `apm/Memory/Phase_04_Frontend_Enhancement/Task_4_4_Device_connection_integration.md`

**Requirements (200+ lines):**
- Executive summary
- Device pairing flow diagram
- Connection state machine (pending → active → inactive)
- Heartbeat monitoring logic (why 10-second polling)
- Error handling (invalid code, already connected, network failure)
- Testing evidence with real Flask device
- Git commit hash

---

## Testing Requirements

**Manual Test:**

1. **Start Flask Detection Service:**
   ```bash
   cd flask-detection
   python main.py
   # Look for: "Device registered: [device-id]" and 4-digit code
   # Example: "Device code: 1234"
   ```

2. **Start Backend:**
   ```bash
   cd backend
   npm start
   ```

3. **Start Frontend:**
   ```bash
   cd frontend/frontend
   npm run dev
   ```

4. **Test Flow:**
   - Navigate to ConnectionPage
   - Enter 4-digit code from Flask service
   - Should connect successfully
   - Navigate to Dashboard
   - ConnectionStatus should show "Connected" (green dot)
   - Stop Flask service (Ctrl+C)
   - Wait 60+ seconds
   - ConnectionStatus should show "Disconnected" (red dot)

5. **Test Errors:**
   - Enter invalid code → Should show error message
   - Enter code from stopped Flask → Should fail gracefully

---

## Validation Checklist

Before committing:

- [ ] User can enter 4-digit code
- [ ] Valid code connects successfully
- [ ] Invalid code shows error
- [ ] ConnectionStatus shows real device status
- [ ] Green dot when device active (<60s heartbeat)
- [ ] Red dot when disconnected
- [ ] Yellow dot when pending
- [ ] Dashboard polls device status every 10 seconds
- [ ] Disconnect button works
- [ ] Memory log 200+ lines
- [ ] Tested with real Flask device

---

## Git Commit

```bash
git add frontend/frontend/src/utils/api.ts frontend/frontend/src/components/ConnectionPage.tsx frontend/frontend/src/components/ConnectionStatus.tsx frontend/frontend/src/components/Dashboard.tsx apm/Memory/Phase_04_Frontend_Enhancement/Task_4_4_Device_connection_integration.md

git commit -m "feat: implement device connection integration with backend (Task 4.4)

- Create device API functions (connect, status, disconnect)
- Update ConnectionPage with real 4-digit code entry
- Implement InputOTP component for code input
- Add device status polling (10-second interval)
- Update ConnectionStatus to show real device state
- Implement heartbeat monitoring (green <60s, red >60s)
- Add disconnect functionality with confirmation dialog
- Handle connection errors (invalid code, network failure)
- Auto-submit on 4-digit code entry
- Comprehensive memory log (200+ lines)

Device pairing end-to-end functional.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

**DO NOT PUSH** - Stay local until Phase 4 complete.

---

## Success Criteria

1. ✅ User can connect device with 4-digit code
2. ✅ Invalid code shows error
3. ✅ ConnectionStatus shows real status (green/yellow/red)
4. ✅ Device polling every 10 seconds
5. ✅ Disconnect works with confirmation
6. ✅ Heartbeat monitoring accurate
7. ✅ Memory log 200+ lines
8. ✅ Tested with real Flask device

---

**BEGIN TASK 4.4 NOW**

Enable device pairing!
