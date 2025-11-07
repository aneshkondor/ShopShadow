# ShopShadow LAN Testing Guide

**Purpose:** Enable testing on multiple devices (Mac, iPhone, iPad, Raspberry Pi) connected to the same WiFi network without requiring internet deployment.

**Last Updated:** November 6, 2025

---

## 🎉 Zero-Config Setup!

ShopShadow now **automatically detects your LAN IP** - no manual configuration needed!

**How it works:**
- Frontend auto-detects whether you're accessing via localhost or LAN IP
- Backend automatically allows all private IP ranges in development mode
- Just start the services and it works on any device on your WiFi

---

## Prerequisites

- All devices must be on the **same WiFi network**
- Mac running backend server and frontend
- Optional: iPhone/iPad for mobile testing
- Optional: Raspberry Pi for Flask detection service

---

## Quick Start (2 Steps!)

### Step 1: Start Backend

```bash
cd backend
npm start
```

**You'll see:**
```
ShopShadow backend server started on port 3001
Access from other devices on your network: http://10.0.0.131:3001
```

**Note the LAN IP shown** (e.g., `10.0.0.131`) - you'll use this on other devices.

### Step 2: Start Frontend

```bash
cd frontend/frontend
npm run dev:lan
```

**You'll see:**
```
➜  Local:   http://localhost:5173/
➜  Network: http://10.0.0.131:5173/
```

**That's it!** No configuration files to edit.

---

## Testing from Different Devices

### On Mac (localhost)
- Open browser: `http://localhost:5173`
- ✅ Automatically connects to `http://localhost:3001`

### On iPhone/iPad
1. Connect to same WiFi as Mac
2. Open Safari: `http://10.0.0.131:5173` (use the IP from Step 1)
3. ✅ Automatically connects to `http://10.0.0.131:3001`

### On Raspberry Pi (Flask Detection)
Update `flask-detection/.env`:
```env
BACKEND_API_URL=http://10.0.0.131:3001
```
(Use the IP from Step 1)

---

## How Auto-Detection Works

**Frontend (api.ts):**
```typescript
// Automatically detects based on window.location.hostname
// localhost:5173 → localhost:3001
// 10.0.0.131:5173 → 10.0.0.131:3001
```

**Backend (server.js):**
```javascript
// In development mode, automatically allows:
// - localhost, 127.0.0.1
// - All private IP ranges: 10.x.x.x, 172.16-31.x.x, 192.168.x.x
```

**No .env.local needed!** ✨

---

## Old Method (Manual IP Configuration)

If you need to override the auto-detection:

---

## Step 2: Configure Backend for LAN Access

The backend is already configured to listen on all network interfaces (`HOST=0.0.0.0`).

### Verify Configuration

Check `backend/.env` contains:

```env
HOST=0.0.0.0
API_PORT=3001
```

### Start Backend

```bash
cd backend
npm start
```

**Expected output:**
```
ShopShadow backend server started on port 3001
Access from other devices on your network: http://169.233.209.238:3001
```

### Test Backend from Other Devices

On iPhone/Pi, open browser and visit:
```
http://169.233.209.238:3001/health
```

Should return: `{"status":"ok"}`

---

## Step 3: Configure Frontend for LAN Testing

### Option A: Use .env.local (Recommended)

The frontend already has `.env.local` configured with your Mac's LAN IP.

**Verify** `frontend/frontend/.env.local` contains:

```env
VITE_API_URL=http://169.233.209.238:3001
```

> **Note:** If your Mac's IP changes (different WiFi network), update this file.

### Start Frontend in LAN Mode

```bash
cd frontend/frontend
npm run dev:lan
```

**Expected output:**
```
VITE v6.4.1  ready in 234 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: http://169.233.209.238:5173/
```

### Test Frontend from Other Devices

On iPhone:
1. Open Safari
2. Navigate to `http://169.233.209.238:5173`
3. Should see ShopShadow landing page

---

## Step 4: Configure Flask Detection Service (Raspberry Pi)

### Update Flask .env File

On your Raspberry Pi, edit `flask-detection/.env`:

```bash
# Change from localhost to Mac's LAN IP
BACKEND_API_URL=http://169.233.209.238:3001
```

### Start Flask Service

```bash
cd flask-detection
python main.py
```

**Expected output:**
```
Device registered with code: 1234
Polling for connection status...
```

---

## Step 5: Full Multi-Device Test Flow

### 1. Start All Services

**On Mac:**
```bash
# Terminal 1: Backend
cd backend && npm start

# Terminal 2: Frontend
cd frontend/frontend && npm run dev:lan
```

**On Raspberry Pi:**
```bash
cd flask-detection && python main.py
```

### 2. Connect Device from iPhone

1. Open Safari on iPhone → `http://169.233.209.238:5173`
2. Click "Sign Up" or "Login"
   - Test user: `demo@email.com` / `1234`
   - Admin user: `admin@email.com` / `1111`
3. Navigate to "Connect Device"
4. Enter the 4-digit code from Pi terminal (e.g., `1234`)
5. Click "Connect"
6. Should see "Device connected successfully"

### 3. Test Real-Time Detection

1. On Pi, show an object to the camera (e.g., apple)
2. Pi logs: `Detected: apple (confidence: 0.85)`
3. Item should appear in basket on iPhone **within 5 seconds**
4. Basket total updates automatically

