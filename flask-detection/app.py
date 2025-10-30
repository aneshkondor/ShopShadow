from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import os
import sys

# Load environment variables
load_dotenv()

# Add parent directory to path to access shared modules
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

# Import shared logger from Task 1.6
from shared.logger import logger

# Import backend client for API communication (Task 3.5)
from api.backend_client import BackendClient

# Create Flask app
app = Flask(__name__)

# Backend client instance (initialized on startup)
backend_client = None

# Configure CORS for backend communication
backend_url = os.getenv('BACKEND_API_URL', 'http://localhost:3000')
CORS(app, origins=[backend_url])

# Configure app settings
app.config['DEBUG'] = os.getenv('DEBUG', 'False').lower() == 'true'

# Request logging middleware
@app.before_request
def log_request():
    logger.info(f"{request.method} {request.path}")

# Global error handler
@app.errorhandler(Exception)
def handle_error(error):
    logger.error(f"Error handling request: {str(error)}", exc_info=True)
    return jsonify({'error': str(error)}), 500

# Health check endpoint
@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'ok'}), 200

# Configuration helper
def get_config():
    """Load and validate all required environment variables"""
    required_vars = [
        'CAMERA_INDEX',
        'CONFIDENCE_THRESHOLD',
        'DETECTION_INTERVAL',
        'BACKEND_API_URL',
        'YOLO_MODEL_PATH',
        'LOG_FILE_PATH'
    ]

    config = {}
    missing = []

    for var in required_vars:
        value = os.getenv(var)
        if value is None:
            missing.append(var)
        else:
            # Type conversions for numeric values
            if var == 'CAMERA_INDEX':
                config[var] = int(value)
            elif var == 'CONFIDENCE_THRESHOLD':
                config[var] = float(value)
            elif var == 'DETECTION_INTERVAL':
                config[var] = int(value)
            else:
                config[var] = value

    if missing:
        raise EnvironmentError(f"Missing required environment variables: {', '.join(missing)}")

    # Add optional YOLO configuration with defaults
    config['YOLO_DEVICE'] = os.getenv('YOLO_DEVICE', 'auto')
    config['YOLO_IOU_THRESHOLD'] = float(os.getenv('YOLO_IOU_THRESHOLD', '0.45'))
    config['YOLO_MAX_DETECTIONS'] = int(os.getenv('YOLO_MAX_DETECTIONS', '300'))

    return config

# Export config for other modules
try:
    CONFIG = get_config()
    logger.info("Flask app configuration loaded successfully")
except Exception as e:
    logger.error(f"Failed to load configuration: {str(e)}")
    CONFIG = None


def init_backend_client():
    """
    Initialize and register backend client

    Called by Task 3.6 (main loop) on startup before detection begins.
    Performs health check and device registration.

    Returns:
        BackendClient: Initialized and registered backend client

    Raises:
        SystemExit: If device registration fails (cannot operate without it)
    """
    global backend_client

    backend_url = CONFIG['BACKEND_API_URL']
    backend_client = BackendClient(backend_url)

    # Check backend health
    if not backend_client.checkHealth():
        logger.warning("Backend health check failed, but continuing anyway")

    # Register device
    try:
        device_id = backend_client.registerDevice()
        logger.info(f"✅ Device registered: {device_id} (pairing code: {backend_client.device_code})")
        logger.info(f"User can pair this device in the frontend using code: {backend_client.device_code}")
    except RuntimeError as e:
        logger.error(f"Failed to register device: {e}")
        logger.error("Cannot operate without device registration. Exiting.")
        sys.exit(1)

    return backend_client


# Export app, config, and backend client initialization function
__all__ = ['app', 'CONFIG', 'backend_client', 'init_backend_client']


if __name__ == '__main__':
    host = os.getenv('FLASK_HOST', '0.0.0.0')
    port = int(os.getenv('FLASK_PORT', 5000))

    logger.info(f"Starting Flask detection service on {host}:{port}")
    app.run(host=host, port=port, debug=app.config['DEBUG'])
