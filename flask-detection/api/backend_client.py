import requests
import time
import sys
import os

# Add parent directory to path for shared modules
sys.path.append(os.path.join(os.path.dirname(__file__), '../..'))
from shared.logger import logger


class BackendClient:
    """HTTP client for communicating with Node.js backend"""

    def __init__(self, backend_url, timeout=10):
        """
        Initialize backend client

        Args:
            backend_url (str): Base URL of backend API (e.g., http://localhost:3000)
            timeout (int): Request timeout in seconds
        """
        self.backend_url = backend_url.rstrip('/')
        self.timeout = timeout
        self.device_id = None
        self.device_code = None

        # Circuit breaker state
        self.failure_count = 0
        self.circuit_open = False
        self.circuit_open_until = 0

        # Configure session with default headers
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'User-Agent': 'ShopShadow-FlaskDetection/1.0'
        })

        logger.info(f"Backend client initialized for {self.backend_url}")

    def registerDevice(self, max_retries=3):
        """
        Register device with backend on startup

        Returns:
            str: Device ID if successful

        Raises:
            RuntimeError: If registration fails after all retries
        """
        endpoint = f"{self.backend_url}/api/devices/register"

        for attempt in range(1, max_retries + 1):
            try:
                logger.info(f"Registering device (attempt {attempt}/{max_retries})...")

                response = self.session.post(
                    endpoint,
                    json={},
                    timeout=self.timeout
                )
                response.raise_for_status()

                data = response.json()
                self.device_id = data.get('deviceId')
                self.device_code = data.get('code')

                if not self.device_id:
                    logger.error(f"Registration response missing deviceId: {data}")
                    raise ValueError("Invalid registration response")

                logger.info(f"✅ Device registered: {self.device_id} (code: {self.device_code})")
                return self.device_id

            except requests.exceptions.ConnectionError as e:
                logger.error(f"Cannot reach backend at {endpoint}. Is it running? Error: {str(e)}")
                if attempt < max_retries:
                    delay = 2 ** (attempt - 1)  # Exponential backoff: 1s, 2s, 4s
                    logger.info(f"Retrying in {delay}s...")
                    time.sleep(delay)
                else:
                    raise RuntimeError(f"Failed to register device after {max_retries} attempts: {str(e)}")

            except requests.exceptions.Timeout as e:
                logger.error(f"Backend request timed out after {self.timeout}s: {str(e)}")
                if attempt < max_retries:
                    delay = 2 ** (attempt - 1)
                    logger.info(f"Retrying in {delay}s...")
                    time.sleep(delay)
                else:
                    raise RuntimeError(f"Failed to register device after {max_retries} attempts: {str(e)}")

            except requests.exceptions.HTTPError as e:
                status_code = e.response.status_code if e.response else None
                logger.error(f"HTTP error during registration (status {status_code}): {str(e)}")

                # If status_code is None or it's a server error (5xx), retry
                if status_code is None or (500 <= status_code < 600):
                    # Server error or unknown error, retry
                    if attempt < max_retries:
                        delay = 2 ** (attempt - 1)
                        logger.info(f"Server error, retrying in {delay}s...")
                        time.sleep(delay)
                    else:
                        raise RuntimeError(f"Failed to register device after {max_retries} attempts: {str(e)}")
                else:
                    # Client error (4xx), don't retry
                    raise RuntimeError(f"Registration failed with client error: {str(e)}")

            except (ValueError, KeyError) as e:
                logger.error(f"Invalid registration response format: {str(e)}")
                if attempt < max_retries:
                    delay = 2 ** (attempt - 1)
                    logger.info(f"Retrying in {delay}s...")
                    time.sleep(delay)
                else:
                    raise RuntimeError(f"Failed to register device after {max_retries} attempts: {str(e)}")

            except Exception as e:
                logger.error(f"Unexpected error during registration: {str(e)}")
                if attempt < max_retries:
                    delay = 2 ** (attempt - 1)
                    logger.info(f"Retrying in {delay}s...")
                    time.sleep(delay)
                else:
                    raise RuntimeError(f"Failed to register device after {max_retries} attempts: {str(e)}")

        raise RuntimeError(f"Failed to register device after {max_retries} attempts")

    def sendToBasket(self, product_id, quantity, confidence):
        """
        Send high-confidence detection (≥70%) to basket

        Args:
            product_id (str): Product ID (e.g., "P001")
            quantity (int): Quantity detected
            confidence (float): Detection confidence (0.0-1.0)

        Returns:
            bool: True if successful, False otherwise
        """
        # Check if device registered
        if not self.device_id:
            logger.error("Cannot send to basket: device not registered")
            return False

        # Check circuit breaker
        if self._check_circuit_breaker():
            return False

        endpoint = f"{self.backend_url}/api/basket/items"
        payload = {
            "productId": product_id,
            "quantity": quantity,
            "confidence": confidence,
            "deviceId": self.device_id
        }

        max_retries = 2
        for attempt_num in range(max_retries + 1):  # 0, 1, 2 = 3 total attempts
            try:
                response = self.session.post(
                    endpoint,
                    json=payload,
                    timeout=self.timeout
                )
                response.raise_for_status()

                data = response.json()
                if data.get('success'):
                    logger.info(f"✅ Added {quantity}x {product_id} to basket (conf {confidence:.2f})")
                    self._record_success()
                    return True
                else:
                    logger.warning(f"Backend returned success=false for basket item: {data}")
                    self._record_failure()
                    return False

            except requests.exceptions.ConnectionError as e:
                logger.error(f"Cannot reach backend at {endpoint}: {str(e)}")
                if attempt_num < max_retries:
                    logger.info(f"Retrying basket API call (attempt {attempt_num + 2}/{max_retries + 1})...")
                    time.sleep(1)
                    continue  # Try next attempt
                else:
                    self._record_failure()
                    return False

            except requests.exceptions.Timeout as e:
                logger.error(f"Basket API request timed out after {self.timeout}s: {str(e)}")
                if attempt_num < max_retries:
                    logger.info(f"Retrying basket API call (attempt {attempt_num + 2}/{max_retries + 1})...")
                    time.sleep(1)
                    continue  # Try next attempt
                else:
                    self._record_failure()
                    return False

            except requests.exceptions.HTTPError as e:
                status_code = e.response.status_code if e.response else None

                if status_code and 400 <= status_code < 500:
                    # Client error (invalid data), don't retry
                    logger.error(f"Basket API client error (status {status_code}): {str(e)}")
                    logger.error(f"Payload: {payload}")
                    self._record_failure()
                    return False
                elif status_code and 500 <= status_code < 600:
                    # Server error, retry
                    logger.error(f"Basket API server error (status {status_code}): {str(e)}")
                    if attempt_num < max_retries:
                        logger.info(f"Retrying basket API call (attempt {attempt_num + 2}/{max_retries + 1})...")
                        time.sleep(1)
                        continue  # Try next attempt
                    else:
                        self._record_failure()
                        return False
                else:
                    logger.error(f"Basket API HTTP error: {str(e)}")
                    self._record_failure()
                    return False

            except Exception as e:
                logger.error(f"Unexpected error sending to basket: {str(e)}")
                logger.error(f"Payload: {payload}")
                self._record_failure()
                return False

        self._record_failure()
        return False

    def sendToPending(self, product_id, name, quantity, confidence):
        """
        Send low-confidence detection (<70%) to pending approval queue

        Args:
            product_id (str): Product ID (e.g., "P001")
            name (str): Product name for display (e.g., "Organic Apples")
            quantity (int): Quantity detected
            confidence (float): Detection confidence (0.0-1.0)

        Returns:
            bool: True if successful, False otherwise
        """
        # Check if device registered
        if not self.device_id:
            logger.error("Cannot send to pending: device not registered")
            return False

        # Check circuit breaker
        if self._check_circuit_breaker():
            return False

        endpoint = f"{self.backend_url}/api/basket/pending-items"
        payload = {
            "productId": product_id,
            "name": name,
            "quantity": quantity,
            "confidence": confidence,
            "deviceId": self.device_id
        }

        max_retries = 2
        for attempt_num in range(max_retries + 1):  # 0, 1, 2 = 3 total attempts
            try:
                response = self.session.post(
                    endpoint,
                    json=payload,
                    timeout=self.timeout
                )
                response.raise_for_status()

                data = response.json()
                if data.get('success'):
                    logger.info(f"📋 Sent {quantity}x {name} to pending approval (conf {confidence:.2f})")
                    self._record_success()
                    return True
                else:
                    logger.warning(f"Backend returned success=false for pending item: {data}")
                    self._record_failure()
                    return False

            except requests.exceptions.ConnectionError as e:
                logger.error(f"Cannot reach backend at {endpoint}: {str(e)}")
                if attempt_num < max_retries:
                    logger.info(f"Retrying pending API call (attempt {attempt_num + 2}/{max_retries + 1})...")
                    time.sleep(1)
                    continue  # Try next attempt
                else:
                    self._record_failure()
                    return False

            except requests.exceptions.Timeout as e:
                logger.error(f"Pending API request timed out after {self.timeout}s: {str(e)}")
                if attempt_num < max_retries:
                    logger.info(f"Retrying pending API call (attempt {attempt_num + 2}/{max_retries + 1})...")
                    time.sleep(1)
                    continue  # Try next attempt
                else:
                    self._record_failure()
                    return False

            except requests.exceptions.HTTPError as e:
                status_code = e.response.status_code if e.response else None

                if status_code == 400:
                    # Special handling: device not connected
                    logger.warning(f"Device not connected, cannot send to pending queue (status {status_code})")
                    logger.info("User may need to pair device via frontend UI")
                    self._record_failure()
                    return False
                elif status_code and 400 <= status_code < 500:
                    # Other client error, don't retry
                    logger.error(f"Pending API client error (status {status_code}): {str(e)}")
                    logger.error(f"Payload: {payload}")
                    self._record_failure()
                    return False
                elif status_code and 500 <= status_code < 600:
                    # Server error, retry
                    logger.error(f"Pending API server error (status {status_code}): {str(e)}")
                    if attempt_num < max_retries:
                        logger.info(f"Retrying pending API call (attempt {attempt_num + 2}/{max_retries + 1})...")
                        time.sleep(1)
                        continue  # Try next attempt
                    else:
                        self._record_failure()
                        return False
                else:
                    logger.error(f"Pending API HTTP error: {str(e)}")
                    self._record_failure()
                    return False

            except Exception as e:
                logger.error(f"Unexpected error sending to pending: {str(e)}")
                logger.error(f"Payload: {payload}")
                self._record_failure()
                return False

        self._record_failure()
        return False

    def checkHealth(self):
        """
        Check if backend is healthy

        Returns:
            bool: True if backend reachable and healthy
        """
        try:
            response = self.session.get(
                f"{self.backend_url}/health",
                timeout=5
            )
            response.raise_for_status()

            data = response.json()
            if data.get('status') == 'ok':
                logger.info("✅ Backend health check passed")
                return True
            else:
                logger.warning(f"Backend health check returned unexpected status: {data}")
                return False

        except requests.exceptions.ConnectionError as e:
            logger.error(f"Backend health check failed - cannot reach backend: {str(e)}")
            return False

        except requests.exceptions.Timeout as e:
            logger.error(f"Backend health check timed out: {str(e)}")
            return False

        except Exception as e:
            logger.error(f"Backend health check failed: {str(e)}")
            return False

    def _check_circuit_breaker(self):
        """
        Check if circuit breaker is open

        Returns:
            bool: True if circuit is open (block requests), False if closed
        """
        if self.circuit_open:
            if time.time() > self.circuit_open_until:
                # Circuit timeout expired, close circuit
                logger.info("🔌 Circuit breaker closed, resuming API calls")
                self.circuit_open = False
                self.failure_count = 0
                return False  # Circuit closed
            else:
                # Circuit still open
                return True  # Circuit open (block requests)
        return False  # Circuit closed

    def _record_failure(self):
        """Record API call failure, open circuit if threshold reached"""
        self.failure_count += 1
        logger.warning(f"⚠️  API call failed ({self.failure_count}/5 failures)")

        if self.failure_count >= 5:
            self.circuit_open = True
            self.circuit_open_until = time.time() + 30
            logger.error("🔌 Circuit breaker opened after 5 consecutive failures (30s pause)")

    def _record_success(self):
        """Record API call success, reset failure count"""
        if self.failure_count > 0:
            logger.info(f"✅ API call succeeded after {self.failure_count} failures, resetting counter")
        self.failure_count = 0
