import { invoke } from '@tauri-apps/api/core';

/**
 * Wait for the renderer to be print-ready (all fonts loaded, all images
 * fetched), then open the OS print dialog via the Tauri `print_window`
 * command. WKWebView's `window.print()` doesn't reliably surface the
 * dialog on macOS, so we go through Tauri's WebviewWindow::print() Rust
 * API instead. The user picks "Save as PDF" in the dialog.
 *
 * Hard-capped at 5s total so the export never hangs indefinitely on a
 * stuck font or image event.
 */
export async function printWhenReady(): Promise<void> {
  const ready = (async () => {
    if (document.fonts && document.fonts.ready) {
      try { await document.fonts.ready; } catch { /* proceed */ }
    }
    const imgs = Array.from(document.images);
    const pending = imgs.filter((img) => !img.complete);
    await Promise.all(
      pending.map(
        (img) =>
          new Promise<void>((resolve) => {
            const done = () => resolve();
            img.addEventListener('load', done, { once: true });
            img.addEventListener('error', done, { once: true });
          })
      )
    );
    // Let the browser settle final layout.
    await new Promise((r) => requestAnimationFrame(r as FrameRequestCallback));
  })();
  const timeout = new Promise<void>((r) => setTimeout(r, 5000));
  await Promise.race([ready, timeout]);

  try {
    await invoke('print_window');
  } catch (err) {
    // Fall back to the browser's window.print() if the Tauri command
    // isn't available (e.g., running outside Tauri).
    console.warn('Tauri print_window invoke failed; falling back to window.print():', err);
    window.print();
  }
}

