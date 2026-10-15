import mongoose from 'mongoose';
import app from './app.js';
import { env } from './config.js';
import { syncPermissionCatalog } from './lib/syncCatalog.js';

async function start() {
  await mongoose.connect(env.mongoUri);
  await syncPermissionCatalog();
  console.log('MongoDB connected');

  const server = app.listen(env.port, () => {
    console.log(`API listening on port ${env.port}`);
  });

  const shutdown = async () => {
    server.close();
    await mongoose.disconnect();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

start().catch((err) => {
  console.error('Failed to start server', err);
  process.exit(1);
});
