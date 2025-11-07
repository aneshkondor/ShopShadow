"""
Main detection loop orchestration.
Entry point for ShopShadow Flask Detection Service.
"""

import signal
import sys
import time
import os
from dotenv import load_dotenv

# Add parent directory to path for shared modules
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from camera.capture import initCamera, captureFrame, releaseCamera
from detection.detector import processFrame, routeDetections
from detection.visualizer import (
    drawDetections,
    showFrame,
    addInfoOverlay,
    createVisualizationWindow,
    destroyVisualizationWindow
)
from api.backend_client import BackendClient
from models.yolo_detector import loadModel, loadMapping
from shared.logger import logger


# Global camera reference for shutdown handler
camera = None
show_visualization = False
WINDOW_NAME = 'ShopShadow Detection'


def shutdown_handler(signum, frame):
    """Handle graceful shutdown on SIGINT/SIGTERM."""
    global show_visualization

    logger.info("=" * 60)
    logger.info("Shutdown signal received, cleaning up...")
    logger.info("=" * 60)

    if camera is not None:
        releaseCamera(camera)
        logger.info("Camera released")

    # Close visualization window if open
    if show_visualization:
        destroyVisualizationWindow(WINDOW_NAME)
        logger.info("Visualization window closed")

    # Flush logs
    for handler in logger.handlers:
        handler.flush()

    logger.info("Detection service stopped")
    sys.exit(0)


