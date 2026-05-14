// Disable SSR for Tauri (the app runs entirely client-side in a webview).
// See https://v2.tauri.app/start/frontend/sveltekit/
export const ssr = false;

// Prerender the fallback so adapter-static produces an index.html SPA shell.
export const prerender = true;
