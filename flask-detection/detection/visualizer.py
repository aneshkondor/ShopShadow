"""
Detection Visualization Module
Draws detection overlays on frames for debugging and monitoring.
"""

import cv2
import numpy as np
from typing import List, Dict


def drawDetections(frame, detections, mapping=None, show_confidence=True):
    """
    Draw bounding boxes and labels on frame for detected objects.

    Args:
        frame: OpenCV image (numpy array, RGB format)
        detections: List of detection dicts with 'bbox', 'class_name', 'confidence'
        mapping: Optional COCO-to-product mapping to show product names
        show_confidence: Whether to show confidence scores (default True)

    Returns:
        numpy.ndarray: Frame with detection overlays (BGR format for display)
    """
    if frame is None:
        return None

    # Convert RGB to BGR for OpenCV display
    display_frame = cv2.cvtColor(frame, cv2.COLOR_RGB2BGR)

    # Define colors for different confidence levels
    HIGH_CONF_COLOR = (0, 255, 0)   # Green for high confidence (>0.7)
    MED_CONF_COLOR = (0, 165, 255)  # Orange for medium confidence (0.5-0.7)
    LOW_CONF_COLOR = (0, 0, 255)    # Red for low confidence (<0.5)

    for detection in detections:
        # Extract detection info
        bbox = detection.get('bbox', [])
        if len(bbox) != 4:
            continue

        x1, y1, x2, y2 = map(int, bbox)
        confidence = detection.get('confidence', 0.0)
        class_name = detection.get('class_name', 'unknown')
        class_id = detection.get('class_id')

        # Choose color based on confidence
        if confidence >= 0.7:
            color = HIGH_CONF_COLOR
        elif confidence >= 0.5:
            color = MED_CONF_COLOR
        else:
            color = LOW_CONF_COLOR

        # Draw bounding box
        cv2.rectangle(display_frame, (x1, y1), (x2, y2), color, 2)

        # Build label text
        label_parts = []

        # Try to get product name from mapping
        if mapping and class_id is not None:
            from models.yolo_detector import getProductFromClass
            product = getProductFromClass(class_id, mapping)
            if product:
                product_name = product.get('product_name', class_name)
                label_parts.append(product_name)
            else:
                label_parts.append(class_name)
        else:
            label_parts.append(class_name)

        # Add confidence score
        if show_confidence:
            label_parts.append(f"{confidence:.2f}")

        label = " - ".join(label_parts)

        # Draw label background
        font = cv2.FONT_HERSHEY_SIMPLEX
        font_scale = 0.5
        font_thickness = 1

        (text_width, text_height), baseline = cv2.getTextSize(
            label, font, font_scale, font_thickness
        )

        # Position label above bounding box
        label_y = max(y1 - 10, text_height + 10)

        # Draw filled rectangle for label background
        cv2.rectangle(
            display_frame,
            (x1, label_y - text_height - baseline - 5),
            (x1 + text_width + 5, label_y + baseline),
            color,
            -1  # Filled
        )

        # Draw label text
        cv2.putText(
            display_frame,
            label,
            (x1 + 2, label_y - 5),
            font,
            font_scale,
            (255, 255, 255),  # White text
            font_thickness,
            cv2.LINE_AA
        )

    return display_frame


def showFrame(window_name, frame, wait_key=1):
    """
    Display frame in OpenCV window.

    Args:
        window_name: Name of the window
        frame: Frame to display (BGR format)
        wait_key: Milliseconds to wait for key press (default 1)

    Returns:
        int: Key code if key pressed, -1 otherwise
    """
    if frame is None:
        return -1

    cv2.imshow(window_name, frame)
    return cv2.waitKey(wait_key)


def addInfoOverlay(frame, info_text, position='top-left'):
    """
    Add informational text overlay to frame.

    Args:
        frame: OpenCV image (BGR format)
        info_text: List of strings to display
        position: Position on frame ('top-left', 'top-right', 'bottom-left', 'bottom-right')

    Returns:
        numpy.ndarray: Frame with info overlay
    """
    if frame is None or not info_text:
        return frame

    height, width = frame.shape[:2]
    font = cv2.FONT_HERSHEY_SIMPLEX
    font_scale = 0.5
    font_thickness = 1
    line_height = 20

    # Calculate position
    if position == 'top-left':
        x, y = 10, 20
    elif position == 'top-right':
        x, y = width - 200, 20
    elif position == 'bottom-left':
        x, y = 10, height - (len(info_text) * line_height) - 10
    else:  # bottom-right
        x, y = width - 200, height - (len(info_text) * line_height) - 10

    # Draw semi-transparent background
    overlay = frame.copy()
    bg_height = len(info_text) * line_height + 10
    bg_width = 190

    cv2.rectangle(
        overlay,
        (x - 5, y - 15),
        (x + bg_width, y + bg_height),
        (0, 0, 0),
        -1
    )

    # Blend overlay
    cv2.addWeighted(overlay, 0.6, frame, 0.4, 0, frame)

    # Draw text lines
    for i, text in enumerate(info_text):
        cv2.putText(
            frame,
            text,
            (x, y + (i * line_height)),
            font,
            font_scale,
            (255, 255, 255),
            font_thickness,
            cv2.LINE_AA
        )

    return frame


def createVisualizationWindow(window_name='ShopShadow Detection'):
    """
    Create and configure visualization window.

    Args:
        window_name: Name of the window
    """
    cv2.namedWindow(window_name, cv2.WINDOW_NORMAL)
    cv2.resizeWindow(window_name, 800, 600)


def destroyVisualizationWindow(window_name='ShopShadow Detection'):
    """
    Destroy visualization window and cleanup.

    Args:
        window_name: Name of the window to destroy
    """
    cv2.destroyWindow(window_name)
