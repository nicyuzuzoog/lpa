import app from './app.js';
import config from './config/index.js';
import { connectDB } from './config/db.js';

async function main() {
  await connectDB();
  app.listen(config.port, () => {
    console.log(`[server] running on http://localhost:${config.port} (${config.nodeEnv})`);
  });
}

main().catch((err) => {
  console.error('[server] failed to start:', err);
  process.exit(1);
});
