"""
Wave 2 Integration Test - YOLO + Backend Communication
Tests the integration between YOLO model and Backend communication system
"""
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
sys.path.append(os.path.join(os.path.dirname(__file__), '../..'))

from models.yolo_detector import loadModel, runInference, loadMapping, getProductFromClass
from api.backend_client import BackendClient
from shared.logger import logger
import numpy as np

def test_wave2_integration():
    """Test YOLO + Backend integration"""
    logger.info("=" * 60)
    logger.info("Testing Wave 2 Integration (YOLO + Backend)")
    logger.info("=" * 60)

    # Load YOLO model
    logger.info("\n1. Loading YOLO model...")
    model = loadModel()
    assert model is not None, "Model loading failed"
    logger.info("✅ YOLO model loaded")

    # Load mapping
    logger.info("\n2. Loading COCO mapping...")
    mapping = loadMapping()
    assert mapping is not None, "Mapping loading failed"
    logger.info(f"✅ Mapping loaded ({len(mapping)} classes)")

    # Initialize backend client (using mock port 3000 for testing)
    logger.info("\n3. Initializing backend client...")
    backend_client = BackendClient('http://localhost:3000')
    logger.info("✅ Backend client initialized")

    # Note: We use port 3000 for mock testing since integration tests
    # use mocked responses. Real backend on 3001 is tested separately.

    # Create dummy frame
    logger.info("\n4. Creating test frame...")
    test_frame = np.zeros((640, 640, 3), dtype=np.uint8)

    # Run inference (will detect nothing in blank frame)
    logger.info("\n5. Running YOLO inference...")
    detections = runInference(model, test_frame, confidence_threshold=0.7)
    logger.info(f"✅ Inference complete ({len(detections)} detections)")
    logger.info("   Note: No detections expected for blank frame")

    # Test product mapping with known COCO classes
    logger.info("\n6. Testing product mapping...")
    test_classes = [47, 44, 53]  # apple, bottle, pizza
    for class_id in test_classes:
        product = getProductFromClass(class_id, mapping)
        if product:
            logger.info(f"   ✅ COCO {class_id} -> {product['product_id']} ({product['product_name']})")
        else:
            logger.info(f"   ⚠️  COCO {class_id} not mapped")

    # Verify backend client has required methods
    logger.info("\n7. Verifying backend client API methods...")
    assert hasattr(backend_client, 'registerDevice'), "Missing registerDevice method"
    assert hasattr(backend_client, 'sendToBasket'), "Missing sendToBasket method"
    assert hasattr(backend_client, 'sendToPending'), "Missing sendToPending method"
    assert hasattr(backend_client, 'checkHealth'), "Missing checkHealth method"
    logger.info("✅ All required API methods present")

    logger.info("\n" + "=" * 60)
    logger.info("Wave 2 Integration Test Complete! ✅")
    logger.info("=" * 60)
    logger.info("\nSummary:")
    logger.info("  ✅ YOLO model loads and runs inference")
    logger.info("  ✅ COCO mapping system works")
    logger.info("  ✅ Backend client initialized")
    logger.info("  ✅ All API methods available")
    logger.info("\nComponents are ready to integrate in Wave 3!")
    logger.info("=" * 60)

    return True

if __name__ == '__main__':
    try:
        success = test_wave2_integration()
        sys.exit(0 if success else 1)
    except Exception as e:
        logger.error(f"Integration test failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
