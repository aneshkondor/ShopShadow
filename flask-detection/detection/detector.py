"""
Detection logic with confidence-based routing.
High confidence (≥0.7) → basket (auto-add)
Low confidence (<0.7) → pending (requires approval)
"""

from collections import Counter
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '../..'))


from shared.logger import logger
from models.yolo_detector import runInference, getProductFromClass


def processFrame(frame, model, threshold=0.7):
    """
    Process a camera frame through YOLO detection.

    Args:
        frame: OpenCV image (numpy array)
        model: YOLO model instance
        threshold: Confidence threshold (default 0.7)

    Returns:
        tuple: (high_confidence_detections, low_confidence_detections)
    """
    # 1. Run YOLO inference
    
    detections = runInference(model, frame, confidence_threshold=0.5)  # Lower threshold to catch all

    # 2. Separate by confidence
    high_conf = [d for d in detections if d['confidence'] >= threshold]
    low_conf = [d for d in detections if d['confidence'] < threshold and d['confidence'] >= 0.5]

    return (high_conf, low_conf)


def countItems(detections):
    """
    Count quantity of each detected class.

    Args:
        detections: List of detection dicts with 'class_id' key

    Returns:
        dict: {class_id: count}

    Example:
        Input: [{'class_id': 47}, {'class_id': 47}, {'class_id': 46}]
        Output: {47: 2, 46: 1}  # 2 apples, 1 banana
    """
    if not detections:
        return {}

    class_ids = [d['class_id'] for d in detections]
    counts = Counter(class_ids)
    return dict(counts)


def routeDetections(high_conf, low_conf, mapping, device_id):
    """
    Route detections to basket (high conf) or pending (low conf).

    Args:
        high_conf: List of high confidence detections
        low_conf: List of low confidence detections
        mapping: COCO-to-product mapping dict
        device_id: Device ID from backend registration

    Returns:
        tuple: (basket_payloads, pending_payloads)
    """

    basket_payloads = []
    pending_payloads = []

    # Count items in each category
    high_counts = countItems(high_conf)
    low_counts = countItems(low_conf)

    # Process high confidence (basket)
    for class_id, quantity in high_counts.items():
        product = getProductFromClass(class_id, mapping)
        if product is None:
            logger.warning(f"Unmapped class {class_id} in high confidence detections")
            continue

        # Get max confidence for this class
        confidences = [d['confidence'] for d in high_conf if d['class_id'] == class_id]
        max_conf = max(confidences)

        payload = {
            'product_id': product['product_id'],
            'quantity': quantity,
            'confidence': max_conf
        }
        basket_payloads.append(payload)

    # Process low confidence (pending)
    for class_id, quantity in low_counts.items():
        product = getProductFromClass(class_id, mapping)
        if product is None:
            logger.warning(f"Unmapped class {class_id} in low confidence detections")
            continue

        # Get confidence for this class
        confidences = [d['confidence'] for d in low_conf if d['class_id'] == class_id]
        avg_conf = sum(confidences) / len(confidences)

        payload = {
            'product_id': product['product_id'],
            'name': product['product_name'],
            'quantity': quantity,
            'confidence': avg_conf
        }
        pending_payloads.append(payload)

    logger.info(f"Routed: {len(basket_payloads)} to basket, {len(pending_payloads)} to pending")
    return (basket_payloads, pending_payloads)