# ShopShadow Flask Detection Service

**Purpose:** Flask-based computer vision service using YOLO11s for real-time item detection in shopping baskets.

## Key Components

- USB camera capture using OpenCV
- YOLO11s object detection inference (Ultralytics library)
- COCO dataset class mapping to ShopShadow product IDs
- Backend API communication for basket updates
- Confidence-based routing (≥70% auto-add, <70% approval queue)

## Directory Structure (Planned)

```
flask-detection/
├── app.py                  # Flask application entry point
├── main.py                 # Detection loop orchestration
├── models/
│   └── yolo_detector.py    # YOLO model loading and inference
├── camera/
│   └── capture.py          # OpenCV camera capture
├── detection/
│   └── detector.py         # Detection pipeline and routing logic
├── api/
│   └── backend_client.py   # HTTP client for Node.js backend
├── config/
│   └── coco_to_products.json  # COCO class → Product ID mapping
├── requirements.txt
└── .env.example
```

## Technology Stack

- **Framework:** Flask (Python web framework)
- **Computer Vision:** OpenCV, Ultralytics YOLO11s
- **Model:** YOLO11s pretrained on COCO dataset (80 classes)
- **Camera:** USB webcam (MacBook built-in for MVP, USB camera for Pi)
- **Logging:** Shared Python logger (../shared/logger.py)

## Detection Workflow

1. **Capture Frame:** OpenCV reads from camera every 5 seconds
2. **Run Inference:** YOLO11s detects objects with bounding boxes and confidence scores
3. **Count Items:** Group detections by class (e.g., 3 apples → quantity=3)
4. **Route by Confidence:**
   - High (≥70%): POST to `/api/basket/items` (auto-add to basket)
   - Low (<70%): POST to `/api/basket/pending-items` (user approval required)
5. **Map to Products:** COCO class IDs → ShopShadow product IDs using mapping file
6. **Repeat:** Continuous 5-second detection loop

## Environment Configuration

- `CAMERA_INDEX`: Webcam device index (0=built-in, 1+=USB)
- `YOLO_MODEL_PATH`: Path to YOLO11s weights file
- `CONFIDENCE_THRESHOLD`: Detection confidence threshold (default 0.7)
- `BACKEND_API_URL`: Node.js backend URL for API calls
- `DETECTION_INTERVAL`: Seconds between detection cycles (default 5)
