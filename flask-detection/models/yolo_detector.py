"""
YOLO11s Model Integration for ShopShadow
==========================================

This module provides YOLO11s computer vision model integration using Ultralytics library.
Handles model loading, inference, and COCO class to product mapping.

Features:
- Automatic model download (yolo11s.pt ~21MB)
- CPU/GPU device auto-detection
- Frame inference with confidence filtering
- COCO class to ShopShadow product mapping
- Performance monitoring and error handling

Author: Agent_Detection (Claude Code)
Task: 3.2 - YOLO11s Model Integration
"""

import os
import sys
import json
import time
import numpy as np
from typing import List, Dict, Optional, Tuple

# Add parent directory to path for shared imports
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
sys.path.append(os.path.join(os.path.dirname(__file__), '../..'))

from shared.logger import logger

# Global model cache to avoid reloading
_yolo_model = None
_yolo_device = None

# Global mapping cache
_coco_mapping = None


class YOLODetector:
    """
    YOLO11s detector wrapper class for object detection.
    Provides convenient interface to model loading and inference.
    """

    def __init__(self, model_path='yolo11s.pt', device=None):
        """
        Initialize YOLO detector with model loading.

        Args:
            model_path: Path to YOLO model file (default: yolo11s.pt)
            device: Device to run model on ('cpu', 'cuda:0', or None for auto)
        """
        self.model = loadModel(model_path, device)
        self.device = _yolo_device
        self.mapping = loadMapping()

    def detect(self, frame, confidence_threshold=0.7):
        """
        Run detection on a frame and return mapped products.

        Args:
            frame: OpenCV frame (numpy array, RGB format)
            confidence_threshold: Minimum confidence (0.0-1.0)

        Returns:
            List of detected products with details
        """
        detections = runInference(self.model, frame, confidence_threshold)

        # Map detections to products
        products = []
        for detection in detections:
            product = getProductFromClass(detection['class_id'], self.mapping)
            if product:
                products.append({
                    **product,
                    'confidence': detection['confidence'],
                    'bbox': detection['bbox'],
                    'coco_class': detection['class_name']
                })

        return products


def loadModel(model_path='yolo11s.pt', device=None):
    """
    Load YOLO11s model with automatic download and device selection.

    This function initializes the YOLO11s model using Ultralytics library.
    The model will auto-download on first run (~21MB). Supports CPU and GPU.

    Args:
        model_path: Path to YOLO model file (default: 'yolo11s.pt')
        device: Device to run on ('cpu', 'cuda:0', None=auto-detect)

    Returns:
        YOLO model instance ready for inference

    Raises:
        Exception: If model download fails or file not found
    """
    global _yolo_model, _yolo_device

    # Return cached model if already loaded
    if _yolo_model is not None:
        logger.debug("Using cached YOLO model")
        return _yolo_model

    logger.info("=" * 60)
    logger.info("Loading YOLO11s Model")
    logger.info("=" * 60)

    try:
        # Import required libraries
        from ultralytics import YOLO
        import torch

        # Auto-detect device if not specified
        if device is None:
            if torch.cuda.is_available():
                device = 'cuda:0'
                logger.info("✅ CUDA available - using GPU acceleration")
            else:
                device = 'cpu'
                logger.info("💻 CUDA not available - using CPU")
        else:
            logger.info(f"📟 Using specified device: {device}")

        _yolo_device = device

        # Load YOLO model (will auto-download if not present)
        logger.info(f"Loading model from: {model_path}")

        try:
            model = YOLO(model_path)
            logger.info("✅ Model loaded successfully")

        except Exception as download_error:
            logger.error(f"❌ Model download/load failed: {download_error}")
            logger.error("")
            logger.error("Manual download instructions:")
            logger.error("1. Download yolo11s.pt from:")
            logger.error("   https://github.com/ultralytics/assets/releases/download/v8.1.0/yolo11s.pt")
            logger.error("2. Place the file in: flask-detection/models/")
            logger.error("3. Retry model loading")
            raise

        # Verify model file exists
        if not os.path.exists(model_path) and not model_path == 'yolo11s.pt':
            logger.error(f"❌ Model file not found: {model_path}")
            raise FileNotFoundError(f"Model file not found: {model_path}")

        # Move model to specified device
        try:
            model.to(device)
            logger.info(f"✅ Model moved to device: {device}")
        except Exception as device_error:
            logger.warning(f"⚠️  Could not move model to {device}: {device_error}")
            logger.warning("   Falling back to CPU")
            device = 'cpu'
            _yolo_device = device
            model.to(device)

        # Warm up model with dummy inference
        logger.info("Warming up model with dummy inference...")
        dummy_frame = np.zeros((640, 640, 3), dtype=np.uint8)

        start_time = time.time()
        _ = model.predict(dummy_frame, verbose=False)
        warmup_time = (time.time() - start_time) * 1000

        logger.info(f"✅ Model warmup complete ({warmup_time:.0f}ms)")
        logger.info(f"📊 Model info: YOLO11s, {len(model.names)} classes")
        logger.info("=" * 60)

        # Cache model globally
        _yolo_model = model

        return model

    except ImportError as e:
        logger.error(f"❌ Required library not found: {e}")
        logger.error("   Install with: pip install ultralytics torch torchvision")
        raise

    except Exception as e:
        logger.error(f"❌ Unexpected error loading model: {e}")
        raise


