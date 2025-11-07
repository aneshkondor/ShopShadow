# ShopShadow - Setup Guide

**Complete setup guide for getting ShopShadow running on your machine (Mac or PC).**

**Estimated Time:** 15-30 minutes

---

## Prerequisites

Before starting, verify you have all required software installed:

📋 **[See REQUIREMENTS.md](./REQUIREMENTS.md) for detailed system requirements**

**Quick Check:**
```bash
node --version    # v18+
npm --version     # 9+
psql --version    # 14+
python3 --version # 3.9+
git --version     # 2.0+
```

---

## Step 1: Clone Repository

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/ShopShadow.git
cd ShopShadow

# Verify structure
ls -la
# Should see: backend/, frontend/, flask-detection/, docs/, etc.
```

---

## Step 2: Database Setup

### 2.1 Start PostgreSQL

**Mac:**
```bash
brew services start postgresql@14
```

**Windows:**
- Open Services app
- Start "PostgreSQL" service

**Linux:**
```bash
sudo systemctl start postgresql
sudo systemctl enable postgresql  # Auto-start on boot
```

### 2.2 Create Database

```bash
# Connect to PostgreSQL
psql postgres

# In psql prompt:
CREATE DATABASE shopshadow;

# Create user (optional - skip if using your OS user)
CREATE USER shopshadow_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE shopshadow TO shopshadow_user;

# Exit psql
\q
```

### 2.3 Run Migrations

```bash
cd backend

# Install node-pg-migrate globally (one-time)
npm install -g node-pg-migrate

# Run migrations to create tables
npm run migrate:up

# Verify tables created
psql shopshadow -c "\dt"
# Should show: users, products, devices, basket_items, orders, etc.
```

### 2.4 Seed Test Data

```bash
# Still in backend/ directory
psql shopshadow < migrations/seed_data.sql

# Verify test users exist
psql shopshadow -c "SELECT email, role FROM users;"
# Should show: demo@email.com, admin@email.com
```

---

## Step 3: Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Create .env file
cp .env.example .env  # If exists, otherwise create manually

# Edit .env with your settings
nano .env  # or use your preferred editor
```

**Backend `.env` Configuration:**

```env
# Database
DATABASE_URL=postgresql://YOUR_USERNAME@localhost:5432/shopshadow

# Or if you created shopshadow_user:
# DATABASE_URL=postgresql://shopshadow_user:your_secure_password@localhost:5432/shopshadow

# Server
API_PORT=3001
HOST=0.0.0.0
NODE_ENV=development

# JWT (keep default for development)
JWT_SECRET=dev-secret-key-change-in-production
JWT_EXPIRES_IN=24h

# CORS (auto-detects in development)
FRONTEND_URL=http://localhost:5173

# Logging
LOG_LEVEL=debug
LOG_FILE_PATH=./logs
```

**Test Backend:**

```bash
# Start backend
npm start

# Should see:
# ✓ PostgreSQL connected successfully
# ✓ ShopShadow backend server started on port 3001
# ✓ Access from other devices: http://YOUR_IP:3001

# In another terminal, test health endpoint
curl http://localhost:3001/health
# Should return: {"success":true,"message":"ShopShadow backend is running",...}
```

**Keep backend running** in this terminal.

---

## Step 4: Frontend Setup

Open a **new terminal** window:

```bash
cd frontend/frontend

# Install dependencies
npm install

# No .env needed! Auto-detection handles API URL

# Start frontend
npm run dev

# Should see:
# ➜  Local:   http://localhost:5173/
# ➜  Network: http://YOUR_IP:5173/
```

**Test Frontend:**

Open browser: `http://localhost:5173`

You should see the ShopShadow landing page! 🎉

**Try logging in:**
- Email: `demo@email.com`
- Password: `1234`

**Or create a new account** via Sign Up.

**Keep frontend running** in this terminal.

---

## Step 5: Flask Detection Service (Optional)

This step is **optional** for basic testing. Required for actual product detection.

### 5.1 Install Python Dependencies

