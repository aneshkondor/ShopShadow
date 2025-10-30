"""
Test YOLO11s Model Loading
===========================

This test validates that the YOLO11s model can be loaded successfully
with proper device detection and configuration.

Author: Agent_Detection (Claude Code)
Task: 3.2 - YOLO11s Model Integration
"""

import sys
import os

# Add parent directory to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
sys.path.append(os.path.join(os.path.dirname(__file__), '../..'))

from models.yolo_detector import loadModel, loadMapping
from shared.logger import logger


def test_model_loading():
    """Test YOLO model loads successfully"""
    logger.info("=" * 60)
    logger.info("Testing YOLO11s Model Loading")
    logger.info("=" * 60)

    try:
        # Test model loading
        logger.info("\n1. Loading YOLO11s model...")
        model = loadModel()

        if model is None:
            logger.error("❌ Model loading failed - returned None")
            return False

        logger.info("✅ Model loaded successfully")
        logger.info(f"   Model type: {type(model)}")
        logger.info(f"   Model classes: {len(model.names)}")
        logger.info(f"   Sample classes: {list(model.names.values())[:10]}")

        # Test mapping loading
        logger.info("\n2. Loading COCO mapping...")
        mapping = loadMapping()

        if mapping is None:
            logger.error("❌ Mapping loading failed - returned None")
            return False

        logger.info("✅ Mapping loaded successfully")
        logger.info(f"   Mapped classes: {len(mapping)}")
        logger.info(f"   Classes: {list(mapping.keys())}")

        # Display mapping details
        logger.info("\n3. Mapping details:")
        for class_id, product in mapping.items():
            logger.info(f"   COCO {class_id}:{product['coco_name']:15} -> {product['product_id']} {product['product_name']}")

        logger.info("\n" + "=" * 60)
        logger.info("✅ All model loading tests passed!")
        logger.info("=" * 60)

        return True

    except Exception as e:
        logger.error(f"\n❌ Test failed with exception: {e}", exc_info=True)
        return False


if __name__ == '__main__':
    success = test_model_loading()
    sys.exit(0 if success else 1)
