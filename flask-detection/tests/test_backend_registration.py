import sys
import os
import requests_mock
import requests
import pytest

sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
sys.path.append(os.path.join(os.path.dirname(__file__), '../..'))

from api.backend_client import BackendClient
from shared.logger import logger


def test_device_registration_success():
    """Test successful device registration"""
    logger.info("=" * 60)
    logger.info("Test: Device Registration Success")
    logger.info("=" * 60)

    with requests_mock.Mocker() as m:
        # Mock successful registration
        m.post(
            'http://localhost:3000/api/devices/register',
            json={'deviceId': 'test-device-123', 'code': '1234'},
            status_code=200
        )

        # Test registration
        client = BackendClient('http://localhost:3000')
        device_id = client.registerDevice()

        assert device_id == 'test-device-123', "Device ID mismatch"
        assert client.device_id == 'test-device-123', "Device ID not stored"
        assert client.device_code == '1234', "Device code not stored"

        logger.info("✅ Device registration success test passed")

    return True


def test_device_registration_retry_logic():
    """Test registration retry logic with failures then success"""
    logger.info("=" * 60)
    logger.info("Test: Device Registration Retry Logic")
    logger.info("=" * 60)

    with requests_mock.Mocker() as m:
        # First 2 attempts fail, 3rd succeeds
        m.post(
            'http://localhost:3000/api/devices/register',
            [
                {'status_code': 500, 'text': 'Internal Server Error'},  # Attempt 1: Server error
                {'status_code': 500, 'text': 'Internal Server Error'},  # Attempt 2: Server error
                {'json': {'deviceId': 'test-123', 'code': '5678'}, 'status_code': 200}  # Attempt 3: Success
            ]
        )

        client = BackendClient('http://localhost:3000')
        device_id = client.registerDevice()

        assert device_id == 'test-123', "Device ID mismatch after retries"
        assert client.device_code == '5678', "Device code mismatch after retries"
        logger.info("✅ Registration retry logic test passed")

    return True


def test_device_registration_connection_error():
    """Test registration with connection errors"""
    logger.info("=" * 60)
    logger.info("Test: Device Registration Connection Error")
    logger.info("=" * 60)

    with requests_mock.Mocker() as m:
        # Simulate connection error
        m.post(
            'http://localhost:3000/api/devices/register',
            exc=requests.exceptions.ConnectionError
        )

        client = BackendClient('http://localhost:3000')

        try:
            device_id = client.registerDevice()
            logger.error("❌ Expected RuntimeError but registration succeeded")
            return False
        except RuntimeError as e:
            logger.info(f"✅ Correctly raised RuntimeError: {str(e)}")
            assert "Failed to register device" in str(e)
            return True


def test_device_registration_timeout():
    """Test registration with timeout"""
    logger.info("=" * 60)
    logger.info("Test: Device Registration Timeout")
    logger.info("=" * 60)

    with requests_mock.Mocker() as m:
        # Simulate timeout
        m.post(
            'http://localhost:3000/api/devices/register',
            exc=requests.exceptions.Timeout
        )

        client = BackendClient('http://localhost:3000')

        try:
            device_id = client.registerDevice()
            logger.error("❌ Expected RuntimeError but registration succeeded")
            return False
        except RuntimeError as e:
            logger.info(f"✅ Correctly raised RuntimeError for timeout: {str(e)}")
            assert "Failed to register device" in str(e)
            return True


def test_device_registration_invalid_response():
    """Test registration with invalid response (missing deviceId)"""
    logger.info("=" * 60)
    logger.info("Test: Device Registration Invalid Response")
    logger.info("=" * 60)

    with requests_mock.Mocker() as m:
        # Mock response without deviceId
        m.post(
            'http://localhost:3000/api/devices/register',
            json={'status': 'ok'},  # Missing deviceId
            status_code=200
        )

        client = BackendClient('http://localhost:3000')

        try:
            device_id = client.registerDevice()
            logger.error("❌ Expected RuntimeError but registration succeeded")
            return False
        except RuntimeError as e:
            logger.info(f"✅ Correctly raised RuntimeError for invalid response: {str(e)}")
            return True


def test_device_registration_client_error():
    """Test registration with 4xx client error (should not retry)"""
    logger.info("=" * 60)
    logger.info("Test: Device Registration Client Error (400)")
    logger.info("=" * 60)

    with requests_mock.Mocker() as m:
        # Mock 400 Bad Request
        m.post(
            'http://localhost:3000/api/devices/register',
            status_code=400,
            json={'error': 'Bad Request'}
        )

        client = BackendClient('http://localhost:3000')

        try:
            device_id = client.registerDevice()
            logger.error("❌ Expected RuntimeError but registration succeeded")
            return False
        except RuntimeError as e:
            logger.info(f"✅ Correctly raised RuntimeError for client error: {str(e)}")
            # Should fail quickly without retries
            assert "client error" in str(e).lower() or "Failed to register" in str(e)
            return True


def run_all_tests():
    """Run all device registration tests"""
    logger.info("\n")
    logger.info("=" * 60)
    logger.info("DEVICE REGISTRATION TEST SUITE")
    logger.info("=" * 60)
    logger.info("\n")

    tests = [
        ("Registration Success", test_device_registration_success),
        ("Registration Retry Logic", test_device_registration_retry_logic),
        ("Connection Error", test_device_registration_connection_error),
        ("Timeout Error", test_device_registration_timeout),
        ("Invalid Response", test_device_registration_invalid_response),
        ("Client Error (400)", test_device_registration_client_error),
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

        logger.info("\n")

    logger.info("=" * 60)
    logger.info(f"RESULTS: {passed} passed, {failed} failed out of {len(tests)} tests")
    logger.info("=" * 60)

    return failed == 0


if __name__ == '__main__':
    success = run_all_tests()
    sys.exit(0 if success else 1)
