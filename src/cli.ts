#!/usr/bin/env node
import { createApp } from './app.js';
import { getPlan } from './core/plans.js';
import { createHttpServer } from './http/server.js';

const args = process.argv.slice(2);
const command = args[0] ?? 'serve';

async function serve(): Promise<void> {
  const app = createApp();
  const server = createHttpServer({
    config: app.config,
    relay: app.relay,
    logger: app.logger,
    store: app.store,
  });

  await new Promise<void>((resolve) => {
    server.listen(app.config.port, app.config.host, resolve);
  });

  const plan = getPlan(app.config.plan);
  app.logger.info('relay-gateway is listening', {
    url: `http://${app.config.host}:${app.config.port}`,
    public_url: app.config.publicUrl,
    plan: plan.name,
    demo: app.config.demo,
  });

  if (app.config.demo) {
    app.logger.info('demo mode: Telegram is faked in-process, nothing leaves this machine');
  } else if ((await app.relay.managerCanManageBots()) === false) {
    app.logger.error(
      'The manager bot cannot create bots: enable Bot Management Mode for it in @BotFather',
    );
  }

  const shutdown = (): void => {
    app.logger.info('shutting down');
    server.close(() => {
      app.db.close();
      process.exit(0);
    });
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

async function main(): Promise<void> {
  switch (command) {
    case 'serve':
      await serve();
      return;
    case 'key': {
      const app = createApp();
      process.stdout.write(`${app.config.adminKey}\n`);
      app.db.close();
      return;
    }
    default:
      process.stdout.write(
        [
          'relay-gateway — multi-tenant Telegram messaging for developers',
          '',
          'Usage:',
          '  relay-gateway serve    start the HTTP server and the web UI',
          '  relay-gateway key      print the platform (admin) key',
          '',
          'Environment: see docs/plan.md and .env.example',
          '',
        ].join('\n'),
      );
      return;
  }
}

main().catch((cause) => {
  process.stderr.write(`fatal: ${cause instanceof Error ? cause.stack : String(cause)}\n`);
  process.exit(1);
});
