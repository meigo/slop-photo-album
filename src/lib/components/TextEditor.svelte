<script lang="ts">
  import { onMount } from 'svelte';
  import { parseStyle, serializeStyle, cssForStyle, DEFAULT_TEXT_STYLE, type TextStyle } from '$lib/text/style';
  import { loadGoogleFont } from '$lib/text/fonts';
  import { FONT_CATALOG, findFont } from '$lib/text/catalog';
  import { updatePageText, deletePageText } from '$lib/db';
  import { invalidateAll } from '$app/navigation';
  import type { PageTextRow } from '$lib/db/types';

  interface Props {
    text: PageTextRow;
    pagePaddingPx: number;
    onClose: () => void;
  }
  let { text, pagePaddingPx, onClose }: Props = $props();

  // Intentionally snapshot the prop's initial values into local $state — this
  // component edits a local copy and only writes back on save(). The
  // state_referenced_locally warnings here are false positives.
  // svelte-ignore state_referenced_locally
  let pos = $state({ x: text.position_x, y: text.position_y, w: text.width, h: text.height });
  // svelte-ignore state_referenced_locally
  let style = $state<TextStyle>(parseStyle(text.style_json) ?? DEFAULT_TEXT_STYLE);
  // svelte-ignore state_referenced_locally
  let content = $state(text.content);

  let dragging = $state<'move' | 'resize' | null>(null);
  let dragStart: { mouseX: number; mouseY: number; pos: { x: number; y: number; w: number; h: number }; parentRect: DOMRect } | null = null;

  $effect(() => {
    loadGoogleFont(style.fontFamily, findFont(style.fontFamily)?.weights ?? [style.fontWeight]);
  });

  function clamp01(v: number) { return Math.max(0, Math.min(1, v)); }

  function onPointerDownMove(e: PointerEvent) {
    const tgt = e.target as HTMLElement;
    // Ignore drags that originate on the toolbar, resize handle, or contentEditable area
    if (tgt.closest('[data-toolbar]')) return;
    if (tgt.closest('[data-resize-handle]')) return;
    if (tgt.closest('[data-text-content]')) return;
    dragging = 'move';
    const parentRect = (e.currentTarget as HTMLElement).parentElement!.getBoundingClientRect();
    dragStart = { mouseX: e.clientX, mouseY: e.clientY, pos: { ...pos }, parentRect };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onPointerDownResize(e: PointerEvent) {
    e.stopPropagation();
    dragging = 'resize';
    const parentRect = (e.currentTarget as HTMLElement).parentElement!.parentElement!.getBoundingClientRect();
    dragStart = { mouseX: e.clientX, mouseY: e.clientY, pos: { ...pos }, parentRect };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: PointerEvent) {
    if (!dragging || !dragStart) return;
    const dx = (e.clientX - dragStart.mouseX) / dragStart.parentRect.width;
    const dy = (e.clientY - dragStart.mouseY) / dragStart.parentRect.height;
    if (dragging === 'move') {
      pos = {
        x: clamp01(dragStart.pos.x + dx),
        y: clamp01(dragStart.pos.y + dy),
        w: pos.w,
        h: pos.h,
      };
    } else {
      pos = {
        x: pos.x, y: pos.y,
        w: clamp01(Math.max(0.05, dragStart.pos.w + dx)),
        h: clamp01(Math.max(0.05, dragStart.pos.h + dy)),
      };
    }
  }

  function onPointerUp(e: PointerEvent) {
    dragging = null;
    dragStart = null;
    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch {
      // ignore: pointer may already be released
    }
  }

  async function save() {
    await updatePageText(text.id, {
      position_x: pos.x,
      position_y: pos.y,
      width: pos.w,
      height: pos.h,
      content,
      style_json: serializeStyle(style),
    });
    await invalidateAll();
    onClose();
  }

  async function remove() {
    if (!confirm('Delete this text?')) return;
    await deletePageText(text.id);
    await invalidateAll();
    onClose();
  }

  let availableWeights = $derived(findFont(style.fontFamily)?.weights ?? [400]);

  // Sync initial content into the contentEditable element on mount so the
  // caret doesn't reset on every reactive update.
  let editorEl: HTMLDivElement | undefined = $state(undefined);
  onMount(() => {
    if (editorEl) editorEl.textContent = content;
  });

  function onInput(e: Event) {
    content = (e.currentTarget as HTMLDivElement).textContent ?? '';
  }
</script>

<svelte:window onkeydown={(e) => { if (e.key === 'Escape') onClose(); }} />

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="absolute"
  style="
    left: calc({pagePaddingPx}px + {pos.x} * (100% - {2 * pagePaddingPx}px));
    top: calc({pagePaddingPx}px + {pos.y} * (100% - {2 * pagePaddingPx}px));
    width: calc({pos.w} * (100% - {2 * pagePaddingPx}px));
    height: calc({pos.h} * (100% - {2 * pagePaddingPx}px));
    z-index: 5;
    outline: 1px dashed var(--color-fg);
    cursor: {dragging === 'move' ? 'grabbing' : 'grab'};
    touch-action: none;
  "
  onpointerdown={onPointerDownMove}
  onpointermove={onPointerMove}
  onpointerup={onPointerUp}
  onpointercancel={onPointerUp}
  role="presentation"
>
  <div
    data-text-content
    bind:this={editorEl}
    contenteditable="true"
    oninput={onInput}
    class="w-full h-full"
    style="{cssForStyle(style)}; outline: none; overflow: hidden; cursor: text;"
  ></div>

  <!-- Resize handle, bottom-right -->
  <div
    data-resize-handle
    onpointerdown={onPointerDownResize}
    onpointermove={onPointerMove}
    onpointerup={onPointerUp}
    style="
      position: absolute;
      right: -6px; bottom: -6px;
      width: 12px; height: 12px;
      background: var(--color-fg);
      border-radius: 50%;
      cursor: nwse-resize;
      z-index: 6;
    "
  ></div>

  <!-- Floating toolbar -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    data-toolbar
    onpointerdown={(e) => e.stopPropagation()}
    style="
      position: absolute;
      top: -36px;
      left: 0;
      display: flex;
      gap: 4px;
      align-items: center;
      background: rgba(0,0,0,0.85);
      color: white;
      padding: 4px 6px;
      border-radius: 6px;
      font-size: 12px;
      z-index: 7;
      white-space: nowrap;
    "
  >
    <select bind:value={style.fontFamily} style="color: black;">
      {#each FONT_CATALOG as f}
        <option value={f.family} style="font-family: '{f.family}', sans-serif;">{f.family}</option>
      {/each}
    </select>
    <input type="number" min="8" max="200" bind:value={style.fontSize} style="width: 60px; color: black;" />
    <select bind:value={style.fontWeight} style="color: black;">
      {#each availableWeights as w}
        <option value={w}>{w}</option>
      {/each}
    </select>
    <button type="button" onclick={() => style.italic = !style.italic} style="padding: 2px 6px; background: {style.italic ? 'rgba(255,255,255,0.3)' : 'transparent'}; color: white; border: 1px solid white; border-radius: 3px;"><em>I</em></button>
    <input type="color" bind:value={style.color} style="width: 28px; height: 24px; border: none; background: transparent;" />
    <button type="button" onclick={() => style.align = 'left'} style="padding: 2px 6px; background: {style.align === 'left' ? 'rgba(255,255,255,0.3)' : 'transparent'}; color: white; border: 1px solid white; border-radius: 3px;">L</button>
    <button type="button" onclick={() => style.align = 'center'} style="padding: 2px 6px; background: {style.align === 'center' ? 'rgba(255,255,255,0.3)' : 'transparent'}; color: white; border: 1px solid white; border-radius: 3px;">C</button>
    <button type="button" onclick={() => style.align = 'right'} style="padding: 2px 6px; background: {style.align === 'right' ? 'rgba(255,255,255,0.3)' : 'transparent'}; color: white; border: 1px solid white; border-radius: 3px;">R</button>
    <button type="button" onclick={save} style="padding: 2px 8px; background: white; color: black; border: none; border-radius: 3px;">save</button>
    <button type="button" onclick={remove} style="padding: 2px 6px; background: transparent; color: #ff8888; border: 1px solid #ff8888; border-radius: 3px;">del</button>
    <button type="button" onclick={onClose} style="padding: 2px 6px; background: transparent; color: white; border: 1px solid white; border-radius: 3px;">esc</button>
  </div>
</div>
