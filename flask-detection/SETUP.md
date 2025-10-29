# Flask Detection Service - Setup Guide

## Overview

This is the Flask-based detection service for ShopShadow. It uses YOLO11s for real-time product detection, OpenCV for camera capture, and communicates with the Node.js backend API.

## System Requirements

- **Python:** 3.11+ (tested with Python 3.13.5)
- **Operating System:** macOS (Apple Silicon), Linux, or Raspberry Pi OS
- **Hardware:** USB camera or built-in webcam
- **Memory:** 2GB+ RAM recommended (YOLO model requires ~500MB)

## Installation

### 1. Virtual Environment Setup

Create and activate a Python virtual environment:

```bash
cd flask-detection
python3 -m venv venv
source venv/bin/activate
```

**Note:** On Windows, use `venv\Scripts\activate` instead.

### 2. Install Dependencies

Upgrade pip and install all required packages:

```bash
pip install --upgrade pip
pip install -r requirements.txt
```

This will install:
- **Flask 3.1.0** - Web framework
- **flask-cors 5.0.0** - CORS support for backend communication
- **opencv-python 4.10.0.84** - Camera capture
- **ultralytics 8.3.50** - YOLO11s model and inference
- **torch 2.6.0** - PyTorch deep learning framework
- **torchvision 0.21.0** - Vision utilities
- **requests 2.32.3** - HTTP client for backend API
- **python-dotenv 1.0.1** - Environment variable management
- **colorlog 6.9.0** - Colored logging (shared logger dependency)
- **numpy 1.26.x** - Array operations

**Installation time:** 2-5 minutes depending on internet speed and system.

### 3. Environment Configuration

Copy the example environment file and configure for your setup:

```bash
cp .env.example .env
```

Edit `.env` with your settings:

```bash
# Flask Server Configuration
FLASK_HOST=0.0.0.0          # Listen on all interfaces
FLASK_PORT=5000             # Flask server port
DEBUG=False                 # Set True for development

# Camera Configuration
CAMERA_INDEX=0              # 0=built-in, 1+=USB cameras

# Detection Configuration
CONFIDENCE_THRESHOLD=0.7    # 0.0-1.0 (0.7 = 70% confidence)
DETECTION_INTERVAL=5        # Seconds between detection cycles

# Backend API Configuration
BACKEND_API_URL=http://localhost:3000

# YOLO Model Configuration
YOLO_MODEL_PATH=./models/yolo11s.pt  # Auto-downloads on first run

# Logging Configuration
LOG_FILE_PATH=./logs/shopshadow.log
```

**Camera Index Guide:**
- **0** - Built-in MacBook camera or primary camera
- **1** - First USB camera
- **2+** - Additional USB cameras

The camera module has automatic fallback detection and will try indexes 0, 1, 2 if your specified camera fails.

### 4. Camera Permissions

#### macOS

Grant camera permissions to your terminal or IDE:

1. System Preferences → Security & Privacy → Camera
2. Enable access for Terminal, iTerm2, or your IDE (VS Code, PyCharm, etc.)
3. Restart your terminal/IDE after granting permissions

#### Linux

Add your user to the `video` group:

```bash
sudo usermod -a -G video $USER
```

Log out and back in for changes to take effect.

## Testing

### Test 1: Logger Integration

Verify the shared logger works correctly:

```bash
source venv/bin/activate
python3 -c "
import sys
import os
sys.path.append('..')
from shared.logger import logger
logger.info('Test message from Flask detection')
logger.warning('Test warning')
logger.error('Test error')
print('Logger test complete')
"
```

**Expected output:**
- Colored console messages with timestamps
- Log file created in `logs/` directory

### Test 2: Camera Module

Test camera initialization and frame capture:

```bash
source venv/bin/activate
python3 tests/test_camera.py
```

**Expected output:**
```
Camera initialized successfully
Frame captured successfully
Frame shape: (480, 640, 3)
Test frame saved to: tests/test_frame.jpg
Captured 5/5 frames successfully
Camera test complete!
```

**If camera test fails:**
- Check camera permissions (see Camera Permissions section)
- Verify camera is not in use by another application
- Try different CAMERA_INDEX values (0, 1, 2)
- Check `tests/test_frame.jpg` was created

### Test 3: Flask App Health Check

Start the Flask server:

```bash
source venv/bin/activate
python3 app.py
```

**Expected console output:**
```
Starting Flask detection service on 0.0.0.0:5000
 * Running on http://0.0.0.0:5000
```

In another terminal, test the health endpoint:

```bash
curl http://localhost:5000/health
```

**Expected response:**
```json
{"status":"ok"}
```

Press `Ctrl+C` to stop the Flask server.

## Running the Detection Service

### Development Mode

```bash
source venv/bin/activate
DEBUG=True python3 app.py
```

### Production Mode

```bash
source venv/bin/activate
python3 app.py
```

**Graceful Shutdown:**
- Press `Ctrl+C` to stop the server
- Camera resources will be automatically cleaned up via signal handlers

## Project Structure

```
flask-detection/
├── app.py                 # Main Flask application
├── requirements.txt       # Python dependencies
├── .env                   # Environment configuration (git-ignored)
├── .env.example           # Environment template
├── SETUP.md              # This file
├── venv/                 # Virtual environment (git-ignored)
├── camera/
│   ├── __init__.py
│   └── capture.py        # Camera capture module with OpenCV
├── tests/
│   ├── __init__.py
│   ├── test_camera.py    # Camera test script
│   └── test_frame.jpg    # Sample captured frame (generated)
├── models/
│   └── yolo11s.pt        # YOLO model (auto-downloaded)
└── logs/
    └── shopshadow.log    # Application logs
```

## Troubleshooting

### Port Already in Use

If port 5000 is already bound:

```bash
FLASK_PORT=5001 python3 app.py
```

Or update `FLASK_PORT` in `.env` file.

### Camera Not Found

```
ERROR: No cameras found. Please check camera connection.
```

**Solutions:**
1. Check camera is physically connected
2. Verify camera permissions (see Camera Permissions section)
3. Close other applications using the camera (Zoom, Skype, etc.)
4. Try fallback camera indexes: `CAMERA_INDEX=1` or `CAMERA_INDEX=2`

### Import Errors

```
ModuleNotFoundError: No module named 'shared'
```

**Solution:** Make sure you're in the `flask-detection` directory and the parent directory contains the `shared/` module:

```bash
ls ../shared/logger.py  # Should exist
```

### Python Version Incompatibility

If you see errors about `torch==2.1.0` not found, you may be using Python 3.13+ which requires newer package versions. The `requirements.txt` has been updated to support Python 3.13.

To check your Python version:

```bash
python3 --version
```

### YOLO Model Download Fails

The YOLO model (~50MB) auto-downloads on first run. If download fails:

1. Check internet connection
2. Manually download from: https://github.com/ultralytics/assets/releases/download/v8.3.0/yolo11s.pt
3. Place in `flask-detection/models/yolo11s.pt`

## Next Steps

After successful setup:

1. **Integration Testing:** Ensure the Node.js backend is running (`npm start` in `backend/`)
2. **YOLO Model Setup:** Task 3.2 will integrate YOLO inference
3. **Detection Loop:** Task 3.6 will implement continuous detection logic
4. **Backend Communication:** Task 3.5 will handle API client for sending detections

## Support

For issues or questions:
- Check project documentation in `apm/` directory
- Review memory logs in `apm/Memory/Phase_03_Flask_Detection_Service/`
- Consult Task assignments in `TASK_ASSIGNMENTS_PHASE_3.md`
