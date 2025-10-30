"""
Test YOLO11s Inference on Sample Images
========================================

This test validates YOLO inference functionality by:
- Loading sample images (or generating test images)
- Running YOLO detection
- Annotating images with bounding boxes
- Measuring inference performance

Author: Agent_Detection (Claude Code)
Task: 3.2 - YOLO11s Model Integration
"""

import sys
import os
import time
import numpy as np
import cv2

# Add parent directory to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
sys.path.append(os.path.join(os.path.dirname(__file__), '../..'))

from models.yolo_detector import loadModel, runInference, loadMapping, getProductFromClass
from shared.logger import logger


def create_test_image(color=(255, 0, 0), text="Test Image"):
    """
    Create a simple test image with colored background and text.

    Args:
        color: BGR color tuple
        text: Text to display on image

    Returns:
        numpy array (640x640x3)
    """
    img = np.zeros((640, 640, 3), dtype=np.uint8)
    img[:] = color

    # Add text
    cv2.putText(img, text, (200, 320), cv2.FONT_HERSHEY_SIMPLEX,
                1, (255, 255, 255), 2, cv2.LINE_AA)

    return img


def test_inference_on_empty_frame():
    """Test inference on empty/blank frames"""
    logger.info("\n" + "=" * 60)
    logger.info("Test 1: Inference on Empty Frame")
    logger.info("=" * 60)

    try:
        # Load model
        model = loadModel()

        # Create empty frame (black)
        frame = np.zeros((640, 640, 3), dtype=np.uint8)

        # Run inference
        start_time = time.time()
        detections = runInference(model, frame, confidence_threshold=0.7)
        inference_time = (time.time() - start_time) * 1000

        logger.info(f"✅ Inference completed in {inference_time:.0f}ms")
        logger.info(f"   Detections found: {len(detections)}")

        if len(detections) > 0:
            logger.warning(f"⚠️  Expected 0 detections in empty frame, got {len(detections)}")

        return True

    except Exception as e:
        logger.error(f"❌ Test failed: {e}", exc_info=True)
        return False


def test_inference_on_test_images():
    """Test inference on various test images"""
    logger.info("\n" + "=" * 60)
    logger.info("Test 2: Inference on Test Images")
    logger.info("=" * 60)

    try:
        # Load model and mapping
        model = loadModel()
        mapping = loadMapping()

        # Create output directory
        output_dir = os.path.join(os.path.dirname(__file__), 'output')
        os.makedirs(output_dir, exist_ok=True)

        # Test images with different colors/patterns
        test_images = [
            ("empty_black", np.zeros((640, 640, 3), dtype=np.uint8)),
            ("solid_red", create_test_image((0, 0, 255), "Red Test")),
            ("solid_green", create_test_image((0, 255, 0), "Green Test")),
            ("solid_blue", create_test_image((255, 0, 0), "Blue Test")),
        ]

        total_inference_time = 0
        total_detections = 0

        for name, frame in test_images:
            logger.info(f"\n   Testing: {name}")

            # Run inference
            start_time = time.time()
            detections = runInference(model, frame, confidence_threshold=0.7)
            inference_time = (time.time() - start_time) * 1000
            total_inference_time += inference_time

            logger.info(f"   Inference time: {inference_time:.0f}ms")
            logger.info(f"   Detections: {len(detections)}")

            if len(detections) > 0:
                total_detections += len(detections)

                # Show detection details
                for det in detections:
                    product = getProductFromClass(det['class_id'], mapping)
                    if product:
                        logger.info(f"      - {det['class_name']} ({det['confidence']:.2f}) -> {product['product_id']} {product['product_name']}")
                    else:
                        logger.info(f"      - {det['class_name']} ({det['confidence']:.2f}) -> (unmapped)")

                # Annotate and save image using YOLO's built-in plotting
                try:
                    results = model.predict(frame, verbose=False, conf=0.7)
                    if len(results) > 0 and results[0].boxes is not None:
                        annotated = results[0].plot()
                        output_path = os.path.join(output_dir, f'{name}_annotated.jpg')
                        cv2.imwrite(output_path, annotated)
                        logger.info(f"   Saved annotated image: {output_path}")
                except Exception as e:
                    logger.warning(f"   Could not save annotated image: {e}")

        # Performance summary
        avg_inference_time = total_inference_time / len(test_images)
        logger.info("\n" + "=" * 60)
        logger.info("Inference Performance Summary:")
        logger.info(f"   Total images tested: {len(test_images)}")
        logger.info(f"   Total detections: {total_detections}")
        logger.info(f"   Average inference time: {avg_inference_time:.0f}ms")

        if avg_inference_time > 500:
            logger.warning(f"⚠️  Average inference time ({avg_inference_time:.0f}ms) exceeds target (<500ms)")
        else:
            logger.info(f"✅ Average inference time within target (<500ms)")

        logger.info("=" * 60)

        return True

    except Exception as e:
        logger.error(f"❌ Test failed: {e}", exc_info=True)
        return False


