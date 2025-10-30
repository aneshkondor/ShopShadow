
# Task 3.4 Memory Log: Detection Logic and Confidence Routing

**Date:** October 30, 2025
**Agent:** Gemini 2.5 Pro
**Task:** Implement detection logic with confidence-based routing for the ShopShadow Flask Detection Service.

---

## 1. Implementation Approach

The core of this task was to create a Python module, `detection/detector.py`, that could take a raw camera frame, process it to find products, and then intelligently decide what to do with those detections based on the YOLO model's confidence score.

The approach was broken down into three distinct, testable functions:

1.  **`processFrame`**: This function acts as the initial pipeline. It takes a frame and the loaded YOLO model, runs the inference, and then immediately segregates the results into two buckets: "high confidence" and "low confidence". A key decision here was to run the initial inference with a lower-than-final threshold (0.5) to ensure we capture a wide range of potential items, which are then filtered more strictly.

2.  **`countItems`**: A crucial requirement is to handle multiple instances of the same product in a single frame (e.g., three apples). Instead of treating each apple as a separate event, this utility function aggregates them. It takes a list of detections and returns a simple dictionary mapping each `class_id` to its `quantity`. `collections.Counter` was the ideal tool for this, providing a concise and efficient solution.

3.  **`routeDetections`**: This is the brain of the module. It takes the high and low confidence lists (produced by `processFrame`) and the aggregated counts (produced by `countItems`), and transforms them into structured payloads suitable for the backend API. It handles the business logic:
    *   **High-confidence items**: These are considered "definite" additions. The payload is lean, containing just the `product_id`, `quantity`, and the *maximum* confidence score for that product group.
    *   **Low-confidence items**: These are "suggestions" for the user to approve. The payload is richer, including the product `name` to be displayed in the UI, `quantity`, and the *average* confidence score.
    *   **Unmapped items**: It gracefully handles cases where YOLO detects an object that isn't in our `coco_to_products.json` mapping by logging a warning and skipping it, preventing crashes.

This modular design ensures that each part of the logic is simple, focused, and can be unit-tested independently, leading to a more robust and maintainable implementation.

---

## 2. Function Descriptions

### `processFrame(frame, model, threshold=0.7)`
-   **Purpose**: To perform the initial object detection on a given camera frame and classify the results based on a confidence threshold.
-   **Inputs**: An OpenCV image (`frame`), a loaded YOLO model object, and the confidence `threshold`.
-   **Processing**: It calls `models.yolo_detector.runInference` to get all detections above a baseline confidence (0.5). It then iterates through these results, splitting them into two lists: one for detections at or above the `threshold`, and one for those below it.
-   **Outputs**: A tuple containing two lists: `(high_confidence_detections, low_confidence_detections)`.

### `countItems(detections)`
-   **Purpose**: To count the occurrences of each unique item in a list of detections.
-   **Inputs**: A list of detection dictionaries, where each dictionary has a `class_id`.
-   **Processing**: It first checks for an empty input to avoid errors. It then creates a list of all `class_id`s from the input and uses `collections.Counter` to perform the aggregation. The result is converted to a standard `dict`.
-   **Outputs**: A dictionary where keys are `class_id`s and values are their counts (e.g., `{47: 3, 46: 1}`).

### `routeDetections(high_conf, low_conf, mapping, device_id)`
-   **Purpose**: To translate the raw detection data into structured API payloads for the backend.
-   **Inputs**: The high and low confidence detection lists, the product `mapping` dictionary, and the `device_id`.
-   **Processing**:
    1.  It calls `countItems` on both `high_conf` and `low_conf` lists.
    2.  For high-confidence items, it iterates through the counts, looks up the `product_id` from the mapping, finds the maximum confidence score among all instances of that item, and builds the basket payload.
    3.  For low-confidence items, it does the same but looks up both `product_id` and `product_name`, calculates the average confidence, and builds the pending payload.
    4.  It logs warnings for any `class_id` not found in the mapping.
-   **Outputs**: A tuple containing two lists of dictionaries: `(basket_payloads, pending_payloads)`.

---

## 3. Testing and Validation

A comprehensive test suite (`tests/test_detection.py`) was created to validate the logic.

-   **`test_process_frame`**: Confirmed that the function correctly returns two lists and handles a blank frame without crashing.
-   **`test_count_items`**: Verified that the counting logic works as expected with a mock list of detections containing multiple instances of the same items.
-   **`test_route_detections`**: This was the most critical test. It confirmed:
    -   High-confidence items are correctly formatted for the basket.
    -   Low-confidence items are correctly formatted for the pending queue.
    -   The correct `product_id` and `name` are mapped.
    -   Quantity is correctly aggregated.
    -   The *max* confidence is used for basket items, and *average* for pending items.
-   **`test_edge_cases`**: Ensured the system is resilient by testing with empty inputs and, importantly, with a `class_id` that does not exist in the product mapping, confirming it is skipped and a warning is logged.

**Test Execution:**
The tests were run via the command line, and all passed successfully, indicating the module is functioning as per the requirements.

```
============================================================
✅ ALL TASK 3.4 TESTS PASSED
============================================================
```

---

## 4. Challenges and Final Thoughts

The implementation was straightforward thanks to the clear specifications and the pre-existing, well-defined interfaces of the `yolo_detector` and `backend_client` modules.

A minor but important consideration was deciding whether to use the maximum, minimum, or average confidence for a group of detected items. The final decision was:
-   **Maximum for high-confidence**: If the model is very sure about at least one instance, we can be confident in the group.
-   **Average for low-confidence**: This provides a more balanced view of the model's uncertainty for items that require user approval.

The code is clean, documented, and robustly tested, providing a solid foundation for the main orchestration loop in Task 3.6.

**Git Commit Hash:** (Will be added after commit)
