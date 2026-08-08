const winston = require('winston');
const { LOG_LEVEL, NODE_ENV } = require('../config/environment');

const formats = [
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
];

if (NODE_ENV === 'development') {
  formats.push(winston.format.colorize(), winston.format.simple());
} else {
  formats.push(winston.format.json());
}

const logger = winston.createLogger({
  level: LOG_LEVEL || 'info',
  format: winston.format.combine(...formats),
  transports: [
    new winston.transports.Console(),
  ],
});

module.exports = logger;
