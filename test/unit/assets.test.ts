import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = dirname(dirname(dirname(fileURLToPath(import.meta.url))));

describe('the generated assets', () => {
  it('are committed and up to date with the stylesheet and the script', () => {
    const generated = join(root, 'src', 'ui', 'assets.generated.ts');
    expect(existsSync(generated), 'src/ui/assets.generated.ts is missing').toBe(true);

    // Regenerate into a temporary copy and compare, so a stale committed file
    // fails here rather than shipping a page that does not match the CSS.
    const before = readFileSync(generated, 'utf8');
    execFileSync('node', ['scripts/gen-assets.mjs'], { cwd: root });
    const after = readFileSync(generated, 'utf8');
    expect(after, 'src/ui/assets.generated.ts is stale — run `npm run build`').toBe(before);
  });

  it('carry the real stylesheet and the real client script', () => {
    const generated = readFileSync(join(root, 'src', 'ui', 'assets.generated.ts'), 'utf8');
    const css = readFileSync(join(root, 'src', 'ui', 'styles.css'), 'utf8');
    const js = readFileSync(join(root, 'src', 'ui', 'app.js'), 'utf8');

    // The generated file holds the files as JSON strings, so a distinctive
    // marker from each one has to be in there.
    expect(generated).toContain(css.slice(0, 60));
    expect(generated).toContain(js.slice(0, 60));
    expect(generated).toContain('export const logo_png');
    expect(generated).toContain('export const favicon_png');
    expect(generated).toContain('export const favicon_svg');
  });
});
