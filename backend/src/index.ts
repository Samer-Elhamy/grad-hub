import 'reflect-metadata';
import { createApp } from './app';
import { config } from './config';
import { initWebSocketServer } from './websocket/ws-server';

/**
 * Bootstrap the Express server with WebSocket and graceful shutdown support.
 * Handles SIGTERM and SIGINT for clean container/process termination.
 */
function start(): void {
  const app = createApp();

  const server = app.listen(config.port, () => {
    console.log(`🚀 Grad Hub API running on http://localhost:${config.port}`);
    console.log(`   Environment: ${config.nodeEnv}`);
    console.log(`   CORS origins: ${config.corsOrigin.join(', ')}`);
  });

  // Initialize WebSocket server for real-time idea streaming
  const wsService = initWebSocketServer(server);
  console.log(`📡 WebSocket server ready at ws://localhost:${config.port}/ws/stream`);

  /**
   * Graceful shutdown handler.
   * Stops WebSocket, then HTTP connections. Forces exit after 10-second timeout.
   */
  function shutdown(signal: string): void {
    console.log(`\n${signal} received — shutting down gracefully...`);

    // Shutdown WebSocket first
    wsService.shutdown();

    server.close(() => {
      console.log('✓ HTTP server closed');
      process.exit(0);
    });

    // Forceful shutdown if graceful close takes too long
    const forceExit = setTimeout(() => {
      console.error('⚠ Forceful shutdown after timeout (10s)');
      process.exit(1);
    }, 10000);

    // Allow process to exit if server.close completes
    forceExit.unref();
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

start();
