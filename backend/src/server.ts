import { config } from './config/env.js';
import app from './app.js';
import prisma from './db/prisma.js';

const server = app.listen(config.port, () => {
  console.log(`[server] listening on http://localhost:${config.port} (${config.nodeEnv})`);
});

const shutdown = async (signal: NodeJS.Signals): Promise<void> => {
  console.log(`[server] received ${signal}, shutting down`);
  server.close(async () => {
    try {
      await prisma.$disconnect();
    } catch (err) {
      console.error('[server] error during prisma disconnect', err);
    }
    process.exit(0);
  });
};

process.on('SIGINT', () => {
  void shutdown('SIGINT');
});
process.on('SIGTERM', () => {
  void shutdown('SIGTERM');
});
