import sys
import os
import requests_mock
import requests

sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
sys.path.append(os.path.join(os.path.dirname(__file__), '../..'))

from api.backend_client import BackendClient
from shared.logger import logger


def test_basket_success():
    """Test successful basket item addition"""
    logger.info("=" * 60)
    logger.info("Test: Basket API Success")
    logger.info("=" * 60)

    with requests_mock.Mocker() as m:
        # Mock device registration
        m.post(
            'http://localhost:3000/api/devices/register',
            json={'deviceId': 'test-device-123', 'code': '1234'},
            status_code=200
        )

        # Mock successful basket addition
        m.post(
            'http://localhost:3000/api/basket/items',
            json={
                'success': True,
                'basketItem': {
                    'id': 'basket-1',
                    'productId': 'P001',
                    'quantity': 2,
                    'confidence': 0.92
                }
            },
            status_code=201
        )

        # Test
        client = BackendClient('http://localhost:3000')
        client.registerDevice()
        result = client.sendToBasket('P001', 2, 0.92)

        assert result is True, "Expected sendToBasket to return True"
        logger.info("✅ Basket API success test passed")

    return True


def test_basket_without_registration():
    """Test basket call without device registration"""
    logger.info("=" * 60)
    logger.info("Test: Basket API Without Registration")
    logger.info("=" * 60)

    client = BackendClient('http://localhost:3000')
    # Don't register device
    result = client.sendToBasket('P001', 1, 0.85)

    assert result is False, "Expected sendToBasket to return False without registration"
    logger.info("✅ Basket API without registration test passed")

    return True


def test_basket_retry_on_connection_error():
    """Test basket API retry logic on connection errors"""
    logger.info("=" * 60)
    logger.info("Test: Basket API Retry on Connection Error")
    logger.info("=" * 60)

    with requests_mock.Mocker() as m:
        # Mock device registration
        m.post(
            'http://localhost:3000/api/devices/register',
            json={'deviceId': 'test-device-123', 'code': '1234'},
            status_code=200
        )

        # First 2 attempts fail with connection error, 3rd succeeds
        m.post(
            'http://localhost:3000/api/basket/items',
            [
                {'exc': requests.exceptions.ConnectionError},  # Attempt 1: Connection error
                {'exc': requests.exceptions.ConnectionError},  # Attempt 2: Connection error
                {'json': {'success': True, 'basketItem': {'id': 'basket-1'}}, 'status_code': 201}  # Attempt 3: Success
            ]
        )

        # Test
        client = BackendClient('http://localhost:3000')
        client.registerDevice()
        result = client.sendToBasket('P001', 1, 0.80)

        # Note: max_retries is 2, so it will try 3 times total (initial + 2 retries)
        assert result is True, "Expected sendToBasket to succeed after retries"
        logger.info("✅ Basket API retry test passed")

    return True


def test_basket_client_error_no_retry():
    """Test basket API does not retry on 4xx client errors"""
    logger.info("=" * 60)
    logger.info("Test: Basket API Client Error (No Retry)")
    logger.info("=" * 60)

    with requests_mock.Mocker() as m:
        # Mock device registration
        m.post(
            'http://localhost:3000/api/devices/register',
            json={'deviceId': 'test-device-123', 'code': '1234'},
            status_code=200
        )

        # Mock 400 Bad Request (should not retry)
        m.post(
            'http://localhost:3000/api/basket/items',
            status_code=400,
            json={'error': 'Invalid product ID'}
        )

        # Test
        client = BackendClient('http://localhost:3000')
        client.registerDevice()
        result = client.sendToBasket('INVALID', 1, 0.75)

        assert result is False, "Expected sendToBasket to return False on client error"
        # Check that it was only called once (no retries)
        assert m.call_count == 2, "Expected only 2 calls (register + 1 basket attempt, no retries)"
        logger.info("✅ Basket API client error test passed")

    return True


def test_basket_server_error_retry():
    """Test basket API retry on 5xx server errors"""
    logger.info("=" * 60)
    logger.info("Test: Basket API Server Error (Retry)")
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
            'http://localhost:3000/api/basket/items',
            [
                {'status_code': 500},  # Attempt 1: Server error
                {'json': {'success': True, 'basketItem': {'id': 'basket-1'}}, 'status_code': 201}  # Attempt 2: Success
            ]
        )

        # Test
        client = BackendClient('http://localhost:3000')
        client.registerDevice()
        result = client.sendToBasket('P001', 1, 0.88)

        assert result is True, "Expected sendToBasket to succeed after server error retry"
        logger.info("✅ Basket API server error retry test passed")

    return True


def test_basket_timeout():
    """Test basket API timeout handling"""
    logger.info("=" * 60)
    logger.info("Test: Basket API Timeout")
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
            'http://localhost:3000/api/basket/items',
            exc=requests.exceptions.Timeout
        )

        # Test
        client = BackendClient('http://localhost:3000')
        client.registerDevice()
        result = client.sendToBasket('P001', 1, 0.95)

        assert result is False, "Expected sendToBasket to return False on timeout"
        logger.info("✅ Basket API timeout test passed")

    return True


def test_basket_circuit_breaker_trigger():
    """Test basket API triggers circuit breaker after failures"""
    logger.info("=" * 60)
    logger.info("Test: Basket API Circuit Breaker Trigger")
    logger.info("=" * 60)

    with requests_mock.Mocker() as m:
        # Mock device registration
        m.post(
            'http://localhost:3000/api/devices/register',
            json={'deviceId': 'test-device-123', 'code': '1234'},
            status_code=200
        )

        # Mock connection error for all basket attempts
        m.post(
            'http://localhost:3000/api/basket/items',
            exc=requests.exceptions.ConnectionError
        )

        # Test
        client = BackendClient('http://localhost:3000')
        client.registerDevice()

        # Make 5 failed calls to trigger circuit breaker
        for i in range(5):
            result = client.sendToBasket('P001', 1, 0.80)
            assert result is False, f"Expected call {i+1} to fail"
            logger.info(f"Call {i+1}: Failed as expected (failure_count={client.failure_count})")

        # Verify circuit breaker is open
        assert client.circuit_open is True, "Expected circuit breaker to be open"
        assert client.failure_count == 5, "Expected failure count to be 5"
        logger.info("✅ Circuit breaker opened after 5 failures")

        # Next call should be blocked by circuit breaker
        result = client.sendToBasket('P001', 1, 0.80)
        assert result is False, "Expected call to be blocked by circuit breaker"
        logger.info("✅ Basket API circuit breaker test passed")

    return True


def run_all_tests():
    """Run all basket API tests"""
    logger.info("\n")
    logger.info("=" * 60)
    logger.info("BASKET API TEST SUITE")
    logger.info("=" * 60)
    logger.info("\n")

    tests = [
        ("Basket Success", test_basket_success),
        ("Basket Without Registration", test_basket_without_registration),
        ("Basket Retry on Connection Error", test_basket_retry_on_connection_error),
        ("Basket Client Error (No Retry)", test_basket_client_error_no_retry),
        ("Basket Server Error (Retry)", test_basket_server_error_retry),
        ("Basket Timeout", test_basket_timeout),
        ("Basket Circuit Breaker Trigger", test_basket_circuit_breaker_trigger),
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