def main():
    """Main detection loop."""
    global camera, show_visualization

    # Load environment variables
    load_dotenv()

    logger.info("=" * 60)
    logger.info("ShopShadow Detection Service Starting")
    logger.info("=" * 60)

    try:
        # ===== 1. COMPONENT INITIALIZATION =====
        logger.info("Initializing components...")

        # Camera
        camera_index = int(os.getenv('CAMERA_INDEX', 0))
        logger.info(f"Initializing camera (index {camera_index})...")
        camera = initCamera(camera_index)
        if camera is None:
            logger.error("Failed to initialize camera")
            sys.exit(1)
        logger.info("✅ Camera initialized")

        # YOLO model
        logger.info("Loading YOLO model...")
        model = loadModel()
        if model is None:
            logger.error("Failed to load YOLO model")
            sys.exit(1)
        logger.info("✅ YOLO model loaded")

        # COCO mapping
        logger.info("Loading COCO-to-product mapping...")
        mapping = loadMapping('config/coco_to_products.json')
        if mapping is None:
            logger.error("Failed to load product mapping")
            sys.exit(1)
        logger.info(f"✅ Product mapping loaded ({len(mapping)} classes)")

        # Backend client
        backend_url = os.getenv('BACKEND_API_URL', 'http://localhost:3001')
        logger.info(f"Initializing backend client ({backend_url})...")
        backend = BackendClient(backend_url)

        # Check backend health
        if not backend.checkHealth():
            logger.error("Backend health check failed")
            logger.error("Make sure backend is running: cd backend && npm start")
            sys.exit(1)
        logger.info("✅ Backend client initialized")

        # ===== 2. DEVICE REGISTRATION =====
        logger.info("Registering device with backend...")
        device_id = backend.registerDevice()
        if device_id is None:
            logger.error("Failed to register device")
            sys.exit(1)
        logger.info(f"✅ Device registered: {device_id}")

        # ===== 3. DETECTION CONFIGURATION =====
        confidence_threshold = float(os.getenv('CONFIDENCE_THRESHOLD', 0.7))
        detection_interval = int(os.getenv('DETECTION_INTERVAL', 5))
        show_visualization = os.getenv('SHOW_VISUALIZATION', 'false').lower() == 'true'

        logger.info("=" * 60)
        logger.info("Configuration:")
        logger.info(f"  Confidence Threshold: {confidence_threshold}")
        logger.info(f"  Detection Interval: {detection_interval}s")
        logger.info(f"  Device ID: {device_id}")
        logger.info(f"  Show Visualization: {show_visualization}")
        logger.info("=" * 60)

        # ===== 3.5. VISUALIZATION WINDOW =====
        if show_visualization:
            logger.info("Creating visualization window...")
            createVisualizationWindow(WINDOW_NAME)
            logger.info("✅ Visualization window created")
            logger.info("   Press 'q' in the window to quit")
            logger.info("=" * 60)

        # ===== 4. MAIN DETECTION LOOP =====
        logger.info("Starting detection loop...")
        logger.info("Press Ctrl+C to stop")
        logger.info("=" * 60)

        iteration = 0

        while True:
            iteration += 1
            loop_start = time.time()

            logger.info(f"--- Iteration {iteration} ---")

            # Capture frame
            frame = captureFrame(camera)
            if frame is None:
                logger.warning("Failed to capture frame, skipping iteration")
                time.sleep(detection_interval)
                continue

            logger.info("Frame captured")

            # Run detection
            high_conf, low_conf = processFrame(frame, model, confidence_threshold)
            logger.info(f"Detections: {len(high_conf)} high confidence, {len(low_conf)} low confidence")

            # Visualize detections if enabled
            if show_visualization:
                # Combine all detections for visualization
                all_detections = high_conf + low_conf

                # Draw detections on frame
                display_frame = drawDetections(frame, all_detections, mapping, show_confidence=True)

                # Add info overlay
                info_lines = [
                    f"Iteration: {iteration}",
                    f"High Conf: {len(high_conf)}",
                    f"Low Conf: {len(low_conf)}",
                    f"Total: {len(all_detections)}",
                    f"Device: {device_id[:8]}...",
                ]
                display_frame = addInfoOverlay(display_frame, info_lines, position='top-left')

                # Show frame
                key = showFrame(WINDOW_NAME, display_frame, wait_key=1)

                # Check for 'q' key to quit
                if key == ord('q'):
                    logger.info("User pressed 'q', shutting down...")
                    shutdown_handler(None, None)

            # Route detections
            basket_payloads, pending_payloads = routeDetections(
                high_conf,
                low_conf,
                mapping,
                device_id
            )

            # Send to backend
            # High confidence → basket
            for payload in basket_payloads:
                success = backend.sendToBasket(
                    product_id=payload['productId'],
                    quantity=payload['quantity'],
                    confidence=payload['confidence']
                )
                if success:
                    logger.info(
                        "✅ Added to basket: %s x%d (device %s)",
                        payload['productId'],
                        payload['quantity'],
                        payload.get('deviceId'),
                    )
                else:
                    logger.error(
                        "❌ Failed to add to basket: %s (device %s)",
                        payload['productId'],
                        payload.get('deviceId'),
                    )

            # Low confidence → pending
            for payload in pending_payloads:
                success = backend.sendToPending(
                    product_id=payload['productId'],
                    name=payload['name'],
                    quantity=payload['quantity'],
                    confidence=payload['confidence']
                )
                if success:
                    logger.info(
                        "⏳ Added to pending: %s x%d (device %s)",
                        payload['name'],
                        payload['quantity'],
                        payload.get('deviceId'),
                    )
                else:
                    logger.warning(
                        "⚠️  Failed to add to pending: %s (device %s)",
                        payload['name'],
                        payload.get('deviceId'),
                    )

            # Log loop timing
            loop_time = time.time() - loop_start
            logger.info(f"Iteration completed in {loop_time:.2f}s")

            if loop_time > detection_interval:
                logger.warning(f"Loop time ({loop_time:.2f}s) exceeded interval ({detection_interval}s)")

            # Wait for next iteration
            time.sleep(detection_interval)

    except KeyboardInterrupt:
        logger.info("Keyboard interrupt received")
        shutdown_handler(signal.SIGINT, None)

    except Exception as e:
        logger.error(f"Fatal error in main loop: {e}")
        import traceback
        traceback.print_exc()
        if camera is not None:
            releaseCamera(camera)
        sys.exit(1)

    finally:
        if camera is not None:
            releaseCamera(camera)

        # Close visualization window
        if show_visualization:
            destroyVisualizationWindow(WINDOW_NAME)


if __name__ == '__main__':
    # Register signal handlers for graceful shutdown
    signal.signal(signal.SIGINT, shutdown_handler)
    signal.signal(signal.SIGTERM, shutdown_handler)

    # Run main loop
    main()
