<script lang="ts">
  import { getTemplate, type Template } from '$lib/layout/templates';

  interface Props {
    templateId: string;
    /** Pixel side length. Icons are square and SVG-rendered at integer
     *  pixel coordinates so 1–2 px features stay crisp at any size. */
    width?: number;
  }
  let { templateId, width = 40 }: Props = $props();

  let tpl = $derived<Template>(getTemplate(templateId));

  function snap(u: number): number {
    return Math.round(u * width);
  }
</script>

<svg
  {width}
  height={width}
  viewBox="0 0 {width} {width}"
  style="display: block; flex-shrink: 0; background: var(--color-surface);"
  shape-rendering="crispEdges"
>
  <!-- 1px frame. stroke is centered on the path, so inset by 0.5 each
       side and shrink by 1 to keep the stroke fully inside the viewport. -->
  <rect x="0.5" y="0.5" width={width - 1} height={width - 1} fill="none" stroke="var(--color-line)" />

  {#each tpl.slots as slotLayout}
    {@const left = snap(slotLayout.x)}
    {@const top = snap(slotLayout.y)}
    {@const right = snap(slotLayout.x + slotLayout.w)}
    {@const bottom = snap(slotLayout.y + slotLayout.h)}
    {@const inT = top > 0 ? 1 : 0}
    {@const inL = left > 0 ? 1 : 0}
    {@const inB = bottom < width ? 1 : 0}
    {@const inR = right < width ? 1 : 0}
    <rect
      x={left + inL}
      y={top + inT}
      width={right - left - inL - inR}
      height={bottom - top - inT - inB}
      fill="var(--color-fg)"
      fill-opacity="0.6"
    />
  {/each}

  {#if tpl.calendarGrid}
    {@const cg = tpl.calendarGrid}
    {@const gLeft = snap(cg.x)}
    {@const gTop = snap(cg.y)}
    {@const gRight = snap(cg.x + cg.w)}
    {@const gBottom = snap(cg.y + cg.h)}
    {@const cInT = gTop > 0 ? 1 : 0}
    {@const cInL = gLeft > 0 ? 1 : 0}
    {@const cInB = gBottom < width ? 1 : 0}
    {@const cInR = gRight < width ? 1 : 0}
    {@const blockX = gLeft + cInL}
    {@const blockY = gTop + cInT}
    {@const blockW = gRight - gLeft - cInL - cInR}
    {@const blockH = gBottom - gTop - cInT - cInB}
    {@const lineCount = cg.h > cg.w ? 6 : 3}
    {@const lineThickness = 2}
    {#each Array(lineCount) as _, i}
      {@const linePos = blockY + Math.round((i * (blockH - lineThickness)) / (lineCount - 1))}
      <rect
        x={blockX}
        y={linePos}
        width={blockW}
        height={lineThickness}
        fill="var(--color-muted)"
        fill-opacity="0.8"
      />
    {/each}
  {/if}
</svg>
