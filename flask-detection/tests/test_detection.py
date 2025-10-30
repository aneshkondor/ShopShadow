"""
Tests for detection logic (Task 3.4)
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
sys.path.append(os.path.join(os.path.dirname(__file__), '../..'))

from detection.detector import processFrame, countItems, routeDetections
from models.yolo_detector import loadModel, loadMapping
from shared.logger import logger
import numpy as np


def test_process_frame():
    """Test detection pipeline."""
    logger.info("=" * 60)
    logger.info("Test 1: Process Frame")
    logger.info("=" * 60)

    # Load model and create test frame
    model = loadModel()
    frame = np.zeros((640, 640, 3), dtype=np.uint8)  # Blank frame

    # Run detection
    high_conf, low_conf = processFrame(frame, model, threshold=0.7)

    # Verify return types
    assert isinstance(high_conf, list), "high_conf should be a list"
    assert isinstance(low_conf, list), "low_conf should be a list"

    logger.info(f"✅ processFrame works: {len(high_conf)} high, {len(low_conf)} low")
    return True


def test_count_items():
    """Test quantity counting."""
    logger.info("=" * 60)
    logger.info("Test 2: Count Items")
    logger.info("=" * 60)

    # Mock detections (3 apples, 2 bananas)
    detections = [
        {'class_id': 47, 'confidence': 0.9},
        {'class_id': 47, 'confidence': 0.85},
        {'class_id': 47, 'confidence': 0.8},
        {'class_id': 46, 'confidence': 0.75},
        {'class_id': 46, 'confidence': 0.7},
    ]

    counts = countItems(detections)

    # Verify counts
    assert counts[47] == 3, f"Expected 3 apples, got {counts.get(47)}"
    assert counts[46] == 2, f"Expected 2 bananas, got {counts.get(46)}"

    logger.info(f"✅ countItems works: {counts}")
    return True


def test_route_detections():
    """Test routing logic."""
    logger.info("=" * 60)
    logger.info("Test 3: Route Detections")
    logger.info("=" * 60)

    # Load mapping
    mapping = loadMapping('config/coco_to_products.json')

    # Mock detections
    high_conf = [
        {'class_id': 47, 'confidence': 0.9},
        {'class_id': 47, 'confidence': 0.85},
    ]
    low_conf = [
        {'class_id': 46, 'confidence': 0.65},
    ]

    # Route
    basket, pending = routeDetections(high_conf, low_conf, mapping, 'test-device')

    # Verify basket payload
    assert len(basket) == 1, f"Expected 1 basket item, got {len(basket)}"
    assert basket[0]['product_id'] == 'P001', "Should map to P001 (apple)"
    assert basket[0]['quantity'] == 2, "Should have 2 apples"
    assert basket[0]['confidence'] == 0.9, "Should use max confidence"

    # Verify pending payload
    assert len(pending) == 1, f"Expected 1 pending item, got {len(pending)}"
    assert pending[0]['product_id'] == 'P002', "Should map to P002 (banana)"
    assert 'name' in pending[0], "Pending payload must have 'name' field"

    logger.info(f"✅ routeDetections works")
    logger.info(f"   Basket: {basket}")
    logger.info(f"   Pending: {pending}")
    return True


def test_edge_cases():
    """Test edge cases."""
    logger.info("=" * 60)
    logger.info("Test 4: Edge Cases")
    logger.info("=" * 60)

    # Test empty detections
    counts = countItems([])
    assert counts == {}, "Empty detections should return empty dict"

    # Test unmapped class
    mapping = loadMapping('config/coco_to_products.json')
    high_conf = [{'class_id': 999, 'confidence': 0.9}]  # Invalid class
    basket, pending = routeDetections(high_conf, [], mapping, 'test-device')
    assert len(basket) == 0, "Unmapped class should be skipped"

    logger.info("✅ Edge cases handled correctly")
    return True


if __name__ == '__main__':
    try:
        test_process_frame()
        test_count_items()
        test_route_detections()
        test_edge_cases()

        logger.info("=" * 60)
        logger.info("✅ ALL TASK 3.4 TESTS PASSED")
        logger.info("=" * 60)
    except Exception as e:
        logger.error(f"❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)