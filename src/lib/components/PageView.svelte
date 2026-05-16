<script lang="ts">
  import { getTemplate, type Template } from '$lib/layout/templates';
  import { convertFileSrc } from '@tauri-apps/api/core';
  import { parseTransform, cssForTransform, type SlotTransform, IDENTITY_TRANSFORM } from '$lib/layout/transform';
  import { autoPositionTransform } from '$lib/layout/autoposition';
  import EmptySlotBg from './EmptySlotBg.svelte';

  interface Slot {
    slot_index: number;
    photo_id: number | null;
    path: string | null;
    thumb_path: string | null;
    transform_json: string | null;
    photo_width: number | null;
    photo_height: number | null;
    faces: Array<{ bbox_x: number; bbox_y: number; bbox_w: number; bbox_h: number }>;
    top_tag: string | null;
  }

  interface Props {
    templateId: string;
    slots: Slot[];
    onSlotClick?: (slotIndex: number) => void;
    onSwapPhoto?: (slotIndex: number) => void;
    onAdjustCrop?: (slotIndex: number) => void;
    editingSlotIndex?: number | null;
  }
  let { templateId, slots, onSlotClick, onSwapPhoto, onAdjustCrop, editingSlotIndex = null }: Props = $props();

  let tpl = $derived<Template>(getTemplate(templateId));
  let aspectRatio = $derived(tpl.aspect === 'square' ? '1 / 1' : '4 / 3');
  let orderedSlots = $derived([...slots].sort((a, b) => a.slot_index - b.slot_index));

  function effectiveTransform(slot: Slot, slotLayout: { x: number; y: number; w: number; h: number }): SlotTransform {
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
    {@const isEditing = editingSlotIndex === i}
    <div
      class="absolute group"
      style="
        left: {slotLayout.x * 100}%;
        top: {slotLayout.y * 100}%;
        width: {slotLayout.w * 100}%;
        height: {slotLayout.h * 100}%;
        padding: 2px;
      "
    >
      <div class="relative w-full h-full overflow-hidden">
        {#if slot?.path}
          <img
            src={convertFileSrc(slot.path)}
            alt=""
            class="absolute inset-0 w-full h-full object-cover"
            style="object-position: {css.objectPosition}; transform: {css.transform}; transform-origin: {css.transformOrigin};"
            draggable="false"
            loading="lazy"
          />
        {:else}
          <EmptySlotBg />
          <div class="absolute inset-0 flex items-center justify-center" style="color: var(--color-muted)">
            <span class="text-xs">empty slot</span>
          </div>
        {/if}

        {#if !isEditing}
          {#if onSlotClick}
            <button
              type="button"
              class="absolute inset-0"
              style="background: none; border: none; cursor: pointer;"
              onclick={() => onSlotClick?.(i)}
              aria-label={`Edit slot ${i + 1}`}
            ></button>
          {/if}

          {#if slot?.path && (onSwapPhoto || onAdjustCrop)}
            <div
              class="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
              style="z-index: 2;"
            >
              {#if onSwapPhoto}
                <button
                  type="button"
                  class="rounded p-1 text-xs"
                  style="background: rgba(0,0,0,0.6); color: white; border: none; cursor: pointer;"
                  onclick={(e) => { e.stopPropagation(); onSwapPhoto?.(i); }}
                  title="Swap photo"
                  aria-label={`Swap photo in slot ${i + 1}`}
                >🖼</button>
              {/if}
              {#if onAdjustCrop}
                <button
                  type="button"
                  class="rounded p-1 text-xs"
                  style="background: rgba(0,0,0,0.6); color: white; border: none; cursor: pointer;"
                  onclick={(e) => { e.stopPropagation(); onAdjustCrop?.(i); }}
                  title="Adjust crop"
                  aria-label={`Adjust crop in slot ${i + 1}`}
                >✥</button>
              {/if}
            </div>
          {/if}
        {/if}
      </div>
    </div>
  {/each}
</div>
