import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// ビルド後のHTML/CSS内の絶対パス（base始まり）を相対パスに置き換える
const htmlAttr = `(href|src(set)?|poster|component-url|renderer-url)=["']?([^"']*,)?`;
const styleAttr = `style=("[^"]*|'[^']*|[^\\s]*)`;
const styleUrl = `url\\(\\s*?["']?`;

function toRelative(outDir, filePath) {
  return (
    path.relative(path.dirname(filePath), outDir).split(path.sep).join('/') ||
    '.'
  );
}

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function replaceHTML(html, base, relativePath) {
  const htmlPattern = `<[^>]+\\s(${htmlAttr}|${styleAttr}${styleUrl})`;
  const cssPattern = `<style>[^<]*${styleUrl}`;
  const regex = new RegExp(
    `(?<=(${htmlPattern}|${cssPattern})\\s*?)${escapeRegExp(base)}(?!/)`,
    'gm'
  );
  return html.replace(regex, `${relativePath}/`);
}

export function replaceCSS(css, base, relativePath) {
  const regex = new RegExp(
    `(?<=${styleUrl}\\s*?)${escapeRegExp(base)}(?!/)`,
    'gm'
  );
  return css.replace(regex, `${relativePath}/`);
}

export default function relativeLinks() {
  let base = '/';
  return {
    name: 'relative-links',
    hooks: {
      'astro:config:done': ({ config }) => {
        base = `/${config.base.replace(/^\/+|\/+$/g, '')}/`.replace('//', '/');
      },
      'astro:build:done': ({ dir }) => {
        const outDir = fileURLToPath(dir);
        const entries = readdirSync(outDir, {
          recursive: true,
          withFileTypes: true,
        });
        for (const entry of entries) {
          if (!entry.isFile()) continue;
          const filePath = path.join(entry.parentPath, entry.name);
          const replace = entry.name.endsWith('.html')
            ? replaceHTML
            : entry.name.endsWith('.css')
              ? replaceCSS
              : null;
          if (!replace) continue;
          const content = readFileSync(filePath, 'utf8');
          const relativePath = toRelative(outDir, filePath);
          writeFileSync(filePath, replace(content, base, relativePath), 'utf8');
        }
      },
    },
  };
}
