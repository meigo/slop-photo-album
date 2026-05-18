<script lang="ts">
  import { getTemplate, type Template } from '$lib/layout/templates';

  interface Props {
    templateId: string;
    /** Pixel width of the icon. Height = width × aspect. */
    width?: number;
  }
  let { templateId, width = 40 }: Props = $props();

  let tpl = $derived<Template>(getTemplate(templateId));
  // Use the template's own aspect for the icon so square-page templates
  // render square icons and landscape (calendar) templates render wider.
  let aspectRatio = $derived(tpl.aspect === 'square' ? 1 : 4 / 3);
  let height = $derived(Math.round(width / aspectRatio));
</script>

<div
  class="relative inline-block"
  style="width: {width}px; height: {height}px; background: var(--color-surface); border: 1px solid var(--color-line); flex-shrink: 0;"
>
  {#each tpl.slots as slotLayout}
    <div
      class="absolute"
      style="
        left: {slotLayout.x * 100}%;
        top: {slotLayout.y * 100}%;
        width: {slotLayout.w * 100}%;
        height: {slotLayout.h * 100}%;
        background: var(--color-fg);
        opacity: 0.6;
        outline: 1px solid var(--color-surface);
        outline-offset: -1px;
      "
    ></div>
  {/each}
  {#if tpl.calendarGrid}
    <div
      class="absolute"
      style="
        left: {tpl.calendarGrid.x * 100}%;
        top: {tpl.calendarGrid.y * 100}%;
        width: {tpl.calendarGrid.w * 100}%;
        height: {tpl.calendarGrid.h * 100}%;
        background: repeating-linear-gradient(0deg, transparent 0 2px, var(--color-muted) 2px 3px),
                    repeating-linear-gradient(90deg, transparent 0 2px, var(--color-muted) 2px 3px);
        opacity: 0.7;
        outline: 1px solid var(--color-surface);
        outline-offset: -1px;
      "
    ></div>
  {/if}
</div>
