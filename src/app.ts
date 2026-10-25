import { join } from 'node:path';
import { type Config, loadConfig } from './config.js';
import { openDatabase, type SqlDatabase } from './core/db.js';
import { Relay } from './core/relay.js';
import { Store } from './core/store.js';
import { createHttpServer } from './http/server.js';
import { createLogger, type Logger } from './logger.js';
import { createTelegramClient } from './telegram/fake.js';

export interface App {
  config: Config;
  db: SqlDatabase;
  store: Store;
  relay: Relay;
  logger: Logger;
}

/**
 * Wires the whole platform together. The HTTP server and the MCP server are
 * built on top of this, so both surfaces share one database, one service and
 * one set of rules.
 */
export function createApp(overrides: Partial<Config> = {}): App {
  const config = loadConfig(overrides);
  const logger = createLogger(config.logLevel);
  const db = openDatabase({
    url: config.databaseUrl,
    authToken: config.databaseAuthToken,
    path: join(config.dataDir, 'relay.sqlite'),
  });
  const store = new Store(db);
  const telegram = createTelegramClient(config.demo);
  const relay = new Relay(config, store, telegram, logger);

  return { config, db, store, relay, logger };
}

export { createHttpServer };
