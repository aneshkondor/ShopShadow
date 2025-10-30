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
from api.backend_client import BackendClient
from models.yolo_detector import loadModel, loadMapping
from shared.logger import logger


# Global camera reference for shutdown handler
camera = None


def shutdown_handler(signum, frame):
    """Handle graceful shutdown on SIGINT/SIGTERM."""
    logger.info("=" * 60)
    logger.info("Shutdown signal received, cleaning up...")
    logger.info("=" * 60)

    if camera is not None:
        releaseCamera(camera)
        logger.info("Camera released")

    # Flush logs
    for handler in logger.handlers:
        handler.flush()

    logger.info("Detection service stopped")
    sys.exit(0)


def main():
    """Main detection loop."""
    global camera

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

        logger.info("=" * 60)
        logger.info("Configuration:")
        logger.info(f"  Confidence Threshold: {confidence_threshold}")
        logger.info(f"  Detection Interval: {detection_interval}s")
        logger.info(f"  Device ID: {device_id}")
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
                    product_id=payload['product_id'],
                    quantity=payload['quantity'],
                    confidence=payload['confidence']
                )
                if success:
                    logger.info(f"✅ Added to basket: {payload['product_id']} x{payload['quantity']}")
                else:
                    logger.error(f"❌ Failed to add to basket: {payload['product_id']}")

            # Low confidence → pending
            for payload in pending_payloads:
                success = backend.sendToPending(
                    product_id=payload['product_id'],
                    name=payload['name'],
                    quantity=payload['quantity'],
                    confidence=payload['confidence']
                )
                if success:
                    logger.info(f"⏳ Added to pending: {payload['name']} x{payload['quantity']}")
                else:
                    logger.warning(f"⚠️  Failed to add to pending: {payload['name']}")

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


if __name__ == '__main__':
    # Register signal handlers for graceful shutdown
    signal.signal(signal.SIGINT, shutdown_handler)
    signal.signal(signal.SIGTERM, shutdown_handler)

    # Run main loop
    main()
