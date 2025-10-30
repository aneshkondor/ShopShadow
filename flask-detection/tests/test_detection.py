import sys
import os

import pytest

sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
sys.path.append(os.path.join(os.path.dirname(__file__), '../..'))

from detection.detector import (
    DEFAULT_DETECTION_FLOOR,
    countItems,
    processFrame,
    routeDetections,
)


@pytest.fixture(autouse=True)
def suppress_logger(monkeypatch):
    """Keep detector logs quiet during unit tests."""
    from detection import detector

    monkeypatch.setattr(detector.logger, "info", lambda *args, **kwargs: None)
    monkeypatch.setattr(detector.logger, "debug", lambda *args, **kwargs: None)


def test_process_frame_splits_by_threshold(monkeypatch):
    from detection import detector

    captured = {}

    def fake_run_inference(model, frame, confidence_threshold):
        captured["confidence_threshold"] = confidence_threshold
        return [
            {"class_id": 47, "confidence": 0.82},
            {"class_id": 47, "confidence": 0.71},
            {"class_id": 46, "confidence": 0.55},
            {"class_id": 46, "confidence": 0.29},  # below floor, should be dropped
        ]

    monkeypatch.setattr(detector, "runInference", fake_run_inference)

    high_conf, low_conf = processFrame(frame=object(), model=object(), threshold=0.7)

    assert captured["confidence_threshold"] == pytest.approx(DEFAULT_DETECTION_FLOOR)
    assert [d["confidence"] for d in high_conf] == [0.82, 0.71]
    assert [d["confidence"] for d in low_conf] == [0.55]


def test_process_frame_respects_detection_floor(monkeypatch):
    from detection import detector

    captured = {}

    def fake_run_inference(model, frame, confidence_threshold):
        captured["confidence_threshold"] = confidence_threshold
        return [
            {"class_id": 47, "confidence": 0.65},
            {"class_id": 47, "confidence": 0.58},
            {"class_id": 46, "confidence": 0.41},
            {"class_id": 46, "confidence": 0.34},
        ]

    monkeypatch.setattr(detector, "runInference", fake_run_inference)

    high_conf, low_conf = processFrame(
        frame=object(),
        model=object(),
        threshold=0.6,
        detection_floor=0.35,
    )

    assert captured["confidence_threshold"] == pytest.approx(0.35)
    assert [d["confidence"] for d in high_conf] == [0.65]
    assert [d["confidence"] for d in low_conf] == [0.58, 0.41]


def test_count_items_handles_empty_and_multiples():
    detections = [
        {"class_id": 47, "confidence": 0.91},
        {"class_id": 47, "confidence": 0.88},
        {"class_id": 46, "confidence": 0.54},
    ]
    assert countItems(detections) == {47: 2, 46: 1}
    assert countItems([]) == {}


def test_route_detections_formats_backend_payloads(monkeypatch):
    from detection import detector

    products = {
        47: {"product_id": "P001", "product_name": "Organic Apples"},
        46: {"product_id": "P002", "product_name": "Fresh Bananas"},
    }

    monkeypatch.setattr(
        detector,
        "getProductFromClass",
        lambda class_id, mapping: products.get(class_id),
    )

    high_conf = [
        {"class_id": 47, "confidence": 0.92349},
        {"class_id": 47, "confidence": 0.88543},
    ]
    low_conf = [
        {"class_id": 46, "confidence": 0.64251},
        {"class_id": 46, "confidence": 0.52239},
    ]

    basket, pending = routeDetections(high_conf, low_conf, mapping={}, device_id="device-123")

    assert basket == [
        {
            "productId": "P001",
            "quantity": 2,
            "confidence": pytest.approx(0.9235),
            "deviceId": "device-123",
        }
    ]
    expected_avg_conf = round((0.64251 + 0.52239) / 2, 4)
    assert pending == [
        {
            "productId": "P002",
            "name": "Fresh Bananas",
            "quantity": 2,
            "confidence": pytest.approx(expected_avg_conf),
            "deviceId": "device-123",
        }
    ]


def test_route_detections_skips_unmapped(monkeypatch, caplog):
    from detection import detector

    caplog.set_level("WARNING")
    monkeypatch.setattr(detector, "getProductFromClass", lambda *args, **kwargs: None)

    basket, pending = routeDetections(
        [{"class_id": 999, "confidence": 0.95}],
        [{"class_id": 1001, "confidence": 0.45}],
        mapping={},
        device_id="device-xyz",
    )

    assert basket == []
    assert pending == []
    assert "Unmapped class 999" in caplog.text
    assert "Unmapped class 1001" in caplog.text