```bash
cd flask-detection

# Create virtual environment (recommended)
python3 -m venv venv
source venv/bin/activate  # Mac/Linux
# or
venv\Scripts\activate     # Windows

# Install dependencies
pip install -r requirements.txt

# This will download YOLO11s model (~20MB) on first run
```

### 5.2 Configure Flask

```bash
# Copy .env.example if it exists
cp .env.example .env  # Otherwise create manually

# Edit .env
nano .env
```

**Flask `.env` Configuration:**

```env
FLASK_HOST=0.0.0.0
FLASK_PORT=5000
DEBUG=False

# Backend API URL (auto-detected from terminal output)
# Use the IP from backend startup: "Access from other devices: http://10.0.0.131:3001"
BACKEND_API_URL=http://localhost:3001  # For testing on same machine

# Camera
CAMERA_INDEX=0  # 0 = default webcam, 1 = external USB camera

# Detection settings
CONFIDENCE_THRESHOLD=0.7
DETECTION_INTERVAL=5

# YOLO
YOLO_MODEL_PATH=./models/yolo11s.pt
YOLO_DEVICE=auto  # auto, cpu, cuda, mps (Apple Silicon)
```

### 5.3 Start Flask Service

```bash
# Still in flask-detection/ with venv activated
python main.py

# Should see:
# ✓ YOLO11s model loaded
# ✓ Device registered with code: 1234
# ✓ Polling for connection status...
```

**Note the 4-digit code** (e.g., `1234`) - you'll need this to connect the device in the frontend.

**Keep Flask running** in this terminal.

---

## Step 6: Test End-to-End Flow

### 6.1 Connect Device

1. In browser (frontend): Login as `demo@email.com`
2. Click "Connect Device"
3. Enter the 4-digit code from Flask terminal
4. Click "Connect"
5. Should see: "Device connected successfully!"

### 6.2 Test Detection

1. Show an object to your webcam (e.g., apple, banana, bottle)
2. Flask should log: `Detected: apple (confidence: 0.85)`
3. Item should appear in basket on frontend **within 5 seconds**
4. Total price updates automatically

### 6.3 Test Checkout

1. Click "Checkout" button
2. Review items
3. Complete checkout
4. Order created and added to order history

---

## Step 7: Admin Features (Optional)

### 7.1 Login as Admin

- Email: `admin@email.com`
- Password: `1111`

### 7.2 Explore Admin Dashboard

- **Overview:** System stats and recent activity
- **Users:** View all users (with search and pagination)
- **Products:** Edit/delete products (try editing price)
- **Orders:** View all orders
- **Analytics:** Detection confidence breakdown

---

## LAN Multi-Device Testing (Optional)

Want to test on your phone? **No configuration needed!**

### On Your Computer

Services are already running with auto-detection enabled.

### On Your Phone

1. **Connect to same WiFi** as your computer
2. **Find your computer's IP:**
   - Mac: Terminal shows "Network: http://10.0.0.131:5173/"
   - Windows: `ipconfig` → look for IPv4 Address
3. **Open Safari** (iPhone) or Chrome (Android)
4. **Navigate to:** `http://YOUR_COMPUTER_IP:5173`
   - Example: `http://10.0.0.131:5173`
5. **Login and test!**

**Frontend automatically detects** the IP and connects to the correct backend URL.

📖 **Full LAN Testing Guide:** [docs/LAN_TESTING_GUIDE.md](./docs/LAN_TESTING_GUIDE.md)

---

## Troubleshooting

### Backend won't start

**"Database connection failed"**
```bash
# Check PostgreSQL is running
psql postgres -c "SELECT 1;"

# Check database exists
psql -l | grep shopshadow

# Verify DATABASE_URL in .env
echo $DATABASE_URL  # Mac/Linux
# or check .env file contents
```

**"Port 3001 already in use"**
```bash
# Find process using port
lsof -i :3001  # Mac/Linux
netstat -ano | findstr :3001  # Windows

# Kill process
kill -9 <PID>  # Mac/Linux
taskkill /PID <PID> /F  # Windows
```