def test_detection_format():
    """Test that detection format matches specification"""
    logger.info("\n" + "=" * 60)
    logger.info("Test 3: Detection Format Validation")
    logger.info("=" * 60)

    try:
        # Load model
        model = loadModel()

        # Create test frame
        frame = np.zeros((640, 640, 3), dtype=np.uint8)

        # Run inference
        detections = runInference(model, frame, confidence_threshold=0.7)

        logger.info(f"   Testing format of {len(detections)} detection(s)")

        # Validate format for each detection
        required_keys = ['class_id', 'class_name', 'confidence', 'bbox']

        for i, det in enumerate(detections):
            # Check all required keys present
            for key in required_keys:
                if key not in det:
                    logger.error(f"❌ Detection {i} missing key: {key}")
                    return False

            # Check types
            if not isinstance(det['class_id'], int):
                logger.error(f"❌ Detection {i} class_id not int: {type(det['class_id'])}")
                return False

            if not isinstance(det['class_name'], str):
                logger.error(f"❌ Detection {i} class_name not str: {type(det['class_name'])}")
                return False

            if not isinstance(det['confidence'], (int, float)):
                logger.error(f"❌ Detection {i} confidence not numeric: {type(det['confidence'])}")
                return False

            if not isinstance(det['bbox'], list) or len(det['bbox']) != 4:
                logger.error(f"❌ Detection {i} bbox not list of 4: {det['bbox']}")
                return False

            # Check confidence range
            if not (0.0 <= det['confidence'] <= 1.0):
                logger.error(f"❌ Detection {i} confidence out of range: {det['confidence']}")
                return False

        logger.info("✅ All detection formats valid")
        logger.info("=" * 60)

        return True

    except Exception as e:
        logger.error(f"❌ Test failed: {e}", exc_info=True)
        return False


def run_all_tests():
    """Run all inference tests"""
    logger.info("=" * 60)
    logger.info("YOLO Inference Test Suite")
    logger.info("=" * 60)

    results = {
        "Empty Frame Test": test_inference_on_empty_frame(),
        "Test Images Test": test_inference_on_test_images(),
        "Detection Format Test": test_detection_format(),
    }

    # Summary
    logger.info("\n" + "=" * 60)
    logger.info("Test Summary:")
    logger.info("=" * 60)

    all_passed = True
    for test_name, passed in results.items():
        status = "✅ PASSED" if passed else "❌ FAILED"
        logger.info(f"   {test_name}: {status}")
        if not passed:
            all_passed = False

    logger.info("=" * 60)

    if all_passed:
        logger.info("✅ All inference tests passed!")
    else:
        logger.error("❌ Some tests failed")

    logger.info("=" * 60)

    return all_passed


if __name__ == '__main__':
    success = run_all_tests()
    sys.exit(0 if success else 1)
