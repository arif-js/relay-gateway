import { readFileSync } from 'node:fs';
import { defineConfig } from 'tsup';

const { version } = JSON.parse(readFileSync('./package.json', 'utf8')) as { version: string };

export default defineConfig({
  entry: { cli: 'src/cli.ts', mcp: 'src/mcp/main.ts' },
  format: ['esm'],
  platform: 'node',
  target: 'node22',
  clean: true,
  splitting: false,
  sourcemap: true,
  dts: false,
  // tsup 8.5 defaults `removeNodeProtocol: true`, which rewrites `node:sqlite`
  // to a bare `sqlite` import. There is no bare `sqlite` builtin, so the
  // bundled server would crash on startup. Keep the `node:` prefix.
  removeNodeProtocol: false,
  define: { __RELAY_VERSION__: JSON.stringify(version) },
});
