import sys
import os
import requests_mock
import requests
import time

sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
sys.path.append(os.path.join(os.path.dirname(__file__), '../..'))

from api.backend_client import BackendClient
from shared.logger import logger


def test_circuit_breaker_opens_after_5_failures():
    """Test circuit breaker opens after 5 consecutive failures"""
    logger.info("=" * 60)
    logger.info("Test: Circuit Breaker Opens After 5 Failures")
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

        # Verify circuit is closed initially
        assert client.circuit_open is False, "Circuit should be closed initially"
        assert client.failure_count == 0, "Failure count should be 0 initially"

        # Make 5 failed calls
        for i in range(5):
            result = client.sendToBasket('P001', 1, 0.80)
            assert result is False, f"Expected call {i+1} to fail"
            logger.info(f"Call {i+1}: Failed (failure_count={client.failure_count})")

        # Verify circuit breaker is open
        assert client.circuit_open is True, "Expected circuit breaker to be open after 5 failures"
        assert client.failure_count == 5, "Expected failure count to be 5"
        assert client.circuit_open_until > time.time(), "Circuit should be open for 30 seconds"
        logger.info("✅ Circuit breaker opened after 5 failures")

    return True


def test_circuit_breaker_blocks_requests_when_open():
    """Test circuit breaker blocks requests while open"""
    logger.info("=" * 60)
    logger.info("Test: Circuit Breaker Blocks Requests When Open")
    logger.info("=" * 60)

    with requests_mock.Mocker() as m:
        # Mock device registration
        m.post(
            'http://localhost:3000/api/devices/register',
            json={'deviceId': 'test-device-123', 'code': '1234'},
            status_code=200
        )

        # Mock connection error
        m.post(
            'http://localhost:3000/api/basket/items',
            exc=requests.exceptions.ConnectionError
        )

        # Test
        client = BackendClient('http://localhost:3000')
        client.registerDevice()

        # Trigger circuit breaker by making 5 failed calls
        for i in range(5):
            client.sendToBasket('P001', 1, 0.80)

        # Verify circuit is open
        assert client.circuit_open is True, "Circuit should be open"

        # Count how many HTTP calls were made before circuit opened
        initial_call_count = m.call_count

        # Try to make another call (should be blocked by circuit breaker)
        result = client.sendToBasket('P001', 1, 0.80)
        assert result is False, "Expected call to be blocked"

        # Verify no additional HTTP calls were made (blocked by circuit breaker)
        assert m.call_count == initial_call_count, "Circuit breaker should block HTTP calls"
        logger.info("✅ Circuit breaker blocked requests while open")

    return True


def test_circuit_breaker_closes_after_timeout():
    """Test circuit breaker closes after 30 second timeout"""
    logger.info("=" * 60)
    logger.info("Test: Circuit Breaker Closes After Timeout")
    logger.info("=" * 60)

    with requests_mock.Mocker() as m:
        # Mock device registration
        m.post(
            'http://localhost:3000/api/devices/register',
            json={'deviceId': 'test-device-123', 'code': '1234'},
            status_code=200
        )

        # Mock connection error then success
        m.post(
            'http://localhost:3000/api/basket/items',
            exc=requests.exceptions.ConnectionError
        )

        # Test
        client = BackendClient('http://localhost:3000')
        client.registerDevice()

        # Trigger circuit breaker
        for i in range(5):
            client.sendToBasket('P001', 1, 0.80)

        assert client.circuit_open is True, "Circuit should be open"

        # Manually set circuit to close now (simulate 30s timeout)
        client.circuit_open_until = time.time() - 1  # Expired 1 second ago

        # Try to make a call (should close circuit and attempt request)
        # Note: This will still fail because we're still mocking connection errors,
        # but it should attempt the HTTP call (not be blocked by circuit breaker)
        initial_call_count = m.call_count
        result = client.sendToBasket('P001', 1, 0.80)

        # Verify circuit breaker closed and allowed the request through
        assert client.circuit_open is False, "Circuit should be closed after timeout"
        assert client.failure_count == 0, "Failure count should be reset"
        assert m.call_count > initial_call_count, "Circuit breaker should allow HTTP calls after closing"
        logger.info("✅ Circuit breaker closed after timeout")

    return True


