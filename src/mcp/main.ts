import { createApp } from '../app.js';
import { startMcpServer } from './server.js';

const app = createApp();

await startMcpServer({
  relay: app.relay,
  store: app.store,
  adminKey: app.config.adminKey,
});
