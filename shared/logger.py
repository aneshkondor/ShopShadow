import logging
import os
from datetime import datetime
from pathlib import Path
from logging.handlers import RotatingFileHandler
import colorlog

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

LOG_DIR = os.getenv('LOG_FILE_PATH', './logs')

# Create logs directory if it doesn't exist
Path(LOG_DIR).mkdir(parents=True, exist_ok=True)

# Per-run log file with timestamp
timestamp = datetime.now().strftime('%Y-%m-%d-%H-%M-%S')
log_file_name = f'shopshadow-{timestamp}.log'
log_file_path = os.path.join(LOG_DIR, log_file_name)

# Custom log format (matching Node.js format)
LOG_FORMAT = '%(asctime)s [%(levelname)s] %(message)s'
DATE_FORMAT = '%Y-%m-%d %H:%M:%S'

# Create logger
logger = logging.getLogger('shopshadow')
logger.setLevel(logging.DEBUG if os.getenv('LOG_LEVEL', 'DEBUG') == 'DEBUG' else logging.INFO)

# File handler (per-run log file)
file_handler = RotatingFileHandler(
    log_file_path,
    maxBytes=10 * 1024 * 1024,  # 10MB
    backupCount=14  # Keep 14 backup files
)
file_handler.setLevel(logging.DEBUG)
file_formatter = logging.Formatter(LOG_FORMAT, datefmt=DATE_FORMAT)
file_handler.setFormatter(file_formatter)

# Console handler with colors
console_handler = colorlog.StreamHandler()
console_handler.setLevel(logging.DEBUG)
console_formatter = colorlog.ColoredFormatter(
    '%(log_color)s' + LOG_FORMAT,
    datefmt=DATE_FORMAT,
    log_colors={
        'DEBUG': 'cyan',
        'INFO': 'green',
        'WARNING': 'yellow',
        'ERROR': 'red',
        'CRITICAL': 'red,bg_white',
    }
)
console_handler.setFormatter(console_formatter)

# Add handlers to logger
logger.addHandler(file_handler)
logger.addHandler(console_handler)

# Export logger methods (matching Node.js API)
def debug(message, **kwargs):
    extra_msg = ' ' + str(kwargs) if kwargs else ''
    logger.debug(message + extra_msg)

def info(message, **kwargs):
    extra_msg = ' ' + str(kwargs) if kwargs else ''
    logger.info(message + extra_msg)

def warn(message, **kwargs):
    extra_msg = ' ' + str(kwargs) if kwargs else ''
    logger.warning(message + extra_msg)

def error(message, **kwargs):
    extra_msg = ' ' + str(kwargs) if kwargs else ''
    logger.error(message + extra_msg)
