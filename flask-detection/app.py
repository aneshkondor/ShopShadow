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

# Create Flask app
app = Flask(__name__)

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

    return config

# Export config for other modules
try:
    CONFIG = get_config()
    logger.info("Flask app configuration loaded successfully")
except Exception as e:
    logger.error(f"Failed to load configuration: {str(e)}")
    CONFIG = None

if __name__ == '__main__':
    host = os.getenv('FLASK_HOST', '0.0.0.0')
    port = int(os.getenv('FLASK_PORT', 5000))

    logger.info(f"Starting Flask detection service on {host}:{port}")
    app.run(host=host, port=port, debug=app.config['DEBUG'])
