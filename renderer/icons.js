/* ─────────────────────────────────────────────────────────────
 *  Nova IDE – SVG Icon Set
 *  Minimalist Lucide-style stroke icons (24×24 viewBox, 1.5px stroke)
 *  Injected into the DOM on DOMContentLoaded to replace emoji fallbacks
 * ───────────────────────────────────────────────────────────── */

const NOVA_ICONS = {
  /* ── Activity Bar Icons ────────────────────────────────── */

  explorer: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
    <line x1="9" y1="14" x2="15" y2="14"/>
  </svg>`,

  search: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="11" cy="11" r="8"/>
    <line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>`,

  ai: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M12 2l2.09 6.26L20.18 10l-6.09 1.74L12 18l-2.09-6.26L3.82 10l6.09-1.74L12 2z"/>
    <line x1="18" y1="18" x2="21" y2="21"/>
    <line x1="18" y1="3" x2="18" y2="6"/>
    <line x1="3" y1="18" x2="6" y2="18"/>
  </svg>`,

  terminal: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="4 17 10 11 4 5"/>
    <line x1="12" y1="19" x2="20" y2="19"/>
  </svg>`,

  settings: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
  </svg>`,

  git: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="18" cy="18" r="3"/>
    <circle cx="6" cy="6" r="3"/>
    <circle cx="6" cy="18" r="3"/>
    <path d="M18 15V9a4 4 0 0 0-4-4H9"/>
    <line x1="6" y1="9" x2="6" y2="15"/>
  </svg>`,

  ollama: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    <path d="M7 3v4M17 3v4" />
    <circle cx="10" cy="11" r="1.5" />
    <circle cx="14" cy="11" r="1.5" />
    <path d="M9 15a3 3 0 0 0 6 0" />
    <path d="M11 15h2" />
    <path d="M12 18v3" />
  </svg>`,

  gitBranch: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <line x1="6" y1="3" x2="6" y2="15"/>
    <circle cx="18" cy="6" r="3"/>
    <circle cx="6" cy="18" r="3"/>
    <path d="M18 6a4 4 0 0 1-4 4h-4a4 4 0 0 0-4 4"/>
  </svg>`,

  gitCommit: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="4"/>
    <line x1="3" y1="12" x2="8" y2="12"/>
    <line x1="16" y1="12" x2="21" y2="12"/>
  </svg>`,

  gitPush: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M12 2v16M12 2l-4 4M12 2l4 4M4 22h16"/>
  </svg>`,

  gitPull: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M12 18V2M12 18l-4-4M12 18l4-4M4 22h16"/>
  </svg>`,

  /* ── Utility Icons ─────────────────────────────────────── */

  close: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/>
    <line x1="6" y1="6" x2="18" y2="18"/>
  </svg>`,

  plus: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"/>
    <line x1="5" y1="12" x2="19" y2="12"/>
  </svg>`,

  chevronRight: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="9 18 15 12 9 6"/>
  </svg>`,

  chevronDown: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="6 9 12 15 18 9"/>
  </svg>`,

  /* ── File Type Icons ───────────────────────────────────── */

  file: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
  </svg>`,

  folder: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
  </svg>`,

  folderOpen: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M5 19a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4l2 3h9a2 2 0 0 1 2 2v1"/>
    <path d="M5 19h14a2 2 0 0 0 2-1.85l1-9.15H7l-2 11z"/>
  </svg>`,

  /* ── Editor / Diff Icons ───────────────────────────────── */

  diffAccept: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>`,

  diffReject: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/>
    <line x1="6" y1="6" x2="18" y2="18"/>
  </svg>`,

  send: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <line x1="22" y1="2" x2="11" y2="13"/>
    <polygon points="22 2 15 22 11 13 2 9 22 2"/>
  </svg>`,

  refresh: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="23 4 23 10 17 10"/>
    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
  </svg>`,

  newFile: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="12" y1="18" x2="12" y2="12"/>
    <line x1="9" y1="15" x2="15" y2="15"/>
  </svg>`,

  newFolder: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
    <line x1="12" y1="11" x2="12" y2="17"/>
    <line x1="9" y1="14" x2="15" y2="14"/>
  </svg>`,

  layoutSidebarLeft: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2"/>
    <line x1="9" y1="3" x2="9" y2="21"/>
  </svg>`,

  layoutSidebarRight: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2"/>
    <line x1="15" y1="3" x2="15" y2="21"/>
  </svg>`,

  layoutPanelBottom: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2"/>
    <line x1="3" y1="15" x2="21" y2="15"/>
  </svg>`,
};

/* ── Colorful SVG File Type Icons ───────────────────────── */
const FILE_TYPE_ICONS = {
  py: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 2c-5.5 0-5 2-5 4h5v1H7c-2 0-4 .5-4 4s2 4 4 4h1v-1.5c0-1.5 1-2.5 2.5-2.5h4.5c1.5 0 2-1 2-2.5V7c0-2.5-1.5-5-7-5z" fill="#387eb8"/><path d="M12 22c5.5 0 5-2 5-4h-5v-1h5c2 0 4-.5 4-4s-2-4-4-4h-1v1.5c0 1.5-1 2.5-2.5 2.5H9c-1.5 0-2 1-2 2.5v2c0 2.5 1.5 5 7 5z" fill="#ffe052"/><circle cx="9" cy="5" r="1" fill="#fff"/><circle cx="15" cy="19" r="1" fill="#fff"/></svg>`,
  js: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect width="20" height="20" x="2" y="2" rx="3" fill="#f7df1e"/><path d="M12.5 12.5c0 1.5-.7 2.2-2 2.2-.8 0-1.4-.3-1.6-.7l1-.6c.1.3.3.4.6.4.4 0 .7-.2.7-.7v-4.6h1.3v4.5zm4.8-.4c0 1.3-.7 1.9-1.9 1.9-1.1 0-1.7-.5-1.9-1l1-.6c.1.3.4.5.8.5.4 0 .6-.2.6-.5 0-.4-.3-.5-.8-.7l-.4-.2c-.7-.3-1.3-.7-1.3-1.6 0-1.1.8-1.8 1.9-1.8.9 0 1.5.3 1.7.8l-1 .6c-.1-.3-.3-.4-.6-.4-.3 0-.5.1-.5.4 0 .3.2.4.7.6l.4.2c.8.3 1.4.7 1.4 1.8z" fill="#000"/></svg>`,
  ts: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect width="20" height="20" x="2" y="2" rx="3" fill="#3178c6"/><path d="M7 8h5v1.3H9.7v5.5H8.3V9.3H7V8zm10.3 4.1c0 1.3-.7 1.9-1.9 1.9-1.1 0-1.7-.5-1.9-1l1-.6c.1.3.4.5.8.5.4 0 .6-.2.6-.5 0-.4-.3-.5-.8-.7l-.4-.2c-.7-.3-1.3-.7-1.3-1.6 0-1.1.8-1.8 1.9-1.8.9 0 1.5.3 1.7.8l-1 .6c-.1-.3-.3-.4-.6-.4-.3 0-.5.1-.5.4 0 .3.2.4.7.6l.4.2c.8.3 1.4.7 1.4 1.8z" fill="#fff"/></svg>`,
  jsx: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#61dafb" stroke-width="1.5"><ellipse cx="12" cy="12" rx="4" ry="11" transform="rotate(30 12 12)"/><ellipse cx="12" cy="12" rx="4" ry="11" transform="rotate(90 12 12)"/><ellipse cx="12" cy="12" rx="4" ry="11" transform="rotate(150 12 12)"/><circle cx="12" cy="12" r="2" fill="#61dafb"/></svg>`,
  tsx: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#61dafb" stroke-width="1.5"><ellipse cx="12" cy="12" rx="4" ry="11" transform="rotate(30 12 12)"/><ellipse cx="12" cy="12" rx="4" ry="11" transform="rotate(90 12 12)"/><ellipse cx="12" cy="12" rx="4" ry="11" transform="rotate(150 12 12)"/><circle cx="12" cy="12" r="2" fill="#61dafb"/></svg>`,
  html: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M4 2l1.5 17L12 22l6.5-3L20 2H4zm12 5H9.3l.2 2H16l-.4 4.5-3.6 1.5-3.6-1.5-.2-2.5h2l.1 1 1.7.6 1.7-.6.2-2.2H7.6l-.6-6h9.6l-.2 2z" fill="#e34f26"/></svg>`,
  css: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M4 2l1.5 17L12 22l6.5-3L20 2H4zm12 5H9.3l.2 2H16l-.4 4.5-3.6 1.5-3.6-1.5-.2-2.5h2l.1 1 1.7.6 1.7-.6.2-2.2H7.6l-.6-6h9.6l-.2 2z" fill="#1572b6"/></svg>`,
  json: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f1c40f" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m0 4v3a2 2 0 0 0 2 2h3m8-14h3a2 2 0 0 1 2 2v3m0 4v3a2 2 0 0 1-2 2h-3M9 8h.01M15 8h.01M9 16h6"/></svg>`,
  md: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7f8c8d" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 8v8M7 8l3 4 3-4v8M17 8l2 2.5-2 2.5M15 10.5h4"/></svg>`,
  go: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14.5c-.8 0-1.5-.3-2-.8-.5-.5-.8-1.2-.8-2s.3-1.5.8-2c.5-.5 1.2-.8 2-.8.6 0 1.2.2 1.6.5l-.8 1.2c-.3-.2-.5-.3-.8-.3-.4 0-.7.1-.9.4-.2.3-.3.6-.3 1s.1.7.3.9c.2.3.5.4.9.4.3 0 .5-.1.8-.3l.8 1.2c-.4.3-1 .5-1.6.5zm5-1.5h-1.5v-3H13v3h-1.5v-7h1.5v2.5h1.5V9h1.5v7z" fill="#00acd7"/></svg>`,
  rs: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#e05d44" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v10M7 12h10M8.5 8.5l7 7M15.5 8.5l-7 7"/></svg>`,
  java: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M6 15c0 1.5 2 2.5 5 2.5s5-1 5-2.5M4 18c0 1.5 3 3 7.5 3s7.5-1.5 7.5-3M10 2c0 2-2 3-2 5s3 3 3 5-1 3-1 4M14 1c0 2-2 3-2 5.5s3 2.5 3 4.5-1 2.5-1 3.5" stroke="#f89820" stroke-width="1.5" stroke-linecap="round"/><ellipse cx="11.5" cy="15" rx="5.5" ry="1.5" fill="#f89820" opacity="0.3"/></svg>`,
  c: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00599c" stroke-width="2" stroke-linecap="round"><path d="M17 8a5 5 0 1 0 0 8"/></svg>`,
  cpp: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00599c" stroke-width="2" stroke-linecap="round"><path d="M14 8a5 5 0 1 0 0 8M17 12h4M19 10v4"/></svg>`,
  rb: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 2L3 9l9 13 9-13L12 2z" fill="#cc342d"/><path d="M12 2v20L21 9l-9-7z" fill="#9b1b18"/></svg>`,
  php: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect width="20" height="12" x="2" y="6" rx="3" fill="#777bb4"/><path d="M7 9h1.5c.8 0 1.3.4 1.3 1s-.5 1-1.3 1H7v2h-1V9zm1 .8V11h.5c.3 0 .5-.1.5-.4s-.2-.4-.5-.4H8zm6.5-.8h1.5c.8 0 1.3.4 1.3 1s-.5 1-1.3 1H15.5v2h-1V9zm1 .8V11h.5c.3 0 .5-.1.5-.4s-.2-.4-.5-.4H15.5zm-5 1.7h1.5v.5h-1.5v-3h-1v4.5h1v-2z" fill="#fff"/></svg>`,
  swift: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M21 16c-3-3-8-4-11-2.5 4.5-4.5 9-3.5 11-1.5-6.5-6.5-15.5-2.5-17.5 1 2.5-4.5 10-6.5 14-4-9 1.5-13.5 9.5-13.5 15.5 3 0 7.5-3.5 10.5-6.5-.5.5-1.5 1-2.5 1 4.5-2.5 7.5-6.5 8.5-9z" fill="#fa7343"/></svg>`,
  sh: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2ecc71" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>`,
  zsh: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2ecc71" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>`,
  yaml: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#e67e22" stroke-width="2"><path d="M4 6h16M4 12h16M4 18h16"/></svg>`,
  yml: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#e67e22" stroke-width="2"><path d="M4 6h16M4 12h16M4 18h16"/></svg>`,
  gitignore: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f05032" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M7.5 7.5l9 9M9 12a3 3 0 1 0 6 0 3 3 0 1 0-6 0"/></svg>`,
};

function getFileIcon(filename) {
  if (!filename) return NOVA_ICONS.file;
  
  const ext = filename.split(".").pop().toLowerCase();
  
  if (filename === ".gitignore" || filename === "gitignore") {
    return FILE_TYPE_ICONS.gitignore;
  }
  
  return FILE_TYPE_ICONS[ext] || NOVA_ICONS.file;
}

/* ── Expose globally for other scripts ───────────────────── */
window.NOVA_ICONS = NOVA_ICONS;
window.FILE_TYPE_ICONS = FILE_TYPE_ICONS;
window.getFileIcon = getFileIcon;

/* ── Inject SVG icons into DOM on load ───────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  // Map element IDs to icon names
  const iconMappings = {
    iconExplorer: 'explorer',
    iconSearch:   'search',
    iconGit:      'git',
    iconAI:       'ai',
    iconTerminal: 'terminal',
    iconSettings: 'settings',
    iconOllama:   'ollama',
    iconNewFile:  'newFile',
    iconNewFolder: 'newFolder',
    iconGitRefresh: 'refresh',
    iconGitPull:  'gitPull',
    iconGitPush:  'gitPush',
    iconGitCommit: 'gitCommit',
    iconTerminalClose: 'close',
    iconGitCreateBranch: 'plus',
    iconTerminalAdd: 'plus',
    outlineChevron: 'chevronDown',
    iconToggleSidebar: 'layoutSidebarLeft',
    iconToggleTerminal: 'layoutPanelBottom',
    iconToggleAi: 'layoutSidebarRight',
  };

  for (const [elementId, iconName] of Object.entries(iconMappings)) {
    const el = document.getElementById(elementId);
    if (el && NOVA_ICONS[iconName]) {
      el.innerHTML = NOVA_ICONS[iconName];
    }
  }
});
