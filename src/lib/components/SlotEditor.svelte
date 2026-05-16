<script lang="ts">
  import { convertFileSrc } from '@tauri-apps/api/core';
  import {
    parseTransform, serializeTransform, cssForTransform,
    type SlotTransform,
  } from '$lib/layout/transform';
  import { autoPositionTransform } from '$lib/layout/autoposition';
  import { updateSlotTransform } from '$lib/db';
  import { invalidateAll } from '$app/navigation';
  import type { SlotLayout } from '$lib/layout/templates';

  interface Props {
    pageId: number;
    slotIndex: number;
    photoPath: string;
    photoWidth: number;
    photoHeight: number;
    initialTransformJson: string | null;
    slotLayout: SlotLayout;
    pageAspect: 'square' | 'landscape';
    faces: Array<{ bbox_x: number; bbox_y: number; bbox_w: number; bbox_h: number }>;
    topTag: string | null;
    onClose: () => void;
  }
  let { pageId, slotIndex, photoPath, photoWidth, photoHeight, initialTransformJson, slotLayout, pageAspect, faces, topTag, onClose }: Props = $props();

  function initialTransform(): SlotTransform {
    const parsed = parseTransform(initialTransformJson);
    if (parsed) return parsed;
    return autoPositionTransform({ photoWidth, photoHeight, faces, topTag, slot: slotLayout });
  }

  let t = $state<SlotTransform>(initialTransform());
  let dragging = $state(false);
  let dragStart: { x: number; y: number; t0: SlotTransform } | null = null;

  function onPointerDown(e: PointerEvent) {
    dragging = true;
    dragStart = { x: e.clientX, y: e.clientY, t0: { ...t } };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: PointerEvent) {
    if (!dragging || !dragStart) return;
    const dx = (e.clientX - dragStart.x);
    const dy = (e.clientY - dragStart.y);
    const container = (e.currentTarget as HTMLElement).getBoundingClientRect();
    t = {
      offsetX: dragStart.t0.offsetX + dx / container.width,
      offsetY: dragStart.t0.offsetY + dy / container.height,
      scale: dragStart.t0.scale,
    };
  }

  function onPointerUp(e: PointerEvent) {
    dragging = false;
    dragStart = null;
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
  }

  function onWheel(e: WheelEvent) {
    e.preventDefault();
    const delta = -e.deltaY * 0.002;
    const newScale = Math.max(1, Math.min(4, t.scale * (1 + delta)));
    t = { ...t, scale: newScale };
  }

  async function save() {
    await updateSlotTransform(pageId, slotIndex, serializeTransform(t));
    await invalidateAll();
    onClose();
  }

  async function reset() {
    await updateSlotTransform(pageId, slotIndex, null);
    await invalidateAll();
    onClose();
  }

  let css = $derived(cssForTransform(t));
</script>

<svelte:window onkeydown={(e) => e.key === 'Escape' && onClose()} />

<div
  class="fixed inset-0 z-50 flex items-center justify-center"
  style="background: rgba(0, 0, 0, 0.85);"
>
  <div class="surface-card relative" style="width: 90vw; max-width: 700px;">
    <div class="flex items-baseline justify-between mb-3">
      <h3 class="text-lg font-medium">Adjust crop</h3>
      <p class="text-sm" style="color: var(--color-muted)">drag to reposition · scroll/pinch to zoom</p>
    </div>
    <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
    <div
      class="relative w-full overflow-hidden"
      style="
        aspect-ratio: {slotLayout.w * (pageAspect === 'landscape' ? 4/3 : 1)} / {slotLayout.h};
        background: var(--color-line);
        touch-action: none;
        user-select: none;
      "
      onpointerdown={onPointerDown}
      onpointermove={onPointerMove}
      onpointerup={onPointerUp}
      onpointercancel={onPointerUp}
      onwheel={onWheel}
    >
      <img
        src={convertFileSrc(photoPath)}
        alt=""
        class="w-full h-full object-cover"
        style="transform: {css.transform}; transform-origin: {css.transformOrigin}; pointer-events: none;"
        draggable="false"
      />
    </div>
    <div class="flex gap-2 mt-3">
      <button type="button" class="btn-primary" onclick={save}>Save crop</button>
      <button type="button" class="btn-secondary" onclick={reset} title="Clear manual crop and use the smart default">Reset to auto</button>
      <button type="button" class="btn-ghost ml-auto" onclick={onClose}>Cancel (Esc)</button>
    </div>
    <p class="text-xs mt-2" style="color: var(--color-muted)">
      Scale {t.scale.toFixed(2)}× · offset ({(t.offsetX * 100).toFixed(0)}%, {(t.offsetY * 100).toFixed(0)}%)
    </p>
  </div>
</div>
