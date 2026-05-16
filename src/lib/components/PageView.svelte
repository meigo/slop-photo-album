<script lang="ts">
  import { getTemplate, type Template } from '$lib/layout/templates';
  import type { SlotLayout } from '$lib/layout/templates';
  import { convertFileSrc } from '@tauri-apps/api/core';
  import {
    parseTransform,
    cssForTransform,
    IDENTITY_TRANSFORM,
    type SlotTransform,
  } from '$lib/layout/transform';
  import { autoPositionTransform } from '$lib/layout/autoposition';

  interface Slot {
    slot_index: number;
    photo_id: number | null;
    path: string | null;
    thumb_path: string | null;
    transform_json: string | null;
    /** Photo's natural pixel dimensions, used by auto-position. May be null
     *  when the slot is empty or photo metadata is missing. */
    photo_width: number | null;
    photo_height: number | null;
    /** Face bboxes for this photo (used by auto-position). */
    faces: Array<{ bbox_x: number; bbox_y: number; bbox_w: number; bbox_h: number }>;
    top_tag: string | null;
  }

  interface Props {
    templateId: string;
    slots: Slot[];
    onSlotClick?: (slotIndex: number) => void;
  }
  let { templateId, slots, onSlotClick }: Props = $props();

  let tpl = $derived<Template>(getTemplate(templateId));
  let aspectRatio = $derived(tpl.aspect === 'square' ? '1 / 1' : '4 / 3');

  // Order slots by slot_index ascending so they match tpl.slots index.
  let orderedSlots = $derived([...slots].sort((a, b) => a.slot_index - b.slot_index));

  function effectiveTransform(slot: Slot, slotLayout: SlotLayout): SlotTransform {
    const manual = parseTransform(slot.transform_json);
    if (manual) return manual;
    if (slot.photo_width !== null && slot.photo_height !== null) {
      return autoPositionTransform({
        photoWidth: slot.photo_width,
        photoHeight: slot.photo_height,
        faces: slot.faces,
        topTag: slot.top_tag,
        slot: slotLayout,
      });
    }
    return IDENTITY_TRANSFORM;
  }
</script>

<div
  class="relative w-full surface-card p-0 overflow-hidden"
  style="aspect-ratio: {aspectRatio}; border: 1px solid var(--color-line);"
>
  {#each tpl.slots as slotLayout, i}
    {@const slot = orderedSlots[i]}
    {@const t = slot ? effectiveTransform(slot, slotLayout) : IDENTITY_TRANSFORM}
    {@const css = cssForTransform(t)}
    <button
      type="button"
      class="absolute"
      style="
        left: {slotLayout.x * 100}%;
        top: {slotLayout.y * 100}%;
        width: {slotLayout.w * 100}%;
        height: {slotLayout.h * 100}%;
        padding: 2px;
        background: none;
        border: none;
        cursor: {onSlotClick ? 'pointer' : 'default'};
      "
      onclick={() => onSlotClick?.(i)}
    >
      <div class="w-full h-full overflow-hidden" style="background: var(--color-line);">
        {#if slot?.path}
          <!-- Use the ORIGINAL photo path (not thumb_path) so review-page
               rendering at ~700-1000px wide stays sharp. loading="lazy"
               keeps off-screen pages from decoding until needed. -->
          <img
            src={convertFileSrc(slot.path)}
            alt=""
            class="w-full h-full object-cover"
            style="transform: {css.transform}; transform-origin: {css.transformOrigin};"
            draggable="false"
            loading="lazy"
          />
        {:else}
          <div class="w-full h-full flex items-center justify-center" style="color: var(--color-muted)">
            <span class="text-xs">empty slot</span>
          </div>
        {/if}
      </div>
    </button>
  {/each}
</div>
