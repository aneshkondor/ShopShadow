# ShopShadow - System Requirements

## Overview

ShopShadow is an automated checkout system using YOLO11s computer vision for real-time product detection.

---

## Hardware Requirements

### Development Machine (Mac/PC)
- **CPU:** Multi-core processor (4+ cores recommended)
- **RAM:** 8GB minimum, 16GB recommended
- **Storage:** 2GB free space (includes dependencies)
- **Network:** WiFi for LAN testing

### Detection Device (Optional - Raspberry Pi)
- **Model:** Raspberry Pi 4 (4GB+ RAM recommended)
- **Camera:** USB webcam or Pi Camera Module
- **Storage:** 16GB+ SD card
- **Network:** WiFi connectivity

### Mobile Testing (Optional)
- **Device:** iPhone, iPad, or Android phone
- **Network:** Same WiFi network as development machine

---

## Software Requirements

### Backend (Node.js + PostgreSQL)

**Node.js:**
- **Version:** 18.x or higher
- **Check:** `node --version`
- **Install:** [nodejs.org](https://nodejs.org/)

**PostgreSQL:**
- **Version:** 14.x or higher
- **Check:** `psql --version`
- **Install:**
  - **Mac:** `brew install postgresql@14`
  - **PC (Windows):** [postgresql.org/download/windows](https://www.postgresql.org/download/windows/)
  - **PC (Linux):** `sudo apt-get install postgresql postgresql-contrib`

**Required:**
- PostgreSQL server running
- Database user with CREATE DATABASE privileges

---

### Frontend (React + Vite)

**Node.js:**
- **Version:** 18.x or higher (same as backend)

**NPM:**
- **Version:** 9.x or higher
- **Check:** `npm --version`

---

### Flask Detection Service (Python)

**Python:**
- **Version:** 3.9 or higher
- **Check:** `python3 --version`
- **Install:** [python.org](https://www.python.org/downloads/)

**Pip:**
- **Version:** Latest
- **Check:** `pip3 --version`

**Required Packages:**
- Flask
- OpenCV (cv2)
- Ultralytics YOLO
- python-dotenv
- requests

*(Automatically installed via `pip install -r requirements.txt`)*

---

## Network Requirements

### For Local Testing (localhost)
- No special configuration needed
- All services run on same machine

### For LAN Multi-Device Testing
- **WiFi Network:** All devices on same network
- **Firewall:** Allow incoming connections on ports 3001, 5000, 5173
- **Router:** No port forwarding needed (LAN only)

### For Internet Deployment (Future - Phase 6)
- Cloud hosting account (AWS, DigitalOcean, Heroku, etc.)
- Domain name (optional)
- SSL certificate for HTTPS

---

## Port Requirements

| Service | Port | Protocol | Access |
|---------|------|----------|--------|
| Backend API | 3001 | HTTP | LAN |
| Frontend Dev Server | 5173 | HTTP | LAN |
| Flask Detection | 5000 | HTTP | LAN (Pi only) |
| PostgreSQL | 5432 | TCP | Localhost |

**Firewall Rules (Mac):**
```bash
# Allow Node.js
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --add /usr/local/bin/node

# Allow Python (for Flask)
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --add /usr/local/bin/python3
```

**Firewall Rules (Windows):**
- Open Windows Defender Firewall
- Allow Node.js through firewall
- Allow Python through firewall

---

## Storage Requirements

### Development
- **Node modules:** ~500MB (backend + frontend)
- **Python packages:** ~1.5GB (includes YOLO model)
- **Database:** ~50MB (test data)
- **Logs:** ~10MB (grows over time)
- **Total:** ~2GB

### Production
- Add ~500MB for build artifacts
- Database grows with user data

---

## Browser Requirements

### Desktop
- **Supported:**
  - Chrome 100+
  - Firefox 100+
  - Safari 15+
  - Edge 100+

### Mobile
- **iOS:** Safari 15+ (iOS 15+)
- **Android:** Chrome 100+

**Note:** Safari on iOS is recommended for LAN testing (best compatibility)

---

## Optional Requirements

### Code Editor
- **Recommended:** VS Code, Cursor, or WebStorm
- **Extensions:**
  - ESLint
  - Prettier
  - TypeScript

### Database GUI (Optional)
- **Postico** (Mac)
- **pgAdmin** (Cross-platform)
- **TablePlus** (Cross-platform)

### API Testing (Optional)
- **Postman**
- **Thunder Client** (VS Code extension)
- **curl** (command line)

---

## Performance Recommendations

### For Best Performance

**Backend:**
- SSD storage for database
- Node.js with `--max-old-space-size=4096` for large datasets

**Frontend:**
- Modern browser with hardware acceleration
- Disable browser extensions during development

**Flask (Raspberry Pi):**
- Use Pi 4 with 4GB+ RAM
- Overclock if needed (for faster YOLO inference)
- Use lightweight Raspberry Pi OS (64-bit)

---

## Operating System Support

### Fully Supported
- **macOS:** 11 (Big Sur) or higher
- **Windows:** 10/11
- **Linux:** Ubuntu 20.04+, Debian 11+, Fedora 35+

### Raspberry Pi
- **OS:** Raspberry Pi OS (64-bit) recommended
- **Alternatives:** Ubuntu Server 22.04 for Pi

---

## Internet Connection

### Development
- Required for initial setup (npm install, pip install)
- Required for YOLO model download (~20MB, one-time)
- Not required for local testing after setup

### Production
- Required for cloud deployment
- Required for remote access

---

## Security Requirements

### Development
- JWT_SECRET can be default (`dev-secret-key-change-in-production`)
- PostgreSQL can use trust authentication (localhost only)

### Production
- **Strong JWT_SECRET** (32+ character random string)
- **PostgreSQL:** Password authentication required
- **HTTPS:** SSL certificate mandatory
- **Environment Variables:** Never commit `.env` files

---

## Minimum vs. Recommended

### Minimum Setup (Works but Slow)
- 2-core CPU, 4GB RAM
- Node.js 18, PostgreSQL 14, Python 3.9
- Testing on single device (localhost)

### Recommended Setup (Smooth Experience)
- 4+ core CPU, 16GB RAM
- Node.js 20+, PostgreSQL 15+, Python 3.11+
- Testing on Mac + iPhone + Raspberry Pi (LAN)

### Ideal Setup (Production-Ready)
- 8+ core CPU, 32GB RAM
- Cloud hosting (AWS/DigitalOcean)
- CDN for frontend assets
- Dedicated database server

---

## Quick Compatibility Check

Run these commands to verify your system:

```bash
# Node.js
node --version  # Should be v18+

# NPM
npm --version   # Should be 9+

# PostgreSQL
psql --version  # Should be 14+

# Python
python3 --version  # Should be 3.9+

# Pip
pip3 --version

# Git
git --version
```

**All checks pass?** ✅ You're ready to proceed with [SETUP.md](./SETUP.md)

**Missing dependencies?** See installation links above.

---

**Last Updated:** November 6, 2025
**For Installation Guide:** See [SETUP.md](./SETUP.md)
**For LAN Testing:** See [docs/LAN_TESTING_GUIDE.md](./docs/LAN_TESTING_GUIDE.md)
