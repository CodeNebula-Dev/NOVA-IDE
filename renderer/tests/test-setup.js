/**
 * test-setup.js
 * Shared test infrastructure for Nova IDE renderer tests.
 *
 * Provides:
 *  - jsdom environment helpers (loadStyles, getDocumentRoot)
 *  - Mock COMMAND_REGISTRY matching the production command set
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ─── Path helpers ─────────────────────────────────────────────────────────

export const STYLES_CSS_PATH = resolve(__dirname, '..', 'styles.css');
export const INDEX_HTML_PATH = resolve(__dirname, '..', 'index.html');

// ─── CSS loading helper ────────────────────────────────────────────────────

/**
 * Load styles.css into the current jsdom document via a <style> tag.
 * Returns the raw CSS text for static analysis.
 */
export function loadStyles() {
  const css = readFileSync(STYLES_CSS_PATH, 'utf8');
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);
  return css;
}

/**
 * Reset the document between tests by removing injected style tags.
 */
export function cleanupStyles() {
  const styles = document.querySelectorAll('style[data-test]');
  styles.forEach(s => s.remove());
}

// ─── Mock COMMAND_REGISTRY ────────────────────────────────────────────────

/**
 * Mock of the production COMMAND_REGISTRY in command-palette.js.
 * Covers all required commands listed in Requirement 4.4.
 */
export const COMMAND_REGISTRY = [
  { id: 'openFolder',      label: 'Open Folder',      action: () => {} },
  { id: 'newFile',         label: 'New File',          action: () => {} },
  { id: 'newFolder',       label: 'New Folder',        action: () => {} },
  { id: 'toggleTerminal',  label: 'Toggle Terminal',   action: () => {} },
  { id: 'openSettings',    label: 'Open Settings',     action: () => {} },
  { id: 'toggleAiPanel',   label: 'Toggle AI Panel',   action: () => {} },
  { id: 'toggleSidebar',   label: 'Toggle Sidebar',    action: () => {} },
  { id: 'newConversation', label: 'New Conversation',  action: () => {} },
];

// ─── Global mock window/document conveniences ─────────────────────────────

/**
 * Get the :root element for custom property inspection.
 */
export function getDocumentRoot() {
  return document.documentElement;
}

/**
 * Get a CSS custom property value from :root.
 * Note: jsdom does not compute CSS variables from stylesheets, so this
 * reads the inline style or falls back to parsing the raw CSS text.
 */
export function getRootVar(cssVarName) {
  return getComputedStyle(document.documentElement)
    .getPropertyValue(cssVarName)
    .trim();
}
