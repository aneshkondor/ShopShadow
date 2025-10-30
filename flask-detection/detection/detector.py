from collections import Counter
from typing import Dict, Iterable, List, Tuple
import sys
import os

sys.path.append(os.path.join(os.path.dirname(__file__), '../..'))


from shared.logger import logger
from models.yolo_detector import runInference, getProductFromClass

DEFAULT_DETECTION_FLOOR = 0.3


def _round_confidence(value: float) -> float:
    """Round confidence values to four decimal places for backend requests."""
    return round(float(value), 4)


def _group_by_class(detections: Iterable[Dict]) -> Dict[int, List[Dict]]:
    """Group detections by class ID for aggregation."""
    grouped: Dict[int, List[Dict]] = {}
    for detection in detections:
        class_id = detection.get('class_id')
        if class_id is None:
            logger.debug("Skipping detection without class_id: %s", detection)
            continue
        grouped.setdefault(class_id, []).append(detection)
    return grouped


def _format_basket_payload(product: Dict, detections: List[Dict], device_id: str) -> Dict:
    """Build payload for basket routing."""
    confidences = [float(d.get('confidence', 0.0)) for d in detections]
    max_conf = max(confidences) if confidences else 0.0
    return {
        "productId": product["product_id"],
        "quantity": len(detections),
        "confidence": _round_confidence(max_conf),
        "deviceId": device_id,
    }


def _format_pending_payload(product: Dict, detections: List[Dict], device_id: str) -> Dict:
    """Build payload for pending routing."""
    confidences = [float(d.get('confidence', 0.0)) for d in detections]
    avg_conf = sum(confidences) / len(confidences) if confidences else 0.0
    return {
        "productId": product["product_id"],
        "name": product["product_name"],
        "quantity": len(detections),
        "confidence": _round_confidence(avg_conf),
        "deviceId": device_id,
    }


def processFrame(frame, model, threshold: float = 0.7, detection_floor: float = DEFAULT_DETECTION_FLOOR):
    """
    Process a camera frame through YOLO detection.

    Args:
        frame: OpenCV image (numpy array)
        model: YOLO model instance
        threshold: Confidence threshold (default 0.7)
        detection_floor: Minimum confidence to keep detections (default 0.3)

    Returns:
        tuple: (high_confidence_detections, low_confidence_detections)
    """
    detection_floor = max(0.0, min(1.0, detection_floor))
    threshold = max(0.0, min(1.0, threshold))

    if detection_floor > threshold:
        logger.warning(
            "Detection floor %.2f is above threshold %.2f; adjusting floor to threshold",
            detection_floor,
            threshold,
        )
        detection_floor = threshold

    # 1. Run YOLO inference with floor confidence to capture low-confidence detections
    detections = runInference(model, frame, confidence_threshold=detection_floor)

    # 2. Separate by confidence
    high_conf = []
    low_conf = []

    for detection in detections:
        confidence = float(detection.get('confidence', 0.0))
        if confidence >= threshold:
            high_conf.append(detection)
        elif confidence >= detection_floor:
            low_conf.append(detection)

    logger.debug(
        "Frame processed with threshold=%.2f floor=%.2f → %d high, %d low",
        threshold,
        detection_floor,
        len(high_conf),
        len(low_conf),
    )

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

    high_grouped = _group_by_class(high_conf)
    low_grouped = _group_by_class(low_conf)

    for class_id, detections in high_grouped.items():
        product = getProductFromClass(class_id, mapping)
        if product is None:
            logger.warning("Unmapped class %s in high confidence detections", class_id)
            continue

        basket_payloads.append(_format_basket_payload(product, detections, device_id))

    for class_id, detections in low_grouped.items():
        product = getProductFromClass(class_id, mapping)
        if product is None:
            logger.warning("Unmapped class %s in low confidence detections", class_id)
            continue

        pending_payloads.append(_format_pending_payload(product, detections, device_id))

    logger.info(
        "Routed detections → basket: %d, pending: %d (device %s)",
        len(basket_payloads),
        len(pending_payloads),
        device_id,
    )
    return (basket_payloads, pending_payloads)
