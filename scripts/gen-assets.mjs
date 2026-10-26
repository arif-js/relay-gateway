#!/usr/bin/env node
// Inlines the UI assets into a TypeScript module.
//
// The server reads the stylesheet and the client script at runtime. That works
// on a normal host, but a serverless bundler cannot see a file that is read
// with a dynamic path — it would not be in the bundle at all. Generating a
// module from the same files keeps one source of truth and works everywhere.
//
// Run by `npm run build`, `npm test`, and `npm run typecheck`. The generated
// module is a local build artifact and is intentionally not committed.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const source = join(root, 'src', 'ui');
const target = join(root, 'src', 'ui', 'assets.generated.ts');

const files = ['styles.css', 'app.js'];

const parts = files.map((file) => {
  const content = readFileSync(join(source, file), 'utf8');
  return `export const ${file.replace(/\W/g, '_')} = ${JSON.stringify(content)};`;
});

const logoBase64 = readFileSync(join(source, 'logo.png')).toString('base64');
parts.push(`export const logo_png = ${JSON.stringify(logoBase64)};`);

const faviconPngPath = join(source, 'favicon.png');
const faviconSvgPath = join(source, 'favicon.svg');
if (!existsSync(faviconPngPath) || !existsSync(faviconSvgPath)) {
  const { execFileSync } = await import('node:child_process');
  execFileSync('node', ['scripts/make-favicons.mjs'], { cwd: root, stdio: 'ignore' });
}

const faviconPngBase64 = readFileSync(faviconPngPath).toString('base64');
parts.push(`export const favicon_png = ${JSON.stringify(faviconPngBase64)};`);

const faviconSvg = readFileSync(faviconSvgPath, 'utf8');
parts.push(`export const favicon_svg = ${JSON.stringify(faviconSvg)};`);

// React SPA assets from Vite
const mainJsPath = join(root, 'client', 'dist', 'assets', 'main.js');
const mainCssPath = join(root, 'client', 'dist', 'assets', 'main.css');

if (!existsSync(mainJsPath) || !existsSync(mainCssPath)) {
  const { execFileSync } = await import('node:child_process');
  execFileSync('npx', ['vite', 'build'], { cwd: root, stdio: 'ignore' });
}

const mainJs = existsSync(mainJsPath) ? readFileSync(mainJsPath, 'utf8') : '';
const mainCss = existsSync(mainCssPath) ? readFileSync(mainCssPath, 'utf8') : '';

parts.push(`export const main_js = ${JSON.stringify(mainJs)};`);
parts.push(`export const main_css = ${JSON.stringify(mainCss)};`);

const banner = `// GENERATED FILE — do not edit.
//
// Run \`npm run build\` to regenerate it from the UI sources.
`;

writeFileSync(target, `${banner}\n${parts.join('\n')}\n`);
process.stdout.write(`generated ${target}\n`);
