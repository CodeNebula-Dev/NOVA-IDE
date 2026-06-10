/**
 * markdown-preview.test.js
 *
 * Tests for the Markdown preview & code view toggle feature.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { STYLES_CSS_PATH, INDEX_HTML_PATH } from './test-setup.js';

const cssText = readFileSync(STYLES_CSS_PATH, 'utf8');
const htmlText = readFileSync(INDEX_HTML_PATH, 'utf8');

describe('Markdown Preview & Code Toggle Layout & Styles', () => {
  it('index.html loads marked.umd.js before Monaco loader', () => {
    const headMatch = htmlText.match(/<head[\s\S]*?<\/head>/i);
    expect(headMatch, 'Could not find <head> block in index.html').toBeTruthy();
    const headContent = headMatch[0];

    expect(headContent).toContain('marked/lib/marked.umd.js');
    expect(headContent).toContain('monaco-editor/min/vs/loader.js');

    const markedIdx = headContent.indexOf('marked/lib/marked.umd.js');
    const monacoIdx = headContent.indexOf('monaco-editor/min/vs/loader.js');
    expect(markedIdx).toBeLessThan(monacoIdx);
  });

  it('index.html defines markdown preview container and toggle controls', () => {
    expect(htmlText).toContain('id="markdownToggleContainer"');
    expect(htmlText).toContain('id="markdownCodeBtn"');
    expect(htmlText).toContain('id="markdownPreviewBtn"');
    expect(htmlText).toContain('id="markdownPreviewContainer"');
  });

  it('styles.css contains rules for breadcrumbs container layout', () => {
    expect(cssText).toContain('.breadcrumbs-container');
    expect(cssText).toContain('.markdown-toggle-container');
    expect(cssText).toContain('.markdown-toggle-pill');
    expect(cssText).toContain('.markdown-toggle-btn');
  });

  it('styles.css contains rules for markdown preview styles', () => {
    expect(cssText).toContain('.markdown-preview-container');
    expect(cssText).toContain('.markdown-preview-container h1');
    expect(cssText).toContain('.markdown-preview-container pre');
    expect(cssText).toContain('.markdown-preview-container table');
  });
});
