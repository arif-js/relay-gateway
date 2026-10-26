import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = dirname(dirname(dirname(fileURLToPath(import.meta.url))));

describe('the generated assets', () => {
  it('include the source UI and built frontend assets', () => {
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
    expect(generated).toContain('export const favicon_16_png');
    expect(generated).toContain('export const favicon_32_png');
    expect(generated).toContain('export const favicon_ico');
    expect(generated).toContain('export const apple_touch_icon');
    expect(generated).toContain('export const main_js');
    expect(generated).toContain('export const main_css');
  });
});
