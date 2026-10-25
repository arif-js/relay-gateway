import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { loadConfig } from '../../src/config.js';
import { PLANS } from '../../src/core/plans.js';

const root = dirname(dirname(dirname(fileURLToPath(import.meta.url))));

function read(relative: string): string {
  return readFileSync(join(root, relative), 'utf8');
}

describe('the documented configuration', () => {
  it('lists every environment variable in .env.example', () => {
    const example = read('.env.example');
    const api = read('docs/api.md');
    const readme = read('README.md');

    const names = [...example.matchAll(/^#?\s*RELAY_[A-Z_]+/gm)].map((m) =>
      m[0].replace(/^#?\s*/, ''),
    );
    expect(names.length).toBeGreaterThan(8);

    for (const name of names) {
      expect(api, `${name} is missing from docs/api.md`).toContain(name);
      expect(readme, `${name} is missing from the README`).toContain(name);
    }
  });

  it('reads every variable it documents', () => {
    const example = read('.env.example');
    const documented = [...example.matchAll(/RELAY_[A-Z_]+/g)].map((m) => m[0]);
    const source = [read('src/config.ts'), read('src/cli.ts'), read('src/mcp/main.ts')].join('\n');
    for (const name of new Set(documented)) {
      expect(source, `${name} is documented but never read`).toContain(name);
    }
  });

  it('defaults the plan to self-host and reads it from the environment', () => {
    const previous = process.env.RELAY_PLAN;
    delete process.env.RELAY_PLAN;
    expect(loadConfig().plan).toBe('selfhost');
    process.env.RELAY_PLAN = 'hosted';
    expect(loadConfig().plan).toBe('hosted');
    if (previous === undefined) {
      delete process.env.RELAY_PLAN;
    } else {
      process.env.RELAY_PLAN = previous;
    }
  });

  it('keeps the demo flag off unless it is asked for', () => {
    const previous = process.env.RELAY_DEMO;
    delete process.env.RELAY_DEMO;
    expect(loadConfig().demo).toBe(false);
    process.env.RELAY_DEMO = '1';
    expect(loadConfig().demo).toBe(true);
    if (previous === undefined) {
      delete process.env.RELAY_DEMO;
    } else {
      process.env.RELAY_DEMO = previous;
    }
  });
});

describe('the plans', () => {
  it('has a self-host plan with no ceilings and a free hosted plan', () => {
    expect(PLANS.selfhost.priceUsd).toBe(0);
    expect(PLANS.selfhost.limits.maxTenants).toBeNull();
    // The $5 a month is our running cost, not a price we charge.
    expect(PLANS.hosted.priceUsd).toBe(0);
    expect(PLANS.hosted.limits.maxTenants).toBe(3);
  });

  it('states the running cost in the README and the pricing page', () => {
    // The $5 is what we pay to run the platform, not what we charge.
    expect(read('README.md')).toContain('$5-a-month');
    expect(read('src/ui/pages.ts')).toContain('$5');
  });
});

describe('the agent guide', () => {
  it('documents the layer map with the four labels', () => {
    const guide = read('AGENTS.md');
    for (const label of ['L0', 'L1', 'L2', 'L3', 'L4']) {
      expect(guide).toContain(label);
    }
  });

  it('points at every skill and role it lists', () => {
    const guide = read('AGENTS.md');
    const paths = [
      ...guide.matchAll(/\.agents\/(?:skills|agents)\/[\w-]+\/[\w-]+\.md/g),
      ...guide.matchAll(/\.agents\/agents\/[\w-]+\.md/g),
    ].map((m) => m[0]);
    expect(paths.length).toBeGreaterThan(4);
    for (const path of new Set(paths)) {
      expect(() => read(path), `${path} is listed but missing`).not.toThrow();
    }
  });
});
