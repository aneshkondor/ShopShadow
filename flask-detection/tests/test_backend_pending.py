import sys
import os
import requests_mock
import requests

sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
sys.path.append(os.path.join(os.path.dirname(__file__), '../..'))

from api.backend_client import BackendClient
from shared.logger import logger


def test_pending_success():
    """Test successful pending item submission"""
    logger.info("=" * 60)
    logger.info("Test: Pending API Success")
    logger.info("=" * 60)

    with requests_mock.Mocker() as m:
        # Mock device registration
        m.post(
            'http://localhost:3000/api/devices/register',
            json={'deviceId': 'test-device-123', 'code': '1234'},
            status_code=200
        )

        # Mock successful pending addition
        m.post(
            'http://localhost:3000/api/basket/pending-items',
            json={
                'success': True,
                'pendingItem': {
                    'id': 'pending-1',
                    'productId': 'P002',
                    'name': 'Organic Apples',
                    'quantity': 1,
                    'confidence': 0.65
                }
            },
            status_code=201
        )

        # Test
        client = BackendClient('http://localhost:3000')
        client.registerDevice()
        result = client.sendToPending('P002', 'Organic Apples', 1, 0.65)

        assert result is True, "Expected sendToPending to return True"
        logger.info("✅ Pending API success test passed")

    return True


def test_pending_without_registration():
    """Test pending call without device registration"""
    logger.info("=" * 60)
    logger.info("Test: Pending API Without Registration")
    logger.info("=" * 60)

    client = BackendClient('http://localhost:3000')
    # Don't register device
    result = client.sendToPending('P002', 'Organic Apples', 1, 0.55)

    assert result is False, "Expected sendToPending to return False without registration"
    logger.info("✅ Pending API without registration test passed")

    return True


def test_pending_device_not_connected():
    """Test pending API with device not connected (400 error)"""
    logger.info("=" * 60)
    logger.info("Test: Pending API Device Not Connected (400)")
    logger.info("=" * 60)

    with requests_mock.Mocker() as m:
        # Mock device registration
        m.post(
            'http://localhost:3000/api/devices/register',
            json={'deviceId': 'test-device-123', 'code': '1234'},
            status_code=200
        )

        # Mock 400 Device Not Connected error
        m.post(
            'http://localhost:3000/api/basket/pending-items',
            status_code=400,
            json={'error': 'Device not connected'}
        )

        # Test
        client = BackendClient('http://localhost:3000')
        client.registerDevice()
        result = client.sendToPending('P002', 'Organic Apples', 1, 0.62)

        assert result is False, "Expected sendToPending to return False on 400 error"
        logger.info("✅ Pending API device not connected test passed")

    return True


def test_pending_retry_on_connection_error():
    """Test pending API retry logic on connection errors"""
    logger.info("=" * 60)
    logger.info("Test: Pending API Retry on Connection Error")
    logger.info("=" * 60)

    with requests_mock.Mocker() as m:
        # Mock device registration
        m.post(
            'http://localhost:3000/api/devices/register',
            json={'deviceId': 'test-device-123', 'code': '1234'},
            status_code=200
        )

        # First attempt fails with connection error, 2nd succeeds
        m.post(
            'http://localhost:3000/api/basket/pending-items',
            [
                {'exc': requests.exceptions.ConnectionError},  # Attempt 1: Connection error
                {'json': {'success': True, 'pendingItem': {'id': 'pending-1'}}, 'status_code': 201}  # Attempt 2: Success
            ]
        )

        # Test
        client = BackendClient('http://localhost:3000')
        client.registerDevice()
        result = client.sendToPending('P002', 'Organic Apples', 1, 0.58)

        assert result is True, "Expected sendToPending to succeed after retry"
        logger.info("✅ Pending API retry test passed")

    return True