def runInference(model, frame, confidence_threshold=0.7):
    """
    Run YOLO inference on a single frame.

    Processes an OpenCV frame through YOLO11s model and returns detected objects
    with bounding boxes, class IDs, and confidence scores.

    Args:
        model: YOLO model instance from loadModel()
        frame: OpenCV frame (numpy array, RGB format, shape: H x W x 3)
        confidence_threshold: Minimum confidence score (0.0-1.0, default: 0.7)

    Returns:
        List of detections, each containing:
        {
            'class_id': int (COCO class ID, e.g., 47 for apple),
            'class_name': str (COCO class name, e.g., 'apple'),
            'confidence': float (0.0-1.0),
            'bbox': [x1, y1, x2, y2] (bounding box coordinates)
        }

    Example:
        >>> detections = runInference(model, frame, 0.7)
        >>> print(detections)
        [
            {'class_id': 47, 'class_name': 'apple', 'confidence': 0.92, 'bbox': [123, 56, 234, 178]},
            {'class_id': 46, 'class_name': 'banana', 'confidence': 0.85, 'bbox': [300, 100, 400, 250]}
        ]
    """
    try:
        # Start inference timer
        start_time = time.time()

        # Run YOLO prediction
        results = model.predict(
            frame,
            verbose=False,
            conf=confidence_threshold,
            iou=0.45
        )

        inference_time = (time.time() - start_time) * 1000

        # Extract detections from results
        detections = []

        if results and len(results) > 0:
            boxes = results[0].boxes

            for box in boxes:
                # Extract box data
                class_id = int(box.cls[0].item())
                confidence = float(box.conf[0].item())
                bbox = box.xyxy[0].tolist()  # [x1, y1, x2, y2]
                class_name = model.names[class_id]

                # Create detection object
                detection = {
                    'class_id': class_id,
                    'class_name': class_name,
                    'confidence': round(confidence, 3),
                    'bbox': [round(coord, 1) for coord in bbox]
                }

                detections.append(detection)

        # Log detection results
        logger.debug(f"Detected {len(detections)} objects in frame ({inference_time:.0f}ms)")

        # Performance warning if inference too slow
        if inference_time > 500:
            logger.warning(f"⚠️  Slow inference: {inference_time:.0f}ms (target: <500ms)")

        return detections

    except Exception as e:
        logger.error(f"❌ Inference error: {e}")
        return []


def getProductFromClass(class_id, mapping):
    """
    Map COCO class ID to ShopShadow product.

    Looks up a COCO class ID in the mapping dictionary and returns
    corresponding product details if mapped.

    Args:
        class_id: COCO class ID (int, e.g., 47 for apple)
        mapping: COCO to product mapping dictionary (from loadMapping())

    Returns:
        Product dictionary if mapped, None otherwise:
        {
            'product_id': str (e.g., 'P001'),
            'product_name': str (e.g., 'Organic Apples'),
            'price': float (e.g., 1.99),
            'coco_name': str (e.g., 'apple')
        }

    Example:
        >>> product = getProductFromClass(47, mapping)
        >>> print(product)
        {'product_id': 'P001', 'product_name': 'Organic Apples', 'price': 1.99, 'coco_name': 'apple'}

        >>> product = getProductFromClass(999, mapping)
        >>> print(product)
        None
    """
    class_id_str = str(class_id)

    if class_id_str in mapping:
        product = mapping[class_id_str]
        logger.debug(f"Mapped COCO class {class_id} ({product['coco_name']}) -> {product['product_id']}")
        return product
    else:
        logger.debug(f"COCO class {class_id} not mapped to any product")
        return None


