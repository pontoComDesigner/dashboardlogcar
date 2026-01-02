/**
 * Utilitário de Logging
 */

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function getTimestamp() {
  return new Date().toISOString();
}

function formatMessage(level, message, color) {
  return `${color}${colors.bright}[${getTimestamp()}] [${level}]${colors.reset} ${message}`;
}

const logger = {
  info: (message) => {
    console.log(formatMessage('INFO', message, colors.blue));
  },
  
  success: (message) => {
    console.log(formatMessage('SUCCESS', message, colors.green));
  },
  
  warn: (message) => {
    console.warn(formatMessage('WARN', message, colors.yellow));
  },
  
  error: (message, error) => {
    const errorMessage = error 
      ? `${message}: ${error.message || error}`
      : message;
    console.error(formatMessage('ERROR', errorMessage, colors.red));
    if (error && error.stack) {
      console.error(error.stack);
    }
  },
  
  debug: (message) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(formatMessage('DEBUG', message, colors.magenta));
    }
  }
};

module.exports = { logger };