def test_circuit_breaker_reset_on_success():
    """Test circuit breaker resets failure count on successful call"""
    logger.info("=" * 60)
    logger.info("Test: Circuit Breaker Resets on Success")
    logger.info("=" * 60)

    with requests_mock.Mocker() as m:
        # Mock device registration
        m.post(
            'http://localhost:3000/api/devices/register',
            json={'deviceId': 'test-device-123', 'code': '1234'},
            status_code=200
        )

        # Mock 3 failures then success
        m.post(
            'http://localhost:3000/api/basket/items',
            [
                {'exc': requests.exceptions.ConnectionError},  # Fail 1
                {'exc': requests.exceptions.ConnectionError},  # Fail 2
                {'exc': requests.exceptions.ConnectionError},  # Fail 3
                {'json': {'success': True, 'basketItem': {'id': 'b1'}}, 'status_code': 201}  # Success
            ]
        )

        # Test
        client = BackendClient('http://localhost:3000')
        client.registerDevice()

        # Make 3 failed calls
        for i in range(3):
            client.sendToBasket('P001', 1, 0.80)

        assert client.failure_count == 3, "Expected failure count to be 3"
        assert client.circuit_open is False, "Circuit should still be closed (threshold is 5)"

        # Make successful call
        result = client.sendToBasket('P001', 1, 0.80)
        assert result is True, "Expected call to succeed"

        # Verify failure count was reset
        assert client.failure_count == 0, "Failure count should be reset after success"
        assert client.circuit_open is False, "Circuit should remain closed"
        logger.info("✅ Circuit breaker reset failure count on success")

    return True


def test_circuit_breaker_with_pending_api():
    """Test circuit breaker works with pending API calls"""
    logger.info("=" * 60)
    logger.info("Test: Circuit Breaker with Pending API")
    logger.info("=" * 60)

    with requests_mock.Mocker() as m:
        # Mock device registration
        m.post(
            'http://localhost:3000/api/devices/register',
            json={'deviceId': 'test-device-123', 'code': '1234'},
            status_code=200
        )

        # Mock connection error for pending API
        m.post(
            'http://localhost:3000/api/basket/pending-items',
            exc=requests.exceptions.ConnectionError
        )

        # Test
        client = BackendClient('http://localhost:3000')
        client.registerDevice()

        # Make 5 failed pending calls to trigger circuit breaker
        for i in range(5):
            result = client.sendToPending('P002', 'Organic Apples', 1, 0.65)
            assert result is False, f"Expected call {i+1} to fail"

        # Verify circuit breaker is open
        assert client.circuit_open is True, "Expected circuit breaker to be open"

        # Try another pending call (should be blocked)
        result = client.sendToPending('P002', 'Organic Apples', 1, 0.65)
        assert result is False, "Expected call to be blocked by circuit breaker"
        logger.info("✅ Circuit breaker works with pending API")

    return True


def test_circuit_breaker_shared_state():
    """Test circuit breaker state is shared between basket and pending APIs"""
    logger.info("=" * 60)
    logger.info("Test: Circuit Breaker Shared State")
    logger.info("=" * 60)

    with requests_mock.Mocker() as m:
        # Mock device registration
        m.post(
            'http://localhost:3000/api/devices/register',
            json={'deviceId': 'test-device-123', 'code': '1234'},
            status_code=200
        )

        # Mock connection errors for both APIs
        m.post(
            'http://localhost:3000/api/basket/items',
            exc=requests.exceptions.ConnectionError
        )
        m.post(
            'http://localhost:3000/api/basket/pending-items',
            exc=requests.exceptions.ConnectionError
        )

        # Test
        client = BackendClient('http://localhost:3000')
        client.registerDevice()

        # Make 3 failed basket calls
        for i in range(3):
            client.sendToBasket('P001', 1, 0.80)

        assert client.failure_count == 3, "Expected failure count to be 3"

        # Make 2 failed pending calls (should reach threshold of 5)
        for i in range(2):
            client.sendToPending('P002', 'Organic Apples', 1, 0.65)

        # Verify circuit breaker opened (shared state between both APIs)
        assert client.failure_count == 5, "Expected failure count to be 5"
        assert client.circuit_open is True, "Circuit should be open after 5 total failures"

        # Both APIs should be blocked now
        result_basket = client.sendToBasket('P001', 1, 0.80)
        result_pending = client.sendToPending('P002', 'Organic Apples', 1, 0.65)
        assert result_basket is False and result_pending is False, "Both APIs should be blocked"
        logger.info("✅ Circuit breaker state is shared between APIs")

    return True


def run_all_tests():
    """Run all circuit breaker tests"""
    logger.info("\n")
    logger.info("=" * 60)
    logger.info("CIRCUIT BREAKER TEST SUITE")
    logger.info("=" * 60)
    logger.info("\n")

    tests = [
        ("Circuit Opens After 5 Failures", test_circuit_breaker_opens_after_5_failures),
        ("Circuit Blocks Requests When Open", test_circuit_breaker_blocks_requests_when_open),
        ("Circuit Closes After Timeout", test_circuit_breaker_closes_after_timeout),
        ("Circuit Resets on Success", test_circuit_breaker_reset_on_success),
        ("Circuit with Pending API", test_circuit_breaker_with_pending_api),
        ("Circuit Shared State", test_circuit_breaker_shared_state),
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
