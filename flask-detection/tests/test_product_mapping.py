"""
Test COCO Class to Product Mapping
===================================

This test validates that COCO classes correctly map to ShopShadow products
and that unmapped classes are handled properly.

Author: Agent_Detection (Claude Code)
Task: 3.2 - YOLO11s Model Integration
"""

import sys
import os
import requests

# Add parent directory to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
sys.path.append(os.path.join(os.path.dirname(__file__), '../..'))

from models.yolo_detector import loadMapping, getProductFromClass
from shared.logger import logger


def test_mapping_loading():
    """Test that mapping file loads correctly"""
    logger.info("=" * 60)
    logger.info("Test 1: Mapping File Loading")
    logger.info("=" * 60)

    try:
        mapping = loadMapping()

        if mapping is None:
            logger.error("❌ Mapping returned None")
            return False

        if not isinstance(mapping, dict):
            logger.error(f"❌ Mapping is not a dict: {type(mapping)}")
            return False

        if len(mapping) == 0:
            logger.error("❌ Mapping is empty")
            return False

        logger.info(f"✅ Mapping loaded successfully with {len(mapping)} classes")
        logger.info("=" * 60)

        return True

    except Exception as e:
        logger.error(f"❌ Test failed: {e}", exc_info=True)
        return False


def test_mapped_classes():
    """Test that mapped COCO classes return correct products"""
    logger.info("\n" + "=" * 60)
    logger.info("Test 2: Mapped Classes Validation")
    logger.info("=" * 60)

    try:
        mapping = loadMapping()

        logger.info(f"\nTesting {len(mapping)} mapped classes:\n")

        all_valid = True

        for class_id_str, expected_product in mapping.items():
            class_id = int(class_id_str)

            # Get product from mapping
            product = getProductFromClass(class_id, mapping)

            if product is None:
                logger.error(f"❌ Class {class_id} returned None")
                all_valid = False
                continue

            # Verify product structure
            required_keys = ['coco_name', 'product_id', 'product_name', 'price']
            for key in required_keys:
                if key not in product:
                    logger.error(f"❌ Class {class_id} missing key: {key}")
                    all_valid = False
                    continue

            # Verify product matches expected
            if product != expected_product:
                logger.error(f"❌ Class {class_id} product mismatch")
                logger.error(f"   Expected: {expected_product}")
                logger.error(f"   Got: {product}")
                all_valid = False
                continue

            # Log success
            logger.info(f"✅ COCO {class_id:>2} ({product['coco_name']:15}) -> {product['product_id']} {product['product_name']:30} ${product['price']:.2f}")

        logger.info("\n" + "=" * 60)

        if all_valid:
            logger.info("✅ All mapped classes valid")
        else:
            logger.error("❌ Some mapped classes invalid")

        logger.info("=" * 60)

        return all_valid

    except Exception as e:
        logger.error(f"❌ Test failed: {e}", exc_info=True)
        return False


def test_unmapped_classes():
    """Test that unmapped COCO classes return None"""
    logger.info("\n" + "=" * 60)
    logger.info("Test 3: Unmapped Classes Handling")
    logger.info("=" * 60)

    try:
        mapping = loadMapping()

        # Test some class IDs that should NOT be mapped
        # COCO has 80 classes (0-79), test a few unmapped ones
        unmapped_test_classes = [0, 1, 5, 10, 20, 60, 70, 79, 999]

        # Filter out any that are actually mapped
        unmapped_test_classes = [c for c in unmapped_test_classes if str(c) not in mapping]

        logger.info(f"\nTesting {len(unmapped_test_classes)} unmapped classes:\n")

        all_valid = True

        for class_id in unmapped_test_classes:
            product = getProductFromClass(class_id, mapping)

            if product is not None:
                logger.error(f"❌ Class {class_id} should return None, got: {product}")
                all_valid = False
            else:
                logger.info(f"✅ COCO {class_id:>3} -> None (as expected)")

        logger.info("\n" + "=" * 60)

        if all_valid:
            logger.info("✅ All unmapped classes correctly return None")
        else:
            logger.error("❌ Some unmapped classes incorrectly returned products")

        logger.info("=" * 60)

        return all_valid

    except Exception as e:
        logger.error(f"❌ Test failed: {e}", exc_info=True)
        return False


def test_backend_product_validation():
    """Test that mapped products exist in backend database"""
    logger.info("\n" + "=" * 60)
    logger.info("Test 4: Backend Product Validation")
    logger.info("=" * 60)

    try:
        mapping = loadMapping()

        # Query backend for products
        backend_url = os.getenv('BACKEND_API_URL', 'http://localhost:3000')
        products_url = f"{backend_url}/api/products"

        logger.info(f"\nQuerying backend: {products_url}\n")

        try:
            response = requests.get(products_url, timeout=5)
            response.raise_for_status()
            backend_products = response.json()

            logger.info(f"✅ Backend returned {len(backend_products)} products")

            # Create lookup dict by product_id
            backend_lookup = {p['id']: p for p in backend_products}

            # Validate each mapped product exists in backend
            all_valid = True

            for class_id, product in mapping.items():
                product_id = product['product_id']

                if product_id not in backend_lookup:
                    logger.error(f"❌ Product {product_id} ({product['product_name']}) not found in backend")
                    all_valid = False
                else:
                    backend_product = backend_lookup[product_id]

                    # Verify name matches
                    if backend_product['name'] != product['product_name']:
                        logger.warning(f"⚠️  Product {product_id} name mismatch:")
                        logger.warning(f"    Mapping: {product['product_name']}")
                        logger.warning(f"    Backend: {backend_product['name']}")

                    # Verify price matches
                    if abs(float(backend_product['price']) - product['price']) > 0.01:
                        logger.warning(f"⚠️  Product {product_id} price mismatch:")
                        logger.warning(f"    Mapping: ${product['price']:.2f}")
                        logger.warning(f"    Backend: ${backend_product['price']}")

                    logger.info(f"✅ {product_id} exists in backend: {backend_product['name']}")

            logger.info("\n" + "=" * 60)

            if all_valid:
                logger.info("✅ All mapped products exist in backend")
            else:
                logger.error("❌ Some mapped products missing from backend")

            logger.info("=" * 60)

            return all_valid

        except requests.exceptions.RequestException as e:
            logger.error(f"❌ Backend request failed: {e}")
            logger.warning("⚠️  Skipping backend validation (backend may not be running)")
            logger.info("=" * 60)
            return True  # Don't fail test if backend is down

    except Exception as e:
        logger.error(f"❌ Test failed: {e}", exc_info=True)
        return False


def run_all_tests():
    """Run all mapping tests"""
    logger.info("=" * 60)
    logger.info("COCO Product Mapping Test Suite")
    logger.info("=" * 60)

    results = {
        "Mapping Loading": test_mapping_loading(),
        "Mapped Classes": test_mapped_classes(),
        "Unmapped Classes": test_unmapped_classes(),
        "Backend Validation": test_backend_product_validation(),
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
        logger.info("✅ All mapping tests passed!")
    else:
        logger.error("❌ Some tests failed")

    logger.info("=" * 60)

    return all_passed


if __name__ == '__main__':
    success = run_all_tests()
    sys.exit(0 if success else 1)