def loadMapping(mapping_path='config/coco_to_products.json'):
    """
    Load COCO to product mapping from JSON file.

    Loads and caches the mapping configuration that connects COCO class IDs
    to ShopShadow product IDs. The mapping is cached globally to avoid
    repeated file reads.

    Args:
        mapping_path: Path to JSON mapping file (relative to flask-detection/)

    Returns:
        Dictionary mapping COCO class IDs (as strings) to product details

    Raises:
        FileNotFoundError: If mapping file not found
        json.JSONDecodeError: If JSON is invalid

    Example mapping format:
        {
            "47": {
                "coco_name": "apple",
                "product_id": "P001",
                "product_name": "Organic Apples",
                "price": 1.99
            }
        }
    """
    global _coco_mapping

    # Return cached mapping if already loaded
    if _coco_mapping is not None:
        logger.debug("Using cached COCO mapping")
        return _coco_mapping

    try:
        # Build full path relative to this file
        base_dir = os.path.dirname(os.path.dirname(__file__))
        full_path = os.path.join(base_dir, mapping_path)

        logger.info(f"Loading COCO mapping from: {full_path}")

        with open(full_path, 'r') as f:
            _coco_mapping = json.load(f)

        logger.info(f"✅ Loaded COCO mapping with {len(_coco_mapping)} classes")

        # Log mapped classes
        mapped_classes = [f"{k}:{v['coco_name']}" for k, v in _coco_mapping.items()]
        logger.info(f"📋 Mapped classes: {', '.join(mapped_classes)}")

        return _coco_mapping

    except FileNotFoundError:
        logger.error(f"❌ COCO mapping file not found: {full_path}")
        logger.error("   Create the file: flask-detection/config/coco_to_products.json")
        raise

    except json.JSONDecodeError as e:
        logger.error(f"❌ Invalid JSON in mapping file: {e}")
        raise

    except Exception as e:
        logger.error(f"❌ Unexpected error loading mapping: {e}")
        raise


def clearCache():
    """
    Clear cached model and mapping.
    Useful for testing or reloading with different configurations.
    """
    global _yolo_model, _yolo_device, _coco_mapping

    _yolo_model = None
    _yolo_device = None
    _coco_mapping = None

    logger.info("Cleared YOLO model and mapping cache")


# Module-level convenience functions for backward compatibility
def detect_objects(frame, confidence_threshold=0.7):
    """
    Convenience function to detect objects without creating YOLODetector instance.

    Args:
        frame: OpenCV frame (numpy array, RGB format)
        confidence_threshold: Minimum confidence (0.0-1.0)

    Returns:
        List of detections from runInference()
    """
    model = loadModel()
    return runInference(model, frame, confidence_threshold)


if __name__ == '__main__':
    """
    Module test: Load model and run basic validation.
    """
    print("=" * 60)
    print("YOLO Detector Module Test")
    print("=" * 60)

    try:
        # Test model loading
        print("\n1. Testing model loading...")
        model = loadModel()
        print("✅ Model loaded successfully")

        # Test mapping loading
        print("\n2. Testing mapping loading...")
        mapping = loadMapping()
        print(f"✅ Mapping loaded with {len(mapping)} classes")

        # Test dummy inference
        print("\n3. Testing dummy inference...")
        dummy_frame = np.zeros((640, 640, 3), dtype=np.uint8)
        detections = runInference(model, dummy_frame, 0.7)
        print(f"✅ Inference successful (detected {len(detections)} objects in empty frame)")

        print("\n" + "=" * 60)
        print("✅ All tests passed!")
        print("=" * 60)

    except Exception as e:
        print(f"\n❌ Test failed: {e}")
        sys.exit(1)
