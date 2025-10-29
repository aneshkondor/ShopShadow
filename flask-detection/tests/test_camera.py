import os
import sys

import cv2

# Ensure local packages are discoverable
current_dir = os.path.dirname(__file__)
sys.path.append(os.path.join(current_dir, '..'))

from camera.capture import captureFrame, initCamera, releaseCamera  # noqa: E402

# Add grandparent for shared modules
sys.path.append(os.path.join(current_dir, '../..'))
from shared.logger import logger  # noqa: E402


def test_camera():
    """Test camera initialization and frame capture."""

    logger.info("=" * 50)
    logger.info("Starting camera test")
    logger.info("=" * 50)

    # Get camera index from environment or default to 0
    camera_index = int(os.getenv('CAMERA_INDEX', 0))

    # Initialize camera
    logger.info(f"Testing camera index: {camera_index}")
    camera = initCamera(camera_index)

    if camera is None:
        logger.error("❌ Camera initialization failed")
        return False

    logger.info("✅ Camera initialized successfully")

    # Capture test frame
    logger.info("Capturing test frame...")
    frame = captureFrame(camera)

    if frame is None:
        logger.error("❌ Frame capture failed")
        releaseCamera(camera)
        return False

    logger.info("✅ Frame captured successfully")
    logger.info(f"   Frame shape: {frame.shape}")
    logger.info(f"   Frame dtype: {frame.dtype}")

    # Save test frame
    output_path = os.path.join(current_dir, 'test_frame.jpg')

    # Convert RGB back to BGR for saving (OpenCV saves in BGR)
    frame_bgr = cv2.cvtColor(frame, cv2.COLOR_RGB2BGR)
    success = cv2.imwrite(output_path, frame_bgr)

    if success:
        logger.info(f"✅ Test frame saved to: {output_path}")
    else:
        logger.error("❌ Failed to save test frame")

    # Capture a few more frames to test stability
    logger.info("Testing frame capture stability (5 frames)...")
    success_count = 0

    for _ in range(5):
        frame = captureFrame(camera)
        if frame is not None:
            success_count += 1

    logger.info(f"   Captured {success_count}/5 frames successfully")

    # Release camera
    releaseCamera(camera)
    logger.info("✅ Camera released")

    logger.info("=" * 50)
    logger.info("Camera test complete!")
    logger.info("=" * 50)

    return success_count >= 4  # Allow 1 failure out of 5


if __name__ == '__main__':
    success = test_camera()
    sys.exit(0 if success else 1)