### 4. Test Multi-Device Sync

1. Keep iPhone on Dashboard
2. On Mac, open `http://localhost:5173` and login as same user
3. Both devices should show **same basket contents**
4. Add item on Pi → appears on BOTH Mac and iPhone
5. Verify 5-second polling keeps both devices in sync

### 5. Test Checkout Flow

1. On iPhone, review basket
2. Click "Checkout"
3. Order created successfully
4. View order history - should show completed order

---

## Troubleshooting

### iPhone Can't Connect to Frontend

**Symptom:** Safari shows "Cannot connect to server"

**Solution:**
1. Verify Mac and iPhone are on **same WiFi**
2. Check Mac firewall: System Settings → Network → Firewall → Allow incoming connections for Node
3. Verify frontend is running: `lsof -i :5173`
4. Verify LAN IP is correct: `ipconfig getifaddr en0`

### Pi Can't Register with Backend

**Symptom:** Flask logs show "Connection refused"

**Solution:**
1. Verify backend is running on Mac
2. Test backend from Pi: `curl http://169.233.209.238:3001/health`
3. Check `flask-detection/.env` has correct `BACKEND_API_URL`
4. Verify Mac firewall allows port 3001

### CORS Errors in Browser Console

**Symptom:** "CORS policy: No 'Access-Control-Allow-Origin' header"

**Solution:**
1. Backend CORS is configured for `http://localhost:5173` only
2. Update `backend/.env`:
   ```env
   # Add LAN IP to FRONTEND_URL (comma-separated)
   FRONTEND_URL=http://localhost:5173,http://169.233.209.238:5173
   ```
3. Restart backend

### Real-Time Updates Not Working

**Symptom:** Items don't appear automatically, need to refresh

**Solution:**
1. Check browser console for network errors
2. Verify polling is active (should see API requests every 5 seconds)
3. Check backend logs for errors
4. Ensure user is authenticated (check localStorage for authToken)

### Detection Not Working on Pi

**Symptom:** Camera opens but no detections sent to backend

**Solution:**
1. Check Pi has internet for downloading YOLO model (first run only)
2. Verify YOLO model downloaded: `ls flask-detection/models/yolo11s.pt`
3. Check camera is working: `python -c "import cv2; print(cv2.VideoCapture(0).read())"`
4. Review Flask logs for errors
5. Verify confidence threshold: objects must be ≥70% confidence

---

## Performance Tips

### Reduce Polling Frequency

If network is slow, increase poll intervals in `Dashboard.tsx`:

```typescript
// Change from 5s to 10s
const interval = setInterval(fetchBasketData, 10000);
```

### Optimize YOLO Performance on Pi

In `flask-detection/.env`:

```env
# Use CPU if GPU unavailable
YOLO_DEVICE=cpu

# Increase detection interval to reduce CPU load
DETECTION_INTERVAL=10
```

---

## Network Configuration Reference

| Device | Service | URL | Port |
|--------|---------|-----|------|
| Mac | Backend API | `http://169.233.209.238:3001` | 3001 |
| Mac | Frontend | `http://169.233.209.238:5173` | 5173 |
| Pi | Flask Detection | `http://[Pi IP]:5000` | 5000 |
| iPhone | Access Frontend | `http://169.233.209.238:5173` | - |

---

## Switching Between Local and LAN Mode

### Local Mode (Single Device on Mac)

**Backend** (`backend/.env`):
```env
HOST=localhost
```

**Frontend** (delete or rename `.env.local`):
```bash
mv frontend/frontend/.env.local frontend/frontend/.env.local.backup
npm run dev  # Uses default localhost
```

**Flask** (`flask-detection/.env`):
```env
BACKEND_API_URL=http://localhost:3001
```

### LAN Mode (Multi-Device)

**Backend** (`backend/.env`):
```env
HOST=0.0.0.0
```

**Frontend** (restore `.env.local`):
```bash
mv frontend/frontend/.env.local.backup frontend/frontend/.env.local
npm run dev:lan
```

**Flask** (`flask-detection/.env`):
```env
BACKEND_API_URL=http://169.233.209.238:3001
```

---

## Security Notes

- **LAN mode exposes services to your local network only**
- NOT accessible from the internet
- All devices must be on same WiFi
- For production deployment, use HTTPS and proper authentication
- Consider VPN for remote access instead of exposing to internet

---

## Next Steps

After validating LAN testing:

1. **Phase 5:** Comprehensive testing and QA
2. **Phase 6:** Production deployment (cloud hosting, domain, HTTPS)
3. **Future:** Mobile app (React Native) for better mobile experience

---

## Support

If you encounter issues not covered here:

1. Check backend logs: `backend/logs/`
2. Check Flask logs: `flask-detection/logs/shopshadow.log`
3. Check browser console for frontend errors
4. Verify all services are running: `lsof -i :3001 && lsof -i :5173`

---

**Configuration Summary:**

✅ Backend listens on `0.0.0.0:3001` (all interfaces)
✅ Frontend runs on `0.0.0.0:5173` with LAN IP in .env.local
✅ Flask configured to use Mac's LAN IP
✅ All devices on same WiFi network
✅ Real-time polling syncs data every 5 seconds

**Enjoy testing ShopShadow on multiple devices!** 🚀