def test_pending_server_error_retry():
    """Test pending API retry on 5xx server errors"""
    logger.info("=" * 60)
    logger.info("Test: Pending API Server Error (Retry)")
    logger.info("=" * 60)

    with requests_mock.Mocker() as m:
        # Mock device registration
        m.post(
            'http://localhost:3000/api/devices/register',
            json={'deviceId': 'test-device-123', 'code': '1234'},
            status_code=200
        )

        # Mock 500 Internal Server Error (should retry)
        m.post(
            'http://localhost:3000/api/basket/pending-items',
            [
                {'status_code': 503},  # Attempt 1: Service Unavailable
                {'json': {'success': True, 'pendingItem': {'id': 'pending-1'}}, 'status_code': 201}  # Attempt 2: Success
            ]
        )

        # Test
        client = BackendClient('http://localhost:3000')
        client.registerDevice()
        result = client.sendToPending('P002', 'Organic Apples', 1, 0.67)

        assert result is True, "Expected sendToPending to succeed after server error retry"
        logger.info("✅ Pending API server error retry test passed")

    return True


def test_pending_timeout():
    """Test pending API timeout handling"""
    logger.info("=" * 60)
    logger.info("Test: Pending API Timeout")
    logger.info("=" * 60)

    with requests_mock.Mocker() as m:
        # Mock device registration
        m.post(
            'http://localhost:3000/api/devices/register',
            json={'deviceId': 'test-device-123', 'code': '1234'},
            status_code=200
        )

        # Mock timeout
        m.post(
            'http://localhost:3000/api/basket/pending-items',
            exc=requests.exceptions.Timeout
        )

        # Test
        client = BackendClient('http://localhost:3000')
        client.registerDevice()
        result = client.sendToPending('P002', 'Organic Apples', 1, 0.64)

        assert result is False, "Expected sendToPending to return False on timeout"
        logger.info("✅ Pending API timeout test passed")

    return True


def test_pending_invalid_product_data():
    """Test pending API with other client errors (not device not connected)"""
    logger.info("=" * 60)
    logger.info("Test: Pending API Invalid Product Data (400)")
    logger.info("=" * 60)

    with requests_mock.Mocker() as m:
        # Mock device registration
        m.post(
            'http://localhost:3000/api/devices/register',
            json={'deviceId': 'test-device-123', 'code': '1234'},
            status_code=200
        )

        # Mock 400 with different error (invalid data, not device not connected)
        m.post(
            'http://localhost:3000/api/basket/pending-items',
            status_code=400,
            json={'error': 'Invalid product data'}
        )

        # Test
        client = BackendClient('http://localhost:3000')
        client.registerDevice()
        result = client.sendToPending('', '', -1, 0.50)  # Invalid data

        assert result is False, "Expected sendToPending to return False on invalid data"
        # Should not retry on 400
        assert m.call_count == 2, "Expected only 2 calls (register + 1 pending attempt, no retries)"
        logger.info("✅ Pending API invalid data test passed")

    return True


def run_all_tests():
    """Run all pending API tests"""
    logger.info("\n")
    logger.info("=" * 60)
    logger.info("PENDING API TEST SUITE")
    logger.info("=" * 60)
    logger.info("\n")

    tests = [
        ("Pending Success", test_pending_success),
        ("Pending Without Registration", test_pending_without_registration),
        ("Pending Device Not Connected (400)", test_pending_device_not_connected),
        ("Pending Retry on Connection Error", test_pending_retry_on_connection_error),
        ("Pending Server Error (Retry)", test_pending_server_error_retry),
        ("Pending Timeout", test_pending_timeout),
        ("Pending Invalid Product Data (400)", test_pending_invalid_product_data),
    ]

    passed = 0
    failed = 0

    for test_name, test_func in tests:
        try:
            logger.info(f"\nRunning: {test_name}")
            result = test_func()
            if result:
                passed += 1
                logger.info(f"✅ {test_name} PASSED")
            else:
                failed += 1
                logger.error(f"❌ {test_name} FAILED")
        except Exception as e:
            failed += 1
            logger.error(f"❌ {test_name} FAILED with exception: {str(e)}")
            import traceback
            logger.error(traceback.format_exc())

        logger.info("\n")

    logger.info("=" * 60)
    logger.info(f"RESULTS: {passed} passed, {failed} failed out of {len(tests)} tests")
    logger.info("=" * 60)

    return failed == 0


if __name__ == '__main__':
    success = run_all_tests()
    sys.exit(0 if success else 1)