### Frontend won't start

**"Port 5173 already in use"**
```bash
# Kill process on port 5173
lsof -ti :5173 | xargs kill  # Mac/Linux
```

**"Module not found"**
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Flask Detection Issues

**"Camera not detected"**
```bash
# Test camera
python3 -c "import cv2; print(cv2.VideoCapture(0).read())"

# Try different camera index in .env
CAMERA_INDEX=1  # or 2, 3, etc.
```

**"YOLO model not found"**
```bash
# Model downloads automatically on first run
# Ensure internet connection
# Check flask-detection/models/ folder exists
mkdir -p models
```

**"No detections appearing"**
- Check confidence threshold: `CONFIDENCE_THRESHOLD=0.5` (lower = more detections)
- Verify backend URL is correct in Flask .env
- Check Flask logs for errors
- Ensure device is connected in frontend

### Database Migration Issues

**"Relation already exists"**
```bash
# Migrations may have already run
# Check migration status
npm run migrate:status

# If needed, rollback and rerun
npm run migrate:down
npm run migrate:up
```

---

## Common Development Tasks

### Reset Database

```bash
cd backend

# Drop and recreate database
psql postgres -c "DROP DATABASE shopshadow;"
psql postgres -c "CREATE DATABASE shopshadow;"

# Rerun migrations and seed
npm run migrate:up
psql shopshadow < migrations/seed_data.sql
```

### View Logs

```bash
# Backend logs
tail -f backend/logs/shopshadow-YYYY-MM-DD.log

# Flask logs
tail -f flask-detection/logs/shopshadow.log
```

### Stop All Services

```bash
# Stop backend (Ctrl+C in terminal)
# Stop frontend (Ctrl+C in terminal)
# Stop Flask (Ctrl+C in terminal)

# Or kill all Node processes
pkill -f "node"  # Use with caution!
```

---

## Next Steps

After successful setup:

1. ✅ **Read Architecture Docs:** [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)
2. ✅ **Try LAN Testing:** [docs/LAN_TESTING_GUIDE.md](./docs/LAN_TESTING_GUIDE.md)
3. ✅ **Review Memory Logs:** [apm/Memory/Memory_Root.md](./apm/Memory/Memory_Root.md)
4. ✅ **Explore Code:** Start with `backend/src/server.js` and `frontend/frontend/src/App.tsx`

---

## Production Deployment

For deploying to production (cloud hosting):

1. Change `NODE_ENV=production` in backend .env
2. Generate strong `JWT_SECRET` (32+ characters)
3. Set up PostgreSQL with password authentication
4. Build frontend: `npm run build`
5. Set up reverse proxy (nginx)
6. Enable HTTPS with SSL certificate
7. Configure environment variables on hosting platform

📖 **Deployment Guide:** [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md) *(coming in Phase 6)*

---

## Getting Help

**Issues?**
- Check [TROUBLESHOOTING.md](./docs/TROUBLESHOOTING.md)
- Review logs in `backend/logs/` and `flask-detection/logs/`
- Search closed issues on GitHub

**Contributing:**
- See [CONTRIBUTING.md](./CONTRIBUTING.md)
- Read coding standards in [docs/CODING_STANDARDS.md](./docs/CODING_STANDARDS.md)

---

## Summary

**You should now have:**
- ✅ Backend API running on `http://localhost:3001`
- ✅ Frontend running on `http://localhost:5173`
- ✅ Database with test data (demo and admin users)
- ✅ (Optional) Flask detection service running
- ✅ Ability to test on phone via LAN

**Test Credentials:**
- Regular user: `demo@email.com` / `1234`
- Admin user: `admin@email.com` / `1111`

---

**Last Updated:** November 6, 2025
**For Requirements:** See [REQUIREMENTS.md](./REQUIREMENTS.md)
**For LAN Testing:** See [docs/LAN_TESTING_GUIDE.md](./docs/LAN_TESTING_GUIDE.md)

**Happy Testing!** 🚀
