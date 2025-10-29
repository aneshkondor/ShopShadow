import atexit
import os
import signal
import sys
import time

import cv2

# Add parent directory to path for shared modules
sys.path.append(os.path.join(os.path.dirname(__file__), '../..'))
from shared.logger import logger  # noqa: E402

# Global camera instance for cleanup
_camera_instance = None


def initCamera(camera_index=0):
    """
    Initialize camera using OpenCV VideoCapture.

    Args:
        camera_index (int): Camera device index (0=built-in, 1+=USB)

    Returns:
        cv2.VideoCapture: Camera object if successful, None otherwise
    """
    global _camera_instance

    try:
        logger.info(f"Initializing camera with index {camera_index}")

        # Create VideoCapture object
        camera = cv2.VideoCapture(camera_index)

        # Set camera properties for optimal performance
        camera.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
        camera.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
        camera.set(cv2.CAP_PROP_FPS, 30)

        # Verify camera opened successfully
        if not camera.isOpened():
            logger.error(f"Failed to open camera {camera_index}")

            # Try fallback camera indexes
            logger.info("Attempting fallback camera detection...")
            for fallback_index in [0, 1, 2]:
                if fallback_index == camera_index:
                    continue

                logger.info(f"Trying camera index {fallback_index}")
                fallback_camera = cv2.VideoCapture(fallback_index)

                if fallback_camera.isOpened():
                    logger.info(f"Successfully opened camera {fallback_index}")
                    camera = fallback_camera
                    camera_index = fallback_index
                    break

                fallback_camera.release()

            if not camera.isOpened():
                logger.error("No cameras found. Please check camera connection.")
                return None

        # Store global instance for cleanup
        _camera_instance = camera

        logger.info(f"Camera {camera_index} initialized successfully")
        return camera

    except cv2.error as e:
        logger.error(f"OpenCV error initializing camera: {str(e)}")
        logger.error(f"Camera device {camera_index} not found. Check CAMERA_INDEX in .env")
        return None

    except PermissionError as e:
        logger.error(f"Camera permission denied: {str(e)}")
        logger.error("On macOS: System Preferences → Security & Privacy → Camera → allow Terminal/IDE")
        logger.error("On Linux: Add user to video group with 'sudo usermod -a -G video $USER'")
        return None

    except Exception as e:  # pragma: no cover - guard unexpected issues
        logger.error(f"Unexpected error initializing camera: {str(e)}", exc_info=True)
        return None


def captureFrame(camera, max_retries=3):
    """
    Capture a single frame from the camera with retry logic.

    Args:
        camera (cv2.VideoCapture): Camera object from initCamera()
        max_retries (int): Maximum number of retry attempts

    Returns:
        numpy.ndarray: Frame in RGB format (ready for YOLO), or None if failed
    """
    if camera is None:
        logger.error("Cannot capture frame: camera is None")
        return None

    for attempt in range(max_retries):
        ret, frame = camera.read()

        if not ret or frame is None:
            logger.warning(f"Frame capture failed (attempt {attempt + 1}/{max_retries})")

            if attempt < max_retries - 1:
                time.sleep(0.1)  # Wait 100ms before retry
                continue

            logger.error("Failed to capture frame after all retries")
            return None

        # Validate frame is not empty
        if frame.shape[0] == 0 or frame.shape[1] == 0:
            logger.error(f"Invalid frame dimensions: {frame.shape}")
            return None

        # Convert BGR (OpenCV) to RGB (YOLO expects RGB)
        frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

        return frame_rgb

    return None


def releaseCamera(camera=None):
    """
    Release camera resources and cleanup.

    Args:
        camera (cv2.VideoCapture): Camera object to release, or None to use global
    """
    global _camera_instance

    if camera is None:
        camera = _camera_instance

    if camera is not None:
        try:
            camera.release()
            cv2.destroyAllWindows()
            logger.info("Camera released successfully")
        except Exception as e:  # pragma: no cover - cleanup best effort
            logger.error(f"Error releasing camera: {str(e)}")

    _camera_instance = None


def _cleanup_handler(signum=None, frame=None):
    """Handle cleanup on shutdown signals."""
    logger.info("Cleanup handler called, releasing camera...")
    releaseCamera()
    if signum is not None:
        sys.exit(0)


# Register for automatic cleanup
atexit.register(releaseCamera)
for sig in (signal.SIGINT, signal.SIGTERM):
    try:
        signal.signal(sig, _cleanup_handler)
    except (ValueError, RuntimeError):
        # Signal registration can fail in some embedded interpreters
        logger.warning(f"Unable to register cleanup handler for signal {sig}")
