
## Prompt 2: For Claude (Python YOLO Detection)

You are building a Python application that runs on a Raspberry Pi to detect objects in real-time using a camera feed and the YOLO (You Only Look Once) model. The application should detect items in a basket and send the detected items to a backend web server every 5 seconds.

### Requirements

#### 1. Camera Setup
- Capture video from the Pi camera (use `opencv-python`)
- Resize frames for efficiency (suggest 416x416 or 640x640)
- Handle camera initialization and errors gracefully

#### 2. YOLO Object Detection
- Use YOLOv8 (from Ultralytics) or YOLOv5 for inference
- Load a pre-trained model (suggest `yolov8n.pt` for lightweight performance on Pi)
- Run inference on each frame to detect objects
- Extract detected class names and confidence scores
- Filter detections by confidence threshold (e.g., only items with >0.5 confidence)

#### 3. Frame Processing Loop
- Capture a frame from the camera
- Run YOLO inference on the frame
- Extract detected item names
- Every 5 seconds (not every frame), compile the list of detected items
- Send the items to the backend server

#### 4. API Communication
- POST detected items to `http://your-web-server/api/basket` every 5 seconds
- Request body format: `{items: ["item1", "item2"], timestamp: "2025-10-28T..."}`
- Handle network errors gracefully (log and retry on next cycle)
- Include error handling for connection failures

#### 5. Terminal/Debugging Interface
- Print detected items to the terminal each cycle
- Show timestamps and frame count
- Display confidence scores for debugging
- Show connection status ("Connected to server" / "Connection failed")
- Allow graceful shutdown with Ctrl+C

#### 6. Performance Optimization
- Use lightweight YOLO model (YOLOv8n or YOLOv5s) for Pi performance
- Reduce frame resolution to speed up inference
- Consider using GPU acceleration if available (e.g., Coral TPU)
- Log inference time and FPS for monitoring

#### 7. Robustness
- Handle camera initialization failures
- Gracefully handle network timeouts
- Retry API calls if they fail
- Continue running even if individual API calls fail

### Code Structure
- Separate functions for: camera setup, YOLO inference, API communication, error handling
- Use configuration variables (API URL, frame rate, confidence threshold) at the top for easy adjustment
- Include comments explaining key sections
- Make it easy to toggle between different YOLO models

### Installation Requirements
- `opencv-python`
- `ultralytics` (for YOLOv8)
- `requests` (for HTTP requests)
- Provide a requirements.txt file
