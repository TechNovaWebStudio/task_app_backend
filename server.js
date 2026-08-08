const { validateEnv, PORT } = require('./config/environment');
const connectDB = require('./config/database');
const logger = require('./utils/logger');

// 1. Validate environment variables
validateEnv();

// 2. Connect to MongoDB then start server
const startServer = async () => {
  await connectDB();

  const app = require('./app');

  const server = app.listen(PORT, () => {
    logger.info(`🚀 Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  });

  // Graceful shutdown
  const shutdown = (signal) => {
    logger.info(`${signal} received. Shutting down gracefully...`);
    server.close(() => {
      logger.info('HTTP server closed.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled Rejection:', reason);
    server.close(() => process.exit(1));
  });
};

startServer();
